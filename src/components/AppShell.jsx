"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STANDALONE_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const isStandaloneRoute = STANDALONE_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  // =========================================================
  // LOAD CURRENT USER
  // =========================================================

  useEffect(() => {
    if (isStandaloneRoute) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadUser() {
      try {
        setLoading(true);

        const response = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
            },
          }
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !data?.user) {
          setUser(null);
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error(
          "AppShell authentication error:",
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
  }, [pathname, isStandaloneRoute]);

  // =========================================================
  // LOGOUT EVENT
  // =========================================================

  useEffect(() => {
    function handleLogout() {
      setLoggingOut(true);
      setUser(null);
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
  // STANDALONE PAGES
  // =========================================================

  if (isStandaloneRoute) {
    return children;
  }

  // =========================================================
  // LOGOUT STATE
  // =========================================================

  if (loggingOut) {
    return null;
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-600">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // AUTHENTICATED APPLICATION SHELL
  // =========================================================

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <div className="flex min-h-screen">

        {/* =================================================
            SIDEBAR
        ================================================== */}

        <Sidebar user={user} />

        {/* =================================================
            MAIN APPLICATION AREA
        ================================================== */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* TOP NAVIGATION */}

          <Navbar user={user} />

          {/* PAGE CONTENT */}

          <main className="min-w-0 flex-1">
            {children}
          </main>

          {/* FOOTER */}

          <Footer />

        </div>
      </div>
    </div>
  );
}