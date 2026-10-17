"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ExternalLink,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Search,
  UsersRound,
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] =
    useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  // Global search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchStudents, setSearchStudents] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const searchRef = useRef(null);

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
          if (!cancelled) setUser(null);
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error("Navbar user loading error:", error);

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

  async function loadNotifications({ silent = false } = {}) {
    try {
      if (!silent) {
        setNotificationsLoading(true);
      }

      setNotificationsError("");

      const response = await fetch("/api/notifications", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

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

      const loadedNotifications = Array.isArray(
        data?.notifications
      )
        ? data.notifications
        : [];

      setNotifications(loadedNotifications);

      const serverUnreadCount = Number.isFinite(
        Number(data?.unreadCount)
      )
        ? Number(data.unreadCount)
        : loadedNotifications.filter(
            (notification) => notification.read !== true
          ).length;

      setUnreadCount(serverUnreadCount);
    } catch (error) {
      console.error("NOTIFICATIONS LOAD ERROR:", error);

      if (!silent) {
        setNotificationsError(
          error?.message || "Unable to load notifications."
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

    const interval = setInterval(() => {
      loadNotifications({ silent: true });
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // =========================================================
  // REFRESH NOTIFICATIONS WHEN TAB BECOMES ACTIVE
  // =========================================================

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadNotifications({ silent: true });
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
  // GLOBAL SEARCH: LOAD STUDENTS FOR FACILITATORS ONLY
  // =========================================================

  useEffect(() => {
    if (user?.role !== "facilitator") {
      setSearchStudents([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSearchStudents() {
      try {
        setSearchLoading(true);
        setSearchError("");

        const response = await fetch("/api/students", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ||
              data?.error ||
              "Unable to load student records."
          );
        }

        const records = Array.isArray(data)
          ? data
          : Array.isArray(data?.students)
            ? data.students
            : [];

        if (!cancelled) {
          setSearchStudents(records);
        }
      } catch (error) {
        console.error(
          "GLOBAL SEARCH STUDENT LOAD ERROR:",
          error
        );

        if (!cancelled) {
          setSearchStudents([]);
          setSearchError(
            error?.message ||
              "Unable to load student records."
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    loadSearchStudents();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  // =========================================================
  // ROLE-BASED SEARCH PAGES
  // =========================================================

  const searchPages =
    user?.role === "facilitator"
      ? [
          {
            label: "Dashboard",
            description: "Platform overview",
            href: "/",
          },
          {
            label: "Student Requests",
            description: "Review applications",
            href: "/student-requests",
          },
          {
            label: "Students",
            description: "Manage student records",
            href: "/students",
          },
          {
            label: "Attendance",
            description: "Attendance records",
            href: "/attendance",
          },
          {
            label: "Progress",
            description: "Student progress",
            href: "/progress",
          },
          {
            label: "Resources",
            description: "Learning resources",
            href: "/resources",
          },
          {
            label: "Projects",
            description: "Student projects",
            href: "/projects",
          },
          {
            label: "Student Reports",
            description: "Review student reports",
            href: "/reports",
          },
          {
            label: "Notifications",
            description: "Platform updates",
            href: "/notifications",
          },
        ]
      : user?.role === "student"
        ? [
            {
              label: "Dashboard",
              description: "Your platform overview",
              href: "/",
            },
            {
              label: "Announcements",
              description: "Platform announcements",
              href: "/announcements",
            },
            {
              label: "My Profile",
              description: "Your account details",
              href: "/student/profile",
            },
            {
              label: "My Attendance",
              description: "Your attendance records",
              href: "/student/attendance",
            },
            {
              label: "My Progress",
              description: "Your learning progress",
              href: "/progress",
            },
            {
              label: "My Projects",
              description: "Your projects",
              href: "/projects",
            },
            {
              label: "Resources",
              description: "Learning resources",
              href: "/resources",
            },
            {
              label: "Report an Issue",
              description: "Submit a report",
              href: "/student/reports",
            },
            {
              label: "Notifications",
              description: "Platform updates",
              href: "/notifications",
            },
          ]
        : [];

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const matchingPages = normalizedSearch
    ? searchPages
        .filter((page) =>
          `${page.label} ${page.description} ${page.href}`
            .toLowerCase()
            .includes(normalizedSearch)
        )
        .slice(0, 6)
    : [];

  const matchingStudents =
    normalizedSearch && user?.role === "facilitator"
      ? searchStudents
          .filter((student) => {
            const fullName = [
              student.firstName,
              student.lastName,
            ]
              .filter(Boolean)
              .join(" ");

            const searchableText = [
              fullName,
              student.name,
              student.email,
              student.studentId,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return searchableText.includes(normalizedSearch);
          })
          .slice(0, 6)
      : [];

  function openSearchResult(href) {
    setSearchOpen(false);
    setSearchQuery("");
    setNotificationsOpen(false);
    setProfileOpen(false);
    window.location.href = href;
  }

  // =========================================================
  // CLOSE MENUS WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        setSearchOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
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
      setSearchOpen(false);
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

  async function markNotificationAsRead(notificationId) {
    if (!notificationId) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: notificationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notification as read."
        );
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
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
    if (unreadCount === 0) return;

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markAllRead: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to mark notifications as read."
        );
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
        "MARK ALL NOTIFICATIONS READ ERROR:",
        error
      );
    }
  }

  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  async function handleNotificationClick(notification) {
    if (!notification) return;

    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }

    setNotificationsOpen(false);

    if (notification.link) {
      window.location.href = notification.link;
    }
  }

  // =========================================================
  // FORMAT NOTIFICATION DATE
  // =========================================================

  function formatNotificationDate(createdAt) {
    if (!createdAt) return "";

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const difference = now.getTime() - date.getTime();
    const seconds = Math.floor(difference / 1000);

    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // =========================================================
  // GET NOTIFICATION TYPE LABEL
  // =========================================================

  function getNotificationIcon(type) {
    if (type === "attendance") return "Attendance";
    if (type === "progress") return "Progress";
    if (type === "student-request") return "Application";
    if (type === "project") return "Project";
    if (type === "announcement") return "Announcement";

    return "Platform";
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setUser(null);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setSearchOpen(false);
    setNotifications([]);
    setUnreadCount(0);

    window.dispatchEvent(new Event("dcc-auth-logout"));

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
        keepalive: true,
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.replace("/login");
    }
  }

  // =========================================================
  // USER INITIALS
  // =========================================================

  function getInitials() {
    if (!user) return "U";

    if (user.name) {
      const parts = user.name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (parts.length >= 2) {
        return (
          parts[0][0] + parts[parts.length - 1][0]
        ).toUpperCase();
      }

      if (parts[0]) {
        return parts[0].slice(0, 2).toUpperCase();
      }
    }

    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }

    return "U";
  }

  // =========================================================
  // DISPLAY NAME
  // =========================================================

  function getDisplayName() {
    if (!user) return "User";

    return user.name || user.email || "User";
  }

  // =========================================================
  // ROLE LABEL
  // =========================================================

  function getRoleLabel() {
    if (!user?.role) return "User";
    if (user.role === "facilitator") return "Facilitator";
    if (user.role === "student") return "Student";

    return user.role;
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="sticky top-0 z-30 hidden border-b border-slate-200 bg-white lg:block">
      <div className="flex h-[92px] items-center justify-end px-8">
        <div className="flex items-center gap-3">
          {/* GLOBAL SEARCH */}

          <div ref={searchRef} className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchQuery}
              placeholder="Search pages and students..."
              autoComplete="off"
              role="combobox"
              aria-expanded={searchOpen}
              aria-controls="global-search-results"
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                }

                if (event.key === "Enter") {
                  event.preventDefault();

                  if (matchingPages.length > 0) {
                    openSearchResult(matchingPages[0].href);
                  } else if (matchingStudents.length > 0) {
                    openSearchResult(
                      `/students?search=${encodeURIComponent(
                        searchQuery.trim()
                      )}`
                    );
                  }
                }
              }}
              className="h-13 w-[330px] rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            {searchOpen && (
              <div
                id="global-search-results"
                role="listbox"
                className="absolute right-0 top-[58px] z-50 max-h-[420px] w-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl"
              >
                {!normalizedSearch ? (
                  <div className="px-4 py-5">
                    <p className="text-sm font-semibold text-slate-700">
                      Global search
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Search for a page
                      {user?.role === "facilitator"
                        ? " or a student by name, email, or student ID."
                        : "."}
                    </p>
                  </div>
                ) : (
                  <>
                    {matchingPages.length > 0 && (
                      <div className="px-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Pages
                        </p>

                        {matchingPages.map((page) => (
                          <button
                            key={page.href}
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() =>
                              openSearchResult(page.href)
                            }
                            className="flex w-full flex-col rounded-lg px-3 py-3 text-left transition hover:bg-blue-50"
                          >
                            <span className="text-sm font-semibold text-slate-800">
                              {page.label}
                            </span>

                            <span className="mt-1 text-xs text-slate-500">
                              {page.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {user?.role === "facilitator" && (
                      <div className="mt-2 border-t border-slate-100 px-2 pt-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Students
                        </p>

                        {searchLoading ? (
                          <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                            Searching student records...
                          </div>
                        ) : searchError ? (
                          <p className="px-3 py-4 text-sm text-red-600">
                            {searchError}
                          </p>
                        ) : matchingStudents.length > 0 ? (
                          matchingStudents.map((student) => {
                            const name =
                              [
                                student.firstName,
                                student.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                              student.name ||
                              "Unnamed student";

                            const studentSearchValue =
                              student.studentId ||
                              student.email ||
                              name;

                            return (
                              <button
                                key={
                                  student._id ||
                                  student.studentId ||
                                  student.email ||
                                  name
                                }
                                type="button"
                                role="option"
                                aria-selected="false"
                                onClick={() =>
                                  openSearchResult(
                                    `/students?search=${encodeURIComponent(
                                      studentSearchValue
                                    )}`
                                  )
                                }
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-blue-50"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                  <UsersRound size={17} />
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-800">
                                    {name}
                                  </span>

                                  <span className="block truncate text-xs text-slate-500">
                                    {student.email ||
                                      student.studentId ||
                                      "Student record"}
                                  </span>
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="px-3 py-4 text-sm text-slate-500">
                            No matching students found.
                          </p>
                        )}
                      </div>
                    )}

                    {matchingPages.length === 0 &&
                      user?.role !== "facilitator" && (
                        <p className="px-4 py-5 text-sm text-slate-500">
                          No matching pages found.
                        </p>
                      )}

                    {matchingPages.length === 0 &&
                      user?.role === "facilitator" &&
                      matchingStudents.length === 0 &&
                      !searchLoading &&
                      !searchError && (
                        <p className="px-4 py-3 text-xs text-slate-400">
                          No matching pages or students found.
                        </p>
                      )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* NOTIFICATIONS */}

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setProfileOpen(false);
                setSearchOpen(false);

                if (!notificationsOpen) {
                  loadNotifications();
                }
              }}
              className="relative flex h-13 w-13 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <Bell size={21} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-[58px] z-50 w-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
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
                    onClick={markAllNotificationsAsRead}
                    disabled={
                      unreadCount === 0 ||
                      notificationsLoading
                    }
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCheck size={15} />
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Loading notifications...
                    </div>
                  ) : notificationsError ? (
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
                        onClick={() => loadNotifications()}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                      >
                        Try again
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
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
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() =>
                            handleNotificationClick(notification)
                          }
                          className={`w-full px-5 py-4 text-left transition hover:bg-slate-50 ${
                            notification.read
                              ? "bg-white"
                              : "bg-blue-50/60"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                notification.read
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              <Bell size={16} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p
                                  className={`text-sm ${
                                    notification.read
                                      ? "font-medium text-slate-700"
                                      : "font-bold text-slate-900"
                                  }`}
                                >
                                  {notification.title ||
                                    "Platform Notification"}
                                </p>

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
                      ))}
                    </div>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <Link
                      href="/notifications"
                      onClick={() =>
                        setNotificationsOpen(false)
                      }
                      className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      View all notifications
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PROFILE */}

          {!loading && user && (
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((value) => !value);
                  setNotificationsOpen(false);
                  setSearchOpen(false);
                }}
                className="flex h-13 items-center gap-3 rounded-xl px-2.5 transition hover:bg-slate-50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {getInitials()}
                </div>

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
                  className={`ml-1 text-slate-400 transition-transform ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[58px] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
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

                  <div className="p-2">
                    <Link
                      href="/change-password"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <KeyRound
                        size={17}
                        className="shrink-0 text-slate-500"
                      />
                      <span className="flex-1">
                        Change Password
                      </span>
                    </Link>

                    <div className="my-2 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogOut size={17} />

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