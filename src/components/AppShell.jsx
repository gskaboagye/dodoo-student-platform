"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// =========================================================
// AUTH / STANDALONE ROUTES
//
// These pages should NOT display:
// - Sidebar
// - Navbar
// - Footer
//
// They are intended to provide a clean authentication
// experience.
// =========================================================

const STANDALONE_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
];

export default function AppShell({ children }) {
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] =
    useState(false);

  // =========================================================
  // CHECK IF CURRENT PAGE IS AN AUTH PAGE
  // =========================================================

  const isStandaloneRoute =
    STANDALONE_ROUTES.some(
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
  //
  // Render only the page itself.
  //
  // No:
  // - Sidebar
  // - Navbar
  // - Footer
  // =========================================================

  if (isStandaloneRoute) {
    return (
      <div className="min-h-screen bg-[#f3f4f6]">
        {children}
      </div>
    );
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

          {/* =================================================
              NAVBAR
          ================================================== */}

          <Navbar />

          {/* =================================================
              PAGE CONTENT
          ================================================== */}

          <main className="min-w-0 flex-1">
            {children}
          </main>

        </div>
      </div>

      {/* ===================================================
          FULL-WIDTH FOOTER

          Footer stays outside the Sidebar/Main-content
          row so that it spans the entire application width.
      ==================================================== */}

      <Footer />

    </div>
  );
}