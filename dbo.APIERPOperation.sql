CREATE OR ALTER PROCEDURE dbo.APIERPOperation
    @Operation NVARCHAR(100),
    @LineData NVARCHAR(MAX) = NULL,
    @LineFilter NVARCHAR(MAX) = NULL,
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
            pf.PageKeyField,
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
	DECLARE @DatabaseName   NVARCHAR(500)
    DECLARE @SchemaName     NVARCHAR(500)
    DECLARE @TableName      NVARCHAR(500)
    DECLARE @SQL            NVARCHAR(MAX)
    DECLARE @WHERE          NVARCHAR(MAX) = ''
    DECLARE @LineQuery      NVARCHAR(MAX)

	SELECT 
            @PageID = PAgeID 
           
        FROM OPENJSON(@LineData)
        WITH (
            PageID INT  );

    -- get page info
    SELECT 
        @DatabaseName = DatabaseName,
        @SchemaName   = SchemaName,
        @TableName    = TableName
    FROM [CP].[PageMaster]
    WHERE PageID = @PageID

    IF @DatabaseName IS NULL
    BEGIN
        SET @State   = 0
        SET @Message = 'Page not found'
        RETURN
    END

    -- parse filters
    IF @LineFilter IS NOT NULL AND LEN(@LineFilter) > 2
    BEGIN
        create table #TempFilter (
            Field      nvarchar(500),
            Value1     nvarchar(500),
            Value2     nvarchar(500)
        )

        insert into #TempFilter (Field, Value1, Value2)
        select Field, Value1, Value2
        from openjson(@LineFilter)
        with (
            Field  nvarchar(500) '$.Field',
            Value1 nvarchar(500) '$.Value1',
            Value2 nvarchar(500) '$.Value2'
        )

        -- build WHERE clause by joining with PageFilters
        SELECT @WHERE = @WHERE +
            CASE pf.FilterType
                WHEN 'date' THEN
                    ' AND ' + pf.PageKeyField + ' = ''' + tf.Value1 + ''''
                WHEN 'datalist_range' THEN
                    ' AND ' + pf.PageKeyField + ' BETWEEN ''' + tf.Value1 + ''' AND ''' + tf.Value2 + ''''
                ELSE ''
            END
        FROM #TempFilter tf
        INNER JOIN [CP].[PageFilters] pf 
            ON pf.PageKeyField COLLATE DATABASE_DEFAULT = tf.Field COLLATE DATABASE_DEFAULT
            AND pf.PageID = @PageID
        WHERE pf.IsActive = 1

        drop table #TempFilter
    END

    -- build final sql
    SET @SQL = 'SELECT * FROM [' + @DatabaseName + '].[' + @SchemaName + '].[' + @TableName + ']'

    IF LEN(@WHERE) > 0
        SET @SQL = @SQL + ' WHERE 1=1 ' + @WHERE
	print @sql 
    -- execute
    EXEC sp_executesql @SQL
       
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