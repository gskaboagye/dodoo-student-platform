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

// =========================================================
// SESSION CHECK INTERVAL
//
// The application checks the session every 30 seconds.
// If the JWT has expired, the user is redirected to login.
// =========================================================

const SESSION_CHECK_INTERVAL = 30 * 1000;

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
  // SESSION EXPIRATION CHECK
  //
  // This checks the server-side session instead of relying
  // only on the browser cookie.
  //
  // If /api/auth/me returns 401, the session is no longer
  // valid and the user is sent to the login page.
  // =========================================================

  useEffect(() => {
    // Do not check authentication on standalone pages.
    if (isStandaloneRoute) {
      return;
    }

    // Do not check while logout is already happening.
    if (loggingOut) {
      return;
    }

    let cancelled = false;
    let checkingSession = false;

    async function checkSession() {
      if (cancelled || checkingSession) {
        return;
      }

      checkingSession = true;

      try {
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

        // ===================================================
        // SESSION EXPIRED / INVALID
        // ===================================================

        if (response.status === 401) {
          if (!cancelled) {
            setLoggingOut(true);

            // Tell other components that authentication
            // is no longer active.
            window.dispatchEvent(
              new Event("dcc-auth-logout")
            );

            // Send the user to login.
            window.location.replace(
              "/login?expired=true"
            );
          }

          return;
        }

        // ===================================================
        // OTHER AUTH FAILURE
        //
        // We only redirect for 401.
        // Server errors such as 500 should not immediately
        // log the user out.
        // ===================================================

        if (!response.ok) {
          return;
        }
      } catch (error) {
        // Network/server errors should not automatically
        // log the user out.
        console.error(
          "Session check failed:",
          error
        );
      } finally {
        checkingSession = false;
      }
    }

    // =======================================================
    // CHECK IMMEDIATELY
    // =======================================================

    checkSession();

    // =======================================================
    // PERIODIC CHECK
    // =======================================================

    const interval = setInterval(
      checkSession,
      SESSION_CHECK_INTERVAL
    );

    // =======================================================
    // CHECK WHEN USER RETURNS TO TAB
    // =======================================================

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible"
      ) {
        checkSession();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // =======================================================
    // CLEANUP
    // =======================================================

    return () => {
      cancelled = true;

      clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    isStandaloneRoute,
    loggingOut,
  ]);

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