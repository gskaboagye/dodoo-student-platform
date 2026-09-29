"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  ChartNoAxesCombined,
  BookOpen,
  FolderKanban,
  UserRound,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setUser(data.user || null);
        }
      } catch (error) {
        console.error("Failed to load user:", error);

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
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      setUser(null);
      setMobileMenuOpen(false);

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        keepalive: true,
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const facilitatorLinks = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Student Requests",
      href: "/student-requests",
      icon: UserPlus,
    },
    {
      name: "Students",
      href: "/students",
      icon: Users,
    },
    {
      name: "Attendance",
      href: "/attendance",
      icon: CalendarCheck,
    },
    {
      name: "Progress",
      href: "/progress",
      icon: ChartNoAxesCombined,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Resources",
      href: "/resources",
      icon: BookOpen,
    },
  ];

  const studentLinks = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      name: "My Profile",
      href: "/student/profile",
      icon: UserRound,
    },
    {
      name: "Attendance",
      href: "/student/attendance",
      icon: CalendarCheck,
    },
    {
      name: "Progress",
      href: "/progress",
      icon: ChartNoAxesCombined,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Resources",
      href: "/resources",
      icon: BookOpen,
    },
  ];

  const links =
    user?.role === "facilitator"
      ? facilitatorLinks
      : studentLinks;

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

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

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* BRAND */}
      <div className="border-b border-slate-200 px-5 py-5">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-blue-700 bg-white text-lg font-bold text-blue-700 transition duration-300 group-hover:scale-105 group-hover:bg-blue-50">
            &lt;/&gt;
          </div>

          <div>
            <p className="text-sm font-extrabold tracking-wide text-blue-700">
              DODOO
            </p>

            <p className="text-xs font-bold tracking-wide text-blue-700">
              CODING CLUB
            </p>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Student Platform
            </p>
          </div>
        </Link>
      </div>

      {/* USER */}
      <div className="border-b border-slate-200 px-5 py-4">
        {loading ? (
          <div className="flex animate-pulse items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200" />

            <div className="flex-1">
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-2 h-2.5 w-32 rounded bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
              {getInitials()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {getDisplayName()}
              </p>

              <p className="truncate text-xs capitalize text-slate-500">
                {user?.role || "student"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}
                  >
                    <Icon size={17} />
                  </span>

                  <span>{link.name}</span>
                </span>

                <ChevronRight
                  size={15}
                  className={`transition-transform duration-200 ${
                    active
                      ? "translate-x-0 text-white/80"
                      : "text-slate-300 group-hover:translate-x-0.5 group-hover:text-blue-500"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-red-100 group-hover:text-red-600">
            {loggingOut ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <LogOut size={17} />
            )}
          </span>

          <span>
            {loggingOut ? "Signing out..." : "Sign Out"}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-blue-700 text-sm font-bold text-blue-700">
            &lt;/&gt;
          </div>

          <div>
            <p className="text-xs font-extrabold text-blue-700">
              DODOO
            </p>

            <p className="text-[9px] font-bold text-blue-700">
              CODING CLUB
            </p>
          </div>
        </Link>

        <button
          type="button"
          aria-label={
            mobileMenuOpen
              ? "Close navigation"
              : "Open navigation"
          }
          onClick={() =>
            setMobileMenuOpen((previous) => !previous)
          }
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
        >
          {mobileMenuOpen ? (
            <X size={21} />
          ) : (
            <Menu size={21} />
          )}
        </button>
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {/* MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          />

          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-2xl lg:hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}