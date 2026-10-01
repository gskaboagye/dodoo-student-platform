"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  ChartNoAxesCombined,
  BookOpen,
  FolderKanban,
  AlertCircle,
  UserRound,
  LogIn,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Megaphone,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // =========================================================
  // CLOSE MOBILE MENU ON ROUTE CHANGE
  // =========================================================

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // =========================================================
  // PREVENT BACKGROUND SCROLL
  // =========================================================

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

  // =========================================================
  // LOGOUT
  // =========================================================

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    // Immediately remove authenticated state.
    setUser(null);

    // Close mobile navigation.
    setMobileMenuOpen(false);

    // Tell AppShell that authentication is no longer active.
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
      console.error("Logout request failed:", error);
    } finally {
      window.location.replace("/login");
    }
  }

  // =========================================================
  // FACILITATOR LINKS
  // =========================================================

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
      name: "Resources",
      href: "/resources",
      icon: BookOpen,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Student Reports",
      href: "/reports",
      icon: AlertCircle,
    },
  ];

  // =========================================================
  // STUDENT LINKS
  // =========================================================

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
      name: "My Attendance",
      href: "/student/attendance",
      icon: CalendarCheck,
    },
    {
      name: "My Progress",
      href: "/progress",
      icon: ChartNoAxesCombined,
    },
    {
      name: "My Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Resources",
      href: "/resources",
      icon: BookOpen,
    },
    {
      name: "Report an Issue",
      href: "/student/reports",
      icon: AlertCircle,
    },
  ];

  // =========================================================
  // SELECT LINKS BASED ON ROLE
  // =========================================================

  const links =
    user?.role === "facilitator"
      ? facilitatorLinks
      : user?.role === "student"
        ? studentLinks
        : [];

  // =========================================================
  // ACTIVE LINK
  // =========================================================

  function isActiveLink(href) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  // =========================================================
  // CLOSE MOBILE MENU
  // =========================================================

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  // =========================================================
  // DCC BRAND
  // =========================================================

  function renderBrand({ mobile = false } = {}) {
    return (
      <Link
        href="/"
        onClick={mobile ? closeMobileMenu : undefined}
        className="group flex items-center gap-3"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-blue-600 text-lg font-bold text-blue-600 transition group-hover:bg-blue-50">
          &lt;/&gt;
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold tracking-tight text-blue-700">
            DODOO
          </h1>

          <p className="truncate text-xs font-bold tracking-wide text-blue-600">
            CODING CLUB
          </p>

          <p className="mt-0.5 truncate text-[10px] text-slate-500">
            Student Success Platform
          </p>
        </div>
      </Link>
    );
  }

  // =========================================================
  // STUDENT ANNOUNCEMENT ICON
  // =========================================================

  function renderAnnouncementIcon() {
    // Only students should see the announcement icon.
    if (loading || user?.role !== "student") {
      return null;
    }

    const announcementActive = isActiveLink("/announcements");

    return (
      <div className="border-b border-slate-200 px-3 py-3">
        <Link
          href="/announcements"
          onClick={closeMobileMenu}
          aria-label="Announcements"
          title="Announcements"
          className={`group flex min-h-[44px] w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
            announcementActive
              ? "bg-blue-50 text-blue-700 shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-3">
            <Megaphone
              size={19}
              className={`shrink-0 transition ${
                announcementActive
                  ? "text-blue-600"
                  : "text-slate-500 group-hover:text-blue-600"
              }`}
            />

            <span>Announcements</span>
          </span>

          {announcementActive && (
            <ChevronRight
              size={15}
              className="text-blue-500"
            />
          )}
        </Link>
      </div>
    );
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  function renderNavigation() {
    if (loading) {
      return (
        <div className="space-y-2 px-3 py-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return (
      <nav className="px-3 py-4">
        <p className="mb-2 px-4 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Navigation
        </p>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isActiveLink(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobileMenu}
              className={`group mb-1 flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon
                  size={19}
                  className={`shrink-0 transition ${
                    isActive
                      ? "text-blue-600"
                      : "text-slate-500 group-hover:text-blue-600"
                  }`}
                />

                <span>{link.name}</span>
              </span>

              {isActive && (
                <ChevronRight
                  size={15}
                  className="text-blue-500"
                />
              )}
            </Link>
          );
        })}
      </nav>
    );
  }

  // =========================================================
  // USER INFORMATION
  // =========================================================

  function renderUserInformation() {
    if (loading) {
      return (
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />

            <div className="min-w-0 flex-1">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />

              <div className="mt-2 h-2.5 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    const initials = getUserInitials(user);

    return (
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user.name || "User"}
            </p>

            <p className="truncate text-xs capitalize text-slate-500">
              {user.role}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // SIGN OUT BUTTON
  // =========================================================

  function renderAuthButton() {
    if (loading) {
      return null;
    }

    if (user) {
      return (
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut
            size={19}
            className="shrink-0"
          />

          <span>
            {loggingOut
              ? "Signing out..."
              : "Sign Out"}
          </span>
        </button>
      );
    }

    return (
      <Link
        href="/login"
        onClick={closeMobileMenu}
        className={`flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
          pathname === "/login"
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <LogIn
          size={19}
          className="shrink-0"
        />

        <span>Login</span>
      </Link>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  if (loggingOut) {
    return null;
  }

  if (!loading && !user) {
    return null;
  }

  return (
    <>
      {/* =====================================================
          MOBILE MENU BUTTON
      ====================================================== */}

      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 md:hidden"
      >
        <Menu size={22} />
      </button>

      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close mobile navigation menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {/* BRAND */}
        <div className="border-b border-slate-200 px-5 py-5">
          {renderBrand()}
        </div>

        {/* USER */}
        {renderUserInformation()}

        {/* NAVIGATION */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {renderNavigation()}
        </div>

        {/* STUDENT ANNOUNCEMENT ICON */}
        {renderAnnouncementIcon()}

        {/* SIGN OUT */}
        <div className="border-t border-slate-200 px-3 py-3">
          {renderAuthButton()}
        </div>
      </aside>

      {/* =====================================================
          MOBILE SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,340px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* MOBILE HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          {renderBrand({
            mobile: true,
          })}

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={22} />
          </button>
        </div>

        {/* USER */}
        {renderUserInformation()}

        {/* NAVIGATION */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {renderNavigation()}
        </div>

        {/* STUDENT ANNOUNCEMENT ICON */}
        {renderAnnouncementIcon()}

        {/* SIGN OUT */}
        <div className="border-t border-slate-200 px-3 py-3">
          {renderAuthButton()}
        </div>
      </aside>
    </>
  );
}

// =========================================================
// HELPERS
// =========================================================

function getUserInitials(user) {
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