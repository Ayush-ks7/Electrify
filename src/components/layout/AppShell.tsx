import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationDrawer } from './NotificationDrawer';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useInvestigations } from '../../hooks/simulation';
import { SimulationPanel } from './SimulationPanel';

export function AppShell() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const investigations = useInvestigations();
  const unreadCount = (investigations.data ?? []).filter(r => r.requires_review && !['Dismissed', 'Resolved'].includes(r.case_status ?? '')).length;

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getPageMeta = (pathname: string) => {
    if (pathname.startsWith('/consumers/')) {
        return { title: 'Consumer Investigation', subtitle: 'Live readings, history, operational evidence and model explanations' };
    }
    switch (pathname) {
      case '/dashboard':
        return { title: 'Overview', subtitle: 'Live monitoring, consumer investigations and full-history review signals' };
      case '/consumers':
        return { title: 'Consumers & Investigations', subtitle: 'Consumption, evidence and case status in one record' };
      case '/system':
        return { title: 'Settings & System Diagnostics', subtitle: 'Backend health and locked model metadata' };
      default:
        return { title: 'Electrify Platform', subtitle: 'Grid Anomaly Intelligence' };
    }
  };

  const pageMeta = getPageMeta(location.pathname);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-xs flex-1 flex flex-col bg-slate-900 z-50">
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          unreadCount={unreadCount}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Search Modal */}
      <SimulationPanel />
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}
