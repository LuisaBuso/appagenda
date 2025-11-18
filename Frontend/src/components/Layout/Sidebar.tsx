import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  UserCircle, 
  List, 
  Package, 
  CreditCard, 
  Scissors,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard", // ✅ CORREGIDO: era "/" ahora "/dashboard"
    icon: LayoutDashboard,
  },
  {
    title: "Performance",
    href: "/performance",
    icon: TrendingUp,
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Users,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: UserCircle,
    disabled: true,
  },
  {
    title: "Services",
    href: "/services",
    icon: List,
    disabled: true,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Billing",
    href: "/billing",
    icon: CreditCard,
    disabled: true,
  },
  {
    title: "Stylists",
    href: "/stylists",
    icon: Scissors,
    disabled: true,
  },
];

export function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (item: NavItem) => {
    if (!item.disabled) {
      navigate(item.href);
      setIsMobileOpen(false); // Cerrar sidebar en móvil al navegar
    }
  };

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
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r bg-white transform transition-transform duration-300 ease-in-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo - Desktop */}
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold tracking-tight">BEAUX</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 mt-16 lg:mt-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-[oklch(0.95_0.05_280)] text-[oklch(0.55_0.25_280)]" : "text-gray-700 hover:bg-gray-100",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
                disabled={item.disabled}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}