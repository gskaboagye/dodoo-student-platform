"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Notifications from "./Notifications";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/verify-email",
];

export default function Navbar() {
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isPublicRoute =
    PUBLIC_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname?.startsWith(`${route}/`)
    );

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      // Never check/render authenticated controls
      // on public authentication pages.
      if (isPublicRoute) {
        if (mounted) {
          setUser(null);
          setCheckingAuth(false);
        }

        return;
      }

      try {
        const response = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (mounted) {
            setUser(null);
          }

          return;
        }

        const data =
          await response.json();

        if (mounted) {
          setUser(
            data?.user || null
          );
        }
      } catch (error) {
        console.error(
          "NAVBAR AUTH CHECK ERROR:",
          error
        );

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [pathname, isPublicRoute]);

  /*
   * PUBLIC PAGES
   *
   * Do not show notification or profile controls
   * while the user is logged out.
   */
  const showAuthenticatedControls =
    !isPublicRoute &&
    !checkingAuth &&
    user;

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="flex h-20 items-center justify-between px-6 md:px-8">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-700 text-2xl font-bold text-blue-700">
            &lt;/&gt;
          </div>

          <div>
            <h1 className="text-lg font-extrabold leading-tight text-blue-700">
              DODOO
            </h1>

            <p className="text-sm font-bold leading-tight text-blue-700">
              CODING CLUB
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="/"
            className="font-semibold text-gray-900 hover:text-blue-700"
          >
            Dashboard
          </a>

          <a
            href="/students"
            className="font-semibold text-gray-900 hover:text-blue-700"
          >
            Students
          </a>

          <a
            href="/attendance"
            className="font-semibold text-gray-900 hover:text-blue-700"
          >
            Attendance
          </a>

          <a
            href="/projects"
            className="font-semibold text-gray-900 hover:text-blue-700"
          >
            Projects
          </a>

          <a
            href="/resources"
            className="font-semibold text-gray-900 hover:text-blue-700"
          >
            Resources
          </a>
        </nav>

        {/* Authenticated controls */}
        {showAuthenticatedControls && (
          <div className="flex items-center gap-4">

            {/* Notification */}
            <Notifications />

            {/* User */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 font-bold text-white">
                {(
                  user?.name ||
                  user?.firstName ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="hidden lg:block">
                <p className="text-sm font-bold text-gray-900">
                  {user?.name ||
                    `${user?.firstName || ""} ${
                      user?.lastName || ""
                    }`.trim() ||
                    "User"}
                </p>

                <p className="text-xs capitalize text-gray-500">
                  {user?.role ||
                    "User"}
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </header>
  );
}