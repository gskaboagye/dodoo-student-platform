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

  const [authenticated, setAuthenticated] = useState(null);

  const isStandaloneRoute = STANDALONE_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      if (isStandaloneRoute) {
        if (!cancelled) {
          setAuthenticated(false);
        }

        return;
      }

      try {
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
            setAuthenticated(false);
          }

          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setAuthenticated(Boolean(data?.user));
        }
      } catch (error) {
        console.error(
          "Authentication check failed:",
          error
        );

        if (!cancelled) {
          setAuthenticated(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, [pathname, isStandaloneRoute]);

  // =========================================================
  // LOGIN / AUTHENTICATION PAGES
  // =========================================================

  if (isStandaloneRoute) {
    return children;
  }

  // =========================================================
  // AUTHENTICATION CHECK
  // =========================================================

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-screen w-full" />
      </div>
    );
  }

  // =========================================================
  // NOT AUTHENTICATED
  // =========================================================

  if (!authenticated) {
    return null;
  }

  // =========================================================
  // AUTHENTICATED DASHBOARD
  // =========================================================

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />

          <main className="min-w-0 flex-1">
            {children}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}