"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function changeDate(currentDate, days) {
  const date = new Date(`${currentDate}T00:00:00`);
  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AttendancePage() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = getToday();

  useEffect(() => {
    initializePage();
  }, []);

  useEffect(() => {
    if (user) {
      loadAttendance(date);
    }
  }, [date, user]);

  async function initializePage() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);

      if (data.user.role === "facilitator") {
        await loadStudents();
      }

      await loadAttendance(date);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const response = await fetch("/api/students", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to load students."
        );
      }

      setStudents(
        Array.isArray(data)
          ? data
          : Array.isArray(data.students)
            ? data.students
            : []
      );
    } catch (err) {
      throw err;
    }
  }

  async function loadAttendance(selectedDate) {
    try {
      setError("");

      const response = await fetch(
        `/api/attendance?date=${encodeURIComponent(selectedDate)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to load attendance."
        );
      }

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data.attendance)
          ? data.attendance
          : [];

      setAttendance(records);
    } catch (err) {
      setAttendance([]);
      setError(
        err.message || "Failed to load attendance."
      );
    }
  }

  function getAttendance(studentId) {
    return attendance.find(
      (record) =>
        String(record.studentId) === String(studentId)
    );
  }

  async function saveAttendance(student, status) {
    if (user?.role !== "facilitator") {
      return;
    }

    setSavingId(String(student._id));
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          date,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Failed to save attendance."
        );
      }

      setMessage(
        `${student.firstName} ${student.lastName}: ${status} for ${formatDate(date)}`
      );

      await loadAttendance(date);
    } catch (err) {
      setError(
        err.message || "Failed to save attendance."
      );
    } finally {
      setSavingId(null);
    }
  }

  function goToPreviousDay() {
    setMessage("");
    setError("");
    setDate((currentDate) =>
      changeDate(currentDate, -1)
    );
  }

  function goToNextDay() {
    setMessage("");
    setError("");

    const nextDate = changeDate(date, 1);

    // Do not allow navigation into the future.
    if (nextDate <= today) {
      setDate(nextDate);
    }
  }

  function goToToday() {
    setMessage("");
    setError("");
    setDate(today);
  }

  const isToday = date === today;
  const nextDate = changeDate(date, 1);
  const canGoForward = nextDate <= today;

  const filteredStudents = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return students;
    }

    return students.filter((student) => {
      const name =
        `${student.firstName || ""} ${
          student.lastName || ""
        }`.toLowerCase();

      return (
        name.includes(value) ||
        student.email
          ?.toLowerCase()
          .includes(value) ||
        student.program
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [students, search]);

  const stats = useMemo(() => {
    return {
      present: attendance.filter(
        (record) => record.status === "Present"
      ).length,

      late: attendance.filter(
        (record) => record.status === "Late"
      ).length,

      absent: attendance.filter(
        (record) => record.status === "Absent"
      ).length,
    };
  }, [attendance]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading attendance...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFacilitator = user.role === "facilitator";
  const isStudent = user.role === "student";

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8">
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
              <CalendarCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {isFacilitator
                  ? "Attendance"
                  : "My Attendance"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {isFacilitator
                  ? "Record and monitor student attendance by day."
                  : "View your attendance records by day."}
              </p>
            </div>

          </div>
        </div>

        {/* =====================================================
            MESSAGES
        ===================================================== */}

        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            DATE CONTROLS
        ===================================================== */}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            {/* DATE PICKER */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Attendance Date
              </label>

              <input
                type="date"
                value={date}
                max={today}
                onChange={(event) => {
                  setMessage("");
                  setError("");
                  setDate(event.target.value);
                }}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* DAY NAVIGATION */}

            <div className="flex flex-wrap items-center gap-2">

              <button
                type="button"
                onClick={goToPreviousDay}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Day
              </button>

              <button
                type="button"
                onClick={goToToday}
                disabled={isToday}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isToday
                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={goToNextDay}
                disabled={!canGoForward}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  canGoForward
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                Next Day
                <ChevronRight className="h-4 w-4" />
              </button>

            </div>

            {/* SEARCH */}

            {isFacilitator && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Search Students
                </label>

                <div className="relative">

                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search by name, email or program..."
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-80"
                  />

                </div>
              </div>
            )}

          </div>

          {/* SELECTED DATE */}

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">

            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Selected Attendance Day
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatDate(date)}
            </p>

            {isToday && (
              <span className="mt-2 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Today
              </span>
            )}

          </div>

        </div>

        {/* =====================================================
            FACILITATOR STATISTICS
        ===================================================== */}

        {isFacilitator && (
          <div className="mb-8 grid gap-5 sm:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Present
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.present}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {formatDate(date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Late
              </p>

              <p className="mt-2 text-3xl font-bold text-yellow-600">
                {stats.late}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {formatDate(date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Absent
              </p>

              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.absent}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {formatDate(date)}
              </p>
            </div>

          </div>
        )}

        {/* =====================================================
            FACILITATOR VIEW
        ===================================================== */}

        {isFacilitator && (
          <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

            <div className="mb-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Student Attendance
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(date)}
                  </p>
                </div>

                {attendance.length > 0 && (
                  <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Attendance Recorded
                  </span>
                )}

              </div>

              <p className="mt-3 text-sm text-slate-500">
                Select the attendance status for each student.
                Previous dates load their saved attendance records.
              </p>

            </div>

            {filteredStudents.length === 0 ? (

              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
                No students found.
              </div>

            ) : (

              <div className="space-y-4">

                {filteredStudents.map((student) => {

                  const record = getAttendance(student._id);

                  const currentStatus = record?.status;

                  const isSaving =
                    savingId === String(student._id);

                  return (
                    <div
                      key={String(student._id)}
                      className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-sm"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* STUDENT */}

                        <div className="flex items-center gap-4">

                          {student.profileImage ? (

                            <img
                              src={student.profileImage}
                              alt={`${student.firstName} ${student.lastName}`}
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-100"
                            />

                          ) : (

                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">

                              {student.firstName?.[0]}
                              {student.lastName?.[0]}

                            </div>

                          )}

                          <div>

                            <h3 className="font-bold text-slate-900">
                              {student.firstName}{" "}
                              {student.lastName}
                            </h3>

                            <p className="text-sm text-slate-500">
                              {student.program ||
                                "Program not specified"}
                            </p>

                            <p className="text-sm text-slate-500">
                              {student.email}
                            </p>

                            {currentStatus && (
                              <p className="mt-1 text-xs font-medium text-blue-600">
                                Saved: {currentStatus}
                              </p>
                            )}

                          </div>

                        </div>

                        {/* STATUS BUTTONS */}

                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Present"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              currentStatus === "Present"
                                ? "bg-green-600 text-white"
                                : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            } disabled:opacity-50`}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Late"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              currentStatus === "Late"
                                ? "bg-yellow-500 text-white"
                                : "border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            } disabled:opacity-50`}
                          >
                            Late
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Absent"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              currentStatus === "Absent"
                                ? "bg-red-600 text-white"
                                : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            } disabled:opacity-50`}
                          >
                            Absent
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>

            )}

          </section>
        )}

        {/* =====================================================
            STUDENT VIEW
        ===================================================== */}

        {isStudent && (
          <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">

            <div className="mb-6">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-xl font-bold text-slate-900">
                    My Attendance Record
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(date)}
                  </p>

                </div>

                {attendance.length > 0 && (
                  <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Record Found
                  </span>
                )}

              </div>

              <p className="mt-3 text-sm text-slate-500">
                Use the date controls above to view your attendance
                for previous days.
              </p>

            </div>

            {attendance.length === 0 ? (

              <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center">

                <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />

                <p className="mt-3 text-sm font-medium text-slate-600">
                  No attendance record found for this date.
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Your facilitator records your attendance.
                </p>

              </div>

            ) : (

              <div className="space-y-4">

                {attendance.map((record) => {

                  const statusConfig = {
                    Present: {
                      icon: CheckCircle2,
                      className:
                        "border-green-200 bg-green-50 text-green-700",
                    },

                    Late: {
                      icon: Clock3,
                      className:
                        "border-yellow-200 bg-yellow-50 text-yellow-700",
                    },

                    Absent: {
                      icon: AlertCircle,
                      className:
                        "border-red-200 bg-red-50 text-red-700",
                    },
                  };

                  const config =
                    statusConfig[record.status] ||
                    statusConfig.Absent;

                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={String(record._id)}
                      className={`flex items-center justify-between rounded-xl border p-5 ${config.className}`}
                    >

                      <div className="flex items-center gap-3">

                        <StatusIcon className="h-6 w-6" />

                        <div>

                          <p className="font-semibold">
                            {record.status}
                          </p>

                          <p className="text-sm opacity-80">
                            {record.date || date}
                          </p>

                        </div>

                      </div>

                      <span className="text-sm font-medium">
                        Attendance
                      </span>

                    </div>
                  );
                })}

              </div>

            )}

          </section>
        )}

      </div>
    </main>
  );
}