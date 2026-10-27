import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Terminal,
  Building2,
  History,
  FileSpreadsheet,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Student Registry', path: '/students', icon: Users },
  { name: 'Integrity Cases', path: '/cases', icon: ShieldAlert },
  { name: 'Verification Sandbox', path: '/sandbox', icon: Terminal, badge: 'SIM' },
  { name: 'Institutions', path: '/institutions', icon: Building2 },
  { name: 'Audit Trail', path: '/audit', icon: History },
  { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
  { name: 'Settings', path: '/settings', icon: Sliders },
];

export const Sidebar: React.FC = () => {
  const { settings, toggleSidebar } = useAppearance();
  const collapsed = settings.sidebarCollapsed;

  return (
    <aside
      className={`bg-surface border-r border-institutional flex flex-col h-screen select-none shrink-0 z-20 transition-all duration-200 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Product Branding Header */}
      <div className="p-4 border-b border-institutional flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-institutional-primary flex items-center justify-center text-white shadow-xs shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-institutional-main tracking-tight truncate">
                Enrolment Integrity
              </h1>
              <p className="text-[11px] text-institutional-muted truncate">
                Institutional APAAR Suite
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded-md text-institutional-muted hover:text-institutional-main hover:bg-surface-secondary transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>


      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-institutional-selected text-institutional-primary font-semibold'
                    : 'text-institutional-main hover:bg-surface-secondary hover:text-institutional-primary'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!collapsed && item.badge && (
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Institutional Node Details */}
      {!collapsed ? (
        <div className="p-3 bg-surface-secondary/40 border-t border-institutional text-xs">
          <div className="text-[11px] text-institutional-muted flex items-center justify-between">
            <span>Primary Node:</span>
            <span className="font-mono text-institutional-primary font-semibold">AICTE-1-432890123</span>
          </div>
          <div className="text-[10px] text-institutional-muted/80 mt-1">
            Apex Institute of Technology
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-institutional flex justify-center text-institutional-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
        </div>
      )}
    </aside>
  );
};
