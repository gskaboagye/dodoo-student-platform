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

  const [loggingOut, setLoggingOut] = useState(false);

  const isStandaloneRoute = STANDALONE_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    function handleLogout() {
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
  // STANDALONE AUTHENTICATION PAGES
  // =========================================================

  if (isStandaloneRoute) {
    return children;
  }

  // =========================================================
  // LOGGING OUT
  // =========================================================

  if (loggingOut) {
    return null;
  }

  // =========================================================
  // DASHBOARD SHELL
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