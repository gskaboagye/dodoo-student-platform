"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  UserRound,
} from "lucide-react";

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

  // Navbar global search
  const [globalSearch, setGlobalSearch] = useState("");

  const [user, setUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // CHECK FACILITATOR ACCESS
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
  // LOAD STUDENTS AND THEIR PROGRESS
  // =====================================================

  async function loadStudents({ refresh = false } = {}) {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      if (!user || user.role !== "facilitator") {
        router.replace("/");
        return;
      }

      const studentsResponse = await fetch("/api/students", {
        cache: "no-store",
      });

      const studentsData = await studentsResponse.json();

      if (!studentsResponse.ok) {
        throw new Error(
          studentsData.message || "Failed to load students."
        );
      }

      const studentList = Array.isArray(studentsData)
        ? studentsData
        : studentsData.students || [];

      const progressResponse = await fetch("/api/progress", {
        cache: "no-store",
      });

      const progressData = await progressResponse.json();

      if (!progressResponse.ok) {
        throw new Error(
          progressData.message ||
            "Failed to load student progress."
        );
      }

      const progressList = Array.isArray(progressData.students)
        ? progressData.students
        : [];

      const studentsWithProgress = studentList.map((student) => {
        const progressStudent = progressList.find(
          (item) =>
            String(item._id) === String(student._id)
        );

        const overallProgress = safePercentage(
          progressStudent?.progress ??
            progressStudent?.overallProgress ??
            progressStudent?.progressDetails?.overallProgress ??
            0
        );

        const projectProgress = safePercentage(
          progressStudent?.projectProgress ??
            progressStudent?.progressDetails?.projectProgress ??
            0
        );

        const attendanceProgress = safePercentage(
          progressStudent?.attendanceProgress ??
            progressStudent?.progressDetails?.attendanceProgress ??
            0
        );

        const timelineProgress = safePercentage(
          progressStudent?.timelineProgress ??
            progressStudent?.progressDetails?.timelineProgress ??
            0
        );

        return {
          ...student,
          progress: overallProgress,
          overallProgress,
          projectProgress,
          attendanceProgress,
          timelineProgress,
          progressDetails:
            progressStudent?.progressDetails || {},
          projectCount: Number(
            progressStudent?.projectCount ?? 0
          ),
          completedProjects: Number(
            progressStudent?.completedProjects ?? 0
          ),
          attendanceCount: Number(
            progressStudent?.attendanceCount ?? 0
          ),
        };
      });

      setStudents(studentsWithProgress);

      setSelectedStudent((current) => {
        if (!current) return null;

        return (
          studentsWithProgress.find(
            (student) =>
              String(student._id) === String(current._id)
          ) || null
        );
      });

      if (refresh) {
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
      if (refresh) {
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
  // CONNECT NAVBAR GLOBAL SEARCH
  // =====================================================

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const query = params.get("search")?.trim() || "";

    if (!query) return;

    setGlobalSearch(query);
    setSearch(query);
  }, []);

  // =====================================================
  // OPEN MATCHING STUDENT PROFILE
  // =====================================================

  useEffect(() => {
    if (!globalSearch || students.length === 0) {
      return;
    }

    const query = globalSearch.trim().toLowerCase();

    if (!query) return;

    const getStudentName = (student) =>
      `${student.firstName || ""} ${
        student.lastName || ""
      }`
        .trim()
        .toLowerCase();

    const exactMatch = students.find((student) => {
      return (
        String(student.studentId || "").toLowerCase() ===
          query ||
        String(student.email || "").toLowerCase() ===
          query ||
        getStudentName(student) === query
      );
    });

    const matchingStudent =
      exactMatch ||
      students.find((student) => {
        return (
          getStudentName(student).includes(query) ||
          String(student.email || "")
            .toLowerCase()
            .includes(query) ||
          String(student.studentId || "")
            .toLowerCase()
            .includes(query)
        );
      });

    if (matchingStudent) {
      setSelectedStudent(matchingStudent);
      setEditing(false);
    }
  }, [globalSearch, students]);

  // =====================================================
  // SAFE PROGRESS PERCENTAGE
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

  // =====================================================
  // STUDENT NAME
  // =====================================================

  function getFullName(student) {
    return (
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() || "Unnamed Student"
    );
  }

  // =====================================================
  // STUDENT INITIALS
  // =====================================================

  function getInitials(student) {
    return (
      `${student.firstName?.[0] || ""}${
        student.lastName?.[0] || ""
      }`.toUpperCase() || "S"
    );
  }

  // =====================================================
  // FORMAT DATE
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
  // FORMAT DATE FOR INPUT
  // =====================================================

  function formatDateInput(date) {
    if (!date) return "";

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

  // =====================================================
  // STATUS STYLING
  // =====================================================

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
  // FILTER STUDENTS
  // =====================================================

  const filteredStudents = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

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
        status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  // =====================================================
  // STUDENT STATISTICS
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

    const totalProjects = students.reduce(
      (sum, student) =>
        sum + Number(student.projectCount || 0),
      0
    );

    const completedProjects = students.reduce(
      (sum, student) =>
        sum +
        Number(
          student.completedProjects || 0
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
  // OPEN STUDENT PROFILE
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
  // BACK TO STUDENT LIST
  // =====================================================

  function handleBackToStudents() {
    setMessage("");
    setError("");
    setEditing(false);
    setSelectedStudent(null);

    setGlobalSearch("");
    setSearch("");

    router.replace("/students", {
      scroll: false,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
    // =====================================================
  // START EDITING STUDENT
  // =====================================================

  function startEditing() {
    if (!selectedStudent) return;

    setError("");
    setMessage("");

    setEditForm({
      firstName: selectedStudent.firstName || "",
      lastName: selectedStudent.lastName || "",
      email: selectedStudent.email || "",
      phone: selectedStudent.phone || "",

      dateOfBirth: formatDateInput(
        selectedStudent.dateOfBirth
      ),

      gender: selectedStudent.gender || "",
      program: selectedStudent.program || "",

      educationLevel:
        selectedStudent.educationLevel || "",

      school: selectedStudent.school || "",
      address: selectedStudent.address || "",

      emergencyContactName:
        selectedStudent.emergencyContactName || "",

      emergencyContactPhone:
        selectedStudent.emergencyContactPhone || "",

      status: String(
        selectedStudent.status || "active"
      ).toLowerCase(),

      enrollmentDate: formatDateInput(
        selectedStudent.enrollmentDate
      ),

      expectedCompletionDate: formatDateInput(
        selectedStudent.expectedCompletionDate
      ),

      programDurationMonths: String(
        selectedStudent.programDurationMonths || 24
      ),

      profileImage: selectedStudent.profileImage || "",
    });

    setEditing(true);
  }

  // =====================================================
  // HANDLE EDIT FORM CHANGES
  // =====================================================

  function handleEditChange(event) {
    const { name, value } = event.target;

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
      setError("No student is selected.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!editForm.firstName.trim()) {
        throw new Error("First name is required.");
      }

      if (!editForm.lastName.trim()) {
        throw new Error("Last name is required.");
      }

      if (!editForm.email.trim()) {
        throw new Error("Email is required.");
      }

      const payload = {
        id: selectedStudent._id,

        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),

        gender: editForm.gender,

        program: editForm.program.trim(),

        educationLevel:
          editForm.educationLevel.trim(),

        school: editForm.school.trim(),
        address: editForm.address.trim(),

        emergencyContactName:
          editForm.emergencyContactName.trim(),

        emergencyContactPhone:
          editForm.emergencyContactPhone.trim(),

        status: editForm.status,

        programDurationMonths: Number(
          editForm.programDurationMonths || 24
        ),

        profileImage: editForm.profileImage.trim(),
      };

      if (editForm.dateOfBirth) {
        payload.dateOfBirth = editForm.dateOfBirth;
      }

      if (editForm.enrollmentDate) {
        payload.enrollmentDate = editForm.enrollmentDate;
      }

      if (editForm.expectedCompletionDate) {
        payload.expectedCompletionDate =
          editForm.expectedCompletionDate;
      }

      const response = await fetch("/api/students", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update student."
        );
      }

      const updatedStudent = data.student;

      setSelectedStudent((current) => ({
        ...current,
        ...updatedStudent,
      }));

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

      setMessage("Student profile updated successfully.");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      await loadStudents({ refresh: true });
    } catch (err) {
      console.error("Save student error:", err);

      setError(
        err.message || "Failed to update student."
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

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/students?id=${encodeURIComponent(id)}`,
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

      setSelectedStudent(null);
      setEditing(false);

      // Clear global search so a deleted record
      // cannot be selected again from the URL query.
      setGlobalSearch("");
      setSearch("");

      router.replace("/students", {
        scroll: false,
      });

      setMessage(
        "Student and associated login account deleted successfully."
      );

      await loadStudents({ refresh: true });
    } catch (err) {
      console.error("Delete student error:", err);

      setError(
        err.message || "Failed to delete student."
      );
    }
  }

  // =====================================================
  // ACCESS CHECK SCREEN
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

  // =====================================================
  // FACILITATOR-ONLY ACCESS
  // =====================================================

  if (!user || user.role !== "facilitator") {
    return null;
  }

  // =====================================================
  // STUDENT PROFILE
  // =====================================================

  if (selectedStudent) {
    const fullName = getFullName(selectedStudent);
    const initials = getInitials(selectedStudent);

    const progress = safePercentage(
      selectedStudent.overallProgress ??
        selectedStudent.progress
    );

    const projectProgress = safePercentage(
      selectedStudent.projectProgress
    );

    const attendanceProgress = safePercentage(
      selectedStudent.attendanceProgress
    );

    const timelineProgress = safePercentage(
      selectedStudent.timelineProgress
    );

    // ===================================================
    // EDIT STUDENT SCREEN
    // ===================================================

    if (editing) {
      return (
        <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
          <div className="mx-auto max-w-5xl">
            <button
              type="button"
              onClick={cancelEditing}
              className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel Editing
            </button>

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSaveStudent}
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
                  Update the student's information and save
                  the changes.
                </p>
              </div>

              <div className="space-y-10 p-6 md:p-8">
                <section>
                  <h2 className="text-xl font-bold text-slate-900">
                    Personal Information
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <FormField
                      label="First Name"
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleEditChange}
                      required
                    />

                    <FormField
                      label="Last Name"
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleEditChange}
                      required
                    />

                    <FormField
                      label="Email"
                      name="email"
                      type="email"
                      value={editForm.email}
                      onChange={handleEditChange}
                      required
                    />

                    <FormField
                      label="Phone"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Date of Birth"
                      name="dateOfBirth"
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={handleEditChange}
                    />

                    <SelectField
                      label="Gender"
                      name="gender"
                      value={editForm.gender}
                      onChange={handleEditChange}
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

                <section>
                  <h2 className="text-xl font-bold text-slate-900">
                    Education Information
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <FormField
                      label="Program"
                      name="program"
                      value={editForm.program}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Education Level"
                      name="educationLevel"
                      value={editForm.educationLevel}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="School"
                      name="school"
                      value={editForm.school}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Address"
                      name="address"
                      value={editForm.address}
                      onChange={handleEditChange}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900">
                    Emergency Contact
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <FormField
                      label="Emergency Contact Name"
                      name="emergencyContactName"
                      value={editForm.emergencyContactName}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Emergency Contact Phone"
                      name="emergencyContactPhone"
                      value={editForm.emergencyContactPhone}
                      onChange={handleEditChange}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-slate-900">
                    Program Details
                  </h2>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <SelectField
                      label="Status"
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
                      options={[
                        "active",
                        "pending",
                        "completed",
                        "inactive",
                        "suspended",
                      ]}
                      labels={[
                        "Active",
                        "Pending",
                        "Completed",
                        "Inactive",
                        "Suspended",
                      ]}
                    />

                    <FormField
                      label="Program Duration (Months)"
                      name="programDurationMonths"
                      type="number"
                      value={editForm.programDurationMonths}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Enrollment Date"
                      name="enrollmentDate"
                      type="date"
                      value={editForm.enrollmentDate}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Expected Completion Date"
                      name="expectedCompletionDate"
                      type="date"
                      value={editForm.expectedCompletionDate}
                      onChange={handleEditChange}
                    />

                    <FormField
                      label="Profile Image URL"
                      name="profileImage"
                      value={editForm.profileImage}
                      onChange={handleEditChange}
                    />
                  </div>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving Changes..."
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
      );
    }
        // ===================================================
    // STUDENT PROFILE VIEW
    // ===================================================
if (!selectedStudent) {
  return null;
}

return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleBackToStudents}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
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
            {/* STUDENT HEADER */}

            <div className="bg-slate-900 px-6 py-8 md:px-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                {selectedStudent?.profileImage ? (
  <img
    src={selectedStudent.profileImage}
    alt={fullName}
    className="h-28 w-28 rounded-full object-cover ring-4 ring-white/20"
    onError={(event) => {
      event.currentTarget.style.display = "none";
    }}
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
                        {selectedStudent.studentId}
                      </span>
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                    selectedStudent.status
                  )}`}
                >
                  {selectedStudent.status || "Active"}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* SUMMARY CARDS */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Overall Progress"
                  value={`${progress}%`}
                  description="Combined progress"
                />

                <SummaryCard
                  label="Projects"
                  value={selectedStudent.projectCount || 0}
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

              {/* PERSONAL INFORMATION */}

              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Personal Information
                </h2>

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
                </div>
              </section>

              {/* PROGRESS DETAILS */}

              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Student Progress
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Review the student's current progress across
                  the program.
                </p>

                <div className="mt-6 space-y-6">
                  {[
                    {
                      label: "Overall Progress",
                      value: progress,
                    },
                    {
                      label: "Project Progress",
                      value: projectProgress,
                    },
                    {
                      label: "Attendance Progress",
                      value: attendanceProgress,
                    },
                    {
                      label: "Timeline Progress",
                      value: timelineProgress,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>

                        <span className="font-bold text-blue-600">
                          {item.value}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${item.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* PROFILE ACTIONS */}

              <section className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleBackToStudents}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Students
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Edit Student
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(selectedStudent._id)
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
  
      // ===================================================
    // STUDENT PROFILE VIEW
    // ===================================================

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleBackToStudents}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Students
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
            {/* STUDENT HEADER */}

            <div className="bg-slate-900 px-6 py-8 md:px-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                {selectedStudent.profileImage ? (
                  <img
                    src={selectedStudent.profileImage}
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
                        {selectedStudent.studentId}
                      </span>
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(
                    selectedStudent.status
                  )}`}
                >
                  {selectedStudent.status || "Active"}
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {/* SUMMARY CARDS */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                  label="Overall Progress"
                  value={`${progress}%`}
                  description="Combined progress"
                />

                <SummaryCard
                  label="Projects"
                  value={selectedStudent.projectCount || 0}
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

              {/* PERSONAL INFORMATION */}

              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Personal Information
                </h2>

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
                </div>
              </section>

              {/* PROGRESS DETAILS */}

              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-900">
                  Student Progress
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Review the student's current progress across
                  the program.
                </p>

                <div className="mt-6 space-y-6">
                  {[
                    {
                      label: "Overall Progress",
                      value: progress,
                    },
                    {
                      label: "Project Progress",
                      value: projectProgress,
                    },
                    {
                      label: "Attendance Progress",
                      value: attendanceProgress,
                    },
                    {
                      label: "Timeline Progress",
                      value: timelineProgress,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>

                        <span className="font-bold text-blue-600">
                          {item.value}%
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${item.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* PROFILE ACTIONS */}

              <section className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleBackToStudents}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Students
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Edit Student
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(selectedStudent._id)
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
          <span className="ml-1 text-red-500">*</span>
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
        {options.map((option, index) => (
          <option key={option} value={option}>
            {labels?.[index] || option}
          </option>
        ))}
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
// STATISTICS CARD
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

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MINI STATISTIC
// =====================================================

function MiniStat({ label, value }) {
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
    Math.max(Math.round(Number(progress) || 0), 0),
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
// STUDENT INFORMATION ROW
// =====================================================

function InfoRow({ label, value }) {
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
// STUDENT INFORMATION ITEM
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

