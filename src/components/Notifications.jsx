"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
} from "lucide-react";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  async function loadNotifications() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/notifications",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );

      setUnreadCount(
        Number(data.unreadCount) || 0
      );
    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL LOAD + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    loadNotifications();

    // Check for new notifications every 15 seconds.
    const interval = setInterval(
      loadNotifications,
      15000
    );

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =====================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // =====================================================

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  async function markAsRead(notification) {
    if (notification.read) {
      return;
    }

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            action: "markRead",
            notificationId:
              notification._id,
          }),
        }
      );

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id
            ? {
                ...item,
                read: true,
              }
            : item
        )
      );

      setUnreadCount((current) =>
        Math.max(current - 1, 0)
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  }

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            action: "markAllRead",
          }),
        }
      );

      if (!response.ok) {
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(date) {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      return "";
    }

    const now = new Date();

    const difference =
      now.getTime() -
      parsedDate.getTime();

    const seconds = Math.floor(
      difference / 1000
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days}d ago`;
    }

    return parsedDate.toLocaleDateString(
      "en-GH",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  // =====================================================
  // CLICK NOTIFICATION
  // =====================================================

  async function handleNotificationClick(
    notification
  ) {
    await markAsRead(notification);

    setOpen(false);

    if (notification.link) {
      window.location.href =
        notification.link;
    }
  }

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* =================================================
          NOTIFICATION BUTTON
      ================================================= */}

      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
      >
        <Bell size={21} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* =================================================
          NOTIFICATION DROPDOWN
      ================================================= */}

      {open && (
        <div className="absolute right-0 z-[100] mt-3 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

          {/* HEADER */}

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-bold text-slate-900">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <CheckCheck size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* NOTIFICATIONS */}

          <div className="max-h-[420px] overflow-y-auto">
            {loading &&
            notifications.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell size={24} />
                </div>

                <p className="mt-4 font-semibold text-slate-700">
                  No notifications
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  We'll let you know when
                  something changes.
                </p>
              </div>
            ) : (
              notifications.map(
                (notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() =>
                      handleNotificationClick(
                        notification
                      )
                    }
                    className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                      notification.read
                        ? "bg-white"
                        : "bg-blue-50/50"
                    }`}
                  >
                    <div className="flex gap-3">

                      {/* UNREAD DOT */}

                      <div className="pt-1.5">
                        <span
                          className={`block h-2.5 w-2.5 rounded-full ${
                            notification.read
                              ? "bg-slate-300"
                              : "bg-blue-600"
                          }`}
                        />
                      </div>

                      {/* CONTENT */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`text-sm ${
                              notification.read
                                ? "font-medium text-slate-700"
                                : "font-bold text-slate-900"
                            }`}
                          >
                            {notification.title}
                          </p>

                          {!notification.read && (
                            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                              New
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {notification.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(
                            notification.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              )
            )}
          </div>

          {/* FOOTER */}

          {notifications.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Check size={16} />

                {unreadCount > 0
                  ? "Mark all as read"
                  : "All notifications read"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}