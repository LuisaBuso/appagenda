import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { API_BASE_URL } from "../../types/config";

type User = {
  email: string;
  nombre: string;
  rol: string;
  access_token: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Limpiar almacenamiento
  const clearAuthStorage = useCallback(() => {
    const keys = ["beaux-email", "beaux-nombre", "beaux-rol", "access_token"];
    keys.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }, []);

  // ✅ Obtener usuario almacenado
  const getStoredUser = useCallback((): User | null => {
    const storage = localStorage.getItem("beaux-email")
      ? localStorage
      : sessionStorage;

    const email = storage.getItem("beaux-email");
    const nombre = storage.getItem("beaux-nombre");
    const rol = storage.getItem("beaux-rol");
    const access_token = storage.getItem("access_token");

    if (email && access_token) {
      return { email, nombre: nombre || "", rol: rol || "user", access_token };
    }
    return null;
  }, []);

  // ✅ Inicializar sesión (sin refresh)
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
    } else {
      clearAuthStorage();
    }
    setIsLoading(false);
  }, [getStoredUser, clearAuthStorage]);

  // ✅ LOGIN directo al backend
  const login = useCallback(
    async (email: string, password: string, remember: boolean = true): Promise<boolean> => {
      setIsLoading(true);
      try {
        const body = new URLSearchParams({ username: email, password });
        const res = await fetch(`${API_BASE_URL}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          credentials: "include", // si usas cookies httpOnly, déjalo
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || "Credenciales incorrectas");
        }

        const data = await res.json(); // { access_token, rol, email, nombre, ... }

        const userData: User = {
          email: data.email,
          nombre: data.nombre,
          rol: data.rol || "user",
          access_token: data.access_token,
        };

        setUser(userData);
        clearAuthStorage();

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("beaux-email", userData.email);
        storage.setItem("beaux-nombre", userData.nombre);
        storage.setItem("beaux-rol", userData.rol);
        storage.setItem("access_token", userData.access_token);

        return true;
      } catch (error) {
        console.error("❌ Error en login:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [clearAuthStorage]
  );

  // ✅ LOGOUT
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      console.warn("⚠️ Logout local sin conexión.");
    }
    setUser(null);
    clearAuthStorage();
  }, [clearAuthStorage]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
