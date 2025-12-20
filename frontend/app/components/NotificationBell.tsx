"use client";

import { useEffect, useRef, useState } from "react";
import { apiDelete, apiFetch, apiPut } from "@/lib/api";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, any>;
};

type NotificationsResponse = {
  notifications: Notification[];
  unread_count: number;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  async function loadNotifications() {
    try {
      const data = await apiFetch<NotificationsResponse>("/notifications/in-app?limit=10");
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      await apiPut(`/notifications/in-app/${notificationId}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }

  async function markAllAsRead() {
    try {
      await apiPut("/notifications/in-app/read-all", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      await apiDelete(`/notifications/in-app/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const deleted = notifications.find((n) => n.id === notificationId);
      if (deleted && !deleted.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  }

  function formatTime(createdAt: string) {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "milestone":
        return "🎉";
      case "position_alert":
        return "📊";
      case "journal_reminder":
        return "📝";
      default:
        return "🔔";
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-brand-400/30 hover:bg-slate-900/40 hover:text-white touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-96 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`border-b border-slate-800 p-4 hover:bg-slate-900/50 cursor-pointer ${
                    !notification.read ? "bg-slate-900/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-100">
                            {notification.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {notification.message}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            {formatTime(notification.created_at)}
                          </div>
                        </div>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-brand-400 flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-xs text-slate-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

