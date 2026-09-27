"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from "lucide-react";

// =====================================================
// DATE HELPERS
// =====================================================

function getToday() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "—";
  }

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function changeDateByDays(
  dateString,
  amount
) {
  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return getToday();
  }

  date.setDate(
    date.getDate() + amount
  );

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// =====================================================
// STATUS HELPERS
// =====================================================

function normalizeStatus(status) {
  if (!status) {
    return "";
  }

  return String(status)
    .trim()
    .toLowerCase();
}

function getStatusLabel(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "present") {
    return "Present";
  }

  if (normalized === "late") {
    return "Late";
  }

  if (normalized === "absent") {
    return "Absent";
  }

  return "Not Recorded";
}

// =====================================================
// STATUS BADGE
// =====================================================

function StatusBadge({ status }) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "present") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 size={14} />
        Present
      </span>
    );
  }

  if (normalized === "late") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Clock3 size={14} />
        Late
      </span>
    );
  }

  if (normalized === "absent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        <AlertCircle size={14} />
        Absent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      Not Recorded
    </span>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  description,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// STUDENT ATTENDANCE PAGE
// =====================================================

export default function StudentAttendancePage() {
  const router = useRouter();

  const [attendance, setAttendance] =
    useState([]);

  const [selectedDate, setSelectedDate] =
    useState(getToday());

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // LOAD USER
  // =====================================================

  async function loadUser() {
    const response = await fetch(
      "/api/auth/me",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Your session has expired. Please log in again."
      );
    }

    const data =
      await response.json();

    return data.user || data;
  }

  // =====================================================
  // LOAD ATTENDANCE
  // =====================================================

  async function loadAttendance() {
    const response = await fetch(
      "/api/attendance",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      throw new Error(
        "The attendance server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Failed to load attendance."
      );
    }

    // -------------------------------------------------
    // Support both possible API response formats:
    //
    // 1. [ ...attendance ]
    //
    // 2. { attendance: [ ...attendance ] }
    // -------------------------------------------------

    let records = [];

    if (Array.isArray(data)) {
      records = data;
    } else if (
      Array.isArray(data?.attendance)
    ) {
      records = data.attendance;
    }

    // -------------------------------------------------
    // Keep only valid attendance records
    // -------------------------------------------------

    const cleanedRecords =
      records.filter(
        (record) =>
          record &&
          typeof record === "object" &&
          record.date
      );

    setAttendance(cleanedRecords);
  }

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  async function loadPage() {
    try {
      setError("");

      const currentUser =
        await loadUser();

      // -------------------------------------------------
      // STUDENTS ONLY
      // -------------------------------------------------

      if (
        currentUser?.role !==
        "student"
      ) {
        router.replace("/");
        return;
      }

      setUser(currentUser);

      await loadAttendance();
    } catch (error) {
      console.error(
        "STUDENT ATTENDANCE LOAD ERROR:",
        error
      );

      const message =
        error?.message ||
        "Unable to load attendance.";

      if (
        message.toLowerCase().includes(
          "session has expired"
        )
      ) {
        router.replace("/login");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // REFRESH
  // =====================================================

  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError("");

      await loadAttendance();
    } catch (error) {
      console.error(
        "ATTENDANCE REFRESH ERROR:",
        error
      );

      setError(
        error?.message ||
          "Unable to refresh attendance."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // =====================================================
  // ATTENDANCE STATISTICS
  // =====================================================

  const statistics = useMemo(() => {
    const present =
      attendance.filter(
        (record) =>
          normalizeStatus(
            record.status
          ) === "present"
      ).length;

    const late =
      attendance.filter(
        (record) =>
          normalizeStatus(
            record.status
          ) === "late"
      ).length;

    const absent =
      attendance.filter(
        (record) =>
          normalizeStatus(
            record.status
          ) === "absent"
      ).length;

    const total =
      present + late + absent;

    const attendanceRate =
      total > 0
        ? Math.round(
            ((present + late) /
              total) *
              100
          )
        : 0;

    return {
      present,
      late,
      absent,
      total,
      attendanceRate,
    };
  }, [attendance]);

  // =====================================================
  // SELECTED DATE RECORD
  // =====================================================

  const selectedRecord =
    useMemo(() => {
      return attendance.find(
        (record) =>
          record.date ===
          selectedDate
      );
    }, [
      attendance,
      selectedDate,
    ]);

  // =====================================================
  // HISTORY
  // =====================================================

  const history = useMemo(() => {
    return [...attendance].sort(
      (a, b) =>
        String(b.date).localeCompare(
          String(a.date)
        )
    );
  }, [attendance]);

  // =====================================================
  // DATE NAVIGATION
  // =====================================================

  function goToPreviousDay() {
    setSelectedDate(
      changeDateByDays(
        selectedDate,
        -1
      )
    );
  }

  function goToNextDay() {
    setSelectedDate(
      changeDateByDays(
        selectedDate,
        1
      )
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <RefreshCw
              className="animate-spin text-blue-600"
              size={24}
            />
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Loading your attendance...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <CalendarCheck
                    size={24}
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    My Attendance
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    View your complete attendance history.
                  </p>
                </div>
              </div>

              {user?.name && (
                <p className="mt-3 text-sm text-slate-600">
                  Welcome,{" "}
                  <span className="font-semibold">
                    {user.name}
                  </span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            title="Attendance Rate"
            value={`${statistics.attendanceRate}%`}
            description={`${statistics.total} recorded days`}
            icon={
              <CalendarCheck
                size={22}
              />
            }
          />

          <StatCard
            title="Present"
            value={
              statistics.present
            }
            description="Days present"
            icon={
              <CheckCircle2
                size={22}
              />
            }
          />

          <StatCard
            title="Late"
            value={
              statistics.late
            }
            description="Days late"
            icon={
              <Clock3
                size={22}
              />
            }
          />

          <StatCard
            title="Absent"
            value={
              statistics.absent
            }
            description="Days absent"
            icon={
              <AlertCircle
                size={22}
              />
            }
          />

        </div>

        {/* =================================================
            DATE SELECTOR
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Check Attendance by Date
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select any date to view your attendance.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

              <button
                type="button"
                onClick={
                  goToPreviousDay
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft
                  size={16}
                />

                Previous Day
              </button>

              <input
                type="date"
                value={
                  selectedDate
                }
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={
                  goToNextDay
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Next Day

                <ArrowRight
                  size={16}
                />
              </button>

            </div>
          </div>
        </div>

        {/* =================================================
            SELECTED DATE
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Selected Date
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {formatDate(
                  selectedDate
                )}
              </h2>
            </div>

            {selectedRecord && (
              <StatusBadge
                status={
                  selectedRecord.status
                }
              />
            )}

          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-5">

            {selectedRecord ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm text-slate-500">
                    Attendance status
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        selectedRecord.status
                      }
                    />
                  </div>
                </div>

                <div className="text-sm text-slate-500">
                  <p>
                    Recorded for:
                  </p>

                  <p className="mt-1 font-medium text-slate-800">
                    {selectedRecord.studentName ||
                      user?.name ||
                      "Student"}
                  </p>
                </div>

              </div>
            ) : (
              <div className="text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <CalendarCheck
                    size={22}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="mt-3 font-semibold text-slate-800">
                  No attendance recorded
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  There is no attendance record for this date.
                </p>

              </div>
            )}

          </div>
        </div>

        {/* =================================================
            COMPLETE HISTORY
        ================================================= */}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 p-5">

            <h2 className="text-lg font-bold text-slate-900">
              Complete Attendance History
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Click any date below to view that day's attendance.
            </p>

          </div>

          {history.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <CalendarCheck
                  size={25}
                  className="text-slate-400"
                />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No attendance records yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Your attendance records will appear here once a facilitator records your attendance.
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[600px]">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Day
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {history.map(
                    (record, index) => {
                      const recordDate =
                        new Date(
                          `${record.date}T00:00:00`
                        );

                      const dayName =
                        Number.isNaN(
                          recordDate.getTime()
                        )
                          ? "—"
                          : recordDate.toLocaleDateString(
                              "en-US",
                              {
                                weekday:
                                  "long",
                              }
                            );

                      const isSelected =
                        record.date ===
                        selectedDate;

                      return (
                        <tr
                          key={
                            record._id ||
                            `${record.studentId}-${record.date}-${index}`
                          }
                          className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                            isSelected
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >

                          <td className="px-5 py-4">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDate(
                                  record.date
                                )
                              }
                              className="text-left font-medium text-blue-600 hover:text-blue-700"
                            >
                              {formatDate(
                                record.date
                              )}
                            </button>

                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {dayName}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                record.status
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-right">

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDate(
                                  record.date
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                              View

                              <ArrowRight
                                size={14}
                              />
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}