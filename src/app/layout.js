"use client";

import { usePathname } from "next/navigation";
import "./globals.css";
import AppShell from "@/components/AppShell";

export default function RootLayout({ children }) {
  const pathname = usePathname();

  const standaloneRoutes = [
    "/login",
    "/forgot-password",
    "/reset-password",
  ];

  const isStandaloneRoute = standaloneRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {isStandaloneRoute ? (
          children
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </body>
    </html>
  );
}