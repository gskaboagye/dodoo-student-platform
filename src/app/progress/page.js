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

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleDateString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProgressBar({ value }) {
  const safeValue = Math.min(
    Math.max(Number(value) || 0, 0),
    100
  );

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function ProgressPage() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setError("");

      const userResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const userData = await userResponse.json();

      if (!userResponse.ok || !userData?.user) {
        window.location.href = "/login";
        return;
      }

      setUser(userData.user);

      const response = await fetch("/api/progress", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Failed to load progress."
        );
      }

      setData(result);
    } catch (err) {
      console.error("Progress error:", err);
      setError(
        err.message || "Unable to load student progress."
      );
    } finally {
      setLoading(false);
    }
  }

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

  if (!user) {
    return null;
  }

  const isFacilitator = user.role === "facilitator";
  const isStudent = user.role === "student";

  /*
   * The progress API returns all students for facilitators.
   * For students, the API should return only their own record.
   *
   * We also perform a client-side ownership check as an
   * additional protection for the interface.
   */
  const allStudents = Array.isArray(data?.students)
    ? data.students
    : [];

  const students = isStudent
    ? allStudents.filter(
        (student) =>
          String(student._id) ===
          String(user.studentId)
      )
    : allStudents;

  /*
   * =========================================================
   * FACILITATOR VIEW
   * =========================================================
   */

  if (isFacilitator) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
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

          {/* Statistics */}
          <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <StatCard
              title="Total Students"
              value={data?.totalStudents || 0}
              icon={<Users size={20} />}
            />

            <StatCard
              title="Average Progress"
              value={`${data?.averageProgress || 0}%`}
              icon={<TrendingUp size={20} />}
            />

            <StatCard
              title="Completed"
              value={data?.completed || 0}
              icon={<CheckCircle size={20} />}
            />

            <StatCard
              title="Needs Attention"
              value={data?.needsAttention || 0}
              icon={<AlertCircle size={20} />}
            />

          </div>

          <ProgressMethod />

          <ProgressList
            students={students}
            title="All Student Progress"
            description="Progress is automatically calculated from projects, attendance, and the 24-month program timeline."
          />

        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * STUDENT VIEW
   * =========================================================
   */

  if (isStudent) {
    const student = students[0];

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
                Your student account may not be linked to a
                student record yet.
              </p>
            </div>

          </div>
        </div>
      );
    }

    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
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

          {/* Overall progress */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-4">
                {student.profileImage ? (
                  <img
                    src={student.profileImage}
                    alt={`${student.firstName} ${student.lastName}`}
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
                    {student.firstName} {student.lastName}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {student.program ||
                      "Program not specified"}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-4xl font-bold text-blue-700">
                  {student.progress || 0}%
                </p>

                <p className="text-xs text-slate-500">
                  Overall Progress
                </p>
              </div>

            </div>

            <div className="mt-6">
              <ProgressBar value={student.progress} />
            </div>

          </div>

          {/* Calculation */}
          <ProgressMethod />

          {/* Personal progress */}
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

function StatCard({ title, value, icon }) {
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

function ProgressMethod() {
  return (
    <div className="mb-8 rounded-xl border border-blue-100 bg-blue-50 p-5">

      <h2 className="mb-4 font-semibold text-slate-900">
        How Progress Is Calculated
      </h2>

      <div className="grid gap-4 md:grid-cols-3">

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
            Based on the average progress of the student's
            projects.
          </p>
        </div>

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
            Present = 100%, Late = 50%, Absent = 0%.
          </p>
        </div>

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
            Measures the student's position within the
            24-month program.
          </p>
        </div>

      </div>
    </div>
  );
}

function ProgressList({
  students,
  title,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

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

          {students.map((student) => {
            const details =
              student.progressDetails || {};

            return (
              <div
                key={String(student._id)}
                className="p-6"
              >

                <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">

                  <div className="flex items-center gap-4">

                    {student.profileImage ? (
                      <img
                        src={student.profileImage}
                        alt={`${student.firstName} ${student.lastName}`}
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
                      {student.progress || 0}%
                    </p>

                    <p className="text-xs text-slate-500">
                      Overall Progress
                    </p>
                  </div>

                </div>

                <div className="mb-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Overall Progress
                    </span>

                    <span className="font-semibold text-blue-700">
                      {student.progress || 0}%
                    </span>
                  </div>

                  <ProgressBar value={student.progress} />
                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  <ProgressDetail
                    title="Projects"
                    value={details.projectProgress}
                    description={`${details.projectCount || 0} project(s)`}
                    icon={<FolderKanban size={18} />}
                  />

                  <ProgressDetail
                    title="Attendance"
                    value={details.attendanceProgress}
                    description={`${details.attendanceRecords || 0} record(s)`}
                    icon={<ClipboardCheck size={18} />}
                  />

                  <ProgressDetail
                    title="Program Timeline"
                    value={details.timelineProgress}
                    description={`Year ${details.programYear || 1} of 2`}
                    icon={<CalendarDays size={18} />}
                  />

                </div>

                <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">

                  <InfoItem
                    label="Enrollment Date"
                    value={formatDate(details.enrollmentDate)}
                  />

                  <InfoItem
                    label="Expected Completion"
                    value={formatDate(
                      details.expectedCompletionDate
                    )}
                  />

                  <InfoItem
                    label="Months Completed"
                    value={`${details.monthsCompleted || 0} / 24`}
                  />

                  <InfoItem
                    label="Months Remaining"
                    value={details.monthsRemaining || 0}
                  />

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}

function ProgressDetail({
  title,
  value,
  description,
  icon,
}) {
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
          {value || 0}%
        </span>
      </div>

      <ProgressBar value={value} />

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>

    </div>
  );
}

function InfoItem({ label, value }) {
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