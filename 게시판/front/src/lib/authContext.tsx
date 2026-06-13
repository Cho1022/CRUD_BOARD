import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "./api";
import type { Member } from "../types";

interface AuthContextValue {
  user: Member | null;
  loading: boolean;
  completeLogin: (accessToken: string, member?: Member) => void;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadUser();
  }, []);

  async function loadUser() {
    if (!window.localStorage.getItem("board_access_token")) return setLoading(false);
    try {
      await refreshMe();
    } catch {
      window.localStorage.removeItem("board_access_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function completeLogin(accessToken: string, member?: Member) {
    window.localStorage.setItem("board_access_token", accessToken);
    setUser(member ?? null);
  }

  async function refreshMe() {
    const response = await api.me();
    setUser(response.data);
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Local logout must still work when the server token is already invalid.
    }
    window.localStorage.removeItem("board_access_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, completeLogin, refreshMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
