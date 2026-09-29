"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  UserRound,
  ChevronDown,
  Settings,
  LogOut,
  X,
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data.user || null);
        }
      } catch (error) {
        console.error(
          "Navbar user load error:",
          error
        );
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

  function getDisplayName() {
    if (!user) {
      return "User";
    }

    return (
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email?.split("@")[0] ||
      "User"
    );
  }

  function getInitials() {
    const name = getDisplayName();

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="sticky top-0 z-30 hidden h-[72px] border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
      <div className="flex h-full items-center justify-between px-6">
        {/* LEFT */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Dodoo Coding Club
          </p>

          <p className="mt-0.5 text-sm font-medium text-slate-500">
            Student Success Platform
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {/* SEARCH */}
          <div className="hidden xl:flex">
            <div className="flex h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
              <Search size={17} />

              <input
                type="search"
                placeholder="Search..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() =>
                setNotificationsOpen(
                  (previous) => !previous
                )
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <Bell size={18} />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-yellow-400 ring-2 ring-white" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Notifications
                    </p>

                    <p className="text-xs text-slate-500">
                      Stay updated with your platform activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(false)
                    }
                    className="text-slate-400 hover:text-slate-600"
                    aria-label="Close notifications"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-4 py-8 text-center">
                  <Bell
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Open Notifications
                  </p>

                  <Link
                    href="/"
                    onClick={() =>
                      setNotificationsOpen(false)
                    }
                    className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View platform updates
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (previous) => !previous
                )
              }
              className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-slate-200 hover:bg-slate-50"
            >
              {loading ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {getInitials()}
                </div>
              )}

              <div className="hidden text-left xl:block">
                <p className="max-w-[140px] truncate text-sm font-semibold text-slate-800">
                  {getDisplayName()}
                </p>

                <p className="text-[11px] capitalize text-slate-500">
                  {user?.role || "User"}
                </p>
              </div>

              <ChevronDown
                size={15}
                className={`text-slate-400 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {getInitials()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {getDisplayName()}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href={
                      user?.role === "student"
                        ? "/student/profile"
                        : "/"
                    }
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <UserRound size={17} />
                    Profile
                  </Link>

                  <Link
                    href="/"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Settings size={17} />
                    Platform
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}