"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AppShell({
  children,
}) {
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