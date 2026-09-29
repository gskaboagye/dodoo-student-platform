"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Clock3,
  ArrowRight,
  X,
} from "lucide-react";

export default function Notifications({
  compact = false,
}) {
  const [notifications, setNotifications] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] =
    useState(0);

  async function loadNotifications() {
    try {
      const response = await fetch(
        "/api/notifications",
        {
          cache: "no-store",
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const items =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.notifications)
            ? data.notifications
            : [];

      setNotifications(items);

      const unread = items.filter(
        (notification) =>
          !notification.read &&
          !notification.isRead
      ).length;

      setUnreadCount(
        data?.unreadCount ?? unread
      );
    } catch (error) {
      console.error(
        "Notifications load error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(id) {
    if (!id) {
      return;
    }

    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          notificationId: id,
          read: true,
        }),
      });

      setNotifications((previous) =>
        previous.map((notification) =>
          String(
            notification._id ||
              notification.id
          ) === String(id)
            ? {
                ...notification,
                read: true,
                isRead: true,
              }
            : notification
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          markAllRead: true,
        }),
      });

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );
    }
  }

  function getNotificationId(notification) {
    return (
      notification?._id ||
      notification?.id
    );
  }

  function getNotificationLink(
    notification
  ) {
    return (
      notification?.link ||
      notification?.url ||
      "#"
    );
  }

  function getTime(notification) {
    const date =
      notification?.createdAt ||
      notification?.date;

    if (!date) {
      return "";
    }

    try {
      return new Date(
        date
      ).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        className={`relative flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 ${
          compact
            ? "h-10 w-10"
            : "h-11 w-11"
        }`}
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-bold text-slate-900 ring-2 ring-white">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />

          <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Notifications
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  Your latest platform updates.
                </p>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    title="Mark all as read"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex animate-pulse gap-3"
                    >
                      <div className="h-9 w-9 rounded-lg bg-slate-200" />

                      <div className="flex-1">
                        <div className="h-3 w-32 rounded bg-slate-200" />

                        <div className="mt-2 h-2.5 w-full rounded bg-slate-100" />

                        <div className="mt-2 h-2.5 w-20 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Bell size={20} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No notifications
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    You are all caught up.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications
                    .slice(0, 10)
                    .map((notification) => {
                      const id =
                        getNotificationId(
                          notification
                        );

                      const isRead =
                        Boolean(
                          notification?.read ??
                            notification?.isRead
                        );

                      return (
                        <div
                          key={
                            id ||
                            Math.random()
                          }
                          className={`relative px-4 py-4 transition ${
                            isRead
                              ? "bg-white"
                              : "bg-blue-50/50"
                          }`}
                        >
                          {!isRead && (
                            <span className="absolute left-2 top-6 h-2 w-2 rounded-full bg-blue-600" />
                          )}

                          <div className="flex gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                              <Bell size={15} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {notification.title ||
                                  "Notification"}
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {notification.message ||
                                  notification.description ||
                                  ""}
                              </p>

                              <div className="mt-2 flex items-center gap-3">
                                {getTime(
                                  notification
                                ) && (
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Clock3
                                      size={11}
                                    />
                                    {getTime(
                                      notification
                                    )}
                                  </span>
                                )}

                                {!isRead && id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markAsRead(
                                        id
                                      )
                                    }
                                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    Mark as read
                                  </button>
                                )}

                                {getNotificationLink(
                                  notification
                                ) !== "#" && (
                                  <Link
                                    href={getNotificationLink(
                                      notification
                                    )}
                                    onClick={() =>
                                      setOpen(false)
                                    }
                                    className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    Open
                                    <ArrowRight
                                      size={11}
                                    />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}