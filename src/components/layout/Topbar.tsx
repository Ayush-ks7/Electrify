import React from 'react';
import { Search, Bell, Menu, User, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface TopbarProps {
  title: string;
  subtitle?: string;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onToggleMobileSidebar: () => void;
}

export function Topbar({
  title,
  subtitle,
  onOpenSearch,
  onOpenNotifications,
  unreadCount,
  onToggleMobileSidebar,
}: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-none">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Search + Notifications + User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search consumer, meter, alert...</span>
          <span className="hidden sm:inline font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-600">
            Ctrl+K
          </span>
        </button>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Operator Profile Menu */}
        <div className="flex items-center gap-2 pl-1 select-none">
          <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
            AS
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">
              Ayush Sharma
            </div>
            <div className="text-[10px] text-slate-500 font-mono leading-tight">
              Lead Analyst
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
