"use client";

import { useEffect, useMemo, useState } from "react";

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .split("T")[0];
}

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
          : data.students || []
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadAttendance(selectedDate) {
    try {
      const response = await fetch(
        `/api/attendance?date=${selectedDate}`,
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

      setAttendance(
        Array.isArray(data)
          ? data
          : Array.isArray(data.attendance)
            ? data.attendance
            : []
      );
    } catch (err) {
      setAttendance([]);
      setError(err.message);
    }
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadStudents(),
        loadAttendance(date),
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAttendance(date);
  }, [date]);

  function getAttendance(studentId) {
    return attendance.find(
      (record) =>
        record.studentId?.toString() ===
        studentId?.toString()
    );
  }

  async function saveAttendance(student, status) {
    setSavingId(student._id);
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
        `${student.firstName} ${student.lastName}: ${status}`
      );

      await loadAttendance(date);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

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

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Attendance
          </h1>

          <p className="mt-2 text-lg text-slate-600">
            Record and monitor student attendance.
          </p>
        </div>

        {/* SUCCESS MESSAGE */}
        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-blue-700">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {/* CONTROLS */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

            {/* DATE */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Attendance Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
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
                  setSearch(event.target.value)
                }
                placeholder="Search by name, email or program..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-80"
              />
            </div>

          </div>
        </div>

        {/* STATISTICS */}
        <div className="mb-8 grid gap-5 sm:grid-cols-3">

          {/* PRESENT */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Present
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {stats.present}
            </p>
          </div>

          {/* LATE */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Late
            </p>

            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {stats.late}
            </p>
          </div>

          {/* ABSENT */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Absent
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {stats.absent}
            </p>
          </div>

        </div>

        {/* STUDENT ATTENDANCE */}
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

              {filteredStudents.map((student) => {
                const record = getAttendance(student._id);

                const currentStatus =
                  record?.status;

                const isSaving =
                  savingId === student._id;

                return (
                  <div
                    key={student._id}
                    className="rounded-2xl border border-slate-200 p-5 transition hover:shadow-sm"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* STUDENT INFORMATION */}
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
                        </div>

                      </div>

                      {/* ATTENDANCE BUTTONS */}
                      <div className="flex flex-wrap gap-2">

                        {/* PRESENT */}
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

                        {/* LATE */}
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

                        {/* ABSENT */}
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
      </div>
    </main>
  );
}