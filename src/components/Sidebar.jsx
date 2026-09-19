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
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadUser();
  }, [pathname]);

  async function loadUser() {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data.user || null);
    } catch (error) {
      console.error("Failed to load user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);

      router.replace("/login");
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

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">

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

      {/* User information */}
      {!loading && user && (
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
      )}

      {/* Role-based navigation */}
      <nav className="px-3 py-5">
        {links.map((link) => {
          const Icon = link.icon;

          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href ||
                pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon size={19} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Login / Logout directly below navigation */}
      <div className="border-t border-slate-200 px-3 py-3">
        {!loading && user ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={19} />

            <span>
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>
        ) : (
          <Link
            href="/login"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
              pathname === "/login"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LogIn size={19} />
            <span>Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}