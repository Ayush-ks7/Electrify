import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NotificationDrawer } from './NotificationDrawer';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useNotifications } from '../../hooks';

export function AppShell() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

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
      return { title: 'Consumer Intelligence Dossier', subtitle: 'Detailed load analytics, anomaly attribution, and evidence' };
    }
    if (pathname.startsWith('/anomalies/')) {
      return { title: 'Anomaly Forensic Analysis', subtitle: 'Multi-model signal breakdown, temporal vectors, and audit log' };
    }
    switch (pathname) {
      case '/dashboard':
        return { title: 'Overview', subtitle: 'Operational priorities, critical alerts, and active anomaly queues' };
      case '/consumers':
        return { title: 'Consumers', subtitle: 'Search, filter, and audit metered connections and risk indices' };
      case '/anomalies':
        return { title: 'Anomalies', subtitle: 'Registry of statistical, isolation forest, and temporal outliers' };
      case '/cases':
      case '/alerts':
        return { title: 'Cases', subtitle: 'Investigation queue, operator workflow, and status resolution' };
      case '/analytics':
        return { title: 'Analytics', subtitle: 'Aggregate trends, cause breakdowns, and diurnal profiles' };
      case '/data-quality':
        return { title: 'Data Quality', subtitle: 'Telemetry sanitization, missing intervals, and sensor health' };
      case '/system':
        return { title: 'Settings & System Diagnostics', subtitle: 'Module runtime status and ML performance metrics' };
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
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  );
}
