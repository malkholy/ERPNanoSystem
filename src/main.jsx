import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import { SessionProvider, useSession } from "./auth/useSession";
import Login from "./auth/Login";

function App() {
  const { session } = useSession();
  if (!session) return <Login />;
  return (
    <div style={{ padding: 40 }}>
      <h2>Welcome, {session.FullName} 👋</h2>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        AppShell coming next…
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>
);
