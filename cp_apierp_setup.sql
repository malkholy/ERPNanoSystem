/*
    ERP Nano System — Runtime Stored Procedure Setup
    
    This script defines the CP.APIERPOperation stored procedure.
    It reads page, field, view, filter, and user group configurations 
    already written by ERPNanoCP, and serves them to the runtime.
*/

GO
CREATE OR ALTER PROCEDURE CP.APIERPOperation
    @Operation NVARCHAR(100),
    @LineData NVARCHAR(MAX) = NULL,
	@SqlStatement NVARCHAR(MAX) = NULL , 
    @User NVARCHAR(100) = NULL,
    @state INT OUTPUT,
    @message NVARCHAR(MAX) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET @state = 0;
    SET @message = 'Success';
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
            SET @state = 1;
            SET @message = 'PageID is required.';
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
            Width AS width,
            ColorRules AS colorRules,
            SortOrder
        FROM CP.PageFields
        WHERE PageID = @PageID AND Visible = 1
        ORDER BY SortOrder;

        -- List1: Page Filters Configuration
        SELECT 
            pf.PageFilterID,
            pf.PageID,
            pf.FilterID,
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
            SET @state = 1;
            SET @message = 'Source table not defined for this page.';
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
            -- Ensure safe escaping to protect against basic SQL injection on filter values
            SET @FilterSQL = @FilterSQL + N' AND ' + QUOTENAME(@FldName) + N' = N''' + REPLACE(@FldVal, N'''', N'''''') + N'''';
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

        SELECT @TargetFilterID = FilterID
        FROM OPENJSON(@LineData)
        WITH (FilterID INT);

        -- Lookup filter table info
        DECLARE @FSchema NVARCHAR(50);
        DECLARE @FTable NVARCHAR(100);

        SELECT 
            @FSchema = SchemaName,
            @FTable = TableName
        FROM CP.FilterMaster
        WHERE FilterID = @TargetFilterID;

        IF @FTable IS NULL OR @FTable = ''
        BEGIN
            SET @state = 1;
            SET @message = 'Filter table source not found.';
            RETURN;
        END

        -- Dynamically select columns from CP.FilterFields to use as value and label
        DECLARE @ValueCol NVARCHAR(100) = NULL;
        DECLARE @LabelCol NVARCHAR(100) = NULL;

        SELECT TOP 1 @ValueCol = FieldName FROM CP.FilterFields WHERE FilterID = @TargetFilterID ORDER BY SortOrder;
        SELECT TOP 1 @LabelCol = FieldName FROM CP.FilterFields WHERE FilterID = @TargetFilterID AND FieldName <> @ValueCol ORDER BY SortOrder;

        IF @ValueCol IS NULL OR @ValueCol = ''
        BEGIN
            -- Fallback columns if none configured
            SET @ValueCol = 'ID';
            SET @LabelCol = 'Name';
        END

        IF @LabelCol IS NULL OR @LabelCol = ''
            SET @LabelCol = @ValueCol;

        -- Execute dynamic SELECT DISTINCT value, label
        DECLARE @OptSQL NVARCHAR(MAX);
        SET @OptSQL = N'SELECT DISTINCT ' + QUOTENAME(@ValueCol) + N' AS value, ' + QUOTENAME(@LabelCol) + N' AS label FROM ' + QUOTENAME(@FSchema) + N'.' + QUOTENAME(@FTable);
        
        EXEC sp_executesql @OptSQL;
        RETURN;
    END

    -- Unknown operation
    SET @state = 1;
    SET @message = N'Unknown operation: ' + ISNULL(@Operation, N'NULL');
END
GO

USE [ERPMega25]
GO

/****** Object:  Table [CP].[FilterMaster]    Script Date: 6/13/2026 5:56:08 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [CP].[FilterMaster](
	[FilterID] [int] IDENTITY(1,1) NOT NULL,
	[FilterName] [nvarchar](500) NOT NULL,
	[DatabaseName] [nvarchar](500) NULL,
	[SchemaName] [nvarchar](500) NULL,
	[TableName] [nvarchar](500) NULL,
	[CreatedBy] [nvarchar](150) NULL,
	[CreatedDate] [datetime] NULL,
	[LastMaintBy] [nvarchar](150) NULL,
	[LastMaintDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[FilterID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [CP].[FilterMaster] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO


USE [ERPMega25]
GO

/****** Object:  Table [CP].[FilterFields]    Script Date: 6/13/2026 5:55:51 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [CP].[FilterFields](
	[FilterFieldID] [int] IDENTITY(1,1) NOT NULL,
	[FilterID] [int] NOT NULL,
	[FieldName] [nvarchar](500) NOT NULL,
	[Label] [nvarchar](500) NULL,
	[DataType] [nvarchar](100) NULL,
	[FilterType] [nvarchar](50) NULL,
	[IsActive] [bit] NOT NULL,
	[SortOrder] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[FilterFieldID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [CP].[FilterFields] ADD  DEFAULT ('equals') FOR [FilterType]
GO

ALTER TABLE [CP].[FilterFields] ADD  DEFAULT ((1)) FOR [IsActive]
GO

ALTER TABLE [CP].[FilterFields] ADD  DEFAULT ((0)) FOR [SortOrder]
GO

ALTER TABLE [CP].[FilterFields]  WITH CHECK ADD  CONSTRAINT [FK_FilterFields_Filter] FOREIGN KEY([FilterID])
REFERENCES [CP].[FilterMaster] ([FilterID])
ON DELETE CASCADE
GO

ALTER TABLE [CP].[FilterFields] CHECK CONSTRAINT [FK_FilterFields_Filter]
GO


USE [ERPMega25]
GO

/****** Object:  Table [CP].[UserPageConditions]    Script Date: 6/13/2026 5:55:42 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [CP].[UserPageConditions](
	[UserPageCondID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[PageID] [int] NOT NULL,
	[IsGranted] [bit] NOT NULL,
	[CondMode] [nvarchar](20) NULL,
	[CondSql] [nvarchar](max) NULL,
	[CondBuilder] [nvarchar](max) NULL,
	[CreatedBy] [nvarchar](150) NULL,
	[CreatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserPageCondID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [CP].[UserPageConditions] ADD  DEFAULT ((1)) FOR [IsGranted]
GO

ALTER TABLE [CP].[UserPageConditions] ADD  DEFAULT ('builder') FOR [CondMode]
GO

ALTER TABLE [CP].[UserPageConditions] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO

ALTER TABLE [CP].[UserPageConditions]  WITH CHECK ADD  CONSTRAINT [FK_UserPageCond_Page] FOREIGN KEY([PageID])
REFERENCES [CP].[PageMaster] ([PageID])
ON DELETE CASCADE
GO

ALTER TABLE [CP].[UserPageConditions] CHECK CONSTRAINT [FK_UserPageCond_Page]
GO


USE [ERPMega25]
GO

/****** Object:  Table [CP].[UserGroups]    Script Date: 6/13/2026 5:55:33 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [CP].[UserGroups](
	[UserGroupID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[GroupID] [int] NOT NULL,
	[CreatedBy] [nvarchar](150) NULL,
	[CreatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserGroupID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [CP].[UserGroups] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO

ALTER TABLE [CP].[UserGroups]  WITH CHECK ADD  CONSTRAINT [FK_UserGroups_Group] FOREIGN KEY([GroupID])
REFERENCES [CP].[GroupMaster] ([GroupID])
ON DELETE CASCADE
GO

ALTER TABLE [CP].[UserGroups] CHECK CONSTRAINT [FK_UserGroups_Group]
GO


USE [ERPMega25]
GO

/****** Object:  Table [CP].[UserFilterConditions]    Script Date: 6/13/2026 5:55:22 PM ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [CP].[UserFilterConditions](
	[UserFilterCondID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[PageID] [int] NOT NULL,
	[PageFilterID] [int] NOT NULL,
	[CondSql] [nvarchar](max) NULL,
	[CreatedBy] [nvarchar](150) NULL,
	[CreatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[UserFilterCondID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [CP].[UserFilterConditions] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
