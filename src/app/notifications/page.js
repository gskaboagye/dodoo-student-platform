"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Bell,
  CheckCheck,
  Loader2,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  async function loadNotifications() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/notifications",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to load notifications."
        );
      }

      const loaded =
        Array.isArray(
          data?.notifications
        )
          ? data.notifications
          : [];

      setNotifications(loaded);

      setUnreadCount(
        Number(data?.unreadCount) ||
          loaded.filter(
            (notification) =>
              !notification.isRead
          ).length
      );
    } catch (err) {
      console.error(
        "NOTIFICATIONS PAGE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadNotifications();
  }, []);

  // =========================================================
  // MARK ONE AS READ
  // =========================================================

  async function markAsRead(
    notificationId
  ) {
    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: notificationId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notification as read."
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    isRead: true,
                  }
                : notification
          )
      );

      setUnreadCount(
        (current) =>
          Math.max(current - 1, 0)
      );
    } catch (err) {
      console.error(
        "MARK NOTIFICATION ERROR:",
        err
      );
    }
  }

  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            markAllRead: true,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notifications as read."
        );
      }

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              isRead: true,
            })
          )
      );

      setUnreadCount(0);
    } catch (err) {
      console.error(
        "MARK ALL NOTIFICATIONS ERROR:",
        err
      );
    }
  }

  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  async function openNotification(
    notification
  ) {
    if (!notification.isRead) {
      await markAsRead(
        notification.id
      );
    }

    if (notification.link) {
      window.location.href =
        notification.link;
    }
  }

  // =========================================================
  // FORMAT DATE
  // =========================================================

  function formatDate(
    createdAt
  ) {
    if (!createdAt) {
      return "";
    }

    const date =
      new Date(createdAt);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleString(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="min-h-[calc(100vh-92px)] bg-slate-50 px-6 py-8 lg:px-10">

      {/* HEADER */}

      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <Link
              href="/"
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-600
              "
            >
              <ArrowLeft
                size={19}
              />
            </Link>

            <div>

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Bell size={21} />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Notifications
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    Your latest platform updates.
                  </p>
                </div>

              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={
              markAllAsRead
            }
            disabled={
              unreadCount === 0
            }
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-blue-600
              px-4
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:bg-slate-200
              disabled:text-slate-400
            "
          >
            <CheckCheck
              size={17}
            />

            Mark all as read
          </button>

        </div>

        {/* =================================================
            SUMMARY
        ================================================== */}

        {!loading &&
          !error && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-slate-200 bg-white p-5">

                <p className="text-sm font-medium text-slate-500">
                  Total notifications
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    notifications.length
                  }
                </p>

              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">

                <p className="text-sm font-medium text-blue-600">
                  Unread notifications
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {unreadCount}
                </p>

              </div>

            </div>
          )}

        {/* =================================================
            CONTENT
        ================================================== */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

          {loading && (
            <div className="flex min-h-[300px] items-center justify-center">

              <div className="flex items-center gap-3 text-sm text-slate-500">

                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Loading notifications...

              </div>

            </div>
          )}

          {!loading &&
            error && (
              <div className="px-6 py-16 text-center">

                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Bell size={20} />
                </div>

                <h2 className="text-lg font-semibold text-slate-800">
                  Unable to load notifications
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={
                    loadNotifications
                  }
                  className="
                    mt-5
                    rounded-xl
                    bg-blue-600
                    px-5
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    hover:bg-blue-700
                  "
                >
                  Try again
                </button>

              </div>
            )}

          {!loading &&
            !error &&
            notifications.length ===
              0 && (
              <div className="px-6 py-16 text-center">

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Bell size={24} />
                </div>

                <h2 className="text-lg font-semibold text-slate-800">
                  No notifications
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  You are all caught up.
                </p>

              </div>
            )}

          {!loading &&
            !error &&
            notifications.length >
              0 && (
              <div className="divide-y divide-slate-100">

                {notifications.map(
                  (notification) => (
                    <button
                      key={
                        notification.id
                      }
                      type="button"
                      onClick={() =>
                        openNotification(
                          notification
                        )
                      }
                      className={`
                        w-full
                        px-6
                        py-5
                        text-left
                        transition
                        hover:bg-slate-50
                        ${
                          notification.isRead
                            ? "bg-white"
                            : "bg-blue-50/50"
                        }
                      `}
                    >

                      <div className="flex gap-4">

                        <div
                          className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              notification.isRead
                                ? "bg-slate-100 text-slate-500"
                                : "bg-blue-100 text-blue-600"
                            }
                          `}
                        >
                          <Bell
                            size={19}
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-4">

                            <div className="flex items-center gap-2">

                              <h3
                                className={`
                                  text-sm
                                  ${
                                    notification.isRead
                                      ? "font-medium text-slate-700"
                                      : "font-bold text-slate-900"
                                  }
                                `}
                              >
                                {notification.title ||
                                  "Platform Notification"}
                              </h3>

                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-600" />
                              )}

                            </div>

                            {notification.link && (
                              <ExternalLink
                                size={16}
                                className="shrink-0 text-slate-400"
                              />
                            )}

                          </div>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {
                              notification.message
                            }
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-3">

                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {notification.type ||
                                "platform"}
                            </span>

                            <span className="text-xs text-slate-400">
                              {formatDate(
                                notification.createdAt
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

        </div>

      </div>

    </main>
  );
}