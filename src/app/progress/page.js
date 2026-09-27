"use client";

import { useEffect, useState } from "react";

import {
  TrendingUp,
  Users,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  FolderKanban,
  ClipboardCheck,
  UserRound,
} from "lucide-react";

// =====================================================
// FORMAT DATE
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
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// =====================================================
// SAFE PERCENTAGE
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
// PROGRESS BAR
// =====================================================

function ProgressBar({ value }) {
  const safeValue = safePercentage(value);

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-500"
        style={{
          width: `${safeValue}%`,
        }}
      />
    </div>
  );
}

// =====================================================
// MAIN PAGE
// =====================================================

export default function ProgressPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ===================================================
  // INITIALIZE
  // ===================================================

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      // -----------------------------------------------
      // Get logged-in user
      // -----------------------------------------------

      const userResponse = await fetch(
        "/api/auth/me",
        {
          cache: "no-store",
        }
      );

      const userData =
        await userResponse.json();

      if (
        !userResponse.ok ||
        !userData?.user
      ) {
        window.location.href = "/login";
        return;
      }

      setUser(userData.user);

      // -----------------------------------------------
      // Get progress
      // -----------------------------------------------

      const response = await fetch(
        "/api/progress",
        {
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Failed to load progress."
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        "Progress error:",
        err
      );

      setError(
        err.message ||
          "Unable to load student progress."
      );
    } finally {
      setLoading(false);
    }
  }

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading progress...
          </p>
        </div>
      </div>
    );
  }

  // ===================================================
  // ERROR
  // ===================================================

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={initialize}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===================================================
  // USER CHECK
  // ===================================================

  if (!user) {
    return null;
  }

  const isFacilitator =
    user.role === "facilitator";

  const isStudent =
    user.role === "student";

  // ===================================================
  // IMPORTANT
  // ===================================================
  //
  // For students, /api/progress already resolves
  // the correct student from:
  //
  // users.studentId
  // OR
  // session.studentId
  // OR
  // email
  //
  // Therefore we DO NOT filter using user.studentId
  // here. That could reject a valid student record
  // when the session contains an old studentId.
  //
  // ===================================================

  const allStudents =
    Array.isArray(data?.students)
      ? data.students
      : [];

  const students = isStudent
    ? data?.student
      ? [data.student]
      : allStudents.length === 1
      ? allStudents
      : []
    : allStudents;

  // ===================================================
  // FACILITATOR VIEW
  // ===================================================

  if (isFacilitator) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-7xl">

          {/* =========================================
              HEADER
          ========================================= */}

          <div className="mb-8">
            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-100 p-3">
                <TrendingUp
                  className="text-blue-700"
                  size={26}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-blue-600">
                  Facilitator
                </p>

                <h1 className="text-2xl font-bold text-slate-900">
                  Student Progress
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Monitor automatically calculated progress
                  across the student program.
                </p>
              </div>

            </div>
          </div>

          {/* =========================================
              STATISTICS
          ========================================= */}

          <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <StatCard
              title="Total Students"
              value={
                data?.totalStudents || 0
              }
              icon={
                <Users size={20} />
              }
            />

            <StatCard
              title="Average Progress"
              value={`${safePercentage(
                data?.averageProgress
              )}%`}
              icon={
                <TrendingUp size={20} />
              }
            />

            <StatCard
              title="Completed"
              value={
                data?.completed || 0
              }
              icon={
                <CheckCircle size={20} />
              }
            />

            <StatCard
              title="Needs Attention"
              value={
                data?.needsAttention || 0
              }
              icon={
                <AlertCircle size={20} />
              }
            />

          </div>

          {/* =========================================
              CALCULATION METHOD
          ========================================= */}

          <ProgressMethod />

          {/* =========================================
              STUDENT LIST
          ========================================= */}

          <ProgressList
            students={students}
            title="All Student Progress"
            description="Progress is automatically calculated from projects, attendance, and the 24-month program timeline."
          />

        </div>
      </div>
    );
  }

  // ===================================================
  // STUDENT VIEW
  // ===================================================

  if (isStudent) {
    const student = students[0];

    // -------------------------------------------------
    // No student record
    // -------------------------------------------------

    if (!student) {
      return (
        <div className="p-6 md:p-8">
          <div className="mx-auto max-w-4xl">

            <div className="mb-8">
              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-blue-100 p-3">
                  <TrendingUp
                    className="text-blue-700"
                    size={26}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-600">
                    Student
                  </p>

                  <h1 className="text-2xl font-bold text-slate-900">
                    My Progress
                  </h1>
                </div>

              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <UserRound
                size={42}
                className="mx-auto mb-4 text-slate-300"
              />

              <h2 className="font-semibold text-slate-800">
                Progress information is not available yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Your student account may not be linked
                to a student record yet.
              </p>

            </div>

          </div>
        </div>
      );
    }

    // -------------------------------------------------
    // Student progress
    // -------------------------------------------------

    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-5xl">

          {/* =========================================
              HEADER
          ========================================= */}

          <div className="mb-8">
            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-blue-100 p-3">
                <TrendingUp
                  className="text-blue-700"
                  size={26}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-blue-600">
                  Student Dashboard
                </p>

                <h1 className="text-2xl font-bold text-slate-900">
                  My Progress
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Your progress is calculated automatically.
                </p>
              </div>

            </div>
          </div>

          {/* =========================================
              OVERALL PROGRESS
          ========================================= */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">

                {student.profileImage ? (
                  <img
                    src={student.profileImage}
                    alt={`${student.firstName || ""} ${student.lastName || ""}`}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                    {student.firstName?.charAt(0)}
                    {student.lastName?.charAt(0)}
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {student.firstName}{" "}
                    {student.lastName}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {student.program ||
                      "Program not specified"}
                  </p>
                </div>

              </div>

              <div className="text-left sm:text-right">

                <p className="text-4xl font-bold text-blue-700">
                  {safePercentage(
                    student.progress ??
                      student.overallProgress
                  )}
                  %
                </p>

                <p className="text-xs text-slate-500">
                  Overall Progress
                </p>

              </div>

            </div>

            <div className="mt-6">
              <ProgressBar
                value={
                  student.progress ??
                  student.overallProgress
                }
              />
            </div>

          </div>

          {/* =========================================
              CALCULATION METHOD
          ========================================= */}

          <ProgressMethod />

          {/* =========================================
              PERSONAL PROGRESS
          ========================================= */}

          <ProgressList
            students={[student]}
            title="My Progress Details"
            description="These values are calculated automatically from your projects, attendance, and program timeline."
          />

        </div>
      </div>
    );
  }

  return null;
}

// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="mb-3 flex items-center justify-between">

        <span className="text-sm font-medium text-slate-500">
          {title}
        </span>

        <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
          {icon}
        </div>

      </div>

      <p className="text-3xl font-bold text-slate-900">
        {value}
      </p>

    </div>
  );
}

// =====================================================
// PROGRESS METHOD
// =====================================================

function ProgressMethod() {
  return (
    <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-5">

      <h2 className="mb-4 font-semibold text-slate-900">
        How Progress Is Calculated
      </h2>

      <div className="grid gap-4 md:grid-cols-3">

        {/* PROJECTS */}

        <div className="rounded-lg bg-white p-4">

          <div className="mb-2 flex items-center gap-2">

            <FolderKanban
              size={18}
              className="text-blue-600"
            />

            <span className="font-semibold">
              Projects - 50%
            </span>

          </div>

          <p className="text-sm text-slate-500">
            Based on the average progress of
            the student's projects.
          </p>

        </div>

        {/* ATTENDANCE */}

        <div className="rounded-lg bg-white p-4">

          <div className="mb-2 flex items-center gap-2">

            <ClipboardCheck
              size={18}
              className="text-blue-600"
            />

            <span className="font-semibold">
              Attendance - 30%
            </span>

          </div>

          <p className="text-sm text-slate-500">
            Present = 100%, Late = 50%,
            Absent = 0%.
          </p>

        </div>

        {/* TIMELINE */}

        <div className="rounded-lg bg-white p-4">

          <div className="mb-2 flex items-center gap-2">

            <CalendarDays
              size={18}
              className="text-blue-600"
            />

            <span className="font-semibold">
              Program Timeline - 20%
            </span>

          </div>

          <p className="text-sm text-slate-500">
            Measures the student's position
            within the 24-month program.
          </p>

        </div>

      </div>

      {/* FORMULA */}

      <div className="mt-5 rounded-lg border border-blue-100 bg-white p-4">

        <p className="text-sm font-semibold text-slate-700">
          Overall Progress Formula
        </p>

        <p className="mt-2 text-sm text-slate-600">
          (Projects × 50%) + (Attendance × 30%)
          + (Program Timeline × 20%)
        </p>

      </div>

    </div>
  );
}

// =====================================================
// PROGRESS LIST
// =====================================================

function ProgressList({
  students,
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* HEADER */}

      <div className="border-b border-slate-200 p-6">

        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>

      </div>

      {/* EMPTY */}

      {students.length === 0 ? (
        <div className="p-10 text-center">

          <Users
            size={40}
            className="mx-auto mb-3 text-slate-300"
          />

          <p className="font-medium text-slate-600">
            No progress records found.
          </p>

        </div>
      ) : (

        <div className="divide-y divide-slate-100">

          {students.map((student) => (
            <StudentProgressCard
              key={String(student._id)}
              student={student}
            />
          ))}

        </div>

      )}

    </div>
  );
}

// =====================================================
// STUDENT PROGRESS CARD
// =====================================================

function StudentProgressCard({
  student,
}) {
  const details =
    student.progressDetails || {};

  // ---------------------------------------------------
  // IMPORTANT:
  // Read from top-level API fields first.
  //
  // This keeps the page compatible with the
  // updated /api/progress route.
  // ---------------------------------------------------

  const projectProgress =
    student.projectProgress ??
    details.projectProgress ??
    0;

  const attendanceProgress =
    student.attendanceProgress ??
    details.attendanceProgress ??
    0;

  const timelineProgress =
    student.timelineProgress ??
    details.timelineProgress ??
    0;

  const overallProgress =
    student.progress ??
    student.overallProgress ??
    details.overallProgress ??
    0;

  // ---------------------------------------------------
  // Counts
  // ---------------------------------------------------

  const projectCount =
    student.projectCount ??
    details.projectCount ??
    student.projects?.length ??
    0;

  const attendanceCount =
    student.attendanceCount ??
    details.attendanceRecords ??
    student.attendance?.length ??
    0;

  const completedProjects =
    student.completedProjects ??
    0;

  // ---------------------------------------------------
  // Timeline information
  // ---------------------------------------------------

  const enrollmentDate =
    student.enrollmentDate ??
    details.enrollmentDate ??
    null;

  const expectedCompletionDate =
    student.expectedCompletionDate ??
    details.expectedCompletionDate ??
    null;

  const monthsCompleted =
    details.monthsCompleted ??
    calculateMonthsCompleted(
      enrollmentDate
    );

  const monthsRemaining =
    details.monthsRemaining ??
    calculateMonthsRemaining(
      enrollmentDate,
      expectedCompletionDate
    );

  const programYear =
    details.programYear ??
    calculateProgramYear(
      enrollmentDate
    );

  return (
    <div className="p-6">

      {/* =========================================
          STUDENT HEADER
      ========================================= */}

      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div className="flex items-center gap-4">

          {student.profileImage ? (
            <img
              src={student.profileImage}
              alt={`${student.firstName || ""} ${student.lastName || ""}`}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              {student.firstName?.charAt(0)}
              {student.lastName?.charAt(0)}
            </div>
          )}

          <div>

            <h3 className="font-semibold text-slate-900">
              {student.firstName}{" "}
              {student.lastName}
            </h3>

            <p className="text-sm text-slate-500">
              {student.program ||
                "Program not specified"}
            </p>

          </div>

        </div>

        <div className="text-left md:text-right">

          <p className="text-3xl font-bold text-blue-700">
            {safePercentage(
              overallProgress
            )}
            %
          </p>

          <p className="text-xs text-slate-500">
            Overall Progress
          </p>

        </div>

      </div>

      {/* =========================================
          OVERALL BAR
      ========================================= */}

      <div className="mb-6">

        <div className="mb-2 flex justify-between text-sm">

          <span className="font-medium text-slate-700">
            Overall Progress
          </span>

          <span className="font-semibold text-blue-700">
            {safePercentage(
              overallProgress
            )}
            %
          </span>

        </div>

        <ProgressBar
          value={overallProgress}
        />

      </div>

      {/* =========================================
          COMPONENT PROGRESS
      ========================================= */}

      <div className="grid gap-4 md:grid-cols-3">

        <ProgressDetail
          title="Projects"
          value={projectProgress}
          description={`${projectCount} project(s)`}
          icon={
            <FolderKanban size={18} />
          }
        />

        <ProgressDetail
          title="Attendance"
          value={attendanceProgress}
          description={`${attendanceCount} record(s)`}
          icon={
            <ClipboardCheck size={18} />
          }
        />

        <ProgressDetail
          title="Program Timeline"
          value={timelineProgress}
          description={`Year ${programYear} of 2`}
          icon={
            <CalendarDays size={18} />
          }
        />

      </div>

      {/* =========================================
          WEIGHTED CONTRIBUTIONS
      ========================================= */}

      <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">

        <h4 className="mb-3 text-sm font-semibold text-slate-800">
          Contribution to Overall Progress
        </h4>

        <div className="grid gap-3 sm:grid-cols-3">

          <ContributionItem
            label="Projects"
            value={projectProgress}
            weight={50}
          />

          <ContributionItem
            label="Attendance"
            value={attendanceProgress}
            weight={30}
          />

          <ContributionItem
            label="Timeline"
            value={timelineProgress}
            weight={20}
          />

        </div>

      </div>

      {/* =========================================
          PROGRAM INFORMATION
      ========================================= */}

      <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">

        <InfoItem
          label="Enrollment Date"
          value={formatDate(
            enrollmentDate
          )}
        />

        <InfoItem
          label="Expected Completion"
          value={formatDate(
            expectedCompletionDate
          )}
        />

        <InfoItem
          label="Months Completed"
          value={`${monthsCompleted} / 24`}
        />

        <InfoItem
          label="Months Remaining"
          value={monthsRemaining}
        />

      </div>

      {/* =========================================
          EXTRA SUMMARY
      ========================================= */}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">

        <SmallSummary
          label="Projects"
          value={projectCount}
        />

        <SmallSummary
          label="Completed Projects"
          value={completedProjects}
        />

        <SmallSummary
          label="Attendance Records"
          value={attendanceCount}
        />

      </div>

    </div>
  );
}

// =====================================================
// PROGRESS DETAIL
// =====================================================

function ProgressDetail({
  title,
  value,
  description,
  icon,
}) {
  const safeValue =
    safePercentage(value);

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">

      <div className="mb-2 flex items-center justify-between">

        <div className="flex items-center gap-2">

          <span className="text-blue-600">
            {icon}
          </span>

          <span className="text-sm font-medium text-slate-600">
            {title}
          </span>

        </div>

        <span className="font-semibold text-slate-900">
          {safeValue}%
        </span>

      </div>

      <ProgressBar
        value={safeValue}
      />

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

// =====================================================
// CONTRIBUTION ITEM
// =====================================================

function ContributionItem({
  label,
  value,
  weight,
}) {
  const percentage =
    safePercentage(value);

  const contribution =
    Math.round(
      percentage *
        (weight / 100)
    );

  return (
    <div className="rounded-lg bg-white p-3">

      <div className="flex items-center justify-between">

        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>

        <span className="text-xs text-slate-400">
          {weight}%
        </span>

      </div>

      <p className="mt-1 text-lg font-bold text-slate-900">
        {percentage}%
      </p>

      <p className="text-xs text-blue-600">
        Contributes {contribution}%
      </p>

    </div>
  );
}

// =====================================================
// INFO ITEM
// =====================================================

function InfoItem({
  label,
  value,
}) {
  return (
    <div>

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="font-medium text-slate-700">
        {value}
      </p>

    </div>
  );
}

// =====================================================
// SMALL SUMMARY
// =====================================================

function SmallSummary({
  label,
  value,
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">

      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

// =====================================================
// CALCULATE MONTHS COMPLETED
// =====================================================

function calculateMonthsCompleted(
  enrollmentDate
) {
  if (!enrollmentDate) {
    return 0;
  }

  const start =
    new Date(enrollmentDate);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return 0;
  }

  const now = new Date();

  if (now <= start) {
    return 0;
  }

  let months =
    (now.getFullYear() -
      start.getFullYear()) *
      12 +
    (now.getMonth() -
      start.getMonth());

  // Adjust if the current day has not
  // reached the enrollment day yet.
  if (
    now.getDate() <
    start.getDate()
  ) {
    months -= 1;
  }

  return Math.min(
    Math.max(months, 0),
    24
  );
}

// =====================================================
// CALCULATE MONTHS REMAINING
// =====================================================

function calculateMonthsRemaining(
  enrollmentDate,
  expectedCompletionDate
) {
  if (
    !enrollmentDate &&
    !expectedCompletionDate
  ) {
    return 24;
  }

  const end = expectedCompletionDate
    ? new Date(
        expectedCompletionDate
      )
    : (() => {
        const date =
          new Date(
            enrollmentDate
          );

        date.setMonth(
          date.getMonth() + 24
        );

        return date;
      })();

  if (
    Number.isNaN(
      end.getTime()
    )
  ) {
    return 0;
  }

  const now = new Date();

  if (now >= end) {
    return 0;
  }

  let months =
    (end.getFullYear() -
      now.getFullYear()) *
      12 +
    (end.getMonth() -
      now.getMonth());

  if (
    end.getDate() <
    now.getDate()
  ) {
    months -= 1;
  }

  return Math.max(
    months,
    0
  );
}

// =====================================================
// CALCULATE PROGRAM YEAR
// =====================================================

function calculateProgramYear(
  enrollmentDate
) {
  const months =
    calculateMonthsCompleted(
      enrollmentDate
    );

  if (months < 12) {
    return 1;
  }

  return 2;
}