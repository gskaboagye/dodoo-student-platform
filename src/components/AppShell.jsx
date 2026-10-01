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

  // =========================================================
  // LISTEN FOR LOGOUT
  // =========================================================

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
  // AUTH PAGES
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
  // APPLICATION SHELL
  // =========================================================

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f4f6] text-slate-900">

      {/* ===================================================
          MAIN APPLICATION AREA
          Sidebar + Dashboard Content
      ==================================================== */}

      <div className="flex min-h-0 flex-1">

        {/* =================================================
            SIDEBAR
        ================================================== */}

        <Sidebar />

        {/* =================================================
            MAIN CONTENT COLUMN
        ================================================== */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* NAVBAR */}

          <Navbar />

          {/* PAGE CONTENT */}

          <main className="min-w-0 flex-1">
            {children}
          </main>

        </div>
      </div>

      {/* ===================================================
          FULL-WIDTH FOOTER

          IMPORTANT:
          Footer is OUTSIDE the Sidebar/Main-content row.
          Therefore it spans the entire screen width.
      ==================================================== */}

      <Footer />

    </div>
  );
}