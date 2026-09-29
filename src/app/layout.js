import "./globals.css";

export const metadata = {
  title: "DCC Student Success & Impact Platform",
  description:
    "Dodoo Coding Club Student Success and Impact Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  );
}