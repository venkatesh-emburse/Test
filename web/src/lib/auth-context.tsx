"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "./api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "support";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(async () => {
    try {
      const savedToken = localStorage.getItem("admin_token");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      setToken(savedToken);
      const adminData = await api.get<AdminUser>("/admin/auth/me");
      setAdmin(adminData);
    } catch {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setAdmin(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ accessToken: string; admin: AdminUser }>(
      "/admin/auth/login",
      { email, password }
    );

    localStorage.setItem("admin_token", response.accessToken);
    localStorage.setItem("admin_user", JSON.stringify(response.admin));
    setToken(response.accessToken);
    setAdmin(response.admin);
    router.push("/admin");
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setAdmin(null);
    setToken(null);
    router.push("/admin/login");
  };

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAdmin() {
  const { admin } = useAuth();
  return admin;
}
