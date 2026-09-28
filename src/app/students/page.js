"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_EDIT_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  program: "",
  educationLevel: "",
  school: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  status: "active",
  enrollmentDate: "",
  expectedCompletionDate: "",
  programDurationMonths: "24",
  profileImage: "",
};

export default function StudentsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(
    EMPTY_EDIT_FORM
  );
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // ACCESS CHECK
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

      if (!data?.user) {
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

  async function loadStudents(options = {}) {
    const isRefresh = options.refresh === true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      if (!user || user.role !== "facilitator") {
        router.replace("/");
        return;
      }

      const studentsResponse = await fetch(
        "/api/students",
        {
          cache: "no-store",
        }
      );

      const studentsData =
        await studentsResponse.json();

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.message ||
            "Failed to load students."
        );
      }

      const studentList = Array.isArray(
        studentsData
      )
        ? studentsData
        : studentsData.students || [];

      const progressResponse = await fetch(
        "/api/progress",
        {
          cache: "no-store",
        }
      );

      const progressData =
        await progressResponse.json();

      if (!progressResponse.ok) {
        throw new Error(
          progressData.message ||
            "Failed to load student progress."
        );
      }

      const progressList = Array.isArray(
        progressData.students
      )
        ? progressData.students
        : [];

      const studentsWithProgress =
        studentList.map((student) => {
          const progressStudent =
            progressList.find(
              (item) =>
                String(item._id) ===
                String(student._id)
            );

          return {
            ...student,

            progress: safePercentage(
              progressStudent?.progress ??
                progressStudent?.overallProgress ??
                progressStudent
                  ?.progressDetails
                  ?.overallProgress ??
                0
            ),

            overallProgress:
              safePercentage(
                progressStudent?.progress ??
                  progressStudent?.overallProgress ??
                  progressStudent
                    ?.progressDetails
                    ?.overallProgress ??
                  0
              ),

            projectProgress:
              safePercentage(
                progressStudent?.projectProgress ??
                  progressStudent
                    ?.progressDetails
                    ?.projectProgress ??
                  0
              ),

            attendanceProgress:
              safePercentage(
                progressStudent?.attendanceProgress ??
                  progressStudent
                    ?.progressDetails
                    ?.attendanceProgress ??
                  0
              ),

            timelineProgress:
              safePercentage(
                progressStudent?.timelineProgress ??
                  progressStudent
                    ?.progressDetails
                    ?.timelineProgress ??
                  0
              ),

            progressDetails:
              progressStudent?.progressDetails ||
              {},

            projectCount:
              Number(
                progressStudent?.projectCount ??
                  0
              ),

            completedProjects:
              Number(
                progressStudent?.completedProjects ??
                  0
              ),

            attendanceCount:
              Number(
                progressStudent?.attendanceCount ??
                  0
              ),
          };
        });

      setStudents(studentsWithProgress);

      setSelectedStudent((current) => {
        if (!current) {
          return null;
        }

        return (
          studentsWithProgress.find(
            (student) =>
              String(student._id) ===
              String(current._id)
          ) || null
        );
      });

      if (isRefresh) {
        setMessage(
          "Student records refreshed successfully."
        );

        window.setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (err) {
      console.error(
        "Load students/progress error:",
        err
      );

      setError(
        err.message ||
          "Failed to load students and progress."
      );
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (
      !checkingAccess &&
      user?.role === "facilitator"
    ) {
      loadStudents();
    }
  }, [checkingAccess, user]);

  // =====================================================
  // HELPERS
  // =====================================================

  function safePercentage(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.min(
      Math.max(Math.round(number), 0),
      100
    );
  }

  function getFullName(student) {
    return (
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() || "Unnamed Student"
    );
  }

  function getInitials(student) {
    return (
      `${student.firstName?.[0] || ""}${
        student.lastName?.[0] || ""
      }`.toUpperCase() || "S"
    );
  }

  function formatDate(date) {
    if (!date) {
      return "Not available";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString(
      "en-GH",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  }

  function formatDateInput(date) {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    const year = parsedDate.getFullYear();
    const month = String(
      parsedDate.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      parsedDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getStatusClasses(status) {
    const normalized = String(
      status || "active"
    ).toLowerCase();

    if (normalized === "active") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "completed") {
      return "bg-blue-100 text-blue-700";
    }

    if (normalized === "pending") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (
      normalized === "inactive" ||
      normalized === "suspended"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-600";
  }

  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredStudents = useMemo(() => {
    const searchValue =
      search.toLowerCase().trim();

    return students.filter((student) => {
      const fullName =
        `${student.firstName || ""} ${
          student.lastName || ""
        }`.toLowerCase();

      const matchesSearch =
        !searchValue ||
        fullName.includes(searchValue) ||
        String(student.email || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(student.phone || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(student.program || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(student.school || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(student.studentId || "")
          .toLowerCase()
          .includes(searchValue);

      const status = String(
        student.status || "active"
      ).toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        status ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    statusFilter,
  ]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const statistics = useMemo(() => {
    const total = students.length;

    const active = students.filter(
      (student) =>
        String(
          student.status || "active"
        ).toLowerCase() === "active"
    ).length;

    const completed = students.filter(
      (student) =>
        String(
          student.status || ""
        ).toLowerCase() === "completed"
    ).length;

    const pending = students.filter(
      (student) =>
        String(
          student.status || ""
        ).toLowerCase() === "pending"
    ).length;

    const averageProgress =
      total > 0
        ? Math.round(
            students.reduce(
              (sum, student) =>
                sum +
                safePercentage(
                  student.overallProgress ??
                    student.progress
                ),
              0
            ) / total
          )
        : 0;

    const totalProjects =
      students.reduce(
        (sum, student) =>
          sum +
          Number(
            student.projectCount || 0
          ),
        0
      );

    const completedProjects =
      students.reduce(
        (sum, student) =>
          sum +
          Number(
            student.completedProjects ||
              0
          ),
        0
      );

    return {
      total,
      active,
      completed,
      pending,
      averageProgress,
      totalProjects,
      completedProjects,
    };
  }, [students]);

  // =====================================================
  // OPEN PROFILE
  // =====================================================

  function handleStudentClick(student) {
    setMessage("");
    setError("");
    setEditing(false);
    setSelectedStudent(student);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // BACK
  // =====================================================

  function handleBackToStudents() {
    setMessage("");
    setError("");
    setEditing(false);
    setSelectedStudent(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // START EDITING
  // =====================================================

  function startEditing() {
    if (!selectedStudent) {
      return;
    }

    setError("");
    setMessage("");

    setEditForm({
      firstName:
        selectedStudent.firstName || "",

      lastName:
        selectedStudent.lastName || "",

      email:
        selectedStudent.email || "",

      phone:
        selectedStudent.phone || "",

      dateOfBirth:
        formatDateInput(
          selectedStudent.dateOfBirth
        ),

      gender:
        selectedStudent.gender || "",

      program:
        selectedStudent.program || "",

      educationLevel:
        selectedStudent.educationLevel || "",

      school:
        selectedStudent.school || "",

      address:
        selectedStudent.address || "",

      emergencyContactName:
        selectedStudent.emergencyContactName ||
        "",

      emergencyContactPhone:
        selectedStudent.emergencyContactPhone ||
        "",

      status:
        String(
          selectedStudent.status ||
            "active"
        ).toLowerCase(),

      enrollmentDate:
        formatDateInput(
          selectedStudent.enrollmentDate
        ),

      expectedCompletionDate:
        formatDateInput(
          selectedStudent.expectedCompletionDate
        ),

      programDurationMonths:
        String(
          selectedStudent.programDurationMonths ||
            24
        ),

      profileImage:
        selectedStudent.profileImage || "",
    });

    setEditing(true);
  }

  // =====================================================
  // EDIT FORM CHANGE
  // =====================================================

  function handleEditChange(event) {
    const { name, value } =
      event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // =====================================================
  // SAVE STUDENT
  // =====================================================

  async function handleSaveStudent(event) {
    event.preventDefault();

    if (!selectedStudent?._id) {
      setError(
        "No student is selected."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!editForm.firstName.trim()) {
        throw new Error(
          "First name is required."
        );
      }

      if (!editForm.lastName.trim()) {
        throw new Error(
          "Last name is required."
        );
      }

      if (!editForm.email.trim()) {
        throw new Error(
          "Email is required."
        );
      }

      const payload = {
        id: selectedStudent._id,

        firstName:
          editForm.firstName.trim(),

        lastName:
          editForm.lastName.trim(),

        email:
          editForm.email.trim(),

        phone:
          editForm.phone.trim(),

        dateOfBirth:
          editForm.dateOfBirth || "",

        gender:
          editForm.gender,

        program:
          editForm.program.trim(),

        educationLevel:
          editForm.educationLevel.trim(),

        school:
          editForm.school.trim(),

        address:
          editForm.address.trim(),

        emergencyContactName:
          editForm.emergencyContactName.trim(),

        emergencyContactPhone:
          editForm.emergencyContactPhone.trim(),

        status:
          editForm.status,

        enrollmentDate:
          editForm.enrollmentDate || "",

        expectedCompletionDate:
          editForm.expectedCompletionDate ||
          "",

        programDurationMonths:
          Number(
            editForm.programDurationMonths ||
              24
          ),

        profileImage:
          editForm.profileImage.trim(),
      };

      const response = await fetch(
        "/api/students",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update student."
        );
      }

      const updatedStudent =
        data.student;

      setSelectedStudent(
        (current) => ({
          ...current,
          ...updatedStudent,
        })
      );

      setStudents((current) =>
        current.map((student) =>
          String(student._id) ===
          String(selectedStudent._id)
            ? {
                ...student,
                ...updatedStudent,
              }
            : student
        )
      );

      setEditing(false);

      setMessage(
        "Student profile updated successfully."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      // Reload calculated progress and
      // synchronize all student data.
      await loadStudents({
        refresh: true,
      });
    } catch (err) {
      console.error(
        "Save student error:",
        err
      );

      setError(
        err.message ||
          "Failed to update student."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // CANCEL EDITING
  // =====================================================

  function cancelEditing() {
    setEditing(false);
    setError("");
    setMessage("");
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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete student."
        );
      }

      setSelectedStudent(null);
      setEditing(false);

      setMessage(
        "Student and associated login account deleted successfully."
      );

      await loadStudents({
        refresh: true,
      });
    } catch (err) {
      console.error(
        "Delete student error:",
        err
      );

      setError(
        err.message ||
          "Failed to delete student."
      );
    }
  }

  // =====================================================
  // ACCESS SCREEN
  // =====================================================

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-slate-500">
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
  // STUDENT PROFILE
  // =====================================================

  if (selectedStudent) {
    const fullName =
      getFullName(selectedStudent);

    const initials =
      getInitials(selectedStudent);

    const progress =
      safePercentage(
        selectedStudent.progress ??
          selectedStudent.overallProgress ??
          0
      );

    const projectProgress =
      safePercentage(
        selectedStudent.projectProgress
      );

    const attendanceProgress =
      safePercentage(
        selectedStudent.attendanceProgress
      );

    const timelineProgress =
      safePercentage(
        selectedStudent.timelineProgress
      );

    // ===================================================
    // EDIT MODE
    // ===================================================

    if (editing) {
      return (
        <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
          <div className="mx-auto max-w-5xl">

            <button
              type="button"
              onClick={cancelEditing}
              className="mb-6 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              ← Cancel Editing
            </button>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleSaveStudent
              }
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
            >

              <div className="bg-slate-900 px-6 py-8 md:px-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                  Facilitator
                </p>

                <h1 className="mt-1 text-3xl font-bold text-white">
                  Edit Student
                </h1>

                <p className="mt-2 text-slate-300">
                  Update the student's
                  information and save the
                  changes.
                </p>
              </div>

              <div className="space-y-10 p-6 md:p-8">

                {/* PERSONAL */}

                <section>
                  <h2 className="text-xl font-bold text-slate-900">
                    Personal Information
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    <FormField
                      label="First Name"
                      name="firstName"
                      value={
                        editForm.firstName
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    />

                    <FormField
                      label="Last Name"
                      name="lastName"
                      value={
                        editForm.lastName
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    />

                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={
                        editForm.email
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    />

                    <FormField
                      label="Phone"
                      name="phone"
                      value={
                        editForm.phone
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <FormField
                      label="Date of Birth"
                      name="dateOfBirth"
                      type="date"
                      value={
                        editForm.dateOfBirth
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <SelectField
                      label="Gender"
                      name="gender"
                      value={
                        editForm.gender
                      }
                      onChange={
                        handleEditChange
                      }
                      options={[
                        "",
                        "Male",
                        "Female",
                        "Other",
                      ]}
                      labels={[
                        "Select gender",
                        "Male",
                        "Female",
                        "Other",
                      ]}
                    />

                  </div>
                </section>

                {/* EDUCATION */}

                <section className="border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-bold text-slate-900">
                    Education & Program
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    <FormField
                      label="Program"
                      name="program"
                      value={
                        editForm.program
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <FormField
                      label="Education Level"
                      name="educationLevel"
                      value={
                        editForm.educationLevel
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <FormField
                      label="School"
                      name="school"
                      value={
                        editForm.school
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <FormField
                      label="Program Duration (Months)"
                      name="programDurationMonths"
                      type="number"
                      min="1"
                      max="120"
                      value={
                        editForm.programDurationMonths
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>
                </section>

                {/* ADDRESS */}

                <section className="border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-bold text-slate-900">
                    Contact Information
                  </h2>

                  <div className="mt-5 space-y-5">

                    <FormField
                      label="Address"
                      name="address"
                      value={
                        editForm.address
                      }
                      onChange={
                        handleEditChange
                      }
                      textarea
                    />

                  </div>
                </section>

                {/* EMERGENCY */}

                <section className="border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-bold text-slate-900">
                    Emergency Contact
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    <FormField
                      label="Contact Name"
                      name="emergencyContactName"
                      value={
                        editForm.emergencyContactName
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                    <FormField
                      label="Contact Phone"
                      name="emergencyContactPhone"
                      value={
                        editForm.emergencyContactPhone
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>
                </section>

                {/* PROGRAM STATUS */}

                <section className="border-t border-slate-200 pt-8">
                  <h2 className="text-xl font-bold text-slate-900">
                    Enrollment & Status
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">

                    <SelectField
                      label="Student Status"
                      name="status"
                      value={
                        editForm.status
                      }
                      onChange={
                        handleEditChange
                      }
                      options={[
                        "active",
                        "inactive",
                        "pending",
                        "completed",
                        "suspended",
                      ]}
                      labels={[
                        "Active",
                        "Inactive",
                        "Pending",
                        "Completed",
                        "Suspended",
                      ]}
                    />

                    <FormField
                      label="Enrollment Date"
                      name="enrollmentDate"
                      type="date"
                      value={
                        editForm.enrollmentDate
                      }
                      onChange={
                        handleEditChange
                      }
                    />

                  </div>
                </section>

                {/* ACTIONS */}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>

                </div>

              </div>
            </form>
          </div>
        </main>
      );
    }

    // ===================================================
    // READ-ONLY PROFILE
    // ===================================================

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">

          <button
            type="button"
            onClick={
              handleBackToStudents
            }
            className="mb-6 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-blue-50"
          >
            ← Back to Students
          </button>

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

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

            {/* HEADER */}

            <div className="bg-slate-900 px-6 py-8 md:px-8">

              <div className="flex flex-col gap-6 md:flex-row md:items-center">

                {selectedStudent.profileImage ? (
                  <img
                    src={
                      selectedStudent.profileImage
                    }
                    alt={fullName}
                    className="h-28 w-28 rounded-full object-cover ring-4 ring-white/20"
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700 ring-4 ring-white/20">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 flex-1">

                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">
                    Student Profile
                  </p>

                  <h1 className="mt-1 break-words text-3xl font-bold text-white">
                    {fullName}
                  </h1>

                  <p className="mt-2 break-all text-slate-300">
                    {selectedStudent.email ||
                      "No email provided"}
                  </p>

                  {selectedStudent.studentId && (
                    <p className="mt-2 text-sm text-slate-400">
                      Student ID:{" "}
                      <span className="font-semibold text-white">
                        {
                          selectedStudent.studentId
                        }
                      </span>
                    </p>
                  )}

                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                    selectedStudent.status
                  )}`}
                >
                  {selectedStudent.status ||
                    "Active"}
                </span>

              </div>
            </div>

            <div className="p-6 md:p-8">

              {/* SUMMARY */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <SummaryCard
                  label="Overall Progress"
                  value={`${progress}%`}
                  description="Combined progress"
                />

                <SummaryCard
                  label="Projects"
                  value={
                    selectedStudent.projectCount ||
                    0
                  }
                  description={`${selectedStudent.completedProjects || 0} completed`}
                />

                <SummaryCard
                  label="Attendance"
                  value={`${attendanceProgress}%`}
                  description={`${selectedStudent.attendanceCount || 0} records`}
                />

                <SummaryCard
                  label="Timeline"
                  value={`${timelineProgress}%`}
                  description="Program timeline"
                />

              </div>

              {/* PERSONAL */}

              <section className="mt-10 border-t border-slate-200 pt-8">

                <h2 className="text-xl font-bold text-slate-900">
                  Personal Information
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

                  <InfoItem
                    label="First Name"
                    value={
                      selectedStudent.firstName
                    }
                  />

                  <InfoItem
                    label="Last Name"
                    value={
                      selectedStudent.lastName
                    }
                  />

                  <InfoItem
                    label="Email"
                    value={
                      selectedStudent.email
                    }
                  />

                  <InfoItem
                    label="Phone"
                    value={
                      selectedStudent.phone
                    }
                  />

                  <InfoItem
                    label="Date of Birth"
                    value={formatDate(
                      selectedStudent.dateOfBirth
                    )}
                  />

                  <InfoItem
                    label="Gender"
                    value={
                      selectedStudent.gender
                    }
                  />

                  <InfoItem
                    label="Program"
                    value={
                      selectedStudent.program
                    }
                  />

                  <InfoItem
                    label="Education Level"
                    value={
                      selectedStudent.educationLevel
                    }
                  />

                  <InfoItem
                    label="School"
                    value={
                      selectedStudent.school
                    }
                  />

                  <InfoItem
                    label="Address"
                    value={
                      selectedStudent.address
                    }
                    wide
                  />

                </div>
              </section>

              {/* EMERGENCY */}

              <section className="mt-10 border-t border-slate-200 pt-8">

                <h2 className="text-xl font-bold text-slate-900">
                  Emergency Contact
                </h2>

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

              {/* PROGRAM */}

              <section className="mt-10 border-t border-slate-200 pt-8">

                <h2 className="text-xl font-bold text-slate-900">
                  Program Information
                </h2>

                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                  <InfoItem
                    label="Student ID"
                    value={
                      selectedStudent.studentId
                    }
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

                </div>
              </section>

              {/* PROGRESS */}

              <section className="mt-10 border-t border-slate-200 pt-8">

                <div className="flex items-end justify-between">

                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Overall Progress
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Automatically calculated from
                      projects, attendance and
                      program timeline.
                    </p>
                  </div>

                  <span className="text-4xl font-bold text-blue-600">
                    {progress}%
                  </span>

                </div>

                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">

                  <ProgressItem
                    title="Projects"
                    progress={
                      projectProgress
                    }
                    description="50% of overall progress"
                  />

                  <ProgressItem
                    title="Attendance"
                    progress={
                      attendanceProgress
                    }
                    description="30% of overall progress"
                  />

                  <ProgressItem
                    title="Program Timeline"
                    progress={
                      timelineProgress
                    }
                    description="20% of overall progress"
                  />

                </div>
              </section>

              {/* MANAGEMENT */}

              <section className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">

                <button
                  type="button"
                  onClick={
                    handleBackToStudents
                  }
                  className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back to Students
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={
                      startEditing
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Edit Student
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(
                        selectedStudent._id
                      )
                    }
                    className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete Student
                  </button>

                </div>

              </section>

            </div>
          </section>
        </div>
      </main>
    );
  }

  // =====================================================
  // STUDENT LIST
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Facilitator Management
            </p>

            <h1 className="mt-1 text-4xl font-bold text-slate-900">
              Students
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              Manage registered students and monitor
              their learning progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadStudents({
                refresh: true,
              })
            }
            disabled={
              refreshing || loading
            }
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh Students"}
          </button>

        </div>

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

        {/* STATISTICS */}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            label="Total Students"
            value={statistics.total}
            description="Registered students"
            icon="👥"
          />

          <StatCard
            label="Active Students"
            value={statistics.active}
            description="Currently active"
            icon="✓"
          />

          <StatCard
            label="Completed"
            value={statistics.completed}
            description="Completed students"
            icon="🎓"
          />

          <StatCard
            label="Average Progress"
            value={`${statistics.averageProgress}%`}
            description="Across all students"
            icon="📈"
          />

        </section>

        {/* OVERVIEW */}

        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Program Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Quick summary of student activity.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5">

              <MiniStat
                label="Projects"
                value={
                  statistics.totalProjects
                }
              />

              <MiniStat
                label="Completed Projects"
                value={
                  statistics.completedProjects
                }
              />

              <MiniStat
                label="Pending"
                value={
                  statistics.pending
                }
              />

            </div>

          </div>
        </section>

        {/* RECORDS */}

        <section className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-slate-200">

          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Student Records
              </h2>

              <p className="mt-1 text-slate-500">
                Showing{" "}
                <strong>
                  {filteredStudents.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {students.length}
                </strong>{" "}
                students
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <input
                type="search"
                placeholder="Search students..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">
                  All Statuses
                </option>
                <option value="active">
                  Active
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="pending">
                  Pending
                </option>
                <option value="inactive">
                  Inactive
                </option>
                <option value="suspended">
                  Suspended
                </option>
              </select>

            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-4 text-slate-500">
                Loading students and progress...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center">

              <div className="text-3xl">
                👥
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                No students found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or
                status filter.
              </p>

            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              {filteredStudents.map(
                (student) => {
                  const fullName =
                    getFullName(student);

                  const initials =
                    getInitials(student);

                  const progress =
                    safePercentage(
                      student.overallProgress ??
                        student.progress
                    );

                  return (
                    <button
                      key={student._id}
                      type="button"
                      onClick={() =>
                        handleStudentClick(
                          student
                        )
                      }
                      className="group w-full text-left"
                    >
                      <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">

                        <div className="flex items-start gap-4">

                          {student.profileImage ? (
                            <img
                              src={
                                student.profileImage
                              }
                              alt={fullName}
                              className="h-16 w-16 shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <h3 className="truncate text-lg font-bold text-slate-900 group-hover:text-blue-600">
                                {fullName}
                              </h3>

                              <span
                                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${getStatusClasses(
                                  student.status
                                )}`}
                              >
                                {student.status ||
                                  "Active"}
                              </span>

                            </div>

                            <p className="mt-1 truncate text-sm text-slate-500">
                              {student.email ||
                                "No email"}
                            </p>

                          </div>
                        </div>

                        <div className="mt-5 space-y-3">

                          {student.studentId && (
                            <InfoRow
                              label="Student ID"
                              value={
                                student.studentId
                              }
                            />
                          )}

                          {student.program && (
                            <InfoRow
                              label="Program"
                              value={
                                student.program
                              }
                            />
                          )}

                          {student.educationLevel && (
                            <InfoRow
                              label="Education"
                              value={
                                student.educationLevel
                              }
                            />
                          )}

                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-5">

                          <div className="mb-2 flex justify-between">

                            <span className="text-sm text-slate-500">
                              Overall Progress
                            </span>

                            <span className="font-bold text-blue-600">
                              {progress}%
                            </span>

                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>

                        </div>

                        <div className="mt-5 grid grid-cols-3 border-t border-slate-100 pt-4 text-center">

                          <div>
                            <p className="font-bold text-slate-900">
                              {student.projectCount ||
                                0}
                            </p>
                            <p className="text-xs text-slate-500">
                              Projects
                            </p>
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {student.completedProjects ||
                                0}
                            </p>
                            <p className="text-xs text-slate-500">
                              Completed
                            </p>
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {student.attendanceCount ||
                                0}
                            </p>
                            <p className="text-xs text-slate-500">
                              Attendance
                            </p>
                          </div>

                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-4 text-right text-sm font-semibold text-blue-600">
                          View Full Profile →
                        </div>

                      </article>
                    </button>
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

// =====================================================
// FORM FIELD
// =====================================================

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  textarea = false,
  min,
  max,
}) {
  const className =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {textarea ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          rows={4}
          className={className}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          max={max}
          className={className}
        />
      )}
    </div>
  );
}

// =====================================================
// SELECT FIELD
// =====================================================

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  labels,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map(
          (option, index) => (
            <option
              key={option}
              value={option}
            >
              {labels?.[index] ||
                option}
            </option>
          )
        )}
      </select>
    </div>
  );
}

// =====================================================
// SUMMARY CARD
// =====================================================

function SummaryCard({
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  label,
  value,
  description,
  icon,
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

      <div className="flex items-start justify-between gap-4">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg">
          {icon}
        </div>

      </div>

    </div>
  );
}

// =====================================================
// MINI STAT
// =====================================================

function MiniStat({
  label,
  value,
}) {
  return (
    <div className="min-w-20 text-center">
      <p className="text-xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

// =====================================================
// PROGRESS ITEM
// =====================================================

function ProgressItem({
  title,
  progress,
  description,
}) {
  const value = Math.min(
    Math.max(
      Math.round(
        Number(progress) || 0
      ),
      0
    ),
    100
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="font-semibold text-slate-800">
          {title}
        </p>

        <span className="font-bold text-blue-600">
          {value}%
        </span>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${value}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>

    </div>
  );
}

// =====================================================
// INFO ROW
// =====================================================

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">

      <span className="shrink-0 text-slate-500">
        {label}
      </span>

      <span className="truncate text-right font-medium text-slate-900">
        {value}
      </span>

    </div>
  );
}

// =====================================================
// INFO ITEM
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