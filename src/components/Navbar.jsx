"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Info,
  Loader2,
  LogOut,
  Search,
  UserRound,
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] =
    useState(false);
  const [notificationsError, setNotificationsError] =
    useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // =========================================================
  // LOAD CURRENT USER
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error(
          "Navbar user loading error:",
          error
        );

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  async function loadNotifications({
    silent = false,
  } = {}) {
    try {
      if (!silent) {
        setNotificationsLoading(true);
      }

      setNotificationsError("");

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

      // -----------------------------------------------------
      // USER IS NOT LOGGED IN
      // -----------------------------------------------------

      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to load notifications."
        );
      }

      const loadedNotifications =
        Array.isArray(data?.notifications)
          ? data.notifications
          : [];

      setNotifications(loadedNotifications);

      // -----------------------------------------------------
      // SERVER UNREAD COUNT
      // -----------------------------------------------------

      const serverUnreadCount =
        Number.isFinite(
          Number(data?.unreadCount)
        )
          ? Number(data.unreadCount)
          : loadedNotifications.filter(
              (notification) =>
                notification.read !== true
            ).length;

      setUnreadCount(serverUnreadCount);
    } catch (error) {
      console.error(
        "NOTIFICATIONS LOAD ERROR:",
        error
      );

      if (!silent) {
        setNotificationsError(
          error?.message ||
            "Unable to load notifications."
        );
      }
    } finally {
      if (!silent) {
        setNotificationsLoading(false);
      }
    }
  }

  // =========================================================
  // LOAD NOTIFICATIONS AFTER USER IS KNOWN
  // =========================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();

    // Refresh notifications every 15 seconds.
    const interval = setInterval(() => {
      loadNotifications({
        silent: true,
      });
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // =========================================================
  // REFRESH WHEN TAB BECOMES ACTIVE
  // =========================================================

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadNotifications({
          silent: true,
        });
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, []);

  // =========================================================
  // CLOSE MENUS WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // LISTEN FOR LOGOUT FROM OTHER COMPONENTS
  // =========================================================

  useEffect(() => {
    function handleLogout() {
      setUser(null);
      setProfileOpen(false);
      setNotificationsOpen(false);
      setNotifications([]);
      setUnreadCount(0);
      setLoggingOut(true);
    }

    window.addEventListener(
      "dcc-auth-logout",
      handleLogout
    );

    return () => {
      window.removeEventListener(
        "dcc-auth-logout",
        handleLogout
      );
    };
  }, []);

  // =========================================================
  // MARK ONE NOTIFICATION AS READ
  // =========================================================

  async function markNotificationAsRead(
    notificationId
  ) {
    if (!notificationId) {
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
            id: notificationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notification as read."
        );
      }

      // -----------------------------------------------------
      // IMPORTANT:
      // The backend uses "read", not "isRead".
      // -----------------------------------------------------

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );

      setUnreadCount((current) =>
        Math.max(current - 1, 0)
      );
    } catch (error) {
      console.error(
        "MARK NOTIFICATION READ ERROR:",
        error
      );
    }
  }

  // =========================================================
  // MARK ALL NOTIFICATIONS AS READ
  // =========================================================

  async function markAllNotificationsAsRead() {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notifications as read."
        );
      }

      // -----------------------------------------------------
      // IMPORTANT:
      // The backend uses "read", not "isRead".
      // -----------------------------------------------------

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error(
        "MARK ALL NOTIFICATIONS READ ERROR:",
        error
      );
    }
  }

  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  async function handleNotificationClick(
    notification
  ) {
    if (!notification) {
      return;
    }

    // Mark unread notification as read first.
    if (!notification.read) {
      await markNotificationAsRead(
        notification.id
      );
    }

    setNotificationsOpen(false);

    // Navigate to the notification link
    // if one was provided.
    if (notification.link) {
      window.location.href =
        notification.link;
    }
  }

  // =========================================================
  // FORMAT NOTIFICATION DATE
  // =========================================================

  function formatNotificationDate(
    createdAt
  ) {
    if (!createdAt) {
      return "";
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    const difference =
      now.getTime() - date.getTime();

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

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  // =========================================================
  // GET NOTIFICATION TYPE LABEL
  // =========================================================

  function getNotificationIcon(type) {
    if (type === "attendance") {
      return "Attendance";
    }

    if (type === "progress") {
      return "Progress";
    }

    if (type === "student-request") {
      return "Application";
    }

    if (type === "project") {
      return "Project";
    }

    return "Platform";
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);
    setUser(null);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadCount(0);

    window.dispatchEvent(
      new Event("dcc-auth-logout")
    );

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control":
              "no-cache",
          },
          keepalive: true,
        }
      );
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      window.location.replace(
        "/login"
      );
    }
  }

  // =========================================================
  // USER INITIALS
  // =========================================================

  function getInitials() {
    if (!user) {
      return "U";
    }

    if (user.name) {
      const parts = user.name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (parts.length >= 2) {
        return (
          parts[0][0] +
          parts[parts.length - 1][0]
        ).toUpperCase();
      }

      if (parts[0]) {
        return parts[0]
          .slice(0, 2)
          .toUpperCase();
      }
    }

    if (user.email) {
      return user.email
        .slice(0, 2)
        .toUpperCase();
    }

    return "U";
  }

  // =========================================================
  // DISPLAY NAME
  // =========================================================

  function getDisplayName() {
    if (!user) {
      return "User";
    }

    return (
      user.name ||
      user.email ||
      "User"
    );
  }

  // =========================================================
  // ROLE LABEL
  // =========================================================

  function getRoleLabel() {
    if (!user?.role) {
      return "User";
    }

    if (user.role === "facilitator") {
      return "Facilitator";
    }

    if (user.role === "student") {
      return "Student";
    }

    return user.role;
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white lg:block">
      <div className="flex h-[92px] items-center justify-between px-8">

        {/* =================================================
            LEFT BRAND
        ================================================== */}

        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <div className="min-w-0">
            <p className="text-base font-extrabold tracking-[0.18em] text-blue-600">
              DODOO CODING CLUB
            </p>

            <p className="mt-1 text-lg font-medium text-slate-500">
              Student Success Platform
            </p>
          </div>
        </Link>

        {/* =================================================
            RIGHT SIDE
        ================================================== */}

        <div className="flex items-center gap-3">

          {/* =================================================
              SEARCH
          ================================================== */}

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              placeholder="Search..."
              className="
                h-13
                w-[330px]
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                pl-12
                pr-4
                text-sm
                text-slate-700
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-blue-300
                focus:bg-white
                focus:ring-4
                focus:ring-blue-50
              "
            />
          </div>

          {/* =================================================
              NOTIFICATIONS
          ================================================== */}

          <div
            ref={notificationRef}
            className="relative"
          >
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={
                notificationsOpen
              }
              onClick={() => {
                setNotificationsOpen(
                  (value) => !value
                );

                setProfileOpen(false);

                if (!notificationsOpen) {
                  loadNotifications();
                }
              }}
              className="
                relative
                flex
                h-13
                w-13
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
              <Bell size={21} />

              {/* ------------------------------------------------
                  UNREAD COUNT
              ------------------------------------------------- */}

              {unreadCount > 0 && (
                <span
                  className="
                    absolute
                    -right-1
                    -top-1
                    flex
                    min-h-5
                    min-w-5
                    items-center
                    justify-center
                    rounded-full
                    bg-red-500
                    px-1.5
                    text-[10px]
                    font-bold
                    text-white
                    ring-2
                    ring-white
                  "
                >
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {/* =================================================
                NOTIFICATION DROPDOWN
            ================================================== */}

            {notificationsOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-[58px]
                  z-50
                  w-[390px]
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  shadow-2xl
                "
              >

                {/* =================================================
                    HEADER
                ================================================== */}

                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Notifications
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Your latest platform updates.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      markAllNotificationsAsRead
                    }
                    disabled={
                      unreadCount === 0 ||
                      notificationsLoading
                    }
                    className="
                      flex
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-2
                      text-xs
                      font-semibold
                      text-blue-600
                      transition
                      hover:bg-blue-50
                      disabled:cursor-not-allowed
                      disabled:opacity-40
                    "
                  >
                    <CheckCheck
                      size={15}
                    />

                    Mark all read
                  </button>
                </div>

                {/* =================================================
                    CONTENT
                ================================================== */}

                <div className="max-h-[420px] overflow-y-auto">

                  {/* ------------------------------------------------
                      LOADING
                  ------------------------------------------------- */}

                  {notificationsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Loading notifications...
                    </div>

                  ) : notificationsError ? (

                    /* ------------------------------------------------
                       ERROR
                    ------------------------------------------------- */

                    <div className="px-5 py-8 text-center">

                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <Info size={18} />
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        Unable to load notifications
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {notificationsError}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          loadNotifications()
                        }
                        className="
                          mt-4
                          rounded-lg
                          bg-blue-600
                          px-4
                          py-2
                          text-xs
                          font-semibold
                          text-white
                          transition
                          hover:bg-blue-700
                        "
                      >
                        Try again
                      </button>
                    </div>

                  ) : notifications.length ===
                    0 ? (

                    /* ------------------------------------------------
                       EMPTY STATE
                    ------------------------------------------------- */

                    <div className="px-5 py-10 text-center">

                      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Bell size={20} />
                      </div>

                      <p className="text-sm font-semibold text-slate-700">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        You are all caught up.
                      </p>
                    </div>

                  ) : (

                    /* ------------------------------------------------
                       NOTIFICATION LIST
                    ------------------------------------------------- */

                    <div className="divide-y divide-slate-100">

                      {notifications.map(
                        (notification) => (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                            className={`
                              w-full
                              px-5
                              py-4
                              text-left
                              transition
                              hover:bg-slate-50
                              ${
                                notification.read
                                  ? "bg-white"
                                  : "bg-blue-50/60"
                              }
                            `}
                          >
                            <div className="flex gap-3">

                              {/* =================================================
                                  ICON
                              ================================================== */}

                              <div
                                className={`
                                  mt-0.5
                                  flex
                                  h-9
                                  w-9
                                  shrink-0
                                  items-center
                                  justify-center
                                  rounded-lg
                                  ${
                                    notification.read
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-blue-100 text-blue-600"
                                  }
                                `}
                              >
                                <Bell
                                  size={16}
                                />
                              </div>

                              {/* =================================================
                                  TEXT
                              ================================================== */}

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-3">

                                  <p
                                    className={`
                                      text-sm
                                      ${
                                        notification.read
                                          ? "font-medium text-slate-700"
                                          : "font-bold text-slate-900"
                                      }
                                    `}
                                  >
                                    {notification.title ||
                                      "Platform Notification"}
                                  </p>

                                  {/* ------------------------------------------------
                                      UNREAD DOT
                                  ------------------------------------------------- */}

                                  {!notification.read && (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </div>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {notification.message}
                                </p>

                                <div className="mt-2 flex items-center justify-between gap-3">

                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    {getNotificationIcon(
                                      notification.type
                                    )}
                                  </span>

                                  <span className="text-[10px] text-slate-400">
                                    {formatNotificationDate(
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

                {/* =================================================
                    FOOTER
                ================================================== */}

                {notifications.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">

                    <Link
                      href="/notifications"
                      onClick={() =>
                        setNotificationsOpen(
                          false
                        )
                      }
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        text-xs
                        font-semibold
                        text-blue-600
                        transition
                        hover:text-blue-700
                      "
                    >
                      View all notifications

                      <ExternalLink
                        size={13}
                      />
                    </Link>

                  </div>
                )}

              </div>
            )}
          </div>

          {/* =================================================
              PROFILE
          ================================================== */}

          {!loading && user && (
            <div
              ref={profileRef}
              className="relative"
            >

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(
                    (value) => !value
                  );

                  setNotificationsOpen(
                    false
                  );
                }}
                className="
                  flex
                  h-13
                  items-center
                  gap-3
                  rounded-xl
                  px-2.5
                  transition
                  hover:bg-slate-50
                "
              >

                {/* =================================================
                    AVATAR
                ================================================== */}

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {getInitials()}
                </div>

                {/* =================================================
                    USER
                ================================================== */}

                <div className="max-w-[180px] text-left">

                  <p className="truncate text-sm font-bold text-slate-800">
                    {getDisplayName()}
                  </p>

                  <p className="text-xs text-slate-500">
                    {getRoleLabel()}
                  </p>

                </div>

                <ChevronDown
                  size={18}
                  className={`
                    ml-1
                    text-slate-400
                    transition-transform
                    ${
                      profileOpen
                        ? "rotate-180"
                        : ""
                    }
                  `}
                />

              </button>

              {/* =================================================
                  PROFILE DROPDOWN
              ================================================== */}

              {profileOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[58px]
                    z-50
                    w-64
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-xl
                  "
                >

                  {/* =================================================
                      PROFILE HEADER
                  ================================================== */}

                  <div className="border-b border-slate-100 px-4 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {getInitials()}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-bold text-slate-800">
                          {getDisplayName()}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {user.email}
                        </p>

                      </div>

                    </div>
                  </div>

                  {/* =================================================
                      PROFILE LINKS
                  ================================================== */}

                  <div className="p-2">

                    <Link
                      href="/profile"
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-2.5
                        text-sm
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                      "
                    >
                      <UserRound
                        size={17}
                      />

                      Profile
                    </Link>

                    <Link
                      href="/about"
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="
                        flex
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-2.5
                        text-sm
                        font-medium
                        text-slate-700
                        transition
                        hover:bg-slate-50
                      "
                    >
                      <Info size={17} />

                      About Platform
                    </Link>

                    <div className="my-2 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      disabled={loggingOut}
                      className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-lg
                        px-3
                        py-2.5
                        text-sm
                        font-semibold
                        text-red-600
                        transition
                        hover:bg-red-50
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                      "
                    >
                      <LogOut
                        size={17}
                      />

                      {loggingOut
                        ? "Logging out..."
                        : "Logout"}
                    </button>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}