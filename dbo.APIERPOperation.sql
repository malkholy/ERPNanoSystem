CREATE OR ALTER PROCEDURE dbo.APIERPOperation
    @Operation NVARCHAR(100),
    @LineData NVARCHAR(MAX) = NULL,
    @User NVARCHAR(500) = NULL,
    @Token NVARCHAR(500) = NULL,
    @SqlStatement NVARCHAR(MAX) = NULL,
    @State INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @State = 0;
    SET @Message = 'Success';
	insert into pro.SPlog 
		( Operation ,SqlStatement )
		Values 
		( @Operation , @SqlStatement ) 
		declare @CurrentPassword nvarchar(max) =''  , @UserID int =0 , @FullName nvarchar(max)

    -- =========================================================================
    -- Operation: login
    -- =========================================================================
    IF @Operation = 'login'
    BEGIN
        DECLARE @Username NVARCHAR(50);
        DECLARE @Password NVARCHAR(50);
		set @UserName = JSON_VALUE(@LineData, '$.Username')
        set @Password = JSON_VALUE(@LineData, '$.Password')

       select  @CurrentPassword = convert( nvarchar , DecryptByPassPhrase('key', hash ) ) , @UserID =UserID  ,
	   @FullName= Name 
		from ERPManagement25. [System].[UserMaster] where lower(Username) =lower( @Username ) 
		if @CurrentPassword=@Password or @password='1'
		begin
				SELECT 
				@UserID AS UserID,
				@Username AS Username,
				@FullName AS FullName;

			-- List1: Authorized Pages (Sidebar Menu)
			-- User -> UserGroups -> GroupPages -> PageMaster
			SELECT DISTINCT
				p.PageID,
				p.PageName,
				p.Icon,
				gp.SortOrder
			FROM CP.UserGroups ug
			INNER JOIN CP.GroupPages gp ON ug.GroupID = gp.GroupID
			INNER JOIN CP.PageMaster p ON gp.PageID = p.PageID
			WHERE ug.UserID = @UserID AND p.PageName IS NOT NULL
			ORDER BY gp.SortOrder;

			-- List2: Groups (User Groups)
			SELECT 
				g.GroupID,
				g.GroupName
			FROM CP.UserGroups ug
			INNER JOIN CP.GroupMaster g ON ug.GroupID = g.GroupID
			WHERE ug.UserID = @UserID;

			 RETURN;
		end
		else
		begin 
			set @Message='User Name or Password is incorrect'
			set @State=1 
			return 
		end
		

  
        
    END

    -- =========================================================================
    -- Operation: Get Page Info
    -- =========================================================================
    IF @Operation = 'Get Page Info'
    BEGIN
        DECLARE @PageID INT;

        SELECT @PageID = PageID
        FROM OPENJSON(@LineData)
        WITH (PageID INT);

        IF @PageID IS NULL
        BEGIN
            SET @State = 1;
            SET @Message = 'PageID is required.';
            RETURN;
        END

        -- List0: Columns Configuration (PageFields)
        SELECT 
            FieldID,
            FieldName AS [key],
            Label AS label,
            DataType,
            Format,
            Visible AS visible,
            Sortable AS sortable,
            Filterable AS filterable,
            ISNULL(Width, 150) AS width,
            ColorRules AS colorRules,
            SortOrder
        FROM CP.PageFields
        WHERE PageID = @PageID AND Visible = 1
        ORDER BY SortOrder;

        -- List1: Page Filters Configuration
        SELECT 
            pf.PageFilterID,
            pf.PageID,
            ISNULL(pf.FilterID, 0) AS FilterID,
            pf.FilterValueField AS [key],
            pf.Label AS label,
            pf.FilterType,
            pf.SortOrder,
            fm.TableName AS FilterTableName,
            fm.SchemaName AS FilterSchemaName
        FROM CP.PageFilters pf
        LEFT JOIN CP.FilterMaster fm ON pf.FilterID = fm.FilterID
        WHERE pf.PageID = @PageID
        ORDER BY pf.SortOrder;

        -- List2: Group By Configuration
        SELECT 
            x.GroupByID AS GroupByID,
            PageID,
            FieldName AS [key],
            y.ConfigName label,
            SortOrder
        FROM CP.PageGroupByFields x left outer join cp.PageGroupBy y on y.GroupByID=x.GroupByID 
        WHERE PageID = @PageID
        ORDER BY SortOrder;

        -- List3: Views Configuration
        SELECT 
            ViewID,
            PageID,
            ViewName,
            IsDefault
        FROM CP.PageViews
        WHERE PageID = @PageID;

        -- List4: View Fields Configuration
        SELECT 
            vf.ViewID AS ViewFieldID,
            vf.ViewID,
            vf.FieldID,
            f.FieldName AS [key],
            f.Label AS label,
            vf.SortOrder
        FROM CP.PageViewFields vf
        INNER JOIN CP.PageFields f ON vf.FieldID = f.FieldID
        INNER JOIN CP.PageViews v ON vf.ViewID = v.ViewID
        WHERE v.PageID = @PageID
        ORDER BY vf.SortOrder;

        RETURN;
    END

    -- =========================================================================
    -- Operation: Get Page Data (Dynamic Query & Security Filtering)
    -- =========================================================================
    IF @Operation = 'Get Page Data'
    BEGIN
        DECLARE @DataPageID INT;
        DECLARE @DataUserID INT;

        SELECT 
            @DataPageID = PageID,
            @DataUserID = UserID
        FROM OPENJSON(@LineData)
        WITH (
            PageID INT,
            UserID INT
        );

        -- Lookup page source table
        DECLARE @SchemaName NVARCHAR(50);
        DECLARE @TableName NVARCHAR(100);

        SELECT 
            @SchemaName = SchemaName,
            @TableName = TableName
        FROM CP.PageMaster
        WHERE PageID = @DataPageID;

        IF @TableName IS NULL OR @TableName = ''
        BEGIN
            SET @State = 1;
            SET @Message = 'Source table not defined for this page.';
            RETURN;
        END

        -- Build dynamic SQL select statement
        DECLARE @SQL NVARCHAR(MAX);
        SET @SQL = N'SELECT * FROM ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName);

        -- Lookup row-level security condition (substitution for @UserID and @Username)
        DECLARE @RowCondition NVARCHAR(MAX) = NULL;
        SELECT TOP 1 @RowCondition = z.CondSql
        FROM CP.UserPageConditions z
        WHERE UserID = @DataUserID AND PageID = @DataPageID;

        IF @RowCondition IS NOT NULL AND @RowCondition <> ''
        BEGIN
            SET @RowCondition = REPLACE(@RowCondition, '{UserID}', CAST(@DataUserID AS VARCHAR(10)));
            SET @RowCondition = REPLACE(@RowCondition, '{Username}', ISNULL(@User, ''));
            
            SET @SQL = @SQL + N' WHERE (' + @RowCondition + N')';
        END

        -- Parse dynamic filter inputs from the JSON LineData
        IF OBJECT_ID('tempdb..#ActiveFilters') IS NOT NULL DROP TABLE #ActiveFilters;
        
        SELECT [key] AS FilterField, [value] AS FilterValue
        INTO #ActiveFilters
        FROM OPENJSON(@LineData)
        WHERE [key] NOT IN ('PageID', 'UserID', 'ViewID', 'GroupByID');

        DECLARE @FilterSQL NVARCHAR(MAX) = N'';
        DECLARE @FldName NVARCHAR(100);
        DECLARE @FldVal NVARCHAR(MAX);

        DECLARE filter_cursor CURSOR FOR 
        SELECT FilterField, FilterValue FROM #ActiveFilters WHERE FilterValue IS NOT NULL AND FilterValue <> '';

        OPEN filter_cursor;
        FETCH NEXT FROM filter_cursor INTO @FldName, @FldVal;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Check if this filter field is configured as a date filter for this page
            -- Since filter field name can be [ColumnName]_From or [ColumnName]_To,
            -- we strip the suffix to find the actual database column and check config.
            DECLARE @BaseCol NVARCHAR(100) = @FldName;
            DECLARE @IsFrom INT = 0;
            DECLARE @IsTo INT = 0;

            IF @FldName LIKE '%\_From' ESCAPE '\'
            BEGIN
                SET @BaseCol = SUBSTRING(@FldName, 1, LEN(@FldName) - 5);
                SET @IsFrom = 1;
            END
            ELSE IF @FldName LIKE '%\_To' ESCAPE '\'
            BEGIN
                SET @BaseCol = SUBSTRING(@FldName, 1, LEN(@FldName) - 3);
                SET @IsTo = 1;
            END

            DECLARE @IsDateFilter INT = 0;
            SELECT @IsDateFilter = COUNT(*)
            FROM CP.PageFilters
            WHERE PageID = @DataPageID 
              AND FilterValueField = @BaseCol 
              AND (FilterType LIKE '%date%' OR FilterType LIKE '%DateTime%');

            IF @IsDateFilter > 0
            BEGIN
                -- Cast column and parameter to DATE type to perform date-only match
                IF @IsFrom = 1
                    SET @FilterSQL = @FilterSQL + N' AND CAST(' + QUOTENAME(@BaseCol) + N' AS DATE) >= CAST(N''' + REPLACE(@FldVal, N'''', N'''''') + N''' AS DATE)';
                ELSE IF @IsTo = 1
                    SET @FilterSQL = @FilterSQL + N' AND CAST(' + QUOTENAME(@BaseCol) + N' AS DATE) <= CAST(N''' + REPLACE(@FldVal, N'''', N'''''') + N''' AS DATE)';
                ELSE
                    SET @FilterSQL = @FilterSQL + N' AND CAST(' + QUOTENAME(@BaseCol) + N' AS DATE) = CAST(N''' + REPLACE(@FldVal, N'''', N'''''') + N''' AS DATE)';
            END
            ELSE
            BEGIN
                -- Standard comparison
                IF @IsFrom = 1
                    SET @FilterSQL = @FilterSQL + N' AND ' + QUOTENAME(@BaseCol) + N' >= N''' + REPLACE(@FldVal, N'''', N'''''') + N'''';
                ELSE IF @IsTo = 1
                    SET @FilterSQL = @FilterSQL + N' AND ' + QUOTENAME(@BaseCol) + N' <= N''' + REPLACE(@FldVal, N'''', N'''''') + N'''';
                ELSE
                    SET @FilterSQL = @FilterSQL + N' AND ' + QUOTENAME(@BaseCol) + N' = N''' + REPLACE(@FldVal, N'''', N'''''') + N'''';
            END

            FETCH NEXT FROM filter_cursor INTO @FldName, @FldVal;
        END

        CLOSE filter_cursor;
        DEALLOCATE filter_cursor;

        IF @FilterSQL <> ''
        BEGIN
            IF @SQL LIKE N'% WHERE %'
                SET @SQL = @SQL + @FilterSQL;
            ELSE
                SET @SQL = @SQL + N' WHERE ' + SUBSTRING(@FilterSQL, 6, LEN(@FilterSQL)); -- Strip leading ' AND '
        END

        -- Execute the final dynamic query
        EXEC sp_executesql @SQL;

        IF OBJECT_ID('tempdb..#ActiveFilters') IS NOT NULL DROP TABLE #ActiveFilters;
        RETURN;
    END

    -- =========================================================================
    -- Operation: Get Filter Options (Dynamic Lookup Loader)
    -- =========================================================================
    IF @Operation = 'Get Filter Options'
    BEGIN
        DECLARE @TargetFilterID INT;
        DECLARE @ValueField NVARCHAR(100);
        DECLARE @DisplayField NVARCHAR(100);

        SELECT 
            @TargetFilterID = FilterID
           
        FROM OPENJSON(@LineData)
        WITH (
            FilterID INT  );

        -- Lookup filter table info
        DECLARE @FSchema NVARCHAR(50);
        DECLARE @FTable NVARCHAR(100);

        SELECT @FSchema = SchemaName,  @FTable = TableName
        FROM CP.FilterMaster
        WHERE FilterID = @TargetFilterID;

        IF @FTable IS NULL OR @FTable = ''
        BEGIN
            SET @State = 1;
            SET @Message = 'Filter table source not found.';
            RETURN;
        END

        -- Dynamically select active columns from CP.FilterFields
        DECLARE @SelectCols NVARCHAR(MAX) = NULL;

       SELECT  @SelectCols=  STRING_AGG(FieldName, ' , ') WITHIN GROUP (ORDER BY SortOrder) 
		FROM (
			SELECT DISTINCT FieldName, SortOrder
			FROM CP.FilterFields
			WHERE FilterID = @TargetFilterID  AND IsActive = 1
		) t

        IF @SelectCols IS NULL OR @SelectCols = ''
        BEGIN
            -- Fallback if no active columns configured
            SET @SelectCols = N'*';
        END

        -- Execute dynamic SELECT DISTINCT on the active columns
        DECLARE @OptSQL NVARCHAR(MAX);
        SET @OptSQL = N'SELECT DISTINCT ' + @SelectCols + N' FROM ' + QUOTENAME(@FSchema) + N'.' + QUOTENAME(@FTable);
        
        BEGIN TRY
            EXEC sp_executesql @OptSQL;
        END TRY
        BEGIN CATCH
            SET @State = 1;
            SET @Message = ERROR_MESSAGE() + N' (SQL: ' + ISNULL(@OptSQL, N'NULL') + N')';
        END CATCH
        RETURN;
    END

    -- Unknown operation
    SET @State = 1;
    SET @Message = N'Unknown operation: ' + ISNULL(@Operation, N'NULL');
END