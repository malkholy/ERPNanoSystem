import { useState } from "react";
import { useSession } from "./useSession.jsx";
import { apiCall } from "../shared/api";

export default function Login() {
  const { login } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiCall("User Login", { Username: username, Password: password });
      if (res.State === 0) {
        const user = res.List0?.[0];
        login({
          UserID:   user?.UserID   || username,
          Username: user?.Username || username,
          FullName: user?.FullName || username,
          Pages:    res.List1      || [],
        });
      } else {
        setError(res.Message || "Invalid username or password.");
      }
    } catch (e) {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") handleLogin();
  }

  return (
    <div className="erp-login">
      <div className="erp-login-card">
        <div className="erp-logo">ERP</div>
        <h2>ERP Nano System</h2>
        <p>Sign in to your workspace</p>

        {error && <div className="erp-login-error">⚠ {error}</div>}

        <div className="erp-input-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
        </div>

        <div className="erp-input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>

        <button
          className="erp-login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>
      </div>
    </div>
  );
}
