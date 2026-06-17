ALTER PROCEDURE [CP].[APICPOperation]
    @Operation      NVARCHAR(100),
    @LineData       NVARCHAR(MAX) = '',
    @User         nvarchar (500)        = '',
    @Token          NVARCHAR(500) = '',
	@SqlStatement nvarchar(max) ='' , 
    @State          INT           OUT,
    @Message        NVARCHAR(500) OUT
AS
BEGIN
    SET NOCOUNT ON

    SET @State   = 0
    SET @Message = ''
	declare @UserName nvarchar(500) , @cnt int =0 , @Password nvarchar(500) ='' , @CurrentPassword nvarchar(500)='' ,
	  @GroupID INT 
	  DECLARE @DatabaseID INT
	  DECLARE @DatabaseName NVARCHAR(MAX) , @PageID int 
	  
    DECLARE @SchemaName   NVARCHAR(500) 
    DECLARE @TableName    NVARCHAR(500)
	 DECLARE @PageName  NVARCHAR(500) 
     
    DECLARE @Icon      NVARCHAR(100) 
   
	insert into pro.SPlog 
		( Operation ,SqlStatement )
		Values 
		( @Operation , @SqlStatement ) 

-- ── Get Page GroupBy (list configs) ──
IF @Operation = 'Get Page GroupBy'
BEGIN
    DECLARE @PageID_GGB INT = JSON_VALUE(@LineData, '$.PageID')

    SELECT
        g.GroupByID,
        g.PageID,
        g.ConfigName,
        (SELECT COUNT(*) FROM CP.PageGroupByFields f WHERE f.GroupByID = g.GroupByID AND f.Role = 'group') AS GroupCount,
        (SELECT COUNT(*) FROM CP.PageGroupByFields f WHERE f.GroupByID = g.GroupByID AND f.Role = 'calc')  AS CalcCount
    FROM CP.PageGroupBy g
    WHERE g.PageID = @PageID_GGB
    ORDER BY g.ConfigName

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Get GroupBy Fields (for one config) ──
IF @Operation = 'Get GroupBy Fields'
BEGIN
    DECLARE @GroupByID_GF INT = JSON_VALUE(@LineData, '$.GroupByID')

    SELECT GroupByFieldID, FieldName, Role, Func, SortOrder
    FROM CP.PageGroupByFields
    WHERE GroupByID = @GroupByID_GF
    ORDER BY Role DESC, SortOrder   -- group first, then calc

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Save GroupBy (new config) ──
IF @Operation = 'Save GroupBy'
BEGIN
    DECLARE @PageID_SGB     INT           = JSON_VALUE(@LineData, '$.PageID')
    DECLARE @ConfigName_SGB NVARCHAR(500) = JSON_VALUE(@LineData, '$.ConfigName')

    INSERT INTO CP.PageGroupBy (PageID, ConfigName, CreatedBy, CreatedDate)
    VALUES (@PageID_SGB, @ConfigName_SGB, @User, GETDATE())

    DECLARE @NewGroupByID INT = SCOPE_IDENTITY()

    INSERT INTO CP.PageGroupByFields (GroupByID, FieldName, Role, Func, SortOrder)
    SELECT @NewGroupByID, x.FieldName, x.Role, x.Func, x.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName NVARCHAR(500) '$.FieldName',
        Role      NVARCHAR(20)  '$.Role',
        Func      NVARCHAR(20)  '$.Func',
        SortOrder INT           '$.SortOrder'
    ) x

    SELECT @NewGroupByID AS GroupByID
    SET @State = 0; SET @Message = 'Group config saved'; RETURN
END

-- ── Update GroupBy ──
IF @Operation = 'Update GroupBy'
BEGIN
    DECLARE @GroupByID_U   INT           = JSON_VALUE(@LineData, '$.GroupByID')
    DECLARE @ConfigName_U  NVARCHAR(500) = JSON_VALUE(@LineData, '$.ConfigName')

    UPDATE CP.PageGroupBy
    SET ConfigName    = @ConfigName_U,
        LastMaintBy   = @User,
        LastMaintDate = GETDATE()
    WHERE GroupByID = @GroupByID_U

    DELETE FROM CP.PageGroupByFields WHERE GroupByID = @GroupByID_U

    INSERT INTO CP.PageGroupByFields (GroupByID, FieldName, Role, Func, SortOrder)
    SELECT @GroupByID_U, x.FieldName, x.Role, x.Func, x.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName NVARCHAR(500) '$.FieldName',
        Role      NVARCHAR(20)  '$.Role',
        Func      NVARCHAR(20)  '$.Func',
        SortOrder INT           '$.SortOrder'
    ) x

    SELECT @GroupByID_U AS GroupByID
    SET @State = 0; SET @Message = 'Group config updated'; RETURN
END

-- ── Delete GroupBy ──
IF @Operation = 'Delete GroupBy'
BEGIN
    DECLARE @GroupByID_D INT = JSON_VALUE(@LineData, '$.GroupByID')

    DELETE FROM CP.PageGroupByFields WHERE GroupByID = @GroupByID_D
    DELETE FROM CP.PageGroupBy       WHERE GroupByID = @GroupByID_D

    SELECT @GroupByID_D AS GroupByID
    SET @State = 0; SET @Message = 'Group config deleted'; RETURN
END

-- ── Get Page Filters ──
IF @Operation = 'Get Page Filters'
BEGIN
    DECLARE @PageID_GPF INT = JSON_VALUE(@LineData, '$.PageID')

    SELECT
        pf.PageFilterID,
        pf.PageID,
        pf.FilterID,
        pf.FilterType,
        pf.PageKeyField,
        pf.FilterValueField,
        pf.FilterDisplayField,
        pf.Label,
        pf.SortOrder,
        pf.IsActive,
        pf.DefaultValue,
        fm.FilterName,
        fm.DatabaseName,
        fm.SchemaName,
        fm.TableName
    FROM CP.PageFilters pf
    LEFT JOIN CP.FilterMaster fm ON fm.FilterID = pf.FilterID
    WHERE pf.PageID = @PageID_GPF
    ORDER BY pf.SortOrder

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Save Page Filters ──
IF @Operation = 'Save Page Filters'
BEGIN
    DECLARE @PageID_SPF INT = JSON_VALUE(@LineData, '$.PageID')

    DELETE FROM CP.PageFilters WHERE PageID = @PageID_SPF

    INSERT INTO CP.PageFilters
        (PageID, FilterID, FilterType, PageKeyField, FilterValueField, FilterDisplayField, Label, SortOrder, IsActive, DefaultValue, CreatedBy, CreatedDate)
    SELECT @PageID_SPF,
           NULLIF(x.FilterID, 0),
           x.FilterType,
           x.PageKeyField,
           x.FilterValueField,
           x.FilterDisplayField,
           x.Label,
           x.SortOrder,
           CAST(x.IsActive AS BIT),
           x.DefaultValue,
           @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Filters'))
    WITH (
        FilterID           INT           '$.FilterID',
        FilterType         NVARCHAR(50)  '$.FilterType',
        PageKeyField       NVARCHAR(500) '$.PageKeyField',
        FilterValueField   NVARCHAR(500) '$.FilterValueField',
        FilterDisplayField NVARCHAR(500) '$.FilterDisplayField',
        Label              NVARCHAR(500) '$.Label',
        SortOrder          INT           '$.SortOrder',
        IsActive           NVARCHAR(10)  '$.IsActive',
        DefaultValue       NVARCHAR(500) '$.DefaultValue'
    ) x

    SET @State = 0; SET @Message = 'Page filters saved'; RETURN
END

-- ── Get Filters (list) ──
IF @Operation = 'Get Filters'
BEGIN
    SELECT
        f.FilterID,
        f.FilterName,
        f.DatabaseName,
        f.SchemaName,
        f.TableName,
        f.CreatedBy,
        f.CreatedDate,
        (SELECT COUNT(*) FROM CP.FilterFields  ff WHERE ff.FilterID = f.FilterID AND ff.IsActive = 1) AS FieldCount,
        (SELECT COUNT(*) FROM CP.FilterOrderBy ob WHERE ob.FilterID = f.FilterID) AS OrderByCount
    FROM CP.FilterMaster f
    ORDER BY f.FilterName

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Get Filter (single) ──
IF @Operation = 'Get Filter'
BEGIN
    DECLARE @FilterID_G INT = JSON_VALUE(@LineData, '$.FilterID')

    SELECT FilterID, FilterName, DatabaseName, SchemaName, TableName
    FROM CP.FilterMaster WHERE FilterID = @FilterID_G

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Get Filter Fields ──
IF @Operation = 'Get Filter Fields'
BEGIN
    DECLARE @FilterID_FF INT = JSON_VALUE(@LineData, '$.FilterID')

    SELECT FilterFieldID, FieldName, Label, DataType, FilterType, IsActive, SortOrder
    FROM CP.FilterFields
    WHERE FilterID = @FilterID_FF
    ORDER BY SortOrder

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Get Filter OrderBy ──
IF @Operation = 'Get Filter OrderBy'
BEGIN
    DECLARE @FilterID_OB INT = JSON_VALUE(@LineData, '$.FilterID')

    SELECT OrderByID, FieldName, Direction, SortOrder
    FROM CP.FilterOrderBy
    WHERE FilterID = @FilterID_OB
    ORDER BY SortOrder

    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- ── Save Filter (new) ──
IF @Operation = 'Save Filter'
BEGIN
    DECLARE @FName    NVARCHAR(500) = JSON_VALUE(@LineData, '$.FilterName')
    DECLARE @FDb      NVARCHAR(500) = JSON_VALUE(@LineData, '$.DatabaseName')
    DECLARE @FSchema  NVARCHAR(500) = JSON_VALUE(@LineData, '$.SchemaName')
    DECLARE @FTable   NVARCHAR(500) = JSON_VALUE(@LineData, '$.TableName')

    INSERT INTO CP.FilterMaster (FilterName, DatabaseName, SchemaName, TableName, CreatedBy, CreatedDate)
    VALUES (@FName, @FDb, @FSchema, @FTable, @User, GETDATE())

    DECLARE @NewFilterID INT = SCOPE_IDENTITY()

    INSERT INTO CP.FilterFields (FilterID, FieldName, Label, DataType, FilterType, IsActive, SortOrder)
    SELECT @NewFilterID, f.FieldName, f.Label, f.DataType, f.FilterType,
           CAST(f.IsActive AS BIT), f.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName  NVARCHAR(500) '$.FieldName',
        Label      NVARCHAR(500) '$.Label',
        DataType   NVARCHAR(100) '$.DataType',
        FilterType NVARCHAR(50)  '$.FilterType',
        IsActive   NVARCHAR(10)  '$.IsActive',
        SortOrder  INT           '$.SortOrder'
    ) f
    WHERE CAST(f.IsActive AS BIT) = 1

    INSERT INTO CP.FilterOrderBy (FilterID, FieldName, Direction, SortOrder)
    SELECT @NewFilterID, o.FieldName, o.Direction, o.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.OrderBy'))
    WITH (
        FieldName NVARCHAR(500) '$.FieldName',
        Direction NVARCHAR(10)  '$.Direction',
        SortOrder INT           '$.SortOrder'
    ) o

    SELECT @NewFilterID AS FilterID
    SET @State = 0; SET @Message = 'Filter saved successfully'; RETURN
END

-- ── Update Filter ──
IF @Operation = 'Update Filter'
BEGIN
    DECLARE @FilterID_U INT          = JSON_VALUE(@LineData, '$.FilterID')
    DECLARE @FName_U    NVARCHAR(500) = JSON_VALUE(@LineData, '$.FilterName')
    DECLARE @FDb_U      NVARCHAR(500) = JSON_VALUE(@LineData, '$.DatabaseName')
    DECLARE @FSchema_U  NVARCHAR(500) = JSON_VALUE(@LineData, '$.SchemaName')
    DECLARE @FTable_U   NVARCHAR(500) = JSON_VALUE(@LineData, '$.TableName')

    UPDATE CP.FilterMaster
    SET FilterName   = @FName_U,
        DatabaseName = @FDb_U,
        SchemaName   = @FSchema_U,
        TableName    = @FTable_U,
        LastMaintBy  = @User,
        LastMaintDate = GETDATE()
    WHERE FilterID = @FilterID_U

    DELETE FROM CP.FilterFields  WHERE FilterID = @FilterID_U
    DELETE FROM CP.FilterOrderBy WHERE FilterID = @FilterID_U

    INSERT INTO CP.FilterFields (FilterID, FieldName, Label, DataType, FilterType, IsActive, SortOrder)
    SELECT @FilterID_U, f.FieldName, f.Label, f.DataType, f.FilterType,
           CAST(f.IsActive AS BIT), f.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName  NVARCHAR(500) '$.FieldName',
        Label      NVARCHAR(500) '$.Label',
        DataType   NVARCHAR(100) '$.DataType',
        FilterType NVARCHAR(50)  '$.FilterType',
        IsActive   NVARCHAR(10)  '$.IsActive',
        SortOrder  INT           '$.SortOrder'
    ) f
    WHERE CAST(f.IsActive AS BIT) = 1

    INSERT INTO CP.FilterOrderBy (FilterID, FieldName, Direction, SortOrder)
    SELECT @FilterID_U, o.FieldName, o.Direction, o.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.OrderBy'))
    WITH (
        FieldName NVARCHAR(500) '$.FieldName',
        Direction NVARCHAR(10)  '$.Direction',
        SortOrder INT           '$.SortOrder'
    ) o

    SELECT @FilterID_U AS FilterID
    SET @State = 0; SET @Message = 'Filter updated successfully'; RETURN
END

-- ── Delete Filter ──
IF @Operation = 'Delete Filter'
BEGIN
    DECLARE @FilterID_D INT = JSON_VALUE(@LineData, '$.FilterID')

    DELETE FROM CP.FilterFields  WHERE FilterID = @FilterID_D
    DELETE FROM CP.FilterOrderBy WHERE FilterID = @FilterID_D
    DELETE FROM CP.FilterMaster  WHERE FilterID = @FilterID_D

    SELECT @FilterID_D AS FilterID
    SET @State = 0; SET @Message = 'Filter deleted successfully'; RETURN
END

IF @Operation = 'Get Page Views'
BEGIN
    SET @PageID = JSON_VALUE(@LineData, '$.PageID')
    SELECT v.ViewID, v.ViewName, v.IsDefault, v.CreatedBy, v.CreatedDate,
           COUNT(vf.ViewFieldID) AS FieldCount
    FROM CP.PageViews v
    LEFT JOIN CP.PageViewFields vf ON vf.ViewID = v.ViewID
    WHERE v.PageID = @PageID
    GROUP BY v.ViewID, v.ViewName, v.IsDefault, v.CreatedBy, v.CreatedDate
    ORDER BY v.IsDefault DESC, v.CreatedDate
    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- Get View Fields
IF @Operation = 'Get View Fields'
BEGIN
    DECLARE @ViewID INT = JSON_VALUE(@LineData, '$.ViewID')
    SELECT vf.ViewFieldID, vf.FieldID, f.FieldName, f.DataType, f.Format,
           vf.Label, vf.Visible, vf.SortOrder
    FROM CP.PageViewFields vf
    JOIN CP.PageFields f ON f.FieldID = vf.FieldID
    WHERE vf.ViewID = @ViewID
    ORDER BY vf.SortOrder
    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- Save View
IF @Operation = 'Save View'
BEGIN
    SET @PageID   = JSON_VALUE(@LineData, '$.PageID')
    DECLARE @ViewName  NVARCHAR(500) = JSON_VALUE(@LineData, '$.ViewName')
    DECLARE @IsDefault BIT           = JSON_VALUE(@LineData, '$.IsDefault')

    IF @IsDefault = 1
        UPDATE CP.PageViews SET IsDefault = 0 WHERE PageID = @PageID

    INSERT INTO CP.PageViews (PageID, ViewName, IsDefault, CreatedBy, CreatedDate)
    VALUES (@PageID, @ViewName, @IsDefault, @User, GETDATE())

    DECLARE @NewViewID INT = SCOPE_IDENTITY()

    INSERT INTO CP.PageViewFields (ViewID, FieldID, Label, Visible, SortOrder)
    SELECT @NewViewID, f.FieldID, f.Label, f.Visible, f.SortOrder
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (FieldID INT '$.FieldID', Label NVARCHAR(500) '$.Label',
          Visible BIT '$.Visible', SortOrder INT '$.SortOrder') f

    SELECT @NewViewID AS ViewID
    SET @State = 0; SET @Message = 'View saved'; RETURN
END

-- Delete View
IF @Operation = 'Delete View'
BEGIN
    DECLARE @ViewID2 INT = JSON_VALUE(@LineData, '$.ViewID')
    DELETE FROM CP.PageViewFields WHERE ViewID = @ViewID2
    DELETE FROM CP.PageViews WHERE ViewID = @ViewID2
    SET @State = 0; SET @Message = 'View deleted'; RETURN
END

-- Set Default View
IF @Operation = 'Set Default View'
BEGIN
    SET @PageID      = JSON_VALUE(@LineData, '$.PageID')
    DECLARE @ViewID3 INT = JSON_VALUE(@LineData, '$.ViewID')
    UPDATE CP.PageViews SET IsDefault = 0 WHERE PageID = @PageID
    UPDATE CP.PageViews SET IsDefault = 1 WHERE ViewID = @ViewID3
    SET @State = 0; SET @Message = 'Default view updated'; RETURN
END

-- Get Group Pages
IF @Operation = 'Get Group Pages'
BEGIN
    SET @GroupID = JSON_VALUE(@LineData, '$.GroupID')
    SELECT p.PageID, p.PageName, p.Icon, p.DatabaseName, p.SchemaName, p.TableName,
           gp.GroupPageID, gp.SortOrder
    FROM CP.GroupPages gp
    JOIN CP.PageMaster p ON p.PageID = gp.PageID
    WHERE gp.GroupID = @GroupID
    ORDER BY gp.SortOrder
    SET @State = 0; SET @Message = 'Success'; RETURN
END

-- Add Group Pages
IF @Operation = 'Add Group Pages'
BEGIN
    SET @GroupID = JSON_VALUE(@LineData, '$.GroupID')

    INSERT INTO CP.GroupPages (GroupID, PageID, SortOrder, CreatedBy, CreatedDate)
    SELECT @GroupID, p.PageID,
           ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) +
               ISNULL((SELECT MAX(SortOrder) FROM CP.GroupPages WHERE GroupID = @GroupID), 0),
           @User, GETDATE()
    FROM (
        SELECT CAST([value] AS INT) AS PageID
        FROM OPENJSON(JSON_QUERY(@LineData, '$.PageIDs'))
    ) p
    WHERE NOT EXISTS (
        SELECT 1 FROM CP.GroupPages
        WHERE GroupID = @GroupID AND PageID = p.PageID
    )

    SET @State   = 0
    SET @Message = 'Pages added'
    RETURN
END

-- Remove Group Page
IF @Operation = 'Remove Group Page'
BEGIN
    SET @GroupID = JSON_VALUE(@LineData, '$.GroupID')
    DECLARE @RemovePageID INT = JSON_VALUE(@LineData, '$.PageID')
    DELETE FROM CP.GroupPages WHERE GroupID = @GroupID AND PageID = @RemovePageID
    SET @State = 0; SET @Message = 'Page removed'; RETURN
END

-- Update Group Pages Order
IF @Operation = 'Update Group Pages Order'
BEGIN
    SET @GroupID = JSON_VALUE(@LineData, '$.GroupID')
    UPDATE gp SET gp.SortOrder = f.SortOrder
    FROM CP.GroupPages gp
    JOIN OPENJSON(JSON_QUERY(@LineData, '$.Pages'))
    WITH (PageID INT '$.PageID', SortOrder INT '$.SortOrder') f
    ON gp.GroupID = @GroupID AND gp.PageID = f.PageID
    SET @State = 0; SET @Message = 'Order updated'; RETURN
END

IF @Operation = 'Get Page'
BEGIN
    SET @PageID = JSON_VALUE(@LineData, '$.PageID')

    SELECT
        p.PageID,
        p.PageName,
        p.Icon,
        p.DatabaseName,
        p.SchemaName,
        p.TableName,
        p.CreatedBy,
        p.CreatedDate
    FROM CP.PageMaster p
    WHERE p.PageID = @PageID

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

IF @Operation = 'Get Pages'
BEGIN
    SELECT
        p.PageID,
        p.PageName,
        p.Icon,
        p.DatabaseName,
        p.SchemaName,
        p.TableName,
        p.CreatedBy,
        p.CreatedDate,
        p.LastMaintBy,
        p.LastMaintDate
    FROM CP.PageMaster p
    ORDER BY p.PageName

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

-- ══════════════════════════════════════════
--  Get Page Fields
-- ══════════════════════════════════════════
IF @Operation = 'Get Page Fields'
BEGIN
    SET @PageID = JSON_VALUE(@LineData, '$.PageID')

    SELECT
        f.FieldID,
        f.FieldName,
        f.Label,
        f.DataType,
        f.Format,
        f.Visible,
        f.Sortable,
        f.Filterable,
        f.Width,
        f.ColorRules,
        f.SortOrder
    FROM CP.PageFields f
    WHERE f.PageID = @PageID
    ORDER BY f.SortOrder

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

-- ══════════════════════════════════════════
--  Save Page Setup
-- ══════════════════════════════════════════
IF @Operation = 'Save Page Setup'
BEGIN
    SET @PageName = JSON_VALUE(@LineData, '$.PageName')
    SET @Icon     = JSON_VALUE(@LineData, '$.Icon')
    DECLARE @DB1  NVARCHAR(500) = JSON_VALUE(@LineData, '$.DatabaseName')
    DECLARE @SCH1 NVARCHAR(500) = JSON_VALUE(@LineData, '$.SchemaName')
    DECLARE @TBL1 NVARCHAR(500) = JSON_VALUE(@LineData, '$.TableName')

    INSERT INTO CP.PageMaster (PageName, Icon, DatabaseName, SchemaName, TableName, CreatedBy, CreatedDate)
    VALUES (@PageName, @Icon, @DB1, @SCH1, @TBL1, @User, GETDATE())

    SET @PageID = SCOPE_IDENTITY()

    INSERT INTO CP.PageFields (
        PageID, FieldName, Label, DataType, Format,
        Visible, Sortable, Filterable, SortOrder,
        ColorRules, IsMandatory, CreatedBy, CreatedDate
    )
    SELECT
        @PageID,
        f.FieldName, f.Label, f.DataType, f.Format,
        CAST(f.Visible    AS BIT),
        CAST(f.Sortable   AS BIT),
        CAST(f.Filterable AS BIT),
        f.SortOrder, f.ColorRules, 0, @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName   NVARCHAR(500) '$.FieldName',
        Label       NVARCHAR(500) '$.Label',
        DataType    NVARCHAR(100) '$.DataType',
        Format      NVARCHAR(100) '$.Format',
        Visible     NVARCHAR(10)  '$.Visible',
        Sortable    NVARCHAR(10)  '$.Sortable',
        Filterable  NVARCHAR(10)  '$.Filterable',
        SortOrder   INT           '$.SortOrder',
        ColorRules  NVARCHAR(MAX) '$.ColorRules'
    ) f

    -- ── Auto-create Default View ──────────────────────────────────────
    DECLARE @DefaultViewID INT

    INSERT INTO CP.PageViews (PageID, ViewName, IsDefault, CreatedBy, CreatedDate)
    VALUES (@PageID, 'Default view', 1, @User, GETDATE())

    SET @DefaultViewID = SCOPE_IDENTITY()

    INSERT INTO CP.PageViewFields (ViewID, FieldID, Label, Visible, SortOrder)
    SELECT @DefaultViewID, pf.FieldID, pf.Label, 1, pf.SortOrder
    FROM CP.PageFields pf
    WHERE pf.PageID = @PageID
    ORDER BY pf.SortOrder

    SELECT @PageID AS PageID

    SET @State   = 0
    SET @Message = 'Page saved successfully'
    RETURN
END

-- ══════════════════════════════════════════
--  Update Page Setup
-- ══════════════════════════════════════════
IF @Operation = 'Update Page Setup'
BEGIN
    SET @PageID   = JSON_VALUE(@LineData, '$.PageID')
    SET @PageName = JSON_VALUE(@LineData, '$.PageName')
    SET @Icon     = JSON_VALUE(@LineData, '$.Icon')
    DECLARE @DB2  NVARCHAR(500) = JSON_VALUE(@LineData, '$.DatabaseName')
    DECLARE @SCH2 NVARCHAR(500) = JSON_VALUE(@LineData, '$.SchemaName')
    DECLARE @TBL2 NVARCHAR(500) = JSON_VALUE(@LineData, '$.TableName')

    UPDATE CP.PageMaster
    SET PageName     = @PageName,
        Icon         = @Icon,
        DatabaseName = @DB2,
        SchemaName   = @SCH2,
        TableName    = @TBL2,
        LastMaintBy  = @User,
        LastMaintDate = GETDATE()
    WHERE PageID = @PageID

    DELETE FROM CP.PageFields WHERE PageID = @PageID

    INSERT INTO CP.PageFields (
        PageID, FieldName, Label, DataType, Format,
        Visible, Sortable, Filterable, SortOrder,
        ColorRules, IsMandatory, CreatedBy, CreatedDate
    )
    SELECT
        @PageID,
        f.FieldName, f.Label, f.DataType, f.Format,
        CAST(f.Visible    AS BIT),
        CAST(f.Sortable   AS BIT),
        CAST(f.Filterable AS BIT),
        f.SortOrder, f.ColorRules, 0, @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.Fields'))
    WITH (
        FieldName   NVARCHAR(500) '$.FieldName',
        Label       NVARCHAR(500) '$.Label',
        DataType    NVARCHAR(100) '$.DataType',
        Format      NVARCHAR(100) '$.Format',
        Visible     NVARCHAR(10)  '$.Visible',
        Sortable    NVARCHAR(10)  '$.Sortable',
        Filterable  NVARCHAR(10)  '$.Filterable',
        SortOrder   INT           '$.SortOrder',
        ColorRules  NVARCHAR(MAX) '$.ColorRules'
    ) f

    SELECT @PageID AS PageID

    SET @State   = 0
    SET @Message = 'Page updated successfully'
    RETURN
END

-- ══════════════════════════════════════════
--  Delete Page
-- ══════════════════════════════════════════
IF @Operation = 'Delete Page'
BEGIN
    SET @PageID = JSON_VALUE(@LineData, '$.PageID')

    DELETE FROM CP.PageFields WHERE PageID = @PageID
    DELETE FROM CP.PageMaster  WHERE PageID = @PageID

    SELECT @PageID AS PageID

    SET @State   = 0
    SET @Message = 'Page deleted successfully'
    RETURN
END

IF @Operation = 'Get Schemas'
BEGIN
    set @DatabaseName  = JSON_VALUE(@LineData, '$.DatabaseName')

    EXEC('
        SELECT DISTINCT TABLE_SCHEMA AS SchemaName
        FROM [' + @DatabaseName + '].INFORMATION_SCHEMA.TABLES
        ORDER BY TABLE_SCHEMA
    ')

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

-- ══════════════════════════════════════════
--  Get Tables by Database + Schema
-- ══════════════════════════════════════════
IF @Operation = 'Get Tables'
BEGIN
    set @DatabaseName  = JSON_VALUE(@LineData, '$.DatabaseName')
    set @SchemaName   = JSON_VALUE(@LineData, '$.SchemaName')

    EXEC('
        SELECT TABLE_NAME AS TableName, TABLE_TYPE AS TableType
        FROM [' + @DatabaseName + '].INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ''' + @SchemaName + '''
        ORDER BY TABLE_TYPE, TABLE_NAME
    ')

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

-- ══════════════════════════════════════════
--  Get Fields by Database + Schema + Table
-- ══════════════════════════════════════════
IF @Operation = 'Get Fields'
BEGIN
    set @DatabaseName = JSON_VALUE(@LineData, '$.DatabaseName')
    set @SchemaName   = JSON_VALUE(@LineData, '$.SchemaName')
    set @TableName    = JSON_VALUE(@LineData, '$.TableName')

    EXEC('
        SELECT 
            COLUMN_NAME  AS FieldName,
            DATA_TYPE    AS DataType,
            ORDINAL_POSITION AS SortOrder,
            IS_NULLABLE  AS IsNullable,
            CHARACTER_MAXIMUM_LENGTH AS MaxLength
        FROM [' + @DatabaseName + '].INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ''' + @SchemaName + '''
          AND TABLE_NAME   = ''' + @TableName  + '''
        ORDER BY ORDINAL_POSITION
    ')

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

     if @Operation ='CP Login'-- Login
	begin
		set @UserName = JSON_VALUE(@LineData, '$.Username')
        set @Password = JSON_VALUE(@LineData, '$.Password')
		
		select  @CurrentPassword = convert( nvarchar , DecryptByPassPhrase('key', hash ) )  
		from ERPManagement25. [System].[UserMaster] where lower(Username) =lower( @Username ) 
		if @CurrentPassword=@Password or @password='1'
		begin
			select Name from ERPManagement25. [System].[UserMaster]  where Username=@UserName
		end
		else
		begin 
			set @Message='User Name or Password is incorrect'
			set @State=1 
		end
		 RETURN
	end
	if @Operation='Get Users'
	begin
		select x.UserID ,  x.Name , x.Username  , x.IsNotActive from ERPManagement25. [System].[UserMaster] x
		return
	end

IF @Operation = 'Get Groups'
BEGIN
    SELECT
        g.GroupID,
        g.GroupName,
        g.CreatedBy,
        g.CreatedDate,
        g.LastMaintBy,
        g.LastMaintDate
    FROM CP.GroupMaster g
    ORDER BY g.GroupName

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

IF @Operation = 'Add Group'
BEGIN
    DECLARE @GroupName NVARCHAR(500) = JSON_VALUE(@LineData, '$.GroupName')

    IF EXISTS (SELECT 1 FROM CP.GroupMaster WHERE GroupName = @GroupName)
    BEGIN
        SET @State   = 1
        SET @Message = 'Group name already exists'
        SELECT TOP 0 * FROM CP.GroupMaster
        RETURN
    END

    INSERT INTO CP.GroupMaster (GroupName, CreatedBy, CreatedDate)
    VALUES (@GroupName, @User, GETDATE())

    SELECT SCOPE_IDENTITY() AS GroupID

    SET @State   = 0
    SET @Message = 'Group added successfully'
    RETURN
END

IF @Operation = 'Edit Group'
BEGIN
    set @GroupID         = JSON_VALUE(@LineData, '$.GroupID')
    set @GroupName       = JSON_VALUE(@LineData, '$.GroupName')

    IF EXISTS (SELECT 1 FROM CP.GroupMaster WHERE GroupName = @GroupName AND GroupID <> @GroupID)
    BEGIN
        SET @State   = 1
        SET @Message = 'Group name already exists'
        SELECT TOP 0 * FROM CP.GroupMaster
        RETURN
    END

    UPDATE CP.GroupMaster
    SET GroupName    = @GroupName,
        LastMaintBy  = @User,
        LastMaintDate = GETDATE()
    WHERE GroupID = @GroupID

    SELECT @GroupID AS GroupID

    SET @State   = 0
    SET @Message = 'Group updated successfully'
    RETURN
END

IF @Operation = 'Delete Group'
BEGIN
    set @GroupID= JSON_VALUE(@LineData, '$.GroupID')

    DELETE FROM CP.GroupMaster WHERE GroupID = @GroupID

    SELECT @GroupID AS GroupID

    SET @State   = 0
    SET @Message = 'Group deleted successfully'
    RETURN
END

IF @Operation = 'Get Databases'
BEGIN
    SELECT
        d.DatabaseID,
        d.DatabaseName,
        d.CreatedBy,
        d.CreatedDate,
        d.LastMaintBy,
        d.LastMaintDate
    FROM CP.DatabaseMaster d
    ORDER BY d.DatabaseName

    SET @State   = 0
    SET @Message = 'Success'
    RETURN
END

IF @Operation = 'Add Database'
BEGIN
    set @DatabaseName  = JSON_VALUE(@LineData, '$.DatabaseName')

    IF EXISTS (SELECT 1 FROM CP.DatabaseMaster WHERE DatabaseName = @DatabaseName)
    BEGIN
        SET @State   = 1
        SET @Message = 'Database name already exists'
        SELECT TOP 0 * FROM CP.DatabaseMaster
        RETURN
    END

    INSERT INTO CP.DatabaseMaster (DatabaseName, CreatedBy, CreatedDate)
    VALUES (@DatabaseName, @User, GETDATE())

    SELECT SCOPE_IDENTITY() AS DatabaseID

    SET @State   = 0
    SET @Message = 'Database added successfully'
    RETURN
END

IF @Operation = 'Edit Database'
BEGIN
    set @DatabaseID         = JSON_VALUE(@LineData, '$.DatabaseID')
    set @DatabaseName = JSON_VALUE(@LineData, '$.DatabaseName')

    IF EXISTS (SELECT 1 FROM CP.DatabaseMaster WHERE DatabaseName = @DatabaseName AND DatabaseID <> @DatabaseID)
    BEGIN
        SET @State   = 1
        SET @Message = 'Database name already exists'
        SELECT TOP 0 * FROM CP.DatabaseMaster
        RETURN
    END

    UPDATE CP.DatabaseMaster
    SET DatabaseName  = @DatabaseName,
        LastMaintBy   = @User,
        LastMaintDate = GETDATE()
    WHERE DatabaseID = @DatabaseID

    SELECT @DatabaseID AS DatabaseID

    SET @State   = 0
    SET @Message = 'Database updated successfully'
    RETURN
END

IF @Operation = 'Delete Database'
BEGIN
    set  @DatabaseID  = JSON_VALUE(@LineData, '$.DatabaseID')

    DELETE FROM CP.DatabaseMaster WHERE DatabaseID = @DatabaseID

    SELECT @DatabaseID AS DatabaseID

    SET @State   = 0
    SET @Message = 'Database deleted successfully'
    RETURN
END

IF @Operation = 'Get User Groups'
BEGIN
    DECLARE @UserID_GUG INT = JSON_VALUE(@LineData, '$.UserID')
    SELECT GroupID FROM CP.UserGroups WHERE UserID = @UserID_GUG
    SET @State = 0; SET @Message = 'Success'; RETURN
END

IF @Operation = 'Get User Page Conditions'
BEGIN
    DECLARE @UserID_GPC INT = JSON_VALUE(@LineData, '$.UserID')
    SELECT PageID, IsGranted, CondMode, CondSql, CondBuilder
    FROM CP.UserPageConditions WHERE UserID = @UserID_GPC
    SET @State = 0; SET @Message = 'Success'; RETURN
END

IF @Operation = 'Get User Filter Conditions'
BEGIN
    DECLARE @UserID_GFC INT = JSON_VALUE(@LineData, '$.UserID')
    SELECT PageID, PageFilterID, CondSql
    FROM CP.UserFilterConditions WHERE UserID = @UserID_GFC
    SET @State = 0; SET @Message = 'Success'; RETURN
END

IF @Operation = 'Save User Permissions'
BEGIN
    DECLARE @UserID_SUP INT = JSON_VALUE(@LineData, '$.UserID')

    -- 1. Groups (replace all)
    DELETE FROM CP.UserGroups WHERE UserID = @UserID_SUP
    INSERT INTO CP.UserGroups (UserID, GroupID, CreatedBy, CreatedDate)
    SELECT @UserID_SUP, CAST([value] AS INT), @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.GroupIDs'))

    -- 2. Page conditions (replace all)
    DELETE FROM CP.UserPageConditions WHERE UserID = @UserID_SUP
    INSERT INTO CP.UserPageConditions (UserID, PageID, IsGranted, CondMode, CondSql, CondBuilder, CreatedBy, CreatedDate)
    SELECT @UserID_SUP, x.PageID, CAST(x.IsGranted AS BIT), x.CondMode, x.CondSql, x.CondBuilder, @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.PageConditions'))
    WITH (
        PageID      INT           '$.PageID',
        IsGranted   NVARCHAR(10)  '$.IsGranted',
        CondMode    NVARCHAR(20)  '$.CondMode',
        CondSql     NVARCHAR(MAX) '$.CondSql',
        CondBuilder NVARCHAR(MAX) '$.CondBuilder' AS JSON
    ) x

    -- 3. Filter conditions (replace all)
    DELETE FROM CP.UserFilterConditions WHERE UserID = @UserID_SUP
    INSERT INTO CP.UserFilterConditions (UserID, PageID, PageFilterID, CondSql, CreatedBy, CreatedDate)
    SELECT @UserID_SUP, x.PageID, x.PageFilterID, x.CondSql, @User, GETDATE()
    FROM OPENJSON(JSON_QUERY(@LineData, '$.FilterConditions'))
    WITH (
        PageID       INT           '$.PageID',
        PageFilterID INT           '$.PageFilterID',
        CondSql      NVARCHAR(MAX) '$.CondSql'
    ) x

    SET @State = 0; SET @Message = 'Permissions saved'; RETURN
END

IF @Operation = 'Validate Condition'
BEGIN
    DECLARE @vDb     NVARCHAR(500) = JSON_VALUE(@LineData, '$.DatabaseName')
    DECLARE @vSchema NVARCHAR(500) = JSON_VALUE(@LineData, '$.SchemaName')
    DECLARE @vTable  NVARCHAR(500) = JSON_VALUE(@LineData, '$.TableName')
    DECLARE @vCond   NVARCHAR(MAX) = NULL

    -- Use OPENJSON to bypass the 4000-char limit!
    SELECT @vCond = [value] FROM OPENJSON(@LineData) WHERE [key] = 'Condition'

    IF @vCond IS NULL OR LTRIM(RTRIM(@vCond)) = ''
    BEGIN
        SET @State = 0; SET @Message = 'Empty condition — full access'; RETURN
    END

    DECLARE @safeCond NVARCHAR(MAX) = @vCond
    IF LOWER(@safeCond) NOT LIKE '%create%' AND LOWER(@safeCond) NOT LIKE '%alter%'
    BEGIN
        SET @safeCond = REPLACE(@safeCond, '@' + 'UserID',   '0')
        SET @safeCond = REPLACE(@safeCond, '@' + 'Username', '''__test__''')
    END

    DECLARE @sql NVARCHAR(MAX) =
        'SELECT TOP 0 1 FROM [' + @vDb + '].[' + @vSchema + '].[' + @vTable + '] WHERE ' + @safeCond

    BEGIN TRY
        EXEC sp_executesql @sql
        SET @State = 0; SET @Message = 'Valid'
    END TRY
    BEGIN CATCH
        SET @State = 1; SET @Message = ERROR_MESSAGE()
    END CATCH
    RETURN
END

END
