import { useState, useEffect } from "react";
import { useSession } from "../auth/useSession.jsx";
import { apiCall } from "../shared/api.js";
import DataGrid from "../shared/DataGrid.jsx";
import SearchDropdown from "../shared/SearchDropdown.jsx";

const badgeStyle = (val) => {
  const v = String(val ?? "").toLowerCase();
  if (v === "active" || v === "paid" || v === "good") return { background: "var(--green-soft)", color: "var(--green)" };
  if (v === "inactive" || v === "bad" || v === "overdue" || v === "unpaid" || v === "cancelled") return { background: "var(--red-soft)", color: "var(--red)" };
  if (v === "pending" || v === "warn" || v === "sent") return { background: "var(--amber-soft)", color: "var(--amber)" };
  return { background: "var(--blue-soft)", color: "var(--blue)" };
};

const MOCK_CONFIGS = {
  Customers: {
    columns: [
      { key: "CustomerID", label: "ID", numeric: false },
      { key: "CustomerName", label: "Customer Name", numeric: false },
      { key: "ContactName", label: "Contact Name", numeric: false },
      { key: "Country", label: "Country", numeric: false },
      { key: "Balance", label: "Balance", numeric: true, SummaryMode: "sum" },
      { key: "Status", label: "Status", numeric: false, render: (v) => <span className="dg-badge" style={badgeStyle(v)}>{v}</span> },
    ],
    filters: [
      { FilterCode: "Country", DisplayName: "Country", FilterType: "dropdown", SourceOptions: ["USA", "UK", "Egypt", "UAE"] },
      { FilterCode: "Status", DisplayName: "Status", FilterType: "dropdown", SourceOptions: ["Active", "Inactive"] },
    ],
    views: [
      { ViewID: 101, ViewName: "Minimal View" },
      { ViewID: 102, ViewName: "Contact Directory" },
    ],
    viewFields: [
      { ViewID: 101, FieldID: 1, key: "CustomerName", SortOrder: 1 },
      { ViewID: 101, FieldID: 2, key: "Balance", SortOrder: 2 },
      { ViewID: 102, FieldID: 1, key: "CustomerName", SortOrder: 1 },
      { ViewID: 102, FieldID: 2, key: "ContactName", SortOrder: 2 },
      { ViewID: 102, FieldID: 3, key: "Country", SortOrder: 3 },
      { ViewID: 102, FieldID: 4, key: "Status", SortOrder: 4 },
    ],
    groupBys: [
      { GroupByID: 201, key: "Country", label: "Group by Country" },
      { GroupByID: 202, key: "Status", label: "Group by Status" },
    ],
    rows: [
      { CustomerID: 1, CustomerName: "Acme Corporation", ContactName: "John Doe", Country: "USA", Balance: 4500.00, Status: "Active" },
      { CustomerID: 2, CustomerName: "Global Trade Ltd", ContactName: "Sara Smith", Country: "UK", Balance: 12300.50, Status: "Active" },
      { CustomerID: 3, CustomerName: "Sila Systems LLC", ContactName: "Ali Malkholy", Country: "Egypt", Balance: 0.00, Status: "Active" },
      { CustomerID: 4, CustomerName: "Delta Distributors", ContactName: "David Vane", Country: "USA", Balance: -120.00, Status: "Active" },
      { CustomerID: 5, CustomerName: "Omega Ventures", ContactName: "Mona Taha", Country: "UAE", Balance: 8750.20, Status: "Inactive" },
    ]
  },
  Items: {
    columns: [
      { key: "ItemID", label: "ID", numeric: false },
      { key: "ItemName", label: "Product Name", numeric: false },
      { key: "Category", label: "Category", numeric: false },
      { key: "Price", label: "Price", numeric: true, SummaryMode: "avg" },
      { key: "StockQty", label: "In Stock", numeric: true, SummaryMode: "sum" },
      { key: "Status", label: "Status", numeric: false, render: (v) => <span className="dg-badge" style={badgeStyle(v)}>{v}</span> },
    ],
    filters: [
      { FilterCode: "Category", DisplayName: "Category", FilterType: "dropdown", SourceOptions: ["Electronics", "Furniture", "Apparel"] },
    ],
    views: [],
    viewFields: [],
    groupBys: [
      { GroupByID: 203, key: "Category", label: "Group by Category" }
    ],
    rows: [
      { ItemID: 1, ItemName: "Vite Laptop Pro", Category: "Electronics", Price: 1299.99, StockQty: 45, Status: "Active" },
      { ItemID: 2, ItemName: "Mechanical Keyboard", Category: "Electronics", Price: 89.50, StockQty: 120, Status: "Active" },
      { ItemID: 3, ItemName: "Ergonomic Office Chair", Category: "Furniture", Price: 249.00, StockQty: 15, Status: "Active" },
      { ItemID: 4, ItemName: "Type-C Fast Charger", Category: "Electronics", Price: 19.99, StockQty: 500, Status: "Active" },
      { ItemID: 5, ItemName: "Leather Notebook Set", Category: "Apparel", Price: 35.00, StockQty: 60, Status: "Active" },
    ]
  },
  SalesOrders: {
    columns: [
      { key: "OrderID", label: "Order #", numeric: false },
      { key: "CustomerName", label: "Customer", numeric: false },
      { key: "OrderDate", label: "Date", numeric: false },
      { key: "TotalAmount", label: "Order Total", numeric: true, SummaryMode: "sum" },
      { key: "PaymentStatus", label: "Status", numeric: false, render: (v) => <span className="dg-badge" style={badgeStyle(v)}>{v}</span> },
    ],
    filters: [
      { FilterCode: "PaymentStatus", DisplayName: "Payment Status", FilterType: "dropdown", SourceOptions: ["Paid", "Pending", "Overdue"] },
    ],
    views: [],
    viewFields: [],
    groupBys: [
      { GroupByID: 204, key: "PaymentStatus", label: "Group by Status" }
    ],
    rows: [
      { OrderID: 1001, CustomerName: "Acme Corporation", OrderDate: "2026-06-01", TotalAmount: 250.00, PaymentStatus: "Paid" },
      { OrderID: 1002, CustomerName: "Global Trade Ltd", OrderDate: "2026-06-10", TotalAmount: 12300.50, PaymentStatus: "Pending" },
      { OrderID: 1003, CustomerName: "Delta Distributors", OrderDate: "2026-06-12", TotalAmount: 19.99, PaymentStatus: "Paid" },
      { OrderID: 1004, CustomerName: "Sila Systems LLC", OrderDate: "2026-06-13", TotalAmount: 850.00, PaymentStatus: "Overdue" },
    ]
  },
  Invoices: {
    columns: [
      { key: "InvoiceID", label: "Invoice #", numeric: false },
      { key: "OrderID", label: "Order #", numeric: false },
      { key: "InvoiceDate", label: "Date", numeric: false },
      { key: "Amount", label: "Amount Due", numeric: true, SummaryMode: "sum" },
      { key: "Status", label: "Status", numeric: false, render: (v) => <span className="dg-badge" style={badgeStyle(v)}>{v}</span> },
    ],
    filters: [
      { FilterCode: "Status", DisplayName: "Invoice Status", FilterType: "dropdown", SourceOptions: ["Paid", "Sent", "Unpaid", "Draft"] },
    ],
    views: [],
    viewFields: [],
    groupBys: [
      { GroupByID: 205, key: "Status", label: "Group by Status" }
    ],
    rows: [
      { InvoiceID: 5001, OrderID: 1001, InvoiceDate: "2026-06-01", Amount: 250.00, Status: "Paid" },
      { InvoiceID: 5002, OrderID: 1003, InvoiceDate: "2026-06-12", Amount: 19.99, Status: "Paid" },
      { InvoiceID: 5003, OrderID: 1002, InvoiceDate: "2026-06-10", Amount: 6000.00, Status: "Sent" },
      { InvoiceID: 5004, OrderID: 1004, InvoiceDate: "2026-06-13", Amount: 850.00, Status: "Unpaid" },
    ]
  }
};

const PAGE_CSS = `
.erp-page-layout { display: flex; gap: 24px; position: relative; }
.erp-page-main { flex: 1; min-width: 0; }
.erp-panel-toggle-tab { position: fixed; right: 0; top: 120px; z-index: 29; background: var(--primary); color: #fff; border: 0; border-radius: 12px 0 0 12px; padding: 12px 14px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; box-shadow: var(--shadow); display: flex; align-items: center; gap: 6px; transition: background 0.15s; }
.erp-panel-toggle-tab:hover { background: var(--primary-dark); }
.erp-right-panel { width: 280px; flex-shrink: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 20px; box-shadow: var(--shadow); display: flex; flex-direction: column; transition: all 0.2s ease-in-out; }
.erp-right-panel.collapsed { width: 0; opacity: 0; padding: 0; margin-left: -24px; border: 0; pointer-events: none; }
.erp-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
.erp-panel-header h3 { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
.erp-panel-close-btn { background: none; border: 0; color: var(--primary); font-weight: 900; font-size: 12px; cursor: pointer; }
.erp-panel-close-btn:hover { color: var(--primary-dark); }
.erp-panel-scroll { display: flex; flex-direction: column; gap: 20px; }
.erp-panel-section { display: flex; flex-direction: column; gap: 12px; }
.erp-panel-section h4 { font-size: 11px; font-weight: 900; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); padding-bottom: 4px; }
.erp-section-header { display: flex; justify-content: space-between; align-items: center; }
.erp-section-clear-btn { background: none; border: 0; color: var(--red); font-weight: 850; font-size: 11px; cursor: pointer; }
.erp-section-clear-btn:hover { text-decoration: underline; }
.erp-panel-fields { display: flex; flex-direction: column; gap: 12px; }
.erp-panel-field { display: flex; flex-direction: column; gap: 6px; }
.erp-panel-field label { font-size: 11px; font-weight: 850; color: var(--muted); text-transform: uppercase; }
.erp-panel-field input { height: 42px; border: 1px solid var(--border); border-radius: 12px; padding: 0 12px; font-size: 13px; font-weight: 700; outline: none; background: var(--soft); }
.erp-panel-field input:focus { border-color: var(--primary); }
.erp-columns-list { display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 4px; }
.erp-columns-list::-webkit-scrollbar { width: 4px; }
.erp-columns-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
.erp-col-checkbox { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; cursor: pointer; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--soft); transition: all 0.1s; }
.erp-col-checkbox:hover { border-color: var(--primary); }
.erp-col-checkbox input { width: 16px; height: 16px; cursor: pointer; }
`;

function injectPageCSS() {
  if (document.getElementById("erp-page-css")) return;
  const s = document.createElement("style");
  s.id = "erp-page-css";
  s.textContent = PAGE_CSS;
  document.head.appendChild(s);
}

export default function DynamicPage({ pageID, pageName }) {
  injectPageCSS();
  const { session } = useSession();
  const [baseColumns, setBaseColumns] = useState([]);
  const [columns, setColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [rows, setRows] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  const [dropdownOptions, setDropdownOptions] = useState({});
  
  // Views and Group-bys
  const [views, setViews] = useState([]);
  const [viewFields, setViewFields] = useState([]);
  const [groupBys, setGroupBys] = useState([]);
  const [activeViewID, setActiveViewID] = useState("");
  const [activeGroupByKey, setActiveGroupByKey] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState({});

  const isLiveMode = session?.Pages && session.Pages.length > 0;

  useEffect(() => {
    if (baseColumns.length > 0) {
      setVisibleColumns(prev => {
        const next = { ...prev };
        baseColumns.forEach(col => {
          if (next[col.key] === undefined) {
            next[col.key] = true;
          }
        });
        return next;
      });
    }
  }, [baseColumns]);

  const displayedColumns = columns.filter(col => visibleColumns[col.key] !== false);

  useEffect(() => {
    loadPageSetup();
  }, [pageID]);

  // Handle column arrangements when view changes
  useEffect(() => {
    if (baseColumns.length === 0) return;
    
    if (activeViewID) {
      const activeFields = viewFields.filter(vf => String(vf.ViewID) === String(activeViewID));
      if (activeFields.length > 0) {
        // Sort and select configured view fields
        const sortedFields = [...activeFields].sort((a, b) => a.SortOrder - b.SortOrder);
        const viewCols = sortedFields
          .map(vf => baseColumns.find(bc => bc.key === vf.key))
          .filter(Boolean);
        setColumns(viewCols);
      } else {
        setColumns(baseColumns);
      }
    } else {
      setColumns(baseColumns);
    }
  }, [activeViewID, baseColumns, viewFields]);

  // Trigger grid data loading
  useEffect(() => {
    if (baseColumns.length > 0) {
      loadGridRows();
    }
  }, [baseColumns, filterValues, activeGroupByKey]);

  // Load Columns, Filters, Views, and Group-bys configurations
  async function loadPageSetup() {
    setLoading(true);
    // Reset view/group configs
    setActiveViewID("");
    setActiveGroupByKey("");
    setViews([]);
    setViewFields([]);
    setGroupBys([]);

    try {
      if (isLiveMode) {
        const res = await apiCall("Get Page Info", { PageID: pageID });
        if (res.state === 0 || res.State === 0) {
          // Columns (List0)
          const mappedCols = (res.List0 || []).map(col => ({
            key: col.key,
            label: col.label,
            numeric: col.Format === "number",
            SummaryMode: "none",
            render: col.DataType === "badge" ? (v) => <span className="dg-badge" style={badgeStyle(v)}>{v}</span> : undefined
          }));
          setBaseColumns(mappedCols);
          setColumns(mappedCols);

          // Filters (List1)
          const mappedFilters = res.List1 || [];
          setFilters(mappedFilters);

          // Group By (List2)
          setGroupBys(res.List2 || []);

          // Views (List3)
          setViews(res.List3 || []);

          // View Fields (List4)
          setViewFields(res.List4 || []);

          // Initialize filter inputs
          const initVals = {};
          mappedFilters.forEach(f => { initVals[f.key] = "" });
          setFilterValues(initVals);

          // Fetch dropdown options for dropdown filters
          mappedFilters.forEach(f => {
            if (f.FilterType === "dropdown") {
              loadDropdownOpts(f.key, f.FilterID);
            }
          });
        }
      } else {
        // Fallback Mock Configs
        const mock = MOCK_CONFIGS[pageID] || { columns: [], filters: [], rows: [], views: [], viewFields: [], groupBys: [] };
        setBaseColumns(mock.columns);
        setColumns(mock.columns);
        setFilters(mock.filters);
        setViews(mock.views);
        setViewFields(mock.viewFields);
        setGroupBys(mock.groupBys);
        
        const initVals = {};
        mock.filters.forEach(f => { initVals[f.FilterCode] = "" });
        setFilterValues(initVals);

        // Map mock options
        const opts = {};
        mock.filters.forEach(f => {
          if (f.SourceOptions) {
            opts[f.FilterCode] = f.SourceOptions.map(o => ({ value: o, label: o }));
          }
        });
        setDropdownOptions(opts);
      }
    } catch (e) {
      console.error("Failed to load page setup:", e);
    } finally {
      setLoading(false);
    }
  }

  // Fetch dropdown lookup options generically
  async function loadDropdownOpts(filterCode, filterID) {
    try {
      const res = await apiCall("Get Filter Options", { FilterID: filterID });
      if (res.state === 0 || res.State === 0) {
        setDropdownOptions(prev => ({
          ...prev,
          [filterCode]: res.List0 || []
        }));
      }
    } catch (e) {
      console.error(`Failed to load options for ${filterCode}:`, e);
    }
  }

  // Load grid rows matching active filters & group-bys
  async function loadGridRows() {
    setLoading(true);
    try {
      if (isLiveMode) {
        const payload = { PageID: pageID, UserID: session.UserID, ...filterValues };
        const res = await apiCall("Get Page Data", payload);
        if (res.state === 0 || res.State === 0) {
          let dbRows = res.List0 || [];
          if (activeGroupByKey) {
            dbRows = groupRowsLocal(dbRows, activeGroupByKey);
          }
          setRows(dbRows);
        }
      } else {
        // Fallback Mock Rows filtering
        const mock = MOCK_CONFIGS[pageID] || { rows: [] };
        let filtered = mock.rows;

        // Apply active dropdown filters locally
        Object.entries(filterValues).forEach(([col, val]) => {
          if (val) {
            filtered = filtered.filter(row => String(row[col] ?? "") === val);
          }
        });

        // Apply dynamic group aggregation locally
        if (activeGroupByKey) {
          filtered = groupRowsLocal(filtered, activeGroupByKey);
        }
        setRows(filtered);
      }
    } catch (e) {
      console.error("Failed to load grid rows:", e);
    } finally {
      setLoading(false);
    }
  }

  // Generic client-side row grouping and numeric aggregation
  function groupRowsLocal(srcRows, groupKey) {
    const groups = {};
    srcRows.forEach(r => {
      const val = r[groupKey] ?? "(blank)";
      if (!groups[val]) {
        groups[val] = {
          _isGroupHeader: true,
          [groupKey]: val,
          _count: 0
        };
        // Initialize numeric fields to 0
        baseColumns.forEach(col => {
          if (col.numeric) {
            groups[val][col.key] = 0;
          }
        });
      }
      groups[val]._count += 1;
      // Accumulate numeric totals
      baseColumns.forEach(col => {
        if (col.numeric) {
          const rval = r[col.key];
          if (typeof rval === "number") {
            groups[val][col.key] += rval;
          } else if (typeof rval === "string" && !isNaN(rval) && rval.trim() !== "") {
            groups[val][col.key] += Number(rval);
          }
        }
      });
    });

    return Object.values(groups).map(g => {
      // Calculate averages if necessary
      baseColumns.forEach(col => {
        if (col.numeric && col.SummaryMode === "avg" && g._count > 0) {
          g[col.key] = Number((g[col.key] / g._count).toFixed(2));
        }
      });
      // Append row count to the grouped column text
      g[groupKey] = `${g[groupKey]} (${g._count} records)`;
      return g;
    });
  }

  function handleFilterChange(filterKey, val) {
    setFilterValues(prev => ({
      ...prev,
      [filterKey]: val
    }));
  }

  function clearFilters() {
    const cleared = {};
    filters.forEach(f => { 
      const filterKey = isLiveMode ? f.key : f.FilterCode;
      cleared[filterKey] = ""; 
    });
    setFilterValues(cleared);
  }

  return (
    <div className="erp-page-layout">
      {/* Main Grid Area */}
      <div className="erp-page-main">
        {!panelOpen && (
          <button className="erp-panel-toggle-tab" onClick={() => setPanelOpen(true)}>
            🔍 Filters & Columns
          </button>
        )}
        <DataGrid
          title={pageName}
          subtitle={isLiveMode ? "Live database config" : "Sandbox mock environment"}
          columns={displayedColumns}
          rows={rows}
          loading={loading}
          onRefresh={loadGridRows}
        />
      </div>

      {/* Right Control Panel */}
      <aside className={`erp-right-panel ${panelOpen ? "open" : "collapsed"}`}>
        <div className="erp-panel-header">
          <h3>Control Panel</h3>
          <button className="erp-panel-close-btn" onClick={() => setPanelOpen(false)}>
            Hide Panel →
          </button>
        </div>

        <div className="erp-panel-scroll">
          {/* View & Group-By configuration */}
          {(views.length > 0 || groupBys.length > 0) && (
            <div className="erp-panel-section">
              <h4>Layout Options</h4>
              {views.length > 0 && (
                <div className="erp-panel-field">
                  <label>Arrangement View</label>
                  <SearchDropdown
                    value={activeViewID}
                    onChange={setActiveViewID}
                    options={views.map(v => ({ value: String(v.ViewID), label: v.ViewName }))}
                    placeholder="— Default Columns —"
                  />
                </div>
              )}

              {groupBys.length > 0 && (
                <div className="erp-panel-field">
                  <label>Group By Summary</label>
                  <SearchDropdown
                    value={activeGroupByKey}
                    onChange={setActiveGroupByKey}
                    options={groupBys.map(g => ({ value: g.key, label: g.label }))}
                    placeholder="— Raw Records —"
                  />
                </div>
              )}
            </div>
          )}

          {/* Filters section */}
          {filters.length > 0 && (
            <div className="erp-panel-section">
              <div className="erp-section-header">
                <h4>Filters</h4>
                <button className="erp-section-clear-btn" onClick={clearFilters}>✕ Reset</button>
              </div>
              <div className="erp-panel-fields">
                {filters.map(filter => {
                  const filterKey = isLiveMode ? filter.key : filter.FilterCode;
                  const filterLabel = isLiveMode ? filter.label : filter.DisplayName;
                  const opts = dropdownOptions[filterKey] || [];
                  return (
                    <div key={filterKey} className="erp-panel-field">
                      <label>{filterLabel}</label>
                      {filter.FilterType === "dropdown" ? (
                        <SearchDropdown
                          value={filterValues[filterKey] || ""}
                          onChange={(val) => handleFilterChange(filterKey, val)}
                          options={opts}
                          placeholder={`Filter by ${filterLabel}`}
                        />
                      ) : (
                        <input
                          type={filter.FilterType === "date" ? "date" : "text"}
                          value={filterValues[filterKey] || ""}
                          onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Display Fields Section */}
          <div className="erp-panel-section">
            <h4>Display Columns</h4>
            <div className="erp-columns-list">
              {columns.map(col => (
                <label key={col.key} className="erp-col-checkbox">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key] !== false}
                    onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col.key]: e.target.checked }))}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
