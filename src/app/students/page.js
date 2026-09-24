"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);

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

      const studentList = Array.isArray(data)
        ? data
        : data.students || [];

      setStudents(studentList);

      // Keep selected student information updated
      if (selectedStudent) {
        const updatedStudent = studentList.find(
          (student) => student._id === selectedStudent._id
        );

        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        } else {
          setSelectedStudent(null);
        }
      }
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
  // SELECT STUDENT
  // =====================================================

  function handleStudentClick(student) {
    setMessage("");
    setError("");
    setSelectedStudent(student);

    // Scroll to the top of the page
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // BACK TO STUDENT LIST
  // =====================================================

  function handleBackToStudents() {
    setMessage("");
    setError("");
    setSelectedStudent(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // DELETE STUDENT
  // =====================================================

  async function handleDelete(id) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this student? This will also remove the student's login account."
    );

    if (!confirmed) {
      return;
    }

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

      setSelectedStudent(null);

      await loadStudents();
    } catch (err) {
      console.error("Delete student error:", err);
      setError(err.message);
    }
  }

  // =====================================================
  // DATE FORMATTER
  // =====================================================

  function formatDate(date) {
    if (!date) {
      return "Not available";
    }

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
  // FULL STUDENT PROFILE
  // =====================================================

  if (selectedStudent) {
    const fullName =
      `${selectedStudent.firstName || ""} ${
        selectedStudent.lastName || ""
      }`.trim() || "Unnamed Student";

    const initials =
      `${selectedStudent.firstName?.[0] || ""}${
        selectedStudent.lastName?.[0] || ""
      }`.toUpperCase() || "S";

    const progress =
      Number(selectedStudent.progress) || 0;

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">

          {/* BACK BUTTON */}
          <button
            type="button"
            onClick={handleBackToStudents}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            ← Back to Students
          </button>

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

          {/* PROFILE HEADER */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

            <div className="bg-slate-900 px-6 py-8 md:px-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">

                {/* PROFILE IMAGE */}
                {selectedStudent.profileImage ? (
                  <img
                    src={selectedStudent.profileImage}
                    alt={fullName}
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-white/20"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700 ring-4 ring-white/20">
                    {initials}
                  </div>
                )}

                {/* NAME */}
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                    Student Profile
                  </p>

                  <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl">
                    {fullName}
                  </h1>

                  <p className="mt-2 text-slate-300">
                    {selectedStudent.email ||
                      "No email provided"}
                  </p>
                </div>

                {/* STATUS */}
                <div>
                  <span
                    className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${
                      selectedStudent.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : selectedStudent.status ===
                          "Completed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {selectedStudent.status || "Active"}
                  </span>
                </div>

              </div>
            </div>

            <div className="p-6 md:p-8">

              {/* PERSONAL INFORMATION */}
              <section>
                <h2 className="text-xl font-bold text-slate-900">
                  Personal Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Student personal and contact information.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                  <InfoItem
                    label="First Name"
                    value={selectedStudent.firstName}
                  />

                  <InfoItem
                    label="Last Name"
                    value={selectedStudent.lastName}
                  />

                  <InfoItem
                    label="Email"
                    value={selectedStudent.email}
                  />

                  <InfoItem
                    label="Phone"
                    value={selectedStudent.phone}
                  />

                  <InfoItem
                    label="Date of Birth"
                    value={formatDate(
                      selectedStudent.dateOfBirth
                    )}
                  />

                  <InfoItem
                    label="Gender"
                    value={selectedStudent.gender}
                  />

                  <InfoItem
                    label="Program"
                    value={selectedStudent.program}
                  />

                  <InfoItem
                    label="Education Level"
                    value={selectedStudent.educationLevel}
                  />

                  <InfoItem
                    label="School"
                    value={selectedStudent.school}
                  />

                  <InfoItem
                    label="Address"
                    value={selectedStudent.address}
                    wide
                  />

                </div>
              </section>

              {/* EMERGENCY CONTACT */}
              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Emergency Contact
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Emergency contact information provided by
                  the student.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">

                  <InfoItem
                    label="Contact Name"
                    value={
                      selectedStudent.emergencyContactName
                    }
                  />

                  <InfoItem
                    label="Contact Phone"
                    value={
                      selectedStudent.emergencyContactPhone
                    }
                  />

                </div>
              </section>

              {/* PROGRAM INFORMATION */}
              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Program Information
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                  <InfoItem
                    label="Student ID"
                    value={selectedStudent.studentId}
                  />

                  <InfoItem
                    label="Enrollment Date"
                    value={formatDate(
                      selectedStudent.enrollmentDate
                    )}
                  />

                  <InfoItem
                    label="Expected Completion"
                    value={formatDate(
                      selectedStudent.expectedCompletionDate
                    )}
                  />

                  <InfoItem
                    label="Program Duration"
                    value={
                      selectedStudent.programDurationMonths
                        ? `${selectedStudent.programDurationMonths} months`
                        : "24 months"
                    }
                  />

                  <InfoItem
                    label="Status"
                    value={
                      selectedStudent.status || "Active"
                    }
                  />

                </div>
              </section>

              {/* PROGRESS */}
              <section className="mt-10 border-t border-slate-200 pt-8">

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Overall Progress
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Current student progress.
                    </p>
                  </div>

                  <span className="text-2xl font-bold text-blue-600">
                    {progress}%
                  </span>
                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
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

              </section>

              {/* ACTIONS */}
              <section className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">

                <button
                  type="button"
                  onClick={handleBackToStudents}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  ← Back to Students
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(selectedStudent._id)
                  }
                  className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete Student
                </button>

              </section>

            </div>
          </section>

        </div>
      </main>
    );
  }

  // =====================================================
  // STUDENT LIST PAGE
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
                {filteredStudents.length === 1
                  ? ""
                  : "s"}
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
                      handleStudentClick(student)
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
                            {student.email ||
                              "No email provided"}
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
                              : student.status ===
                                "Completed"
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

// =====================================================
// READ-ONLY INFORMATION ITEM
// =====================================================

function InfoItem({
  label,
  value,
  wide = false,
}) {
  return (
    <div
      className={`rounded-xl bg-slate-50 p-4 ${
        wide
          ? "sm:col-span-2 lg:col-span-3"
          : ""
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