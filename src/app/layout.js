import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import Notifications from "@/components/Notifications";

export const metadata = {
  title: "DCC Student Success & Impact Platform",
  description:
    "Dodoo Coding Club Student Success and Impact Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen">

          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col min-h-screen">

            {/* TOP BAR */}
            <header className="sticky top-0 z-40 flex h-16 items-center justify-end border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
              <Notifications />
            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            <Footer />

          </div>
        </div>
      </body>
    </html>
  );
}