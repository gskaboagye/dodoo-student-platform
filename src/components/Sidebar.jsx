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
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load the currently authenticated user
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

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile menu is open
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

  // Logout
  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      // Immediately clear local authentication state
      setUser(null);

      // Close mobile navigation
      setMobileMenuOpen(false);

      // Navigate to login
      router.replace("/login");

      // Refresh server/client authentication state
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setLoggingOut(false);
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
      name: "Resources",
      href: "/resources",
      icon: BookOpen,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
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
      name: "My Attendance",
      href: "/attendance",
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
  ];

  const links =
    user?.role === "facilitator"
      ? facilitatorLinks
      : user?.role === "student"
        ? studentLinks
        : [];

  function isActiveLink(href) {
    if (href === "/") {
      return pathname === "/";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function renderNavigation() {
    return (
      <nav className="px-3 py-5">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = isActiveLink(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobileMenu}
              className={`mb-1 flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={19} className="shrink-0" />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  function renderUserInformation() {
    if (loading || !user) {
      return null;
    }

    return (
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <UserRound size={19} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {user.name || "User"}
            </p>

            <p className="text-xs capitalize text-slate-500">
              {user.role}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <LogOut size={19} className="shrink-0" />

          <span>
            {loggingOut ? "Logging out..." : "Logout"}
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
        <LogIn size={19} className="shrink-0" />

        <span>Login</span>
      </Link>
    );
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={mobileMenuOpen}
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 md:hidden"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Logo */}
        <div className="border-b border-slate-200 px-6 py-6">
          <Link href="/" className="block">
            <h1 className="text-lg font-bold text-slate-900">
              Dodoo Coding Club
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Student Success Platform
            </p>
          </Link>
        </div>

        {/* User Information */}
        {renderUserInformation()}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {renderNavigation()}
        </div>

        {/* Login / Logout */}
        <div className="border-t border-slate-200 px-3 py-3">
          {renderAuthButton()}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(82vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="min-w-0"
          >
            <h1 className="truncate text-base font-bold text-slate-900">
              Dodoo Coding Club
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Student Success Platform
            </p>
          </Link>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
            className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={22} />
          </button>
        </div>

        {/* User Information */}
        {renderUserInformation()}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {renderNavigation()}
        </div>

        {/* Login / Logout */}
        <div className="border-t border-slate-200 px-3 py-3">
          {renderAuthButton()}
        </div>
      </aside>
    </>
  );
}