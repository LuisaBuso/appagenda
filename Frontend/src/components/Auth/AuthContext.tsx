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
  access_token: string;
  pais?: string;
  sede_id?: string;
  nombre_local?: string;
  moneda?: string; // ← Agregar campo para moneda
  zona_horaria?: string; // ← Opcional: zona horaria
  telefono?: string; // ← Opcional: teléfono
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

// Función para obtener información del local por sede_id
const fetchLocalInfo = async (sede_id: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}admin/locales/${sede_id}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo local: ${response.status}`);
    }

    const data = await response.json();
    return {
      pais: data.pais || undefined,
      nombre_local: data.nombre || undefined,
      sede_id: data.sede_id || sede_id,
      moneda: data.moneda || undefined,
      zona_horaria: data.zona_horaria || undefined,
      telefono: data.telefono || undefined,
      direccion: data.direccion || undefined,
    };
  } catch (error) {
    console.error("Error obteniendo información del local:", error);
    return null;
  }
};

// Función para determinar sede_id basada en email - ACTUALIZADA CON TODAS LAS SEDES
const getSedeIdFromEmail = (email: string): string | undefined => {
  const emailSedeMap: Record<string, string> = {
    'rizosfelicesguayaquil@gmail.com': 'SD-28080',
    'rizosfelicessabaneta@gmail.com': 'SD-89958',
    'rizosfelicespereira@gmail.com': 'SD-28919',
    'info@rizosfelices.co': 'SD-40203',
    'rizosfelicesniquia@gmail.com': 'SD-26470',
    // Agrega más según sea necesario
  };
  
  // Buscar por email exacto
  if (emailSedeMap[email]) {
    return emailSedeMap[email];
  }
  
  // También puedes buscar por coincidencia parcial si es necesario
  for (const [key, value] of Object.entries(emailSedeMap)) {
    if (email.toLowerCase().includes(key.toLowerCase().split('@')[0])) {
      return value;
    }
  }
  
  return undefined;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Limpiar storage
  const clearAuthStorage = useCallback(() => {
    const keys = [
      "beaux-id", 
      "beaux-name", 
      "beaux-email", 
      "beaux-role", 
      "access_token",
      "beaux-pais",
      "beaux-sede_id",
      "beaux-nombre_local",
      "beaux-moneda",
      "beaux-zona_horaria",
      "beaux-telefono"
    ];
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
              access_token: storedToken,
              pais: localStorage.getItem("beaux-pais") || sessionStorage.getItem("beaux-pais") || undefined,
              sede_id: localStorage.getItem("beaux-sede_id") || sessionStorage.getItem("beaux-sede_id") || undefined,
              nombre_local: localStorage.getItem("beaux-nombre_local") || sessionStorage.getItem("beaux-nombre_local") || undefined,
              moneda: localStorage.getItem("beaux-moneda") || sessionStorage.getItem("beaux-moneda") || undefined,
              zona_horaria: localStorage.getItem("beaux-zona_horaria") || sessionStorage.getItem("beaux-zona_horaria") || undefined,
              telefono: localStorage.getItem("beaux-telefono") || sessionStorage.getItem("beaux-telefono") || undefined,
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
        // 1. Hacer login para obtener el token
        const loginResponse = await fetch(`${API_BASE_URL}auth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            username: email,
            password: password,
          }),
        });

        if (!loginResponse.ok) {
          throw new Error("Credenciales incorrectas");
        }

        const loginData = await loginResponse.json();
        
        // 2. Crear objeto de usuario básico
        const userData: User = {
          id: loginData.email || email,
          name: loginData.nombre || loginData.name || email.split('@')[0],
          email: email,
          role: loginData.rol || "user",
          token: loginData.access_token,
          access_token: loginData.access_token,
        };

        // 3. Obtener sede_id (del backend o del mapeo por email)
        let sede_id = loginData.sede_id || getSedeIdFromEmail(email);
        
        // 4. Si tenemos sede_id, obtener información del local (incluyendo país, moneda, etc.)
        if (sede_id && loginData.access_token) {
          const localInfo = await fetchLocalInfo(sede_id, loginData.access_token);
          
          if (localInfo) {
            // Actualizar userData con toda la información del local
            userData.pais = localInfo.pais;
            userData.sede_id = localInfo.sede_id;
            userData.nombre_local = localInfo.nombre_local;
            userData.moneda = localInfo.moneda;
            userData.zona_horaria = localInfo.zona_horaria;
            userData.telefono = localInfo.telefono;
          }
        }

        // 5. Establecer usuario y guardar en storage
        setUser(userData);
        clearAuthStorage();

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("beaux-id", userData.id);
        storage.setItem("beaux-name", userData.name);
        storage.setItem("beaux-email", userData.email);
        storage.setItem("beaux-role", userData.role);
        storage.setItem("access_token", userData.token);
        
        // Guardar información adicional si existe
        if (userData.pais) storage.setItem("beaux-pais", userData.pais);
        if (userData.sede_id) storage.setItem("beaux-sede_id", userData.sede_id);
        if (userData.nombre_local) storage.setItem("beaux-nombre_local", userData.nombre_local);
        if (userData.moneda) storage.setItem("beaux-moneda", userData.moneda);
        if (userData.zona_horaria) storage.setItem("beaux-zona_horaria", userData.zona_horaria);
        if (userData.telefono) storage.setItem("beaux-telefono", userData.telefono);

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