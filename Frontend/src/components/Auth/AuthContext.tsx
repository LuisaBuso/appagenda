// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { login as apiLogin, refreshToken, logout as apiLogout } from "./authService";

type User = {
  email: string;
  nombre: string;
  rol: string;
  access_token: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext)!;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Guardar sesión
  const saveUser = (data: User, remember: boolean) => {
    if (remember) localStorage.setItem("user", JSON.stringify(data));
    else sessionStorage.setItem("user", JSON.stringify(data));
  };

  // Obtener sesión
  const getStoredUser = () => {
    const data = localStorage.getItem("user") || sessionStorage.getItem("user");
    return data ? (JSON.parse(data) as User) : null;
  };

  // 🔹 Inicialización (cuando recarga la página)
  useEffect(() => {
    const initialize = async () => {
      const stored = getStoredUser();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const refreshed = await refreshToken();
        // ✅ Token renovado correctamente
        const newUser = { ...stored, access_token: refreshed.access_token };
        setUser(newUser);
        saveUser(newUser, !!localStorage.getItem("user"));
        console.log("🔁 Token refrescado correctamente");
      } catch (err) {
        // ⚠️ Si no se puede refrescar, mantenemos el usuario actual
        setUser(stored);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // 🔹 LOGIN normal
  const login = useCallback(async (email: string, password: string, remember: boolean = false) => {
    try {
      const data = await apiLogin(email, password);
      const userData = {
        email: data.email,
        nombre: data.nombre,
        rol: data.rol,
        access_token: data.access_token,
      };
      setUser(userData);
      saveUser(userData, remember);
      return true;
    } catch (err) {
      console.error("❌ Error en login:", err);
      return false;
    }
  }, []);

  // 🔹 LOGOUT
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {}
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
