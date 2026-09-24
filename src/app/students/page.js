"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // FACILITATOR ACCESS CHECK
  // =====================================================

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      setCheckingAccess(true);

      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      if (data.user.role !== "facilitator") {
        router.replace("/");
        return;
      }

      setUser(data.user);
    } catch (err) {
      console.error("Access check failed:", err);
      router.replace("/login");
    } finally {
      setCheckingAccess(false);
    }
  }

  // =====================================================
  // LOAD STUDENTS
  // =====================================================

  async function loadStudents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/students", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load students."
        );
      }

      setStudents(
        Array.isArray(data)
          ? data
          : data.students || []
      );
    } catch (err) {
      console.error("Load students error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checkingAccess && user?.role === "facilitator") {
      loadStudents();
    }
  }, [checkingAccess, user]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredStudents = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    if (!searchValue) {
      return students;
    }

    return students.filter((student) => {
      const fullName =
        `${student.firstName || ""} ${
          student.lastName || ""
        }`.toLowerCase();

      return (
        fullName.includes(searchValue) ||
        student.email
          ?.toLowerCase()
          .includes(searchValue) ||
        student.phone
          ?.toLowerCase()
          .includes(searchValue) ||
        student.program
          ?.toLowerCase()
          .includes(searchValue) ||
        student.school
          ?.toLowerCase()
          .includes(searchValue) ||
        student.educationLevel
          ?.toLowerCase()
          .includes(searchValue)
      );
    });
  }, [students, search]);

  // =====================================================
  // ACCESS CHECK SCREEN
  // =====================================================

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">
              Checking access...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user || user.role !== "facilitator") {
    return null;
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Students
          </h1>

          <p className="mt-2 text-lg text-slate-600">
            View and manage student profiles.
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

        {/* STUDENT RECORDS */}
        <section className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

          {/* SECTION HEADER */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Student Records
              </h2>

              <p className="mt-1 text-slate-500">
                {filteredStudents.length} registered student
                {filteredStudents.length === 1 ? "" : "s"}
              </p>
            </div>

            <input
              type="search"
              placeholder="Search students..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-80"
            />
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
              No students found.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredStudents.map((student) => {
                const fullName =
                  `${student.firstName || ""} ${
                    student.lastName || ""
                  }`.trim() || "Unnamed Student";

                const initials =
                  `${student.firstName?.[0] || ""}${
                    student.lastName?.[0] || ""
                  }`.toUpperCase() || "S";

                const progress =
                  Number(student.progress) || 0;

                return (
                  <button
                    key={student._id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/students/${student._id}`
                      )
                    }
                    className="group text-left"
                  >
                    <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">

                      {/* STUDENT HEADER */}
                      <div className="flex items-start gap-4">

                        {student.profileImage ? (
                          <img
                            src={student.profileImage}
                            alt={fullName}
                            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                          />
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                            {initials}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-blue-600">
                            {fullName}
                          </h3>

                          <p className="mt-1 truncate text-sm text-slate-500">
                            {student.email || "No email provided"}
                          </p>
                        </div>

                      </div>

                      {/* BASIC INFORMATION */}
                      <div className="mt-5 space-y-3">

                        {student.studentId && (
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">
                              Student ID
                            </span>

                            <span className="font-medium text-slate-900">
                              {student.studentId}
                            </span>
                          </div>
                        )}

                        {student.program && (
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">
                              Program
                            </span>

                            <span className="truncate font-medium text-slate-900">
                              {student.program}
                            </span>
                          </div>
                        )}

                        {student.educationLevel && (
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">
                              Education
                            </span>

                            <span className="font-medium text-slate-900">
                              {student.educationLevel}
                            </span>
                          </div>
                        )}

                        {student.school && (
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-slate-500">
                              School
                            </span>

                            <span className="truncate font-medium text-slate-900">
                              {student.school}
                            </span>
                          </div>
                        )}

                      </div>

                      {/* PROGRESS */}
                      <div className="mt-5 border-t border-slate-100 pt-5">

                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-slate-500">
                            Progress
                          </span>

                          <span className="text-sm font-semibold text-blue-600">
                            {progress}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${Math.min(
                                Math.max(progress, 0),
                                100
                              )}%`,
                            }}
                          />
                        </div>

                      </div>

                      {/* STATUS + VIEW PROFILE */}
                      <div className="mt-5 flex items-center justify-between">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            student.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : student.status === "Completed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {student.status || "Active"}
                        </span>

                        <span className="text-sm font-semibold text-blue-600 group-hover:underline">
                          View Profile →
                        </span>

                      </div>

                    </article>
                  </button>
                );
              })}

            </div>
          )}

        </section>
      </div>
    </main>
  );
}