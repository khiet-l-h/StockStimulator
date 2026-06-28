import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import type { MeResponse } from "../types";

interface AuthState {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Update the displayed cash balance after a trade without a full /me refetch. */
  setCashBalance: (newBalance: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      localStorage.removeItem("access_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.login(email, password);
    localStorage.setItem("access_token", res.access_token);
    const me = await api.me();
    setUser(me);
  };

  const signup = async (email: string, password: string): Promise<void> => {
    const res = await api.signup(email, password);
    localStorage.setItem("access_token", res.access_token);
    const me = await api.me();
    setUser(me);
  };

  const googleLogin = async (accessToken: string): Promise<void> => {
    const res = await api.googleAuth(accessToken);
    localStorage.setItem("access_token", res.access_token);
    const me = await api.me();
    setUser(me);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Server-side logout is a stub; always clear local state
    } finally {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  const setCashBalance = (newBalance: string): void => {
    setUser((prev) => (prev ? { ...prev, cash_balance: newBalance } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, signup, googleLogin, logout, setCashBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
