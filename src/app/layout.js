import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "DCC Student Success & Impact Platform",
  description:
    "Dodoo Coding Club Student Success and Impact Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}