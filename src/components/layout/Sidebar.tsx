import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  BellRing,
  BarChart3,
  ShieldCheck,
  Cpu,
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

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Consumers', href: '/consumers', icon: Users },
    { label: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
    { label: 'Alerts / Cases', href: '/alerts', icon: BellRing },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Data Quality', href: '/data-quality', icon: ShieldCheck },
    { label: 'System & ML', href: '/system', icon: Cpu },
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
                Grid Intelligence v2.4
              </span>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded bg-[#0F52BA] flex items-center justify-center text-white font-bold">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

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

      {/* Pipeline Status Indicator in Sidebar */}
      {!collapsed && (
        <div className="m-3 p-2.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Pipeline Core
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <div className="text-slate-300 font-mono text-[10px]">
            1.48M Records Ingested
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-800 flex items-center justify-end">
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
