"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Megaphone,
  CalendarDays,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/announcements",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to load announcements."
        );
      }

      setAnnouncements(
        Array.isArray(data?.announcements)
          ? data.announcements
          : []
      );
    } catch (error) {
      console.error(
        "ANNOUNCEMENTS PAGE ERROR:",
        error
      );

      setError(
        error.message ||
          "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date) {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return parsedDate.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Bell size={24} />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Announcements
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Stay updated with the latest
              Dodoo Coding Club news and
              important updates.
            </p>
          </div>

        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-sm font-semibold text-red-700">
                Unable to load announcements
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ===================================================
            LOADING
        =================================================== */}

        {loading ? (

          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">

            <div className="flex flex-col items-center gap-3 text-slate-400">

              <Loader2
                size={28}
                className="animate-spin text-blue-600"
              />

              <p className="text-sm">
                Loading announcements...
              </p>

            </div>

          </div>

        ) : announcements.length === 0 ? (

          /* =================================================
             EMPTY STATE
          ================================================= */

          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 text-center">

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Bell size={25} />
            </div>

            <h2 className="text-base font-bold text-slate-800">
              No announcements yet
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are currently no announcements
              from Dodoo Coding Club. New updates
              will appear here when they are
              published.
            </p>

          </div>

        ) : (

          /* =================================================
             ANNOUNCEMENTS
          ================================================= */

          <div className="space-y-4">

            {announcements.map(
              (announcement) => (

                <article
                  key={announcement.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-md sm:p-6"
                >

                  <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Megaphone size={19} />
                    </div>

                    <div className="min-w-0 flex-1">

                      <h2 className="text-base font-bold leading-6 text-slate-900 sm:text-lg">
                        {announcement.title}
                      </h2>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {announcement.message}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">

                        <CalendarDays size={14} />

                        <span>
                          {formatDate(
                            announcement.createdAt
                          )}
                        </span>

                        {announcement.updatedAt && (
                          <span>
                            · Updated
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </div>

    </main>
  );
}