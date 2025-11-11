import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard";
import Performance from "./pages/Perfomance/Perfomance";
import Appointments from "./pages/Appoinment/Appointment";
import Products from "./pages/Products/Products";
import BeauxLogin from "./pages/LoginPage/LoginPage";
import { AuthProvider, useAuth } from "./components/Auth/AuthContext";
import "./App.css";

/** 🔒 Componente para proteger rutas privadas */
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth(); // Solo obtener user, sin loading

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/** 🌍 Enrutador principal */
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Login público */}
            <Route path="/" element={<BeauxLogin />} />

            {/* Rutas privadas */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <PrivateRoute>
                  <Performance />
                </PrivateRoute>
              }
            />
            <Route
              path="/appointments"
              element={
                <PrivateRoute>
                  <Appointments />
                </PrivateRoute>
              }
            />
            <Route
              path="/products"
              element={
                <PrivateRoute>
                  <Products />
                </PrivateRoute>
              }
            />

            {/* Cualquier otra ruta redirige al login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;