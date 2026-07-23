'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Wifi,
  Package,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  DollarSign,
  BarChart3,
  Boxes,
  ChevronDown,
  Send,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  href?: string;
  label: string;
  icon?: any;
  items?: MenuItem[];
}

const menuStructure: MenuItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Comercial',
    icon: BarChart3,
    items: [
      { href: '/plans', label: 'Planes', icon: Wifi },
      { href: '/clients', label: 'Clientes', icon: Users },
    ],
  },
  {
    label: 'Finanzas',
    icon: Wallet,
    items: [
      { href: '/incomes', label: 'Ingresos', icon: DollarSign },
      { href: '/payments', label: 'Egresos', icon: Send },
      { href: '/liabilities', label: 'Pasivos', icon: CreditCard },
      { href: '/expenses', label: 'Gastos', icon: Wallet },
      { href: '/utilidad', label: 'Utilidad', icon: TrendingUp },
      { href: '/cash', label: 'Caja', icon: Building2 },
    ],
  },
  { href: '/assets', label: 'Activos', icon: Package },
  { href: '/inventory', label: 'Inventario', icon: Boxes },
  { href: '/history', label: 'Historial', icon: History },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { logout, username } = useAuth();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const isGroupActive = (items: MenuItem[]) => {
    return items.some((item) => item.href && isActive(item.href));
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderItem = (item: MenuItem, isSub = false) => {
    if (item.items) {
      const open = openGroups[item.label] ?? isGroupActive(item.items);
      const Icon = item.icon;
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleGroup(item.label)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              isGroupActive(item.items)
                ? 'text-primary-600 bg-primary-50'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
            title={collapsed ? item.label : undefined}
          >
            {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${isGroupActive(item.items) ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600'}`} />}
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">{item.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
          {!collapsed && open && (
            <div className="ml-4 mt-1 space-y-0.5">
              {item.items.map((sub) => renderItem(sub, true))}
            </div>
          )}
        </div>
      );
    }

    const Icon = item.icon;
    const active = item.href ? isActive(item.href) : false;
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={`flex items-center gap-3 ${isSub ? 'px-3 py-2 ml-2' : 'px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-200 group ${
          active
            ? 'bg-primary-500 text-white shadow-md'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
        title={collapsed ? item.label : undefined}
      >
        {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />}
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-50 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="text-base font-bold text-gray-800 truncate">ISP Manager</h1>
              <p className="text-xs text-gray-400 truncate">Sistema de Administracion</p>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuStructure.map((item) => renderItem(item))}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {!collapsed && username && (
          <p className="text-xs text-gray-400 mb-2 px-3 truncate">{username}</p>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full group"
          title={collapsed ? 'Cerrar sesion' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-red-500" />
          {!collapsed && <span className="truncate">Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  );
}
