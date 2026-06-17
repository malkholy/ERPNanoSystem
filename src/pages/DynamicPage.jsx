import { useState, useEffect } from "react";
import { apiCall } from "../shared/api.js";
import DataGrid from "../shared/DataGrid.jsx";
import SearchDropdown from "../shared/SearchDropdown.jsx";

/*
 * DynamicPage — runtime renderer for ERP Nano pages.
 *
 * Load sequence, all via APIERPOperation:
 *   Step 1. Get Page Info  -> List0 columns, List1 filters, List2 groupby, List3 views, List4 view-fields
 *   Step 2. Get Filter Data with FilterID -> dropdown options for each datalist filter where FilterID > 0
 *   Step 3. Get Page Data with PageID + LineFilter -> grid rows
 *
 * Backend contract for List1 filters — each row MUST provide:
 *   key                = PageKeyField, the REAL table column used to filter
 *   FilterType         = date | datalist | datalist_range | date_range
 *   DefaultValue       = blank | Today | Yesterday | Month Began | literal
 *   FilterValueField   = lookup value column for dropdown options
 *   FilterDisplayField = lookup display column for dropdown options
 *   FilterID           = greater than 0 for datalist with lookup, 0 for date with no lookup
 */
const badgeStyle = (val) => {
  const v = String(val ?? "").toLowerCase();
  if (v === "active" || v === "paid" || v === "good") return { background: "var(--green-soft)", color: "var(--green)" };
  if (v === "inactive" || v === "bad" || v === "overdue" || v === "unpaid" || v === "cancelled") return { background: "var(--red-soft)", color: "var(--red)" };
  if (v === "pending" || v === "warn" || v === "sent") return { background: "var(--amber-soft)", color: "var(--amber)" };
  return { background: "var(--blue-soft)", color: "var(--blue)" };
};

const PAGE_CSS = `
.erp-page-layout { display: block; position: relative; }
.erp-page-main { width: 100%; }
.erp-accordion-container { border-bottom: 1px solid var(--border); }
.erp-accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: var(--surface); border-bottom: 1px solid var(--border); }
.erp-accordion-tabs { display: flex; gap: 10px; flex-wrap: wrap; }
.erp-accordion-tab { display: inline-flex; align-items: center; gap: 8px; height: 34px; border: 1px solid var(--border); background: var(--surface); border-radius: 99px; padding: 0 16px; font-weight: 800; font-size: 12.5px; cursor: pointer; color: var(--text); transition: all 0.15s ease; }
.erp-accordion-tab:hover { border-color: var(--primary); background: var(--soft); }
.erp-accordion-chevron { width: 32px; height: 32px; border: 1px solid var(--border); background: var(--surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; font-weight: 900; color: var(--muted); transition: all 0.15s; }
.erp-accordion-chevron:hover { border-color: var(--primary); color: var(--primary); background: var(--soft); }
.erp-accordion-body { background: #f8fafc; border-bottom: 1px solid var(--border); padding: 20px 24px; transition: all 0.2s ease-in-out; }
.erp-section-title { font-size: 11px; font-weight: 900; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; display: block; }
.erp-filters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px 20px; margin-bottom: 20px; }
.erp-filter-item { display: flex; flex-direction: column; gap: 6px; }
.erp-filter-item label { font-size: 11.5px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
.erp-filter-item input, .erp-filter-item select { height: 38px; border: 1px solid var(--border); border-radius: 10px; padding: 0 12px; font-size: 13px; font-weight: 750; outline: none; background: var(--surface); color: var(--text); transition: all 0.15s; }
.erp-filter-item input::placeholder { color: var(--muted); font-weight: 500; }
.erp-filter-item input:focus, .erp-filter-item select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
.erp-options-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 20px; }
.erp-options-fields { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.erp-col-dropdown-btn { height: 38px; border: 1px solid var(--border); background: var(--surface); border-radius: 10px; padding: 0 14px; font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; justify-content: space-between; min-width: 160px; text-align: left; transition: all 0.15s; }
.erp-col-dropdown-btn:hover { border-color: var(--primary); }
.erp-col-dropdown-menu { position: absolute; top: calc(100% + 6px); left: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow); z-index: 1000; padding: 10px; min-width: 200px; max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.erp-col-dropdown-item { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 800; padding: 8px 10px; border-radius: 8px; cursor: pointer; transition: background 0.1s; color: var(--text); }
.erp-col-dropdown-item:hover { background: var(--soft); }
.erp-dropdown-backdrop { position: fixed; inset: 0; z-index: 999; background: transparent; }
.erp-action-btns { display: flex; gap: 10px; }
.erp-btn-reset { height: 38px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 10px; padding: 0 16px; font-weight: 900; font-size: 13px; cursor: pointer; transition: all 0.15s; }
.erp-btn-reset:hover { border-color: var(--muted); color: var(--text); background: var(--soft); }
.erp-btn-apply { height: 38px; border: 0; background: var(--primary); color: #fff; border-radius: 10px; padding: 0 18px; font-weight: 900; font-size: 13px; cursor: pointer; transition: all 0.15s; box-shadow: 0 2px 8px var(--primary-soft); }
.erp-btn-apply:hover { background: var(--primary-dark); transform: translateY(-1px); }
`;

function injectPageCSS() {
  if (document.getElementById("erp-page-css-v2")) return;
  const s = document.createElement("style");
  s.id = "erp-page-css-v2";
  s.textContent = PAGE_CSS;
  document.head.appendChild(s);
}

function resolveDateDefault(val) {
  if (!val) return "";
  const d = new Date();
  const fmt = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const r = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${r}`;
  };
  const v = val.toLowerCase().trim();
  if (v === "today") return fmt(d);
  if (v === "yesterday") {
    d.setDate(d.getDate() - 1);
    return fmt(d);
  }
  if (v === "last week") {
    d.setDate(d.getDate() - 7);
    return fmt(d);
  }
  if (v === "month began") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  if (v === "last month") {
    let m = d.getMonth() - 1;
    let y = d.getFullYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    return `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  if (v === "year began") {
    return `${d.getFullYear()}-01-01`;
  }
  // already ISO YYYY-MM-DD ? keep as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // otherwise try to parse a real date string (handles ISO datetime, MM/DD/YYYY, etc.)
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) return fmt(parsed);
  return val;
}

export default function DynamicPage({ pageID, pageName, onBack }) {
  injectPageCSS();
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
  const [colDropdownOpen, setColDropdownOpen] = useState(false);

  const UserID = sessionStorage.getItem('UserID') || '1';

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
          .map(vf => baseColumns.find(bc => bc.key === (vf.FieldName || vf.key)))
          .filter(Boolean);
        setColumns(viewCols);
      } else {
        setColumns(baseColumns);
      }
    } else {
      setColumns(baseColumns);
    }
  }, [activeViewID, baseColumns, viewFields]);

  // Trigger grid data loading initially
  useEffect(() => {
    if (baseColumns.length > 0) {
      loadGridRows();
    }
  }, [baseColumns]);

  // Load Columns, Filters, Views, and Group-bys configurations
  async function loadPageSetup() {
    setLoading(true);
    setBaseColumns([]);
    setColumns([]);
    setFilterValues({});
    setActiveViewID("");
    setActiveGroupByKey("");
    setViews([]);
    setViewFields([]);
    setGroupBys([]);

    try {
      // ── STEP 1: Get Page Info — columns, filters, views, groupbys ──
      const res = await apiCall("Get Page Info", { PageID: pageID }, { Sp_Name: "APIERPOperation" });
      if (res.state === 0 || res.State === 0) {
        // Filters (List1)
        const mappedFilters = res.List1 || [];
        setFilters(mappedFilters);

        // Group By (List2)
        setGroupBys(res.List2 || []);

        // Views (List3)
        setViews(res.List3 || []);

        // View Fields (List4)
        setViewFields(res.List4 || []);

        // Initialize filter inputs (apply defaults; resolve date tokens like "Today")
        const initVals = {};
        mappedFilters.forEach(f => {
          const isDate = f.FilterType && (
            f.FilterType.toLowerCase().includes("date") ||
            f.FilterType.toLowerCase().includes("datetime")
          );
          const isRange = f.FilterType && (
            f.FilterType.toLowerCase().includes("range") ||
            f.FilterType.toLowerCase().includes("from-to") ||
            f.FilterType.toLowerCase().includes("from_to")
          );
          const def = f.DefaultValue || "";
          const resolvedVal = isDate ? resolveDateDefault(def) : def;
          
          if (isRange) {
            initVals[`${f.key}_From`] = resolvedVal;
            initVals[`${f.key}_To`] = "";
          } else {
            initVals[f.key] = resolvedVal;
          }
        });
        setFilterValues(initVals);

        // ── STEP 2: Get Filter Data — fill each datalist dropdown ──
        mappedFilters.forEach(f => {
          const isDropdown = f.FilterType && (
            f.FilterType.toLowerCase().includes("dropdown") ||
            f.FilterType.toLowerCase().includes("datalist")
          );
          if (isDropdown) {
            loadDropdownOpts(f.key, f.FilterID, f.FilterValueField, f.FilterDisplayField);
          }
        });

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
        // ── STEP 3: Get Page Data — auto-fires via the baseColumns useEffect ──
      }
    } catch (e) {
      console.error("Failed to load page setup:", e);
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: Fetch dropdown lookup options for a datalist filter
  async function loadDropdownOpts(filterCode, filterID, valueField = null, displayField = null) {
    if (!filterID || Number(filterID) === 0) return; // date/no-lookup filters have FilterID 0
    try {
      const payload = { FilterID: filterID };
      if (valueField) payload.ValueField = valueField;
      if (displayField) payload.DisplayField = displayField;

      const res = await apiCall("Get Filter Data", payload, { Sp_Name: "APIERPOperation" });
      if (res.state === 0 || res.State === 0) {
        setDropdownOptions(prev => ({
          ...prev,
          [filterCode]: res.List0 || []
        }));
      }
    } catch (e) {
      console.error(`Failed to load filter data for ${filterCode}:`, e);
    }
  }

  // Load grid rows matching active filters & group-bys
  async function loadGridRows(filtersOverride = null) {
    setLoading(true);
    try {
      // Use the provided filters override if it exists, otherwise fall back to the state
      const activeFilters = filtersOverride && Object.keys(filtersOverride).length > 0 ? filtersOverride : filterValues;
      
      // Construct LineFilter array format expected by CP.APIERPOperation
      const filterList = [];
      filters.forEach(f => {
        const isRange = f.FilterType && (
          f.FilterType.toLowerCase().includes("range") ||
          f.FilterType.toLowerCase().includes("from-to") ||
          f.FilterType.toLowerCase().includes("from_to")
        );
        
        const fieldName = f.PageKeyField || f.key;
        if (isRange) {
          const val1 = activeFilters[`${f.key}_From`];
          const val2 = activeFilters[`${f.key}_To`];
          if ((val1 !== undefined && val1 !== null && val1 !== "") || 
              (val2 !== undefined && val2 !== null && val2 !== "")) {
            filterList.push({
              Field: fieldName,
              Value1: val1 !== undefined && val1 !== null ? String(val1) : "",
              Value2: val2 !== undefined && val2 !== null ? String(val2) : ""
            });
          }
        } else {
          const val = activeFilters[f.key];
          if (val !== undefined && val !== null && val !== "") {
            filterList.push({
              Field: fieldName,
              Value1: String(val),
              Value2: ""
            });
          }
        }
      });

      const payload = { PageID: pageID };
      const res = await apiCall("Get Page Data", payload, { 
        Sp_Name: "APIERPOperation",
        LineFilter: filterList.length > 0 ? JSON.stringify(filterList) : null
      });
      if (res.state === 0 || res.State === 0) {
        let dbRows = res.List0 || [];
        if (activeGroupByKey) {
          dbRows = groupRowsLocal(dbRows, activeGroupByKey);
        }
        setRows(dbRows);
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
    setFilterValues(prev => {
      const next = { ...prev, [filterKey]: val };
      const baseKey = filterKey.replace(/_(From|To)$/, "");
      const filter = filters.find(f => f.key === baseKey);
      if (filter) {
        const isRange = filter.FilterType && (
          filter.FilterType.toLowerCase().includes("range") ||
          filter.FilterType.toLowerCase().includes("from-to") ||
          filter.FilterType.toLowerCase().includes("from_to")
        );
        const isDate = filter.FilterType && (
          filter.FilterType.toLowerCase().includes("date") ||
          filter.FilterType.toLowerCase().includes("datetime")
        );
        if (isDate && !isRange) {
          loadGridRows(next);
        }
      }
      return next;
    });
  }

  // Resolve a typed value (e.g. "10001") to its display name (e.g. "Ahmed Al-Hassan")
  // `filter` is the filter config object (has key, FilterValueField, FilterDisplayField)
  function resolveDisplayName(filter, val) {
    if (!val) return "";
    const opts = dropdownOptions[filter.key] || [];
    if (!opts.length || typeof opts[0] !== "object") return "";
    const headers = Object.keys(opts[0]);
    // value column in the lookup options = FilterValueField, else first column
    const valCol = (filter.FilterValueField && filter.FilterValueField in opts[0])
                 ? filter.FilterValueField : headers[0];
    const row = opts.find(o => String(o[valCol]) === String(val));
    if (!row) return "";
    // display column = FilterDisplayField, else second column, else first non-value column
    const dispCol = (filter.FilterDisplayField && filter.FilterDisplayField in opts[0])
                  ? filter.FilterDisplayField
                  : (headers[1] && headers[1] !== valCol ? headers[1] : headers.find(h => h !== valCol));
    return dispCol ? String(row[dispCol] ?? "") : "";
  }

  function clearFilters() {
    const cleared = {};
    filters.forEach(f => { 
      const isRange = f.FilterType && (
        f.FilterType.toLowerCase().includes("range") ||
        f.FilterType.toLowerCase().includes("from-to") ||
        f.FilterType.toLowerCase().includes("from_to")
      );
      if (isRange) {
        cleared[`${f.key}_From`] = "";
        cleared[`${f.key}_To`] = "";
      } else {
        cleared[f.key] = "";
      }
    });
    setFilterValues(cleared);
    loadGridRows(cleared);
  }

  const activeViewName = views.find(v => String(v.ViewID) === String(activeViewID))?.ViewName || "Default Layout";
  const visibleCount = columns.filter(col => visibleColumns[col.key] !== false).length;

  const controlPanelElement = (
    <div className="erp-accordion-container">
      {/* Subheader bar with toggle buttons */}
      <div className="erp-accordion-header">
        <div className="erp-accordion-tabs">
          <button className="erp-accordion-tab" onClick={() => setPanelOpen(!panelOpen)}>
            <span className="icon">🔍</span> {filters.length} Filters
          </button>
          <button className="erp-accordion-tab" onClick={() => setPanelOpen(!panelOpen)}>
            <span className="icon">📊</span> {visibleCount} Columns
          </button>
          <button className="erp-accordion-tab" onClick={() => setPanelOpen(!panelOpen)}>
            <span className="icon">⚙️</span> {activeViewName}
          </button>
        </div>
        <button className="erp-accordion-chevron" onClick={() => setPanelOpen(!panelOpen)}>
          {panelOpen ? "▲" : "▼"}
        </button>
      </div>

      {/* Expanded Accordion Body */}
      {panelOpen && (
        <div className="erp-accordion-body">
          {filters.length > 0 && (
            <div className="erp-panel-section" style={{ marginBottom: 20 }}>
              <span className="erp-section-title">Filters</span>
              <div className="erp-filters-grid">
                {filters.map(filter => {
                  const filterKey = filter.key;
                  const filterLabel = filter.label;
                  const opts = dropdownOptions[filterKey] || [];
                  const isDropdown = filter.FilterType && (
                    filter.FilterType.toLowerCase().includes("dropdown") ||
                    filter.FilterType.toLowerCase().includes("datalist")
                  );
                  const isDate = filter.FilterType && (
                    filter.FilterType.toLowerCase().includes("date") ||
                    filter.FilterType.toLowerCase().includes("datetime")
                  );
                  const isRange = filter.FilterType && (
                    filter.FilterType.toLowerCase().includes("range") ||
                    filter.FilterType.toLowerCase().includes("from-to") ||
                    filter.FilterType.toLowerCase().includes("from_to")
                  );

                  return (
                    <div key={filterKey} className="erp-filter-item">
                      <label>{filterLabel}</label>
                      {isRange ? (
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            {isDropdown ? (
                              <SearchDropdown
                                value={filterValues[`${filterKey}_From`] || ""}
                                onChange={(val) => handleFilterChange(`${filterKey}_From`, val)}
                                options={opts}
                                valueKey={filter.FilterValueField}
                                placeholder="From"
                                style={{ height: 38, borderRadius: 10, fontSize: 13 }}
                              />
                            ) : (
                              <input
                                type={isDate ? "date" : "text"}
                                value={filterValues[`${filterKey}_From`] || ""}
                                onChange={(e) => handleFilterChange(`${filterKey}_From`, e.target.value)}
                                placeholder="From"
                                style={{ width: "100%" }}
                              />
                            )}
                            {!isDate && !isDropdown && resolveDisplayName(filter, filterValues[`${filterKey}_From`]) && (
                              <div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 700, marginTop: 5 }}>
                                {resolveDisplayName(filter, filterValues[`${filterKey}_From`])}
                              </div>
                            )}
                          </div>
                          <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: "bold", marginTop: 10 }}>→</span>
                          <div style={{ flex: 1 }}>
                            {isDropdown ? (
                              <SearchDropdown
                                value={filterValues[`${filterKey}_To`] || ""}
                                onChange={(val) => handleFilterChange(`${filterKey}_To`, val)}
                                options={opts}
                                valueKey={filter.FilterValueField}
                                placeholder="To"
                                style={{ height: 38, borderRadius: 10, fontSize: 13 }}
                              />
                            ) : (
                              <input
                                type={isDate ? "date" : "text"}
                                value={filterValues[`${filterKey}_To`] || ""}
                                onChange={(e) => handleFilterChange(`${filterKey}_To`, e.target.value)}
                                placeholder="To"
                                style={{ width: "100%" }}
                              />
                            )}
                            {!isDate && !isDropdown && resolveDisplayName(filter, filterValues[`${filterKey}_To`]) && (
                              <div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 700, marginTop: 5 }}>
                                {resolveDisplayName(filter, filterValues[`${filterKey}_To`])}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        isDropdown ? (
                          <SearchDropdown
                            value={filterValues[filterKey] || ""}
                            onChange={(val) => handleFilterChange(filterKey, val)}
                            options={opts}
                            valueKey={filter.FilterValueField}
                            placeholder={`Filter by ${filterLabel}`}
                          />
                        ) : (
                          <input
                            type={isDate ? "date" : "text"}
                            value={filterValues[filterKey] || ""}
                            onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                          />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Columns & Arrangement View */}
          <div className="erp-options-row">
            <div className="erp-options-fields">

              {groupBys.length > 0 && (
                <div className="erp-filter-item">
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

            <div className="erp-action-btns">
              <button className="erp-btn-reset" onClick={clearFilters}>Reset</button>
              <button className="erp-btn-apply" onClick={() => loadGridRows()}>Apply Filter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const viewDropdownElement = views.length > 0 ? (
    <div style={{ display: "inline-block", minWidth: 165 }}>
      <SearchDropdown
        value={activeViewID}
        onChange={(val) => {
          setActiveViewID(val);
          setTimeout(() => loadGridRows(), 0);
        }}
        options={views.map(v => ({ value: String(v.ViewID), label: v.ViewName }))}
        placeholder="View List"
        style={{ height: 32, borderRadius: 8, fontSize: 12 }}
      />
    </div>
  ) : null;

  return (
    <div className="erp-page-layout">
      <div className="erp-page-main">
        <DataGrid
          title={pageName}
          subtitle="Live database config preview"
          columns={displayedColumns}
          rows={rows}
          loading={loading}
          onRefresh={loadGridRows}
          extraButtons={onBack ? [{ label: "← Back to Pages", onClick: onBack }] : []}
          controlPanel={controlPanelElement}
          viewDropdown={viewDropdownElement}
        />
      </div>
    </div>
  );
}
