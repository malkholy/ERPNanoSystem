import { useState, useEffect } from "react";
import { apiCall } from "../shared/api.js";
import DataGrid from "../shared/DataGrid.jsx";

const TYPES = [
  { key: "datalist",       name: "Data List",    desc: "normal dropdown" },
  { key: "datalist_range", name: "From–To List", desc: "range, two lists" },
  { key: "date",           name: "Date",         desc: "single date" },
  { key: "date_range",     name: "Date From–To", desc: "date range" },
];

const TYPE_META = {
  datalist:       { label: "Data List",    bg: "#dbeafe", fg: "#2563eb" },
  datalist_range: { label: "From–To List", bg: "#ede9fe", fg: "#7c3aed" },
  date:           { label: "Date",         bg: "#dcfce7", fg: "#16a34a" },
  date_range:     { label: "Date From–To", bg: "#fef3c7", fg: "#92400e" },
};

const CSS = `
.ft-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.ft-modal{background:var(--surface);border-radius:18px;width:100%;max-width:520px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.ft-modal-head{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
.ft-modal-head h3{font-size:17px;font-weight:900}
.ft-x{height:30px;width:30px;border:1px solid var(--border);border-radius:9px;background:var(--surface);cursor:pointer;font-size:14px}
.ft-modal-body{padding:20px;display:flex;flex-direction:column;gap:14px;max-height:62vh;overflow:auto}
.ft-modal-foot{padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}
.ft-fld label{display:block;font-size:11px;font-weight:900;color:var(--muted);text-transform:uppercase;margin-bottom:6px;letter-spacing:.03em}
.ft-fld select,.ft-fld input{width:100%;height:42px;border:1px solid var(--border);border-radius:12px;padding:0 12px;font-size:13px;font-weight:700;background:var(--surface);color:var(--text);outline:none}
.ft-fld select:focus,.ft-fld input:focus{border-color:var(--primary)}
.ft-pills{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ft-pill{padding:11px 12px;border:1px solid var(--border);border-radius:12px;cursor:pointer;font-size:12px;font-weight:900;text-align:center;background:var(--surface)}
.ft-pill.sel{border-color:var(--primary);background:var(--primary-soft);color:var(--primary-dark)}
.ft-pill .desc{display:block;font-size:10px;font-weight:600;color:var(--muted);margin-top:3px}
.ft-pill.sel .desc{color:var(--primary-dark)}
.ft-note{background:#dbeafe;border-radius:10px;padding:10px 12px;font-size:11px;color:#1e40af;font-weight:700;line-height:1.5}
`;

function injectCSS() {
  if (document.getElementById("ft-css")) return;
  const s = document.createElement("style");
  s.id = "ft-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const EMPTY_DRAFT = {
  FilterType: "datalist",
  FilterID: "",
  FilterValueField: "",
  FilterDisplayField: "",
  PageKeyField: "",
  Label: "",
  DefaultValue: "",
};

/**
 * Props:
 *  pageId      number  (row.PageID)
 *  pageFields  array   [{FieldName, ...}]  — the page's configured fields
 *  isRO        bool    view mode
 *  showToast   fn
 */
export default function FilterTab({ pageId, pageFields = [], isRO = false, showToast = () => {} }) {
  injectCSS();

  const [allFilters, setAllFilters]   = useState([]);   // FilterMaster list
  const [rows, setRows]               = useState([]);   // linked filters
  const [fmFields, setFmFields]       = useState({});   // {FilterID:[names]}
  const [saving, setSaving]           = useState(false);

  // modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editIndex, setEditIndex]     = useState(null);  // null = new
  const [draft, setDraft]             = useState(EMPTY_DRAFT);

  useEffect(() => { init(); }, []);

  async function init() {
    try { const d = await apiCall("Get Filters"); setAllFilters(d.List0 || []); } catch { void 0; }
    if (pageId) {
      try {
        const d = await apiCall("Get Page Filters", { PageID: pageId });
        const links = (d.List0 || []).map(x => ({
          FilterType:         x.FilterType || "datalist",
          FilterID:           x.FilterID || "",
          FilterName:         x.FilterName || "",
          FilterValueField:   x.FilterValueField || "",
          FilterDisplayField: x.FilterDisplayField || "",
          PageKeyField:       x.PageKeyField || "",
          Label:              x.Label || "",
          DefaultValue:       x.DefaultValue || "",
        }));
        setRows(links);
        links.forEach(l => l.FilterID && loadFmFields(l.FilterID));
      } catch { void 0; }
    }
  }

  async function loadFmFields(filterId) {
    if (!filterId || fmFields[filterId]) return;
    try {
      const fm = allFilters.find(a => String(a.FilterID) === String(filterId));
      if (fm && fm.DatabaseName && fm.TableName) {
        const d = await apiCall("Get Fields", {
          DatabaseName: fm.DatabaseName,
          SchemaName: fm.SchemaName || "dbo",
          TableName: fm.TableName
        });
        const names = (d.List0 || []).map(col => {
          return col.FieldName || col.COLUMN_NAME || col.ColumnName || Object.values(col)[0] || "";
        }).filter(Boolean);
        setFmFields(m => ({ ...m, [filterId]: names }));
      } else {
        const d = await apiCall("Get Filter Fields", { FilterID: filterId });
        const names = (d.List0 || []).map(f => f.FieldName);
        setFmFields(m => ({ ...m, [filterId]: names }));
      }
    } catch {
      try {
        const d = await apiCall("Get Filter Fields", { FilterID: filterId });
        const names = (d.List0 || []).map(f => f.FieldName);
        setFmFields(m => ({ ...m, [filterId]: names }));
      } catch { void 0; }
    }
  }

  function isDateType(t) { return t === "date" || t === "date_range"; }

  // ── modal open/close ──
  function openNew() {
    setEditIndex(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }
  function openEdit(i) {
    const r = rows[i];
    setEditIndex(i);
    setDraft({
      FilterType: r.FilterType,
      FilterID: r.FilterID || "",
      FilterValueField: r.FilterValueField || "",
      FilterDisplayField: r.FilterDisplayField || "",
      PageKeyField: r.PageKeyField || "",
      Label: r.Label || "",
      DefaultValue: r.DefaultValue || "",
    });
    if (r.FilterID) loadFmFields(r.FilterID);
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); }

  function setDraftType(t) {
    setDraft(d => {
      let nextField = d.PageKeyField;
      if (isDateType(t)) {
        const currentF = pageFields.find(f => f.FieldName === d.PageKeyField);
        const isCurrentDate = currentF && (
          (currentF.DataType || "").toLowerCase().includes("date") ||
          (currentF.DataType || "").toLowerCase().includes("time") ||
          (currentF.Format || "").toLowerCase().includes("date") ||
          (currentF.Format || "").toLowerCase().includes("time")
        );
        if (!isCurrentDate) {
          nextField = "";
        }
        return { ...d, FilterType: t, FilterID: "", FilterValueField: "", FilterDisplayField: "", PageKeyField: nextField };
      }
      return { ...d, FilterType: t };
    });
  }
  function setDraftMaster(id) {
    setDraft(d => ({ ...d, FilterID: id, FilterValueField: "", FilterDisplayField: "" }));
    if (id) loadFmFields(id);
  }

  function saveDraft() {
    const isDate = isDateType(draft.FilterType);
    if (!draft.PageKeyField) { showToast("Select a page field"); return; }
    if (!isDate && !draft.FilterID) { showToast("Select a filter master"); return; }
    if (!isDate && !draft.FilterValueField) { showToast("Select the value field"); return; }
    if (!isDate && !draft.FilterDisplayField) { showToast("Select the display field"); return; }

    const fm = allFilters.find(a => String(a.FilterID) === String(draft.FilterID));
    const newRow = {
      FilterType:         draft.FilterType,
      FilterID:           isDate ? "" : draft.FilterID,
      FilterName:         isDate ? "" : (fm ? fm.FilterName : ""),
      FilterValueField:   isDate ? "" : draft.FilterValueField,
      FilterDisplayField: isDate ? "" : draft.FilterDisplayField,
      PageKeyField:       draft.PageKeyField,
      Label:              draft.Label || (fm ? fm.FilterName : draft.PageKeyField),
      DefaultValue:       draft.DefaultValue || "",
    };

    if (editIndex === null) setRows(p => [...p, newRow]);
    else setRows(p => p.map((r, i) => i === editIndex ? newRow : r));
    setModalOpen(false);
  }

  function removeRow(i) { setRows(p => p.filter((_, idx) => idx !== i)); }

  async function saveAll() {
    setSaving(true);
    try {
      const d = await apiCall("Save Page Filters", {
        PageID: pageId,
        Filters: rows.map((r, i) => ({
          FilterID:           r.FilterID ? Number(r.FilterID) : 0,
          FilterType:         r.FilterType,
          PageKeyField:       r.PageKeyField,
          FilterValueField:   r.FilterValueField,
          FilterDisplayField: r.FilterDisplayField,
          Label:              r.Label,
          DefaultValue:       r.DefaultValue || "",
          SortOrder:          i + 1,
          IsActive:           1,
        })),
      });
      if (d.State === 0) showToast("Filters saved");
      else showToast(d.Message || "Error");
    } catch { showToast("Save failed"); }
    setSaving(false);
  }

  const draftIsDate = isDateType(draft.FilterType);
  const draftFmFieldNames = draft.FilterID ? (fmFields[draft.FilterID] || []) : [];
  const filteredPageFields = pageFields.filter(f => {
    if (draftIsDate) {
      const type = (f.DataType || "").toLowerCase();
      const format = (f.Format || "").toLowerCase();
      return type.includes("date") || type.includes("time") || format.includes("date") || format.includes("time");
    }
    return true;
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:13,color:"var(--muted)",fontWeight:800}}>Configure filters shown on this page</span>
        {!isRO && <button className="dg-btn primary" disabled={saving} onClick={saveAll}>{saving?"Saving…":"Save Filters"}</button>}
      </div>

      <DataGrid
        title="Page Filters"
        subtitle={`${rows.length} filter(s) configured`}
        hideHeader={true}
        columns={[
          { key:"_n", label:"#", numeric:true, render:(v,r) => rows.indexOf(r)+1 },
          { key:"FilterType", label:"Type", render:v => {
            const m = TYPE_META[v] || { label:v, bg:"#e5e7eb", fg:"#111827" };
            return <span style={{padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:900,background:m.bg,color:m.fg}}>{m.label}</span>;
          }},
          { key:"FilterName", label:"Filter Master", render:v => v || <span style={{color:"var(--muted)"}}>—</span> },
          { key:"FilterValueField", label:"Filter Field", render:(v,r) => r.FilterID ? <span style={{fontSize:12}}>{r.FilterValueField} / {r.FilterDisplayField}</span> : <span style={{color:"var(--muted)"}}>—</span> },
          { key:"PageKeyField", label:"Page Field" },
          { key:"Label", label:"Label" },
          { key:"DefaultValue", label:"Default Value", render:v => v ? <span style={{fontWeight:800,color:"#7c3aed"}}>{v}</span> : <span style={{color:"var(--muted)"}}>—</span> },
        ]}
        rows={rows}
        onAdd={isRO ? undefined : openNew}
        onEdit={isRO ? undefined : (r => openEdit(rows.indexOf(r)))}
        onDelete={isRO ? undefined : (sel => { sel.forEach(r => removeRow(rows.indexOf(r))); })}
      />

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="ft-overlay" onClick={e => { if (e.target.className === "ft-overlay") closeModal(); }}>
          <div className="ft-modal">
            <div className="ft-modal-head">
              <h3>{editIndex === null ? "New Filter" : "Edit Filter"}</h3>
              <button className="ft-x" onClick={closeModal}>✕</button>
            </div>
            <div className="ft-modal-body">

              <div className="ft-fld">
                <label>Filter Type</label>
                <div className="ft-pills">
                  {TYPES.map(t => (
                    <div key={t.key} className={`ft-pill ${draft.FilterType===t.key?"sel":""}`} onClick={()=>setDraftType(t.key)}>
                      {t.name}<span className="desc">{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {draftIsDate && (
                <div className="ft-note">Date filters use a date picker — no Filter Master needed.</div>
              )}

              {!draftIsDate && (
                <>
                  <div className="ft-fld">
                    <label>Filter Master</label>
                    <select value={draft.FilterID} onChange={e=>setDraftMaster(e.target.value)}>
                      <option value="">— select filter master —</option>
                      {allFilters.map(a => <option key={a.FilterID} value={a.FilterID}>{a.FilterName}</option>)}
                    </select>
                  </div>
                  <div className="ft-fld">
                    <label>Filter Value Field</label>
                    <select value={draft.FilterValueField} onChange={e=>setDraft(d=>({...d,FilterValueField:e.target.value}))}>
                      <option value="">— select —</option>
                      {draftFmFieldNames.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="ft-fld">
                    <label>Filter Display Field (shown in dropdown)</label>
                    <select value={draft.FilterDisplayField} onChange={e=>setDraft(d=>({...d,FilterDisplayField:e.target.value}))}>
                      <option value="">— select —</option>
                      {draftFmFieldNames.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="ft-fld">
                <label>Page Field (to filter)</label>
                <select value={draft.PageKeyField} onChange={e=>setDraft(d=>({...d,PageKeyField:e.target.value}))}>
                  <option value="">— select page field —</option>
                  {filteredPageFields.map(f => <option key={f.FieldName} value={f.FieldName}>{f.FieldName}</option>)}
                </select>
              </div>

              {draft.PageKeyField && (
                <div className="ft-fld">
                  <label>Default Value</label>
                  {draftIsDate ? (
                    <select value={draft.DefaultValue || ""} onChange={e=>setDraft(d=>({...d,DefaultValue:e.target.value}))}>
                      <option value="">— none —</option>
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="Last Week">Last Week</option>
                      <option value="Month Began">Month Began</option>
                      <option value="Last Month">Last Month</option>
                      <option value="Year Began">Year Began</option>
                    </select>
                  ) : (
                    <input value={draft.DefaultValue || ""} onChange={e=>setDraft(d=>({...d,DefaultValue:e.target.value}))} placeholder="e.g. Active, 1, or leave blank" />
                  )}
                </div>
              )}

              <div className="ft-fld">
                <label>Display Label</label>
                <input value={draft.Label} onChange={e=>setDraft(d=>({...d,Label:e.target.value}))} placeholder="e.g. Customer" />
              </div>

            </div>
            <div className="ft-modal-foot">
              <button className="dg-btn" onClick={closeModal}>Cancel</button>
              <button className="dg-btn primary" onClick={saveDraft}>{editIndex === null ? "Add Filter" : "Update"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
