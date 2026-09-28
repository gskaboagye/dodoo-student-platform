"use client";

import { useEffect, useMemo, useState } from "react";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeStatus(status) {
  if (!status) {
    return "";
  }

  return String(status).trim().toLowerCase();
}

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState("");

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = getToday();

  // =====================================================
  // LOAD AUTHENTICATED USER
  // =====================================================

  async function loadUser() {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The authentication server returned an invalid response."
      );
    }

    if (!response.ok || !data?.user) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Your session has expired. Please log in again."
      );
    }

    return data.user;
  }

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  async function loadStudents() {
    const response = await fetch("/api/students", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The students server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          "Failed to load students."
      );
    }

    const studentList = Array.isArray(data)
      ? data
      : Array.isArray(data?.students)
        ? data.students
        : [];

    setStudents(studentList);

    return studentList;
  }

  // =====================================================
  // LOAD ATTENDANCE
  // =====================================================

  async function loadAttendance(selectedDate) {
    if (!selectedDate) {
      return;
    }

    try {
      const response = await fetch(
        `/api/attendance?date=${encodeURIComponent(
          selectedDate
        )}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The attendance server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to load attendance."
        );
      }

      /*
       * The API may return either:
       *
       * [
       *   ...
       * ]
       *
       * or:
       *
       * {
       *   attendance: [...]
       * }
       */

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.attendance)
          ? data.attendance
          : [];

      /*
       * Keep only valid attendance records.
       */
      const cleanedRecords = records.filter(
        (record) =>
          record &&
          typeof record === "object" &&
          record.date
      );

      setAttendance(cleanedRecords);

      return cleanedRecords;
    } catch (err) {
      console.error(
        "LOAD ATTENDANCE ERROR:",
        err
      );

      /*
       * Do not destroy existing attendance during
       * an automatic refresh if the request temporarily
       * fails.
       */
      throw err;
    }
  }

  // =====================================================
  // INITIALIZE PAGE
  // =====================================================

  async function initializePage() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const currentUser = await loadUser();

      if (currentUser.role !== "facilitator") {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      await Promise.all([
        loadStudents(),
        loadAttendance(date),
      ]);
    } catch (err) {
      console.error(
        "ATTENDANCE PAGE INITIALIZATION ERROR:",
        err
      );

      const message =
        err?.message ||
        "Unable to load attendance.";

      setError(message);

      if (
        message
          .toLowerCase()
          .includes("session has expired")
      ) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIAL PAGE LOAD
  // =====================================================

  useEffect(() => {
    initializePage();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // LOAD ATTENDANCE WHEN DATE CHANGES
  // =====================================================

  useEffect(() => {
    if (!user || !date) {
      return;
    }

    loadAttendance(date).catch((err) => {
      console.error(
        "DATE ATTENDANCE LOAD ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to load attendance."
      );
    });
  }, [date, user]);

  // =====================================================
  // AUTOMATIC REFRESH
  // =====================================================

  /*
   * This keeps the facilitator's attendance screen
   * synchronized with the database.
   *
   * It is especially useful if another facilitator
   * changes attendance while this page is open.
   */

  useEffect(() => {
    if (!user || !date) {
      return;
    }

    const interval = setInterval(() => {
      loadAttendance(date).catch((err) => {
        console.error(
          "AUTOMATIC ATTENDANCE REFRESH ERROR:",
          err
        );
      });
    }, 15000);

    return () => {
      clearInterval(interval);
    };
  }, [user, date]);

  // =====================================================
  // REFRESH WHEN TAB BECOMES VISIBLE
  // =====================================================

  useEffect(() => {
    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        user &&
        date
      ) {
        loadAttendance(date).catch((err) => {
          console.error(
            "VISIBILITY ATTENDANCE REFRESH ERROR:",
            err
          );
        });
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [user, date]);

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  async function handleRefresh() {
    try {
      setRefreshing(true);
      setError("");
      setMessage("");

      await Promise.all([
        loadStudents(),
        loadAttendance(date),
      ]);

      setMessage(
        `Attendance refreshed for ${formatDate(date)}.`
      );
    } catch (err) {
      console.error(
        "MANUAL ATTENDANCE REFRESH ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to refresh attendance."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // =====================================================
  // GET ATTENDANCE FOR STUDENT
  // =====================================================

  function getAttendance(studentId) {
    if (!studentId) {
      return undefined;
    }

    return attendance.find((record) => {
      return (
        String(record?.studentId) ===
        String(studentId)
      );
    });
  }

  // =====================================================
  // SAVE ATTENDANCE
  // =====================================================

  async function saveAttendance(
    student,
    status
  ) {
    if (!student?._id) {
      setError(
        "Unable to identify this student."
      );
      return;
    }

    if (!user || user.role !== "facilitator") {
      setError(
        "Only facilitators can record attendance."
      );
      return;
    }

    const studentId = String(
      student._id
    );

    setSavingId(studentId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        "/api/attendance",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            studentId:
              student._id,
            studentName: `${student.firstName || ""} ${
              student.lastName || ""
            }`.trim(),
            date,
            status,
          }),
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The attendance server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to save attendance."
        );
      }

      /*
       * Reload the attendance directly from the
       * database after saving.
       */
      await loadAttendance(date);

      setMessage(
        `${student.firstName || ""} ${
          student.lastName || ""
        }: ${status} for ${formatDate(date)}`
      );
    } catch (err) {
      console.error(
        "SAVE ATTENDANCE ERROR:",
        err
      );

      setError(
        err?.message ||
          "Failed to save attendance."
      );
    } finally {
      setSavingId(null);
    }
  }

  // =====================================================
  // DATE HELPERS
  // =====================================================

  function changeDate(
    currentDate,
    amount
  ) {
    const current = new Date(
      `${currentDate}T00:00:00`
    );

    if (Number.isNaN(current.getTime())) {
      return today;
    }

    current.setDate(
      current.getDate() + amount
    );

    const year =
      current.getFullYear();

    const month = String(
      current.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      current.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

    const nextDate = changeDate(
      date,
      1
    );

    /*
     * Do not allow the facilitator to
     * move into a future date.
     */
    if (nextDate <= today) {
      setDate(nextDate);
    }
  }

  function goToToday() {
    setMessage("");
    setError("");
    setDate(today);
  }

  // =====================================================
  // DATE STATE
  // =====================================================

  const isToday = date === today;

  const nextDate = changeDate(
    date,
    1
  );

  const canGoForward =
    nextDate <= today;

  // =====================================================
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents =
    useMemo(() => {
      const value =
        search
          .toLowerCase()
          .trim();

      if (!value) {
        return students;
      }

      return students.filter(
        (student) => {
          const name =
            `${student.firstName || ""} ${
              student.lastName || ""
            }`.toLowerCase();

          const email =
            student.email
              ?.toLowerCase() || "";

          const program =
            student.program
              ?.toLowerCase() || "";

          return (
            name.includes(value) ||
            email.includes(value) ||
            program.includes(value)
          );
        }
      );
    }, [students, search]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const stats = useMemo(() => {
    return {
      present:
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "present"
        ).length,

      late:
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "late"
        ).length,

      absent:
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "absent"
        ).length,
    };
  }, [attendance]);

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Attendance
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              Record and monitor student attendance.
            </p>

            {user?.name && (
              <p className="mt-2 text-sm text-slate-500">
                Facilitator:{" "}
                <span className="font-semibold text-slate-700">
                  {user.name}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Attendance"}
          </button>

        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {/* =================================================
            CONTROLS
        ================================================= */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            {/* DATE */}

            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Attendance Date
              </label>

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={
                    goToPreviousDay
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Previous
                </button>

                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => {
                    setMessage("");
                    setError("");

                    const selected =
                      event.target.value;

                    if (
                      selected &&
                      selected <= today
                    ) {
                      setDate(selected);
                    }
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={
                    goToNextDay
                  }
                  disabled={
                    !canGoForward
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>

                {!isToday && (
                  <button
                    type="button"
                    onClick={
                      goToToday
                    }
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Today
                  </button>
                )}

              </div>

              <p className="mt-2 text-sm text-slate-500">
                {formatDate(date)}
              </p>
            </div>

            {/* SEARCH */}

            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Search Students
              </label>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by name, email or program..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-96"
              />
            </div>

          </div>
        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mb-8 grid gap-5 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Present
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.present}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Late
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {stats.late}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Absent
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.absent}
            </p>
          </div>

        </div>

        {/* =================================================
            STUDENT ATTENDANCE
        ================================================= */}

        <section className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Student Attendance
            </h2>

            <p className="mt-1 text-slate-500">
              Select the attendance status for each student.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
              No students found.
            </div>
          ) : (
            <div className="space-y-4">

              {filteredStudents.map(
                (student) => {
                  const record =
                    getAttendance(
                      student._id
                    );

                  const currentStatus =
                    record?.status;

                  const isSaving =
                    savingId ===
                    String(
                      student._id
                    );

                  return (
                    <div
                      key={student._id}
                      className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-sm"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* STUDENT */}

                        <div className="flex items-center gap-4">

                          {student.profileImage ? (
                            <img
                              src={
                                student.profileImage
                              }
                              alt={`${student.firstName || ""} ${
                                student.lastName || ""
                              }`}
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-100"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                              {student.firstName?.[0] ||
                                ""}
                              {student.lastName?.[0] ||
                                ""}
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
                              <p className="mt-1 text-xs font-medium text-slate-600">
                                Current status:{" "}
                                <span className="font-semibold">
                                  {currentStatus}
                                </span>
                              </p>
                            )}
                          </div>

                        </div>

                        {/* STATUS BUTTONS */}

                        <div className="flex flex-wrap gap-2">

                          <button
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Present"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              normalizeStatus(
                                currentStatus
                              ) ===
                              "present"
                                ? "bg-green-600 text-white"
                                : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isSaving &&
                            normalizeStatus(
                              currentStatus
                            ) !==
                              "present"
                              ? "Saving..."
                              : "Present"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Late"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              normalizeStatus(
                                currentStatus
                              ) ===
                              "late"
                                ? "bg-yellow-500 text-white"
                                : "border border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isSaving &&
                            normalizeStatus(
                              currentStatus
                            ) !==
                              "late"
                              ? "Saving..."
                              : "Late"}
                          </button>

                          <button
                            type="button"
                            disabled={
                              isSaving
                            }
                            onClick={() =>
                              saveAttendance(
                                student,
                                "Absent"
                              )
                            }
                            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                              normalizeStatus(
                                currentStatus
                              ) ===
                              "absent"
                                ? "bg-red-600 text-white"
                                : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {isSaving &&
                            normalizeStatus(
                              currentStatus
                            ) !==
                              "absent"
                              ? "Saving..."
                              : "Absent"}
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}