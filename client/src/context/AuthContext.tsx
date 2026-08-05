import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth.ts";
import BudgetPlugin from "../plugins/BudgetPlugin.ts";
import { getApiUrl } from "../api/config.ts";

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "spendlens_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      BudgetPlugin.setAuthToken({ token: "", apiUrl: "" }).catch(() => {});
      setIsLoading(false);
      return;
    }

    BudgetPlugin.setAuthToken({ token, apiUrl: getApiUrl() }).catch(() => {});

    authApi
      .getMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        BudgetPlugin.setAuthToken({ token: "", apiUrl: "" }).catch(() => {});
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.loginUser({ email, password });
    localStorage.setItem(TOKEN_KEY, result.token);
    BudgetPlugin.setAuthToken({ token: result.token, apiUrl: getApiUrl() }).catch(() => {});
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await authApi.registerUser({ email, password, name });
      localStorage.setItem(TOKEN_KEY, result.token);
      BudgetPlugin.setAuthToken({ token: result.token, apiUrl: getApiUrl() }).catch(() => {});
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    BudgetPlugin.setAuthToken({ token: "", apiUrl: "" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
