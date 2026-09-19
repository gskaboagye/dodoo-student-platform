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
  // DELETE STUDENT
  // =====================================================

  async function handleDelete(id) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this student? This will also remove the student's login account."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/students?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete student."
        );
      }

      setMessage(
        "Student and associated login account deleted successfully."
      );

      await loadStudents();
    } catch (err) {
      setError(err.message);
    }
  }

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
  // DATE FORMATTER
  // =====================================================

  function formatDate(date) {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-GH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

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
            View complete student profiles and learning progress.
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-80"
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
            <div className="space-y-6">

              {filteredStudents.map((student) => {
                const progress =
                  Number(student.progress) || 0;

                return (
                  <article
                    key={student._id}
                    className="overflow-hidden rounded-2xl border border-slate-200"
                  >

                    {/* STUDENT HEADER */}
                    <div className="bg-slate-50 p-6">

                      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        <div className="flex items-center gap-5">

                          {student.profileImage ? (
                            <img
                              src={student.profileImage}
                              alt={`${student.firstName} ${student.lastName}`}
                              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-white shadow-sm"
                            />
                          ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700 ring-4 ring-white">
                              {student.firstName?.[0]}
                              {student.lastName?.[0]}
                            </div>
                          )}

                          <div>
                            <h3 className="text-2xl font-bold text-slate-900">
                              {student.firstName}{" "}
                              {student.lastName}
                            </h3>

                            <p className="mt-1 text-slate-600">
                              {student.email}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Student Profile
                            </p>
                          </div>

                        </div>

                        <div className="flex items-center gap-3">

                          <span
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              student.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : student.status === "Completed"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {student.status || "Active"}
                          </span>

                        </div>

                      </div>
                    </div>

                    {/* COMPLETE PROFILE */}
                    <div className="p-6">

                      <div className="mb-6">
                        <h4 className="text-lg font-bold text-slate-900">
                          Personal Information
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          Read-only student information.
                        </p>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                        {/* FIRST NAME */}
                        <InfoItem
                          label="First Name"
                          value={student.firstName}
                        />

                        {/* LAST NAME */}
                        <InfoItem
                          label="Last Name"
                          value={student.lastName}
                        />

                        {/* EMAIL */}
                        <InfoItem
                          label="Email"
                          value={student.email}
                        />

                        {/* PHONE */}
                        <InfoItem
                          label="Phone"
                          value={student.phone}
                        />

                        {/* DATE OF BIRTH */}
                        <InfoItem
                          label="Date of Birth"
                          value={formatDate(
                            student.dateOfBirth
                          )}
                        />

                        {/* GENDER */}
                        <InfoItem
                          label="Gender"
                          value={student.gender}
                        />

                        {/* PROGRAM */}
                        <InfoItem
                          label="Program"
                          value={student.program}
                        />

                        {/* EDUCATION */}
                        <InfoItem
                          label="Education Level"
                          value={student.educationLevel}
                        />

                        {/* SCHOOL */}
                        <InfoItem
                          label="School"
                          value={student.school}
                        />

                        {/* ADDRESS */}
                        <InfoItem
                          label="Address"
                          value={student.address}
                          wide
                        />

                      </div>

                      {/* EMERGENCY CONTACT */}
                      <div className="mt-8">

                        <h4 className="mb-4 text-lg font-bold text-slate-900">
                          Emergency Contact
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2">

                          <InfoItem
                            label="Contact Name"
                            value={
                              student.emergencyContactName
                            }
                          />

                          <InfoItem
                            label="Contact Phone"
                            value={
                              student.emergencyContactPhone
                            }
                          />

                        </div>
                      </div>

                      {/* PROGRAM INFORMATION */}
                      <div className="mt-8">

                        <h4 className="mb-4 text-lg font-bold text-slate-900">
                          Program Information
                        </h4>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                          <InfoItem
                            label="Enrollment Date"
                            value={formatDate(
                              student.enrollmentDate
                            )}
                          />

                          <InfoItem
                            label="Expected Completion"
                            value={formatDate(
                              student.expectedCompletionDate
                            )}
                          />

                          <InfoItem
                            label="Program Duration"
                            value={
                              student.programDurationMonths
                                ? `${student.programDurationMonths} months`
                                : "24 months"
                            }
                          />

                          <InfoItem
                            label="Status"
                            value={
                              student.status || "Active"
                            }
                          />

                        </div>
                      </div>

                      {/* PROGRESS */}
                      <div className="mt-8">

                        <div className="mb-3 flex items-center justify-between">

                          <div>
                            <h4 className="text-lg font-bold text-slate-900">
                              Overall Progress
                            </h4>

                            <p className="text-sm text-slate-500">
                              Progress is calculated automatically.
                            </p>
                          </div>

                          <span className="text-xl font-bold text-blue-600">
                            {progress}%
                          </span>

                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                      </div>

                      {/* DELETE */}
                      <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(student._id)
                          }
                          className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete Student
                        </button>

                      </div>

                    </div>
                  </article>
                );
              })}

            </div>
          )}

        </section>
      </div>
    </main>
  );
}

// =====================================================
// READ-ONLY INFORMATION ITEM
// =====================================================

function InfoItem({ label, value, wide = false }) {
  return (
    <div
      className={`rounded-xl bg-slate-50 p-4 ${
        wide ? "sm:col-span-2 lg:col-span-3" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words font-medium text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}