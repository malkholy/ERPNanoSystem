import { createContext, useContext, useState, useCallback } from "react";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);

  const login = useCallback((userData) => {
    sessionStorage.setItem("UserName", userData.Username);
    sessionStorage.setItem("UserID",   userData.UserID);
    setSession({
      UserID:   userData.UserID,
      Username: userData.Username,
      FullName: userData.FullName || userData.Username,
      Pages:    userData.Pages || [],
    });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
