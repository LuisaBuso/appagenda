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
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  access_token: string; // ← Agregar esta propiedad
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Limpiar storage
  const clearAuthStorage = useCallback(() => {
    const keys = ["beaux-id", "beaux-name", "beaux-email", "beaux-role", "access_token"];
    keys.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }, []);

  // Validar token con el endpoint que tienes
  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}auth/validate_token`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error("Error validando token:", error);
      return false;
    }
  }, []);

  // Inicializar autenticación con validación
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedEmail = localStorage.getItem("beaux-email") || sessionStorage.getItem("beaux-email");
        const storedToken = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");

        if (storedEmail && storedToken) {
          // Validar el token antes de establecer el usuario
          const isValid = await validateToken(storedToken);
          
          if (isValid) {
            const userData: User = {
              id: localStorage.getItem("beaux-id") || sessionStorage.getItem("beaux-id") || "",
              name: localStorage.getItem("beaux-name") || sessionStorage.getItem("beaux-name") || "",
              email: storedEmail,
              role: localStorage.getItem("beaux-role") || sessionStorage.getItem("beaux-role") || "user",
              token: storedToken,
              access_token: storedToken, // ← Mismo valor que token
            };
            setUser(userData);
          } else {
            // Token inválido, limpiar storage
            console.warn("Token inválido, limpiando sesión");
            clearAuthStorage();
          }
        } else {
          clearAuthStorage();
        }
      } catch (error) {
        console.error("Error inicializando auth:", error);
        clearAuthStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [clearAuthStorage, validateToken]);

  // Login contra FastAPI
  const login = useCallback(
    async (email: string, password: string, remember: boolean = true): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}auth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            username: email,
            password: password,
          }),
        });

        if (!response.ok) {
          throw new Error("Credenciales incorrectas");
        }

        const data = await response.json();
        
        // Ajusta estos campos según lo que realmente devuelve tu backend
        const userData: User = {
          id: data.email, // o data.id si tu backend lo devuelve
          name: data.nombre || data.name || email.split('@')[0],
          email: data.email,
          role: data.rol || "user",
          token: data.access_token,
          access_token: data.access_token, // ← Mismo valor que token
        };

        setUser(userData);
        clearAuthStorage();

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("beaux-id", userData.id);
        storage.setItem("beaux-name", userData.name);
        storage.setItem("beaux-email", userData.email);
        storage.setItem("beaux-role", userData.role);
        storage.setItem("access_token", userData.token);

        return true;
      } catch (error) {
        console.error("Error en login:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [clearAuthStorage]
  );

  // Logout
  const logout = useCallback(() => {
    setUser(null);
    clearAuthStorage();
  }, [clearAuthStorage]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};