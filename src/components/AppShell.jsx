"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Notifications from "@/components/Notifications";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/verify-email",
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname?.startsWith(`${route}/`)
  );

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      if (isPublicRoute) {
        if (mounted) {
          setUser(null);
          setCheckingAuth(false);
        }

        return;
      }

      setCheckingAuth(true);

      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setUser(null);
          }

          return;
        }

        const data = await response.json();

        if (mounted) {
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error(
          "APP SHELL AUTH CHECK ERROR:",
          error
        );

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [pathname, isPublicRoute]);

  // Login, register, and verification pages
  // should not show authenticated navigation.
  if (isPublicRoute) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // Don't briefly show authenticated navigation
  // while authentication is being checked.
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // No authenticated user = no sidebar or notification.
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // Authenticated application shell.
  return (
    <div className="flex min-h-screen">

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col min-h-screen">

        <header className="sticky top-0 z-40 flex h-16 items-center justify-end border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <Notifications />
        </header>

        <main className="min-w-0 flex-1">
          {children}
        </main>

        <Footer />

      </div>
    </div>
  );
}