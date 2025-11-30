import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  CreditCard,
  Home,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../Auth/AuthContext';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  // SUPER ADMIN
  { title: 'Dashboard', href: '/superadmin/dashboard', icon: LayoutDashboard, roles: ['super_admin'] },
  { title: 'Performance', href: '/superadmin/performance', icon: TrendingUp, roles: ['super_admin'] },
  { title: 'Agenda', href: '/superadmin/appointments', icon: Users, roles: ['super_admin'] },
  { title: 'Products', href: '/superadmin/products', icon: Package, roles: ['super_admin'] },
  { title: 'Clientes', href: '/superadmin/clients', icon: Users, roles: ['super_admin'] },
  { title: 'Comisiones', href: '/superadmin/commissions', icon: CreditCard, roles: ['super_admin'] },
  { title: 'Sedes', href: '/superadmin/sedes', icon: Home, roles: ['super_admin'] },
  { title: 'Estilistas', href: '/superadmin/stylists', icon: Users, roles: ['super_admin'] },
  { title: 'Servicios', href: '/superadmin/services', icon: Package, roles: ['super_admin'] },

  // ADMIN SEDE
  { title: 'Dashboard', href: '/sede/dashboard', icon: LayoutDashboard, roles: ['admin_sede'] },
  { title: 'Performance', href: '/sede/performance', icon: TrendingUp, roles: ['admin_sede'] },
  { title: 'Agenda', href: '/sede/appointments', icon: Users, roles: ['admin_sede'] },
  { title: 'Productos', href: '/sede/products', icon: Package, roles: ['admin_sede'] },
  { title: 'Clientes', href: '/sede/clients', icon: Users, roles: ['admin_sede'] },

  // ESTILISTA
  { title: 'Agenda', href: '/stylist/appointments', icon: Users, roles: ['estilista'] },
  { title: 'Comisiones', href: '/stylist/commissions', icon: CreditCard, roles: ['estilista'] },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth(); // Añadir logout del contexto de autenticación
  const location = useLocation();
  const navigate = useNavigate();

  // Obtener el rol desde AuthContext o storage
  const getStoredRole = (): string | null => {
    return (
      localStorage.getItem('beaux-rol') ||
      sessionStorage.getItem('beaux-rol') ||
      (user ? user.role : null)
    );
  };

  const handleNavigation = (item: NavItem) => {
    navigate(item.href);
    setIsMobileOpen(false);
  };

  // Función para cerrar sesión
  const handleLogout = () => {
    // Limpiar todos los tokens y datos de localStorage
    localStorage.removeItem('beaux-rol');
    localStorage.removeItem('beaux-name');
    localStorage.removeItem('beaux-id');
    localStorage.removeItem('beaux-email');
    localStorage.removeItem('access_token');
    
    // Limpiar todos los tokens y datos de sessionStorage
    sessionStorage.removeItem('beaux-rol');
    sessionStorage.removeItem('beaux-name');
    sessionStorage.removeItem('beaux-id');
    sessionStorage.removeItem('beaux-email');
    sessionStorage.removeItem('access_token');
    
    // Llamar a la función logout del contexto de autenticación si existe
    if (logout) {
      logout();
    }
    
    // Redirigir al login
    navigate('/login');
    setIsMobileOpen(false);
  };

  // Filtrar ítems visibles según rol
  const visibleItems = navItems.filter((item) => {
    const userRole = getStoredRole();
    return item.roles?.includes(userRole || '');
  });

  // 🚀 Redirección automática según el rol (después del login)
  useEffect(() => {
    const userRole = getStoredRole();
    const currentPath = location.pathname;

    if (userRole) {
      const defaultRoutes: Record<string, string> = {
        super_admin: '/superadmin/dashboard',
        admin_sede: '/sede/dashboard',
        estilista: '/stylist/appointments',
      };

      const targetRoute = defaultRoutes[userRole];
      if (targetRoute && currentPath === '/') {
        navigate(targetRoute);
      }
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    console.log('Rol del usuario:', getStoredRole());
    console.log('Items visibles:', visibleItems.map((item) => item.title));
  }, [user]);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">BEAUX</h1>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r bg-white transform transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold tracking-tight">BEAUX</h1>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 mt-16 lg:mt-0">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[oklch(0.95_0.05_280)] text-[oklch(0.55_0.25_280)]'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </button>
              );
            })
          ) : (
            <div className="text-center text-gray-500 py-4">
              No hay items disponibles para tu rol
            </div>
          )}
        </nav>

        {/* Botón de Cerrar Sesión */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
}