import { useState, useEffect, useRef } from "react";

const CSS = `
.sd-wrap { position:relative; flex:1; width:100%; }
.sd-trigger { width:100%; height:42px; border:1px solid var(--border); border-radius:12px; background:var(--surface); padding:0 36px 0 12px; font-size:13px; font-weight:700; outline:none; color:var(--text); text-align:left; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition: border-color 0.15s, box-shadow 0.15s; }
.sd-trigger:focus { border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-soft); }
.sd-trigger.open { border-color:var(--primary); border-radius:12px 12px 0 0; box-shadow:0 0 0 3px var(--primary-soft); }
.sd-trigger.ro { background:#f1f5f9; color:var(--muted); cursor:default; }
.sd-arrow { color:var(--muted); font-size:11px; flex-shrink:0; }
.sd-dropdown { position:absolute; left:0; min-width:max(100%, 360px); max-width:min(550px, 90vw); top:100%; background:var(--surface); border:1px solid var(--primary); border-top:0; border-radius:0 0 12px 12px; z-index:9999; box-shadow:0 8px 24px rgba(15,23,42,.1); }
.sd-search-wrap { padding:8px; border-bottom:1px solid var(--border); }
.sd-search { width:100%; height:34px; border:1px solid var(--border); border-radius:9px; padding:0 10px; font-size:13px; outline:none; background:var(--soft); }
.sd-search:focus { border-color:var(--primary); }
.sd-list { max-height:200px; overflow-y:auto; }
.sd-item { padding:10px 13px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sd-item:hover { background:var(--primary-soft); color:var(--primary-dark); }
.sd-item.active { background:var(--primary-soft); color:var(--primary-dark); font-weight:900; }
.sd-item.active::after { content:"✓"; margin-left:auto; color:var(--primary); font-weight:900; }
.sd-empty { padding:14px; text-align:center; color:var(--muted); font-size:13px; }
.sd-clear { height:34px; width:100%; border:0; border-top:1px solid var(--border); background:var(--soft); color:var(--muted); font-size:12px; font-weight:900; cursor:pointer; border-radius:0 0 12px 12px; }
.sd-clear:hover { background:var(--primary-soft); color:var(--primary-dark); }

/* Option 3 — ID badge + name inline + trailing detail */
.sd-row { padding:10px 13px; cursor:pointer; display:flex; align-items:center; gap:8px; white-space:nowrap; }
.sd-row:hover { background:var(--primary-soft); }
.sd-row:hover .sd-row-name { color:var(--primary-dark); }
.sd-row.active { background:var(--primary-soft); }
.sd-row.active .sd-row-name { color:var(--primary-dark); font-weight:900; }
.sd-row-badge { font-size:10px; border:1px solid var(--border); color:var(--muted); border-radius:5px; padding:1px 7px; white-space:nowrap; flex-shrink:0; font-weight:800; }
.sd-row.active .sd-row-badge { border-color:var(--primary); color:var(--primary-dark); }
.sd-row-name { font-size:13px; font-weight:700; color:var(--text); flex:1; overflow:hidden; text-overflow:ellipsis; }
.sd-row-detail { font-size:11px; color:var(--muted); flex-shrink:0; }
`;

function injectCSS() {
  if (document.getElementById("sd-css-v2")) return;
  const s = document.createElement("style");
  s.id = "sd-css-v2";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Props:
 *  value        string — current value
 *  onChange     fn(value)
 *  options      [{value, label}] or [string] or array of db row objects
 *  placeholder  string
 *  disabled     bool
 *  clearable    bool
 *  valueKey     string — key mapping for selected value column (for database row options)
 *  style        object
 */
export default function SearchDropdown({
  value = "",
  onChange,
  options = [],
  placeholder = "— Select —",
  disabled = false,
  clearable = true,
  valueKey = "",
  style = {},
}) {
  injectCSS();

  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef             = useRef();
  const searchRef           = useRef();

  // Check if options are structured objects (multi-column database rows)
  const isMultiCol = options.length > 0 && 
                     typeof options[0] === "object" && 
                     !('value' in options[0]);

  const headers = isMultiCol ? Object.keys(options[0]) : [];
  const valKey  = valueKey || (headers.length > 0 ? headers[0] : "value");

  // normalize options to [{value, label}] for non-multi-column layout
  const normalized = isMultiCol ? [] : options.map(o =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  const filtered = isMultiCol 
    ? options.filter(item => {
        if (!search) return true;
        return Object.values(item).some(val => 
          String(val ?? '').toLowerCase().includes(search.toLowerCase())
        );
      })
    : normalized.filter(o =>
        String(o.label ?? "").toLowerCase().includes(search.toLowerCase()) ||
        String(o.value ?? "").toLowerCase().includes(search.toLowerCase())
      );

  // Determine trigger display label
  let selectedLabel = value;
  if (isMultiCol) {
    const selectedItem = options.find(o => String(o[valKey]) === String(value));
    if (selectedItem) {
      selectedLabel = Object.values(selectedItem).filter(v => v !== null && v !== undefined && v !== '').join(" - ");
    }
  } else {
    selectedLabel = normalized.find(o => String(o.value) === String(value))?.label || value;
  }

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  function select(val) {
    onChange(val);
    setOpen(false);
  }

  if (disabled) return (
    <div className="sd-trigger ro" style={style}>
      <span>{selectedLabel || placeholder}</span>
      <span className="sd-arrow">▾</span>
    </div>
  );

  return (
    <div className="sd-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`sd-trigger ${open ? "open" : ""}`}
        style={style}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ color: value ? "var(--text)" : "var(--muted)" }}>
          {selectedLabel || placeholder}
        </span>
        <span className="sd-arrow">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="sd-dropdown">
          <div className="sd-search-wrap">
            <input
              ref={searchRef}
              className="sd-search"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {isMultiCol ? (
            <div className="sd-list">
              {filtered.length === 0 ? (
                <div className="sd-empty">No results</div>
              ) : (
                filtered.map((item, idx) => {
                  const itemVal = item[valKey];
                  const isActive = String(itemVal) === String(value);
                  // first column = badge, second = name, rest = trailing detail(s)
                  const badge  = String(item[headers[0]] ?? "");
                  const name   = headers[1] ? String(item[headers[1]] ?? "") : "";
                  const detail = headers.slice(2)
                    .map(h => String(item[h] ?? ""))
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div
                      key={idx}
                      className={`sd-row ${isActive ? "active" : ""}`}
                      onClick={() => select(itemVal)}
                    >
                      <span className="sd-row-badge">{badge}</span>
                      {name && <span className="sd-row-name">{name}</span>}
                      {detail && <span className="sd-row-detail">{detail}</span>}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="sd-list">
              {filtered.length === 0 ? (
                <div className="sd-empty">No results</div>
              ) : (
                filtered.map(o => (
                  <div
                    key={o.value}
                    className={`sd-item ${o.value === value ? "active" : ""}`}
                    onClick={() => select(o.value)}
                  >
                    {o.label}
                  </div>
                ))
              )}
            </div>
          )}

          {clearable && value && (
            <button className="sd-clear" onClick={() => { onChange(""); setOpen(false); }}>
              ✕ Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
