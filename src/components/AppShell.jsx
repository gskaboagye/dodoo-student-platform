"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AppShell({ children }) {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setAuthenticated(false);
          }
          return;
        }

        const result = await response.json();

        if (mounted) {
          setAuthenticated(Boolean(result?.user));
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (mounted) {
          setAuthenticated(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * While authentication is being checked, don't render
   * the dashboard structure. This prevents the Footer,
   * Sidebar, Navbar, and dashboard content from briefly
   * appearing after logout.
   */
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-white" aria-hidden="true">
        <div className="h-screen w-full" />
      </div>
    );
  }

  /*
   * If the user is logged out, do not render the dashboard
   * shell at all.
   */
  if (!authenticated) {
    return null;
  }

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