import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../api/auth.ts";

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
      setIsLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.loginUser({ email, password });
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await authApi.registerUser({ email, password, name });
      localStorage.setItem(TOKEN_KEY, result.token);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
