import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme.css";
import { SessionProvider, useSession } from "./auth/useSession.jsx";
import AppShell from "./components/AppShell";
import Login from "./auth/Login.jsx";

function App() {
  const { session } = useSession();
  if (!session) return <Login />;
  return <AppShell />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>
);
