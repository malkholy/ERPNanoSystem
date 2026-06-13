import { useState, useEffect } from "react";
import { useSession } from "../auth/useSession.jsx";
import DynamicPage from "../pages/DynamicPage.jsx";

const MOCK_PAGES = [
  { PageID: 'Customers', PageName: 'Customers', Icon: '👤' },
  { PageID: 'Items', PageName: 'Product Catalog', Icon: '🛍' },
  { PageID: 'SalesOrders', PageName: 'Sales Orders', Icon: '📝' },
  { PageID: 'Invoices', PageName: 'Invoices', Icon: '💳' },
];

const WELCOME_CSS = `
.welcome-dash { max-width: 900px; margin: 40px auto; padding: 20px; }
.welcome-header { margin-bottom: 30px; }
.welcome-header h2 { font-size: 32px; font-weight: 900; color: var(--text); }
.welcome-header p { color: var(--muted); margin-top: 8px; font-size: 16px; }
.welcome-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
.welcome-stat-card { background: var(--surface); padding: 24px; border-radius: 20px; border: 1px solid var(--border); box-shadow: var(--shadow); display: flex; align-items: center; gap: 16px; transition: transform 0.2s; }
.welcome-stat-card:hover { transform: translateY(-4px); }
.welcome-stat-icon { width: 48px; height: 48px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; font-size: 20px; }
.welcome-stat-info h4 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 800; }
.welcome-stat-info p { font-size: 24px; font-weight: 900; margin-top: 4px; color: var(--text); }
.welcome-quick { background: var(--surface); border: 1px solid var(--border); padding: 24px; border-radius: 20px; box-shadow: var(--shadow); }
.welcome-quick h3 { font-size: 18px; font-weight: 900; margin-bottom: 16px; }
.welcome-quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.welcome-quick-btn { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--soft); border: 1px solid var(--border); border-radius: 12px; text-align: left; cursor: pointer; transition: all 0.15s; font-weight: 800; }
.welcome-quick-btn:hover { background: var(--primary-soft); border-color: var(--primary); transform: translateX(2px); }
.welcome-quick-btn span { font-size: 18px; }
`;

function injectWelcomeCSS() {
  if (document.getElementById("welcome-css")) return;
  const s = document.createElement("style");
  s.id = "welcome-css";
  s.textContent = WELCOME_CSS;
  document.head.appendChild(s);
}

export default function AppShell() {
  injectWelcomeCSS();
  const { session, logout } = useSession();
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabID, setActiveTabID] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Determine pages: database assigned pages or mock fallbacks
  const menuPages = session?.Pages && session.Pages.length > 0 ? session.Pages : MOCK_PAGES;

  // Open a page in a new or existing tab
  function openTab(page) {
    const exists = openTabs.find(t => t.PageID === page.PageID);
    if (!exists) {
      setOpenTabs([...openTabs, page]);
    }
    setActiveTabID(page.PageID);
    setSidebarOpen(false); // Close sidebar on mobile after clicking
  }

  // Close a tab
  function closeTab(e, pageID) {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.PageID !== pageID);
    setOpenTabs(remaining);

    // If the closed tab was the active one, switch to the last remaining tab
    if (activeTabID === pageID) {
      if (remaining.length > 0) {
        setActiveTabID(remaining[remaining.length - 1].PageID);
      } else {
        setActiveTabID(null);
      }
    }
  }

  const activeTab = openTabs.find(t => t.PageID === activeTabID);
  const userInitials = session?.FullName ? session.FullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const groupLabel = session?.Groups && session.Groups.length > 0
    ? session.Groups.map(g => g.GroupName).join(", ")
    : (session?.Pages && session.Pages.length > 0 ? "Live Session" : "Mock Session");

  return (
    <div className="erp-shell">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`erp-mobile-overlay ${sidebarOpen ? "show" : ""}`} 
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Container */}
      <aside className={`erp-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="erp-side-brand">
          <div className="erp-side-logo">ERP</div>
          <div>
            <h2>ERP Nano</h2>
            <p>Runtime Environment</p>
          </div>
        </div>

        <div className="erp-side-section">Modules</div>
        <ul className="erp-side-menu">
          {menuPages.map(page => {
            const isActive = activeTabID === page.PageID;
            return (
              <li key={page.PageID} onClick={() => openTab(page)}>
                <div className={`erp-side-link ${isActive ? "active" : ""}`}>
                  <span className="erp-side-icon">{page.Icon || "📄"}</span>
                  <span>{page.PageName}</span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer with User Profile */}
        <div className="erp-side-footer">
          <div className="erp-side-user">
            <div className="erp-side-avatar">{userInitials}</div>
            <div>
              <strong>{session?.FullName || session?.Username}</strong>
              <span>{groupLabel}</span>
            </div>
          </div>
          <div className="erp-side-actions">
            <button style={{ gridColumn: "span 2" }} onClick={logout}>Sign Out →</button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="erp-main">
        {/* Topbar / Tabs Row */}
        <header className="erp-topbar">
          <button className="erp-mobile-toggle" onClick={() => setSidebarOpen(true)}>
            ☰ Menu
          </button>
          
          <div className="erp-tabs">
            {openTabs.map(tab => (
              <div 
                key={tab.PageID} 
                className={`erp-tab ${activeTabID === tab.PageID ? "active" : ""}`}
                onClick={() => setActiveTabID(tab.PageID)}
              >
                <span>{tab.PageName}</span>
                <span className="erp-tab-close" onClick={(e) => closeTab(e, tab.PageID)}>✕</span>
              </div>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <div className="erp-content">
          {activeTab ? (
            <DynamicPage 
              key={activeTab.PageID}
              pageID={activeTab.PageID} 
              pageName={activeTab.PageName} 
            />
          ) : (
            /* Dashboard Landing Screen when no tabs are open */
            <div className="welcome-dash">
              <div className="welcome-header">
                <h2>Welcome, {session?.FullName} 👋</h2>
                <p>ERP Nano System is ready. Open a module from the sidebar or click a quick link to begin.</p>
              </div>

              <div className="welcome-stats">
                <div className="welcome-stat-card">
                  <div className="welcome-stat-icon">👤</div>
                  <div className="welcome-stat-info">
                    <h4>Accounts</h4>
                    <p>Active</p>
                  </div>
                </div>
                <div className="welcome-stat-card">
                  <div className="welcome-stat-icon">📦</div>
                  <div className="welcome-stat-info">
                    <h4>Products</h4>
                    <p>In Stock</p>
                  </div>
                </div>
                <div className="welcome-stat-card">
                  <div className="welcome-stat-icon">📈</div>
                  <div className="welcome-stat-info">
                    <h4>Sales</h4>
                    <p>Live Grid</p>
                  </div>
                </div>
              </div>

              <div className="welcome-quick">
                <h3>Quick Navigation</h3>
                <div className="welcome-quick-grid">
                  {menuPages.map(page => (
                    <button 
                      key={page.PageID} 
                      className="welcome-quick-btn"
                      onClick={() => openTab(page)}
                    >
                      <span>{page.Icon || "📄"}</span>
                      <span>{page.PageName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
