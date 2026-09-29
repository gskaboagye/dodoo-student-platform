"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CalendarDays,
  Megaphone,
  ArrowRight,
} from "lucide-react";

export default function Announcements({
  role,
}) {
  const [announcements, setAnnouncements] =
    useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      try {
        const response = await fetch(
          "/api/announcements",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (!cancelled) {
            setAnnouncements([]);
          }

          return;
        }

        const data = await response.json();

        const items =
          Array.isArray(data)
            ? data
            : Array.isArray(data?.announcements)
              ? data.announcements
              : [];

        if (!cancelled) {
          setAnnouncements(items);
        }
      } catch (error) {
        console.error(
          "Announcements load error:",
          error
        );

        if (!cancelled) {
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [role]);

  if (loading) {
    return (
      <section className="dcc-fade-up mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-200" />

          <div className="flex-1">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-56 rounded bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

  if (announcements.length === 0) {
    return (
      <section className="dcc-fade-up mt-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            <Megaphone size={19} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Announcements
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              There are no new announcements at the moment.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dcc-fade-up mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BellRing size={18} />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Announcements
            </h2>

            <p className="text-xs text-slate-500">
              Important updates from DCC.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-yellow-50 px-2.5 py-1 text-[10px] font-bold text-yellow-700">
          {announcements.length}{" "}
          {announcements.length === 1
            ? "update"
            : "updates"}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {announcements
          .slice(0, 5)
          .map((announcement, index) => {
            const title =
              announcement.title ||
              announcement.subject ||
              "Platform Announcement";

            const message =
              announcement.message ||
              announcement.description ||
              "";

            const date =
              announcement.createdAt ||
              announcement.date;

            return (
              <div
                key={
                  announcement._id ||
                  announcement.id ||
                  index
                }
                className="group px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Megaphone size={15} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {title}
                    </h3>

                    {message && (
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {message}
                      </p>
                    )}

                    {date && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <CalendarDays size={12} />

                        <span>
                          {new Date(
                            date
                          ).toLocaleDateString(
                            undefined,
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {announcement.link && (
                    <Link
                      href={announcement.link}
                      className="self-center text-blue-600 transition hover:text-blue-700"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}