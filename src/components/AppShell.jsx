"use client";

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

  const isStandaloneRoute = STANDALONE_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  /*
   * LOGIN / PASSWORD PAGES
   *
   * These pages should NOT receive:
   * - Sidebar
   * - Navbar
   * - Footer
   */

  if (isStandaloneRoute) {
    return children;
  }

  /*
   * ALL OTHER PAGES
   *
   * These pages receive the complete
   * DCC application shell.
   */

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}

        <Sidebar />

        {/* MAIN AREA */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* NAVBAR */}

          <Navbar />

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