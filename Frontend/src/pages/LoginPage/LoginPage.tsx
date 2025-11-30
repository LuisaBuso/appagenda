import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../components/Auth/AuthContext";

const BeauxLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password, rememberMe);

      if (success) {
        // 🔹 Obtener el rol del usuario desde storage
        const storedRole =
          localStorage.getItem("beaux-role") ||
          sessionStorage.getItem("beaux-role");

        // 🔹 Redirigir según el rol
        switch (storedRole) {
          case "super_admin":
            navigate("/superadmin/dashboard");
            break;
          case "admin_sede":
            navigate("/sede/dashboard");
            break;
          case "estilista":
            navigate("/stylist/appointments");
            break;
          default:
            navigate("/unauthorized");
            break;
        }
      } else {
        setError("Credenciales incorrectas o servidor no disponible.");
      }
    } catch (err) {
      console.error(err);
      setError("Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BEAUX</h1>
          <p className="text-gray-600">Bienvenido de vuelta</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Recordarme</span>
              </label>
              <button
                type="button"
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-all"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              {!isLoading && <ArrowRight className="ml-2 inline h-5 w-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BeauxLogin;
