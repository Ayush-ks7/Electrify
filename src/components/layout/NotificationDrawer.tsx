import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { X, Check, Bell, ExternalLink, CheckCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../utils/classNames';

export interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDrawerProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0F52BA]" />
              <h3 className="text-sm font-semibold text-slate-900">Platform Notifications</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-[#0F52BA]">
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMarkAllAsRead}
                className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No notifications to display.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'p-4 transition-colors relative',
                    !n.isRead ? 'bg-blue-50/20' : 'bg-white'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0F52BA] shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-slate-900 leading-snug">
                        {n.title}
                      </span>
                    </div>
                    <SeverityBadge severity={n.severity} size="sm" />
                  </div>

                  {n.consumerId && (
                    <div className="text-[11px] text-slate-500 font-mono mb-1">
                      {n.consumerId} {n.meterId ? `• Meter: ${n.meterId}` : ''}
                    </div>
                  )}

                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">{n.message}</p>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">{n.timestamp}</span>
                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <button
                          onClick={() => onMarkAsRead(n.id)}
                          className="text-slate-500 hover:text-slate-800 text-[10px] font-medium"
                        >
                          Mark read
                        </button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          navigate(n.actionUrl);
                          onMarkAsRead(n.id);
                          onClose();
                        }}
                      >
                        {n.actionText}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
