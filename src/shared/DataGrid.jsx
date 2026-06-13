import { useState, useEffect, useRef } from "react";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;font-family:Inter,Segoe UI,Arial,sans-serif}
:root{--bg:#f8fafc;--surface:#fff;--soft:#f9fafb;--text:#111827;--muted:#64748b;--border:#e5e7eb;--primary:#f97316;--primary-dark:#ea580c;--primary-soft:#ffedd5;--green:#16a34a;--green-soft:#dcfce7;--red:#dc2626;--red-soft:#fee2e2;--blue:#2563eb;--blue-soft:#dbeafe;--amber:#f59e0b;--amber-soft:#fef3c7;--shadow:0 16px 40px rgba(15,23,42,.08)}
.dg-page-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:18px}
.dg-page-head h1{font-size:26px;font-weight:900}
.dg-muted{color:var(--muted);font-size:14px}
.dg-grid-panel{background:var(--surface);border:1px solid var(--border);border-radius:22px;box-shadow:var(--shadow);overflow:hidden}
.dg-grid-title{padding:16px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between}
.dg-grid-title h3{font-size:18px;font-weight:900}
.dg-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--border)}
.dg-selected{color:#0b5ed7;font-weight:900;margin-right:8px}
.dg-search{height:40px;border:1px solid var(--border);border-radius:12px;padding:0 12px;font-weight:800;min-width:260px;outline:none}
.dg-btn{height:40px;border:1px solid var(--border);background:var(--surface);border-radius:12px;padding:0 14px;font-weight:900;cursor:pointer;font-size:13px}
.dg-btn.primary{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;border:0}
.dg-btn.green{background:#166534;color:#fff;border:0}
.dg-btn.red{background:#991b1b;color:#fff;border:0}
.dg-btn.blue{background:#0b5ed7;color:#fff;border:0}
.dg-btn:disabled{opacity:.4;cursor:not-allowed}
.dg-export-wrap{position:relative}
.dg-export-menu,.dg-row-menu{position:fixed;display:none;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);z-index:10000;padding:7px;min-width:210px}.dg-summary-menu{position:fixed;display:none;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);z-index:10000;padding:7px;min-width:210px}
.dg-export-menu.show,.dg-row-menu.show,.dg-summary-menu.show{display:block}
.dg-menu-title{padding:8px 10px 5px;color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase}
.dg-menu-item{padding:10px 12px;border-radius:9px;font-weight:900;cursor:pointer;display:flex;justify-content:space-between;font-size:13px}
.dg-menu-item:hover{background:var(--primary-soft);color:var(--primary-dark)}
.dg-danger{color:var(--red)}
.dg-table-wrap{overflow:auto;max-height:520px}
table.dg-table{width:100%;border-collapse:collapse;min-width:600px;table-layout:auto}
table.dg-table th,table.dg-table td{padding:13px 16px;border-bottom:1px solid var(--border);white-space:nowrap;text-align:left;font-size:13px}
table.dg-table th{background:var(--soft);color:var(--muted);font-size:13px;position:sticky;top:0;z-index:3;font-weight:900}
.dg-sort{cursor:pointer}
.dg-filter-btn{height:28px;width:28px;border:1px solid var(--border);border-radius:9px;background:var(--surface);cursor:pointer;margin-left:6px;font-size:12px}
.dg-filter-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.dg-num{text-align:right;font-family:Consolas,monospace;font-weight:800}
.dg-badge{padding:6px 10px;border-radius:999px;font-size:12px;font-weight:900}
.dg-good{background:var(--green-soft);color:var(--green)}
.dg-warn{background:var(--amber-soft);color:var(--amber)}
.dg-bad{background:var(--red-soft);color:var(--red)}
table.dg-table tr.active-row td{background:var(--primary-soft)!important}
table.dg-table tr.selected-row td{background:rgba(249,115,22,.12)}
table.dg-table tfoot td{background:var(--soft)!important;font-weight:900;border-top:2px solid var(--primary)}
table.dg-table tfoot td.dg-num{text-align:right;font-family:Consolas,monospace}
table.dg-table tfoot td.dg-summary-cell{cursor:context-menu}
table.dg-table tfoot td.dg-summary-cell:hover{background:var(--primary-soft)!important}
.dg-summary-badge{display:block;color:var(--primary);font-size:10px;margin-top:3px;font-weight:900}
.dg-paging{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px}
.dg-page-size{height:38px;border:1px solid var(--border);border-radius:10px;padding:0 10px;font-size:13px}
.dg-pager{display:flex;gap:6px}
.dg-page-btn{height:36px;min-width:36px;border:1px solid var(--border);background:var(--surface);border-radius:10px;font-weight:900;cursor:pointer;font-size:13px}
.dg-page-btn.active{background:var(--primary);color:#fff;border:0}
.dg-page-btn:disabled{opacity:.4}
.dg-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:99999}
.dg-modal.show{display:flex}
.dg-modal-box{width:min(560px,calc(100vw - 28px));background:var(--surface);border-radius:22px;box-shadow:var(--shadow)}
.dg-modal-head{padding:18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.dg-modal-head h3{font-size:17px;font-weight:900}
.dg-modal-body{padding:18px}
.dg-col-list{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.dg-col-list label{padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--soft);font-weight:800;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px}
.dg-toast{position:fixed;bottom:18px;right:18px;background:#111827;color:#fff;padding:12px 16px;border-radius:14px;display:none;z-index:99999;font-weight:800;font-size:13px}
.dg-toast.show{display:block}
.dg-col-filter-popup{position:fixed;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);z-index:10001;padding:10px;min-width:200px;display:none}
.dg-col-filter-popup.show{display:block}
.dg-col-filter-popup input{width:100%;height:34px;border:1px solid var(--border);border-radius:9px;padding:0 10px;font-size:13px;margin-bottom:8px;outline:none}
.dg-col-filter-opts{max-height:180px;overflow:auto}
.dg-col-filter-opt{padding:7px 8px;border-radius:7px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:8px}
.dg-col-filter-opt:hover{background:var(--primary-soft)}
.dg-col-filter-actions{display:flex;gap:6px;margin-top:8px}
.dg-col-filter-actions button{flex:1;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--soft);font-weight:900;font-size:12px;cursor:pointer}
.dg-col-filter-actions button.ok{background:var(--primary);color:#fff;border:0}
.dg-th-inner{display:flex;align-items:center;position:relative}
.dg-resize-handle{position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:1;background:transparent}
.dg-resize-handle:hover{background:var(--primary)}
`;

function injectCSS() {
  if (document.getElementById("dg-css")) return;
  const s = document.createElement("style");
  s.id = "dg-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

function fmtNum(v) {
  if (typeof v !== "number") return String(v ?? "");
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1).replace(".0", "") + "K";
  return v.toLocaleString();
}

function calcSummary(rows, col, mode) {
  const vals = rows.map(r => r[col]).filter(v => typeof v === "number");
  if (!vals.length || !mode || mode === "none") return "";
  if (mode === "count") return vals.length;
  if (mode === "sum") return fmtNum(vals.reduce((a, b) => a + b, 0));
  if (mode === "avg") return fmtNum(vals.reduce((a, b) => a + b, 0) / vals.length);
  if (mode === "min") return fmtNum(Math.min(...vals));
  if (mode === "max") return fmtNum(Math.max(...vals));
  return "";
}

const PAGE_SIZES = [25, 50, 100, 500, 1000];

export default function DataGrid({
  title = "Data",
  subtitle = "",
  columns = [],
  rows = [],
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onDuplicate,
  onRefresh,
  extraButtons = [],
}) {
  injectCSS();

  const [search, setSearch]         = useState("");
  const [sortCol, setSortCol]       = useState("");
  const [sortDir, setSortDir]       = useState("asc");
  const [pageIdx, setPageIdx]       = useState(1);
  const [pageSize, setPageSize]     = useState(25);
  const [selected, setSelected]     = useState(new Set());
  const [hidden, setHidden]         = useState(new Set());
  const [colWidths, setColWidths]     = useState({});
  const [summary, setSummary]       = useState({});
  const [colFilters, setColFilters] = useState({});
  const [rowMenu, setRowMenu]       = useState(null);
  const [exportMenu, setExportMenu] = useState(null);
  const [summaryMenuPos, setSummaryMenuPos] = useState(null);
  const [colFilterMenu, setColFilterMenu]   = useState(null);
  const [colFilterSearch, setColFilterSearch] = useState("");
  const [colModal, setColModal]     = useState(false);
  const [toast, setToast]           = useState("");

  // refs — never stale inside event handlers
  const lastSelRef    = useRef(null);
  const resizeRef     = useRef(null);
  const anchorRef     = useRef(null);
  const summaryColRef = useRef("");
  const summaryRef    = useRef({});
  const rowMenuRef    = useRef();
  const exportMenuRef = useRef();
  const summaryMenuRef= useRef();
  const colFilterRef  = useRef();

  // keep summaryRef in sync with state
  useEffect(() => { summaryRef.current = summary; }, [summary]);

  useEffect(() => {
    function handler(e) {
      if (rowMenuRef.current     && !rowMenuRef.current.contains(e.target))     setRowMenu(null);
      if (exportMenuRef.current  && !exportMenuRef.current.contains(e.target))  setExportMenu(null);
      if (summaryMenuRef.current && !summaryMenuRef.current.contains(e.target)) setSummaryMenuPos(null);
      if (colFilterRef.current   && !colFilterRef.current.contains(e.target))   setColFilterMenu(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function showToast(m) { setToast(m); setTimeout(() => setToast(""), 1600); }

  function startResize(e, col) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[col] || e.currentTarget.closest("th").offsetWidth;
    resizeRef.current = { col, startX, startW };
    function onMove(ev) {
      const diff = ev.clientX - resizeRef.current.startX;
      const newW = Math.max(60, resizeRef.current.startW + diff);
      setColWidths(p => ({ ...p, [resizeRef.current.col]: newW }));
    }
    function onUp() {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const visCols = columns.filter(c => !hidden.has(c.key));

  const filtered = rows
    .filter(r => Object.entries(colFilters).every(([col, vals]) => !vals || vals.size === 0 || vals.has(String(r[col] ?? ""))))
    .filter(r => visCols.some(c => String(r[c.key] ?? "").toLowerCase().includes(search.toLowerCase())));

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av ?? "").localeCompare(String(bv ?? ""))
      : String(bv ?? "").localeCompare(String(av ?? ""));
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeIdx    = Math.min(pageIdx, totalPages);
  const pageRows   = sorted.slice((safeIdx - 1) * pageSize, safeIdx * pageSize);

  // ── selection — uses ref so shift always works ──
  function select(i, e) {
    setSelected(prev => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelRef.current !== null) {
        const lo = Math.min(lastSelRef.current, i);
        const hi = Math.max(lastSelRef.current, i);
        for (let x = lo; x <= hi; x++) next.add(x);
      } else if (e.ctrlKey || e.metaKey) {
        next.has(i) ? next.delete(i) : next.add(i);
        lastSelRef.current = i;
      } else {
        next.clear();
        next.add(i);
        lastSelRef.current = i;
        anchorRef.current = i;
      }
      return next;
    });
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const cur = lastSelRef.current ?? 0;
      const n = e.key === "ArrowDown" ? Math.min(cur+1, pageRows.length-1) : Math.max(cur-1, 0);
      if (e.shiftKey) {
        if (anchorRef.current === null) anchorRef.current = cur;
        lastSelRef.current = n;
        const lo = Math.min(anchorRef.current, n);
        const hi = Math.max(anchorRef.current, n);
        const next = new Set();
        for (let x = lo; x <= hi; x++) next.add(x);
        setSelected(next);
      } else {
        anchorRef.current = n;
        lastSelRef.current = n;
        setSelected(new Set([n]));
      }
    }
    if (e.key === "Home")  { setSelected(new Set([0])); lastSelRef.current = 0; anchorRef.current = 0; }
    if (e.key === "End")   { const n = pageRows.length-1; setSelected(new Set([n])); lastSelRef.current = n; anchorRef.current = n; }
    if (e.key === "Enter" && lastSelRef.current !== null && onView) onView(pageRows[lastSelRef.current]);
  }

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPageIdx(1);
  }

  function openColFilter(e, col) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const uniqueVals = [...new Set(rows.map(r => String(r[col] ?? "")))].sort();
    const current = colFilters[col] || new Set(uniqueVals);
    setColFilterMenu({ x: r.left, y: r.bottom + 6, col, uniqueVals, tempSelected: new Set(current) });
    setColFilterSearch("");
  }

  function toggleColFilterVal(val) {
    setColFilterMenu(prev => {
      const s = new Set(prev.tempSelected);
      s.has(val) ? s.delete(val) : s.add(val);
      return { ...prev, tempSelected: s };
    });
  }

  function applyColFilter() {
    setColFilters(prev => ({ ...prev, [colFilterMenu.col]: colFilterMenu.tempSelected }));
    setColFilterMenu(null); setPageIdx(1);
  }

  const isColFiltered = col => {
    if (!colFilters[col]) return false;
    return colFilters[col].size < new Set(rows.map(r => String(r[col] ?? ""))).size;
  };

  // ── summary — fully ref-based like preview.html ──
  function openSummaryMenu(e, col) {
    e.preventDefault();
    e.stopPropagation();
    summaryColRef.current = col;
    const menuHeight = 280;
    const y = e.clientY + menuHeight > window.innerHeight
      ? e.clientY - menuHeight
      : e.clientY;
    setSummaryMenuPos({ x: e.clientX, y });
  }

  function applySummaryMode(mode) {
    const col = summaryColRef.current;
    setSummary(p => ({ ...p, [col]: mode }));
    setSummaryMenuPos(null);
  }

  function exportCSV() {
    const header = visCols.map(c => c.label).join(",");
    const body = sorted.map(r => visCols.map(c => `"${r[c.key] ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([header + "\n" + body], { type: "text/csv" }));
    a.download = title + ".csv"; a.click();
    setExportMenu(null); showToast("Exported!");
  }

  function exportExcel() {
    if (!window.XLSX) { showToast("XLSX not loaded"); return; }
    const data = sorted.map(r => Object.fromEntries(visCols.map(c => [c.label, r[c.key]])));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(data), title);
    window.XLSX.writeFile(wb, title + ".xlsx");
    setExportMenu(null); showToast("Exported!");
  }

  function exportPDF() {
    if (!window.jspdf) { showToast("jsPDF not loaded"); return; }
    const doc = new window.jspdf.jsPDF({ orientation: "landscape" });
    doc.text(title, 14, 14);
    doc.autoTable({ head: [visCols.map(c => c.label)], body: sorted.map(r => visCols.map(c => String(r[c.key] ?? ""))), startY: 22 });
    doc.save(title + ".pdf");
    setExportMenu(null); showToast("Exported!");
  }

  function saveLayout() {
    localStorage.setItem("erpGridLayout_" + title, JSON.stringify({ hidden: [...hidden], summary }));
    showToast("Layout saved");
  }

  const selRow  = selected.size === 1 ? pageRows[lastSelRef.current] : null;
  const selRows = [...selected].map(i => pageRows[i]).filter(Boolean);

  function renderCell(col, row) {
    if (col.render) return col.render(row[col.key], row);
    if (col.numeric) return fmtNum(row[col.key]);
    return String(row[col.key] ?? "");
  }

  return (
    <div tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
      <div className="dg-page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <div className="dg-muted">{subtitle}</div>}
        </div>
      </div>

      <div className="dg-grid-panel">
        <div className="dg-grid-title">
          <h3>{title} List</h3>
          <span className="dg-muted">{sorted.length} records</span>
        </div>

        <div className="dg-toolbar">
          <span className="dg-selected">{selected.size} selected</span>
          {onAdd     && <button className="dg-btn blue"  onClick={onAdd}>+ New</button>}
          {onView    && <button className="dg-btn blue"  disabled={!selRow} onClick={() => selRow && onView(selRow)}>View</button>}
          {onEdit    && <button className="dg-btn green" disabled={!selRow} onClick={() => selRow && onEdit(selRow)}>Edit</button>}
          {onDelete  && <button className="dg-btn red"   disabled={!selRows.length} onClick={() => onDelete(selRows)}>Delete</button>}
          {onRefresh && <button className="dg-btn" onClick={onRefresh}>↻ Refresh</button>}
          {extraButtons.map((b,i) => (
            <button key={i} className={`dg-btn ${b.className||""}`} onClick={b.onClick}>{b.label}</button>
          ))}
          <input className="dg-search" placeholder="Search in grid..."
            value={search} onChange={e => { setSearch(e.target.value); setPageIdx(1); }} />
          <div className="dg-export-wrap" ref={exportMenuRef}>
            <button className="dg-btn green" onClick={e => {
              const r = e.currentTarget.getBoundingClientRect();
              setExportMenu(exportMenu ? null : { x: r.left, y: r.bottom + 8 });
            }}>Export ▾</button>
            <div className={`dg-export-menu ${exportMenu ? "show" : ""}`}
              style={exportMenu ? { left: exportMenu.x, top: exportMenu.y } : {}}>
              <div className="dg-menu-item" onClick={exportExcel}>📗 Excel</div>
              <div className="dg-menu-item" onClick={exportPDF}>📕 PDF</div>
              <div className="dg-menu-item" onClick={exportCSV}>📄 CSV</div>
            </div>
          </div>
        </div>

        <div className="dg-table-wrap">
          <table className="dg-table">
            <thead>
              <tr>
                {visCols.map(col => (
                  <th key={col.key} style={colWidths[col.key] ? {width: colWidths[col.key], minWidth: colWidths[col.key]} : {}}>
                    <div className="dg-th-inner">
                      <span className="dg-sort" onClick={() => toggleSort(col.key)}>
                        {col.label}{sortCol === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </span>
                      <button className={`dg-filter-btn ${isColFiltered(col.key) ? "active" : ""}`}
                        onClick={e => openColFilter(e, col.key)}>⌄</button>
                      <div className="dg-resize-handle" onMouseDown={e => startResize(e, col.key)} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={visCols.length} style={{ textAlign:"center", padding:30, color:"var(--muted)" }}>Loading…</td></tr>}
              {!loading && pageRows.length === 0 && <tr><td colSpan={visCols.length} style={{ textAlign:"center", padding:30, color:"var(--muted)" }}>No records found</td></tr>}
              {!loading && pageRows.map((row, i) => (
                <tr key={i}
                  className={selected.has(i) ? "selected-row" : ""}
                  onClick={e => select(i, e)}
                  onDoubleClick={() => onView && onView(row)}
                  onContextMenu={e => {
                    e.preventDefault();
                    lastSelRef.current = i;
                    setSelected(new Set([i]));
                    setRowMenu({ x: e.clientX, y: e.clientY, row });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {visCols.map(col => (
                    <td key={col.key} className={col.numeric ? "dg-num" : ""}>{renderCell(col, row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {visCols.map((col, i) => {
                  const isNum = sorted.some(r => typeof r[col.key] === "number");
                  if (!isNum && i === 0) return <td key={col.key}>Summary</td>;
                  if (!isNum) return <td key={col.key}></td>;
                  const mode = summary[col.key] || "none";
                  const val  = calcSummary(sorted, col.key, mode);
                  return (
                    <td key={col.key}
                      className={`dg-summary-cell ${col.numeric ? "dg-num" : ""}`}
                      onContextMenu={e => openSummaryMenu(e, col.key)}>
                      {val && <span>{val}</span>}
                      <span className="dg-summary-badge">{mode !== "none" ? mode.toUpperCase() : "RIGHT CLICK"}</span>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="dg-paging">
          <div>Show{" "}
            <select className="dg-page-size" value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPageIdx(1); }}>
              {PAGE_SIZES.map(s => <option key={s}>{s}</option>)}
            </select>{" "}entries
          </div>
          <div className="dg-muted">
            Showing {sorted.length ? (safeIdx-1)*pageSize+1 : 0}–{Math.min(safeIdx*pageSize, sorted.length)} of {sorted.length} entries
          </div>
          <div className="dg-pager">
            <button className="dg-page-btn" disabled={safeIdx===1} onClick={() => setPageIdx(p=>p-1)}>‹</button>
            {[...Array(Math.min(totalPages,10))].map((_,i) => (
              <button key={i} className={`dg-page-btn ${i+1===safeIdx?"active":""}`} onClick={() => setPageIdx(i+1)}>{i+1}</button>
            ))}
            {totalPages > 10 && <span style={{padding:"0 6px",color:"var(--muted)"}}>…{totalPages}</span>}
            <button className="dg-page-btn" disabled={safeIdx===totalPages} onClick={() => setPageIdx(p=>p+1)}>›</button>
          </div>
        </div>
      </div>

      {/* Row Menu */}
      <div ref={rowMenuRef} className={`dg-row-menu ${rowMenu?"show":""}`}
        style={rowMenu?{left:rowMenu.x,top:rowMenu.y}:{}}>
        <div className="dg-menu-title">Record Actions</div>
        {onView      && <div className="dg-menu-item" onClick={() => { onView(rowMenu.row); setRowMenu(null); }}>👁 View</div>}
        {onEdit      && <div className="dg-menu-item" onClick={() => { onEdit(rowMenu.row); setRowMenu(null); }}>✏ Edit</div>}
        {onDuplicate && <div className="dg-menu-item" onClick={() => { onDuplicate(rowMenu.row); setRowMenu(null); }}>📄 Duplicate</div>}
        {onDelete    && <div className="dg-menu-item dg-danger" onClick={() => { onDelete([rowMenu.row]); setRowMenu(null); }}>🗑 Delete</div>}
        <div className="dg-menu-title">Grid Functions</div>
        <div className="dg-menu-item" onClick={() => { setColModal(true); setRowMenu(null); }}>⚙ Columns</div>
        <div className="dg-menu-item" onClick={() => { showToast("Advanced filter coming soon"); setRowMenu(null); }}>🔎 Advanced Filter</div>
        <div className="dg-menu-item" onClick={() => { saveLayout(); setRowMenu(null); }}>💾 Save Layout</div>
      </div>

      {/* Summary Menu — col stored in ref, never stale */}
      <div ref={summaryMenuRef} className={`dg-summary-menu ${summaryMenuPos?"show":""}`}
        style={summaryMenuPos?{left:summaryMenuPos.x,top:summaryMenuPos.y}:{}}>
        <div className="dg-menu-title">Summary: {summaryColRef.current}</div>
        {["none","sum","avg","min","max","count"].map(mode => (
          <div key={mode} className="dg-menu-item" onClick={() => applySummaryMode(mode)}>
            {mode.charAt(0).toUpperCase()+mode.slice(1)}
            <span>{(summary[summaryColRef.current]||"none")===mode?"✓":""}</span>
          </div>
        ))}
      </div>

      {/* Col Filter */}
      <div ref={colFilterRef} className={`dg-col-filter-popup ${colFilterMenu?"show":""}`}
        style={colFilterMenu?{left:colFilterMenu.x,top:colFilterMenu.y}:{}}>
        <input placeholder="Search values…" value={colFilterSearch}
          onChange={e => setColFilterSearch(e.target.value)} />
        <div className="dg-col-filter-opts">
          {colFilterMenu && colFilterMenu.uniqueVals
            .filter(v => v.toLowerCase().includes(colFilterSearch.toLowerCase()))
            .map(val => (
              <div key={val} className="dg-col-filter-opt" onClick={() => toggleColFilterVal(val)}>
                <span>{colFilterMenu.tempSelected.has(val)?"☑":"☐"}</span>
                {val||'(blank)'}
              </div>
            ))}
        </div>
        <div className="dg-col-filter-actions">
          <button onClick={() => setColFilterMenu(null)}>Cancel</button>
          <button onClick={() => { setColFilters(p=>{const n={...p};delete n[colFilterMenu.col];return n;}); setColFilterMenu(null); }}>Clear</button>
          <button className="ok" onClick={applyColFilter}>Apply</button>
        </div>
      </div>

      {/* Columns Modal */}
      <div className={`dg-modal ${colModal?"show":""}`}>
        <div className="dg-modal-box">
          <div className="dg-modal-head">
            <h3>Columns</h3>
            <button className="dg-btn" onClick={() => setColModal(false)}>✕</button>
          </div>
          <div className="dg-modal-body">
            <div className="dg-col-list">
              {columns.map(col => (
                <label key={col.key}>
                  <input type="checkbox" checked={!hidden.has(col.key)}
                    onChange={() => setHidden(p => { const n=new Set(p); n.has(col.key)?n.delete(col.key):n.add(col.key); return n; })} />
                  {col.label}
                </label>
              ))}
            </div>
            <br/>
            <button className="dg-btn primary" onClick={() => setColModal(false)}>Apply</button>
          </div>
        </div>
      </div>

      <div className={`dg-toast ${toast?"show":""}`}>{toast}</div>
    </div>
  );
}
