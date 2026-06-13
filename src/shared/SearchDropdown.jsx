import { useState, useEffect, useRef } from "react";

const CSS = `
.sd-wrap { position:relative; }
.sd-trigger { width:100%; height:42px; border:1px solid var(--border); border-radius:12px; background:var(--surface); padding:0 36px 0 12px; font-size:13px; font-weight:700; outline:none; color:var(--text); text-align:left; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
.sd-trigger:focus { border-color:var(--primary); }
.sd-trigger.open { border-color:var(--primary); border-radius:12px 12px 0 0; }
.sd-trigger.ro { background:#f1f5f9; color:var(--muted); cursor:default; }
.sd-arrow { color:var(--muted); font-size:11px; flex-shrink:0; }
.sd-dropdown { position:absolute; left:0; right:0; top:100%; background:var(--surface); border:1px solid var(--primary); border-top:0; border-radius:0 0 12px 12px; z-index:9999; box-shadow:0 8px 24px rgba(15,23,42,.1); }
.sd-search-wrap { padding:8px; border-bottom:1px solid var(--border); }
.sd-search { width:100%; height:34px; border:1px solid var(--border); border-radius:9px; padding:0 10px; font-size:13px; outline:none; background:var(--soft); }
.sd-search:focus { border-color:var(--primary); }
.sd-list { max-height:200px; overflow-y:auto; }
.sd-item { padding:10px 13px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; }
.sd-item:hover { background:var(--primary-soft); color:var(--primary-dark); }
.sd-item.active { background:var(--primary-soft); color:var(--primary-dark); font-weight:900; }
.sd-item.active::after { content:"✓"; margin-left:auto; color:var(--primary); font-weight:900; }
.sd-empty { padding:14px; text-align:center; color:var(--muted); font-size:13px; }
.sd-clear { height:34px; width:100%; border:0; border-top:1px solid var(--border); background:var(--soft); color:var(--muted); font-size:12px; font-weight:900; cursor:pointer; border-radius:0 0 12px 12px; }
.sd-clear:hover { background:var(--primary-soft); color:var(--primary-dark); }
`;

function injectCSS() {
  if (document.getElementById("sd-css")) return;
  const s = document.createElement("style");
  s.id = "sd-css";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * Props:
 *  value        string — current value
 *  onChange     fn(value)
 *  options      [{value, label}] or [string]
 *  placeholder  string
 *  disabled     bool
 *  clearable    bool
 */
export default function SearchDropdown({
  value = "",
  onChange,
  options = [],
  placeholder = "— Select —",
  disabled = false,
  clearable = true,
}) {
  injectCSS();

  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef             = useRef();
  const searchRef           = useRef();

  // normalize options to [{value, label}]
  const normalized = options.map(o =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  const filtered = normalized.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = normalized.find(o => o.value === value)?.label || value;

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
    <div className="sd-trigger ro">
      <span>{selectedLabel || placeholder}</span>
      <span className="sd-arrow">▾</span>
    </div>
  );

  return (
    <div className="sd-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`sd-trigger ${open ? "open" : ""}`}
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
