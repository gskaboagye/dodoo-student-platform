"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Bell,
  ChevronDown,
  ExternalLink,
  Info,
  LogOut,
  Search,
  Users,
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

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
  // LISTEN FOR LOGOUT FROM OTHER COMPONENTS
  // =========================================================

  useEffect(() => {
    function handleLogout() {
      setUser(null);
      setProfileOpen(false);
      setNotificationsOpen(false);
      setLoggingOut(true);
    }

    window.addEventListener("dcc-auth-logout", handleLogout);

    return () => {
      window.removeEventListener("dcc-auth-logout", handleLogout);
    };
  }, []);

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
    if (!user) {
      return "User";
    }

    return user.name || user.firstName || "User";
  }

  // =========================================================
  // ROLE LABEL
  // =========================================================

  function getRoleLabel() {
    if (!user?.role) {
      return "User";
    }

    return (
      user.role.charAt(0).toUpperCase() +
      user.role.slice(1)
    );
  }

  // =========================================================
  // CLOSE PROFILE WHEN CLICKING OUTSIDE
  // =========================================================

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest(
          "[data-profile-menu]"
        )
      ) {
        setProfileOpen(false);
      }

      if (
        !event.target.closest(
          "[data-notification-menu]"
        )
      ) {
        setNotificationsOpen(false);
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

  // =========================================================
  // RENDER
  // =========================================================

  if (loggingOut) {
    return null;
  }

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
              size={20}
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
            className="relative"
            data-notification-menu
          >
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                setNotificationsOpen(
                  (value) => !value
                )
              }
              className="relative flex h-13 w-13 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <Bell size={21} />

              <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full bg-yellow-400 ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-[58px] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="font-semibold text-slate-900">
                    Notifications
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Your latest platform updates.
                  </p>
                </div>

                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-slate-500">
                    No new notifications.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              PROFILE
          ================================================== */}

          {!loading && user && (
            <div
              className="relative"
              data-profile-menu
            >
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (value) => !value
                  )
                }
                className="flex h-13 items-center gap-3 rounded-xl px-2.5 transition hover:bg-slate-50"
              >
                {/* AVATAR */}

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {getInitials()}
                </div>

                {/* USER */}

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
                    profileOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {/* =================================================
                  PROFILE DROPDOWN
              ================================================== */}

              {profileOpen && (
                <div className="absolute right-0 top-[62px] z-50 w-[330px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                  {/* USER HEADER */}

                  <div className="flex items-center gap-4 border-b border-slate-200 px-5 py-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                      {getInitials()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {getDisplayName()}
                      </p>

                      <p className="truncate text-sm text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* =================================================
                      DROPDOWN LINKS
                  ================================================== */}

                  <div className="p-2">

                    {/* ABOUT DODOO CODING CLUB */}

                    <a
                      href="https://dodoocodingclub.com/about/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-3">
                        <Info
                          size={20}
                          className="text-slate-500"
                        />

                        <span>
                          About Dodoo Coding Club
                        </span>
                      </span>

                      <ExternalLink
                        size={15}
                        className="text-slate-400"
                      />
                    </a>

                    {/* FOUNDERS OF THE CLUB */}

                    <a
                      href="https://dodoocodingclub.com/founders-board/"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        setProfileOpen(false)
                      }
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="flex items-center gap-3">
                        <Users
                          size={20}
                          className="text-slate-500"
                        />

                        <span>
                          Founders of the Club
                        </span>
                      </span>

                      <ExternalLink
                        size={15}
                        className="text-slate-400"
                      />
                    </a>

                    {/* DIVIDER */}

                    <div className="my-1 border-t border-slate-100" />

                    {/* SIGN OUT */}

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut
                        size={20}
                        className="text-slate-500"
                      />

                      <span>
                        {loggingOut
                          ? "Signing out..."
                          : "Sign Out"}
                      </span>
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