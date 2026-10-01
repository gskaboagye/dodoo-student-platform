"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  CalendarDays,
  Megaphone,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function Announcements({ role }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadAnnouncements(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/announcements", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        setAnnouncements([]);
        return;
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.announcements)
        ? data.announcements
        : [];

      setAnnouncements(items);
    } catch (error) {
      console.error("Announcements load error:", error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        setLoading(true);

        const response = await fetch("/api/announcements", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          if (!cancelled) {
            setAnnouncements([]);
          }

          return;
        }

        const data = await response.json();

        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.announcements)
          ? data.announcements
          : [];

        if (!cancelled) {
          setAnnouncements(items);
        }
      } catch (error) {
        console.error("Announcements load error:", error);

        if (!cancelled) {
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialLoad();

    return () => {
      cancelled = true;
    };
  }, [role]);

  function formatDate(date) {
    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }

  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (loading) {
    return (
      <section className="border-b border-slate-200 bg-white px-3 py-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />

          <div className="flex-1">
            <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
            <div className="mt-1.5 h-2.5 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-100" />
              <div className="mt-1 h-2.5 w-3/4 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  /*
   * ============================================================
   * SIDEBAR ANNOUNCEMENTS
   * ============================================================
   */

  return (
    <section className="border-b border-slate-200 bg-white px-3 py-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <BellRing size={16} />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">
              Announcements
            </h2>

            <p className="text-[10px] text-slate-500">
              Latest DCC updates
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadAnnouncements(true)}
          disabled={refreshing}
          aria-label="Refresh announcements"
          title="Refresh announcements"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Count */}
      {announcements.length > 0 && (
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-[10px] font-medium text-slate-400">
            Recent updates
          </span>

          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
            {announcements.length}
          </span>
        </div>
      )}

      {/* Empty State */}
      {announcements.length === 0 ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <Megaphone size={16} />
            </div>

            <h3 className="mt-2 text-xs font-semibold text-slate-800">
              No announcements
            </h3>

            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              There are no new DCC updates at the moment.
            </p>
          </div>
        </div>
      ) : (
        /*
         * Scrollable announcement area.
         * This prevents the sidebar from becoming excessively tall.
         */
        <div className="max-h-[285px] space-y-2 overflow-y-auto pr-1">
          {announcements.slice(0, 5).map((announcement, index) => {
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
              announcement.date ||
              announcement.publishedAt;

            const announcementKey =
              announcement._id ||
              announcement.id ||
              `announcement-${index}`;

            const content = (
              <div className="group rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-blue-50/50">
                <div className="flex gap-2.5">
                  {/* Icon */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                    <Megaphone size={13} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-[11px] font-bold leading-4 text-slate-800">
                        {title}
                      </h3>

                      {announcement.link && (
                        <ArrowRight
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                        />
                      )}
                    </div>

                    {message && (
                      <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-slate-500">
                        {message}
                      </p>
                    )}

                    {date && (
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400">
                        <CalendarDays size={10} />

                        <span>{formatDate(date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );

            if (announcement.link) {
              return (
                <Link
                  key={announcementKey}
                  href={announcement.link}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={announcementKey}>
                {content}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {announcements.length > 5 && (
        <p className="mt-3 px-1 text-center text-[9px] text-slate-400">
          Showing the 5 most recent announcements
        </p>
      )}
    </section>
  );
}