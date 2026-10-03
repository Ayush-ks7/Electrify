import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const location = useLocation();

  const primaryNavItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Investigations', href: '/consumers', icon: Users },
  ];

  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-all duration-200 select-none z-30 shrink-0 sticky top-0',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800 px-3.5 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-[#0F52BA] flex items-center justify-center text-white shrink-0 font-bold">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wider text-white uppercase block leading-none">
                ELECTRIFY
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight">
                Grid Intelligence
              </span>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded bg-[#0F52BA] flex items-center justify-center text-white font-bold">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' &&
              (location.pathname.startsWith(item.href) ||
                (item.href === '/cases' && location.pathname.startsWith('/alerts'))));

          return (
            <NavLink
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors relative group',
                isActive
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0F52BA] rounded-r" />
              )}
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-[#0F52BA]' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Secondary Bottom Navigation (Settings / System) */}
      <div className="p-2 border-t border-slate-800 space-y-1">
        <NavLink
          to="/system"
          title={collapsed ? 'Settings & System' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded text-xs font-medium transition-colors relative group',
            location.pathname.startsWith('/system')
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          )}
        >
          {location.pathname.startsWith('/system') && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#0F52BA] rounded-r" />
          )}
          <Settings
            className={cn(
              'w-4 h-4 shrink-0 transition-colors',
              location.pathname.startsWith('/system')
                ? 'text-[#0F52BA]'
                : 'text-slate-400 group-hover:text-slate-200'
            )}
          />
          {!collapsed && <span className="truncate">Settings & System</span>}
        </NavLink>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors w-full flex items-center justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
