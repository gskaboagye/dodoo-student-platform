"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  ChartNoAxesCombined,
  FolderKanban,
  BookOpen,
  UserRound,
  Clock3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  ClipboardCheck,
  Target,
  Code2,
  Terminal,
  GitBranch,
  FileCheck2,
  UserPlus,
  RefreshCw,
} from "lucide-react";

import Announcements from "@/components/Announcements";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [studentData, setStudentData] = useState(null);

  const [pendingApplications, setPendingApplications] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshingApplications, setRefreshingApplications] =
    useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // GET CURRENT USER
      // =====================================================

      const userResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!userResponse.ok) {
        window.location.href = "/login";
        return;
      }

      const userData = await userResponse.json();

      if (!userData?.user) {
        window.location.href = "/login";
        return;
      }

      const currentUser = userData.user;

      setUser(currentUser);

      // =====================================================
      // FACILITATOR DATA
      // =====================================================

      if (currentUser.role === "facilitator") {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            "Unable to load facilitator dashboard."
          );
        }

        const dashboardData = await response.json();

        setData(dashboardData);

        // ---------------------------------------------------
        // LOAD PENDING STUDENT APPLICATIONS
        // ---------------------------------------------------

        try {
          const applicationsResponse = await fetch(
            "/api/student-requests",
            {
              cache: "no-store",
            }
          );

          if (applicationsResponse.ok) {
            const applicationsData =
              await applicationsResponse.json();

            const applications =
              Array.isArray(applicationsData)
                ? applicationsData
                : Array.isArray(
                    applicationsData?.students
                  )
                ? applicationsData.students
                : Array.isArray(
                    applicationsData?.requests
                  )
                ? applicationsData.requests
                : Array.isArray(
                    applicationsData?.applications
                  )
                ? applicationsData.applications
                : [];

            setPendingApplications(applications);
          } else {
            setPendingApplications([]);
          }
        } catch (applicationError) {
          console.error(
            "Pending applications error:",
            applicationError
          );

          setPendingApplications([]);
        }

        return;
      }

      // =====================================================
      // STUDENT DATA
      // =====================================================

      if (currentUser.role === "student") {
        // =====================================================
        // PENDING STUDENT
        // =====================================================

        if (currentUser.status === "pending") {
          setStudentData({
            pending: true,
            email: currentUser.email || "",
          });

          return;
        }

        // =====================================================
        // LOAD STUDENT DATA
        // =====================================================

        const [
          profileResponse,
          attendanceResponse,
          projectsResponse,
          progressResponse,
        ] = await Promise.all([
          fetch("/api/student/profile", {
            cache: "no-store",
          }),

          fetch("/api/attendance", {
            cache: "no-store",
          }),

          fetch("/api/projects", {
            cache: "no-store",
          }),

          fetch("/api/progress", {
            cache: "no-store",
          }),
        ]);

        // =====================================================
        // PROFILE
        // =====================================================

        const profileData = profileResponse.ok
          ? await profileResponse.json()
          : null;

        // =====================================================
        // ATTENDANCE
        // =====================================================

        const attendanceData = attendanceResponse.ok
          ? await attendanceResponse.json()
          : { attendance: [] };

        // =====================================================
        // PROJECTS
        // =====================================================

        const projectsData = projectsResponse.ok
          ? await projectsResponse.json()
          : { projects: [] };

        // =====================================================
        // PROGRESS
        // =====================================================

        const progressData = progressResponse.ok
          ? await progressResponse.json()
          : null;

        // =====================================================
        // NORMALIZE ATTENDANCE DATA
        // =====================================================

        const attendance = Array.isArray(attendanceData)
          ? attendanceData
          : Array.isArray(attendanceData?.attendance)
          ? attendanceData.attendance
          : [];

        // =====================================================
        // NORMALIZE PROJECT DATA
        // =====================================================

        const projects = Array.isArray(projectsData)
          ? projectsData
          : Array.isArray(projectsData?.projects)
          ? projectsData.projects
          : [];

        // =====================================================
        // ONLY SHOW THIS STUDENT'S PROJECTS
        // =====================================================

        const myProjects = projects.filter((project) => {
          if (!currentUser.studentId) {
            return false;
          }

          return (
            String(project.studentId) ===
            String(currentUser.studentId)
          );
        });

        // =====================================================
        // ATTENDANCE STATISTICS
        // =====================================================

        const present = attendance.filter(
          (record) => record.status === "Present"
        ).length;

        const late = attendance.filter(
          (record) => record.status === "Late"
        ).length;

        const absent = attendance.filter(
          (record) => record.status === "Absent"
        ).length;

        const totalAttendance = attendance.length;

        const attendanceRate =
          totalAttendance > 0
            ? Math.round(
                ((present + late * 0.5) /
                  totalAttendance) *
                  100
              )
            : 0;

        // =====================================================
        // PROJECT PROGRESS
        // =====================================================

        const projectProgress =
          myProjects.length > 0
            ? Math.round(
                myProjects.reduce(
                  (sum, project) =>
                    sum +
                    Number(project.progress || 0),
                  0
                ) / myProjects.length
              )
            : 0;

        // =====================================================
        // OFFICIAL OVERALL PROGRESS
        // =====================================================

        const overallProgress =
          normalizeProgressValue(
            progressData?.progress?.overall ??
              progressData?.overallProgress ??
              progressData?.progress?.percentage ??
              progressData?.percentage ??
              0
          );

        // =====================================================
        // SAVE STUDENT DATA
        // =====================================================

        setStudentData({
          profile:
            profileData?.student ||
            profileData ||
            null,

          attendance,

          projects: myProjects,

          present,
          late,
          absent,

          attendanceRate,

          projectProgress,

          overallProgress,

          progressDetails:
            progressData?.progressDetails ||
            progressData?.progress?.details ||
            null,
        });

        return;
      }

      // =====================================================
      // UNKNOWN ROLE
      // =====================================================

      setError(
        "Your account role is not recognized."
      );
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        err.message ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // REFRESH PENDING APPLICATIONS
  // =========================================================

  async function refreshPendingApplications() {
    try {
      setRefreshingApplications(true);

      const response = await fetch(
        "/api/student-requests",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to refresh applications."
        );
      }

      const responseData =
        await response.json();

      const applications =
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(
              responseData?.students
            )
          ? responseData.students
          : Array.isArray(
              responseData?.requests
            )
          ? responseData.requests
          : Array.isArray(
              responseData?.applications
            )
          ? responseData.applications
          : [];

      setPendingApplications(applications);
    } catch (err) {
      console.error(
        "Refresh applications error:",
        err
      );
    } finally {
      setRefreshingApplications(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-700">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // FACILITATOR DASHBOARD
  // =========================================================

  if (user?.role === "facilitator") {
    const pendingCount =
      pendingApplications.length;

    return (
      <div className="p-4 sm:p-6">

        {/* =================================================
            FACILITATOR WELCOME
        ================================================= */}

        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950 px-6 py-7 text-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.65)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">

          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
              backgroundSize: "34px 34px",
              maskImage:
                "linear-gradient(to right, black, transparent 75%)",
              WebkitMaskImage:
                "linear-gradient(to right, black, transparent 75%)",
            }}
          />

          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="pointer-events-none absolute right-6 top-6 hidden h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm lg:flex">
            <Code2 className="h-14 w-14 text-blue-400/70" />
          </div>

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2.5">

                <div className="flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15">
                    <Terminal className="h-3.5 w-3.5" />
                  </span>

                  DCC_CODE_LAB
                </div>

                <span className="h-1 w-1 rounded-full bg-slate-600" />

                <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  Facilitator Workspace
                </span>

              </div>

              <p className="mt-6 text-sm font-semibold text-blue-400">
                Tech Facilitator Dashboard
              </p>

              <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.7rem] lg:leading-tight">
                Welcome back, {user.name || "Facilitator"}.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Guide students from their first line of code to real-world projects.
                Manage learning, track progress, review applications, and keep the
                Code Lab moving forward.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">

                <Link
                  href="/student-requests"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 hover:shadow-blue-900/40"
                >
                  <FileCheck2 className="h-4 w-4" />
                  Review Applications

                  {pendingCount > 0 && (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
                      {pendingCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/students"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-white/[0.08]"
                >
                  <Users className="h-4 w-4" />
                  Manage Students
                </Link>

              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">

                <span className="inline-flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-blue-400" />
                  Real-world development
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Student-focused learning
                </span>

              </div>

            </div>

            {/* AT A GLANCE */}

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-xl backdrop-blur-md">

              <div className="mb-4 flex items-center justify-between">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    At a glance
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-200">
                    Code Lab activity
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">

                  <div className="flex items-center gap-2 text-slate-400">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[11px]">
                      Students
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-white">
                    {data?.totalStudents ?? 0}
                  </p>

                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">

                  <div className="flex items-center gap-2 text-slate-400">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    <span className="text-[11px]">
                      Pending
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-white">
                    {pendingCount}
                  </p>

                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">

                  <div className="flex items-center gap-2 text-slate-400">
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span className="text-[11px]">
                      Projects
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-white">
                    {data?.activeProjects ?? 0}
                  </p>

                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">

                  <div className="flex items-center gap-2 text-slate-400">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    <span className="text-[11px]">
                      Present
                    </span>
                  </div>

                  <p className="mt-2 text-xl font-bold text-white">
                    {data?.presentToday ?? 0}
                  </p>

                </div>

              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-blue-400/10 bg-blue-400/5 px-3 py-2.5 text-xs text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
                Platform services are available
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            MAIN STATISTICS
        ================================================= */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <StatCard
            title="Total Students"
            value={data?.totalStudents ?? 0}
            icon={<Users size={22} />}
            href="/students"
          />

          <StatCard
            title="Pending Applications"
            value={pendingCount}
            icon={<FileCheck2 size={22} />}
            href="/student-requests"
            highlight={pendingCount > 0}
          />

          <StatCard
            title="Present Today"
            value={data?.presentToday ?? 0}
            icon={<CheckCircle2 size={22} />}
            href="/attendance"
          />

          <StatCard
            title="Active Projects"
            value={data?.activeProjects ?? 0}
            icon={<FolderKanban size={22} />}
            href="/projects"
          />

        </div>

        {/* =================================================
            PENDING APPLICATIONS
        ================================================= */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <UserPlus size={21} />
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="font-semibold text-slate-900">
                    Pending Student Applications
                  </h2>

                  {pendingCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {pendingCount}
                    </span>
                  )}

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Review students waiting for
                  facilitator approval.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={refreshPendingApplications}
                disabled={refreshingApplications}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={
                    refreshingApplications
                      ? "h-4 w-4 animate-spin"
                      : "h-4 w-4"
                  }
                />

                Refresh
              </button>

              <Link
                href="/student-requests"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Review Applications
                <ArrowRight size={15} />
              </Link>

            </div>

          </div>

          {pendingApplications.length > 0 ? (
            <div className="mt-5 space-y-3">

              {pendingApplications
                .slice(0, 5)
                .map((application) => {

                  const applicationName =
                    application.name ||
                    `${application.firstName || ""} ${
                      application.lastName || ""
                    }`.trim() ||
                    "Unnamed Student";

                  const applicationEmail =
                    application.email ||
                    "No email provided";

                  const applicationProgram =
                    application.program ||
                    "Program not specified";

                  return (
                    <div
                      key={
                        String(
                          application._id ||
                            application.id ||
                            application.email ||
                            applicationName
                        )
                      }
                      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <UserRound size={20} />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-slate-900">
                            {applicationName}
                          </p>

                          <p className="truncate text-xs text-slate-500">
                            {applicationEmail}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2">

                            <span className="text-xs text-slate-500">
                              {applicationProgram}
                            </span>

                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-700">
                              Pending
                            </span>

                          </div>

                        </div>

                      </div>

                      <Link
                        href="/student-requests"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Review
                        <ArrowRight size={14} />
                      </Link>

                    </div>
                  );
                })}

              {pendingApplications.length > 5 && (
                <div className="pt-2 text-center">

                  <Link
                    href="/student-requests"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all {pendingApplications.length} applications
                  </Link>

                </div>
              )}

            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CheckCircle2 size={24} />
              </div>

              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No Pending Applications
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                There are currently no student
                applications waiting for review.
              </p>

            </div>
          )}

        </section>

        {/* =================================================
            FACILITATOR CARDS
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">

          <DashboardCard
            title="Today's Attendance"
            description="Current attendance records"
            icon={<CalendarCheck size={20} />}
          >

            <div className="grid grid-cols-3 gap-3">

              <MiniStat
                label="Present"
                value={data?.presentToday ?? 0}
                icon={<CheckCircle2 size={17} />}
              />

              <MiniStat
                label="Late"
                value={data?.lateToday ?? 0}
                icon={<Clock3 size={17} />}
              />

              <MiniStat
                label="Absent"
                value={data?.absentToday ?? 0}
                icon={<AlertCircle size={17} />}
              />

            </div>

            <Link
              href="/attendance"
              className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Manage attendance
              <ArrowRight size={16} />
            </Link>

          </DashboardCard>

          <DashboardCard
            title="Quick Actions"
            description="Common facilitator tasks"
            icon={<Target size={20} />}
          >

            <div className="grid gap-3">

              <QuickAction
                href="/student-requests"
                icon={<FileCheck2 size={18} />}
                text="Review Applications"
              />

              <QuickAction
                href="/students"
                icon={<Users size={18} />}
                text="Manage Students"
              />

              <QuickAction
                href="/attendance"
                icon={<ClipboardCheck size={18} />}
                text="Record Attendance"
              />

              <QuickAction
                href="/projects"
                icon={<FolderKanban size={18} />}
                text="Manage Projects"
              />

              <QuickAction
                href="/resources"
                icon={<BookOpen size={18} />}
                text="Manage Resources"
              />

            </div>

          </DashboardCard>

          <DashboardCard
            title="Recent Students"
            description="Recently registered students"
            icon={<Users size={20} />}
          >

            {data?.recentStudents?.length > 0 ? (
              <div className="space-y-3">

                {data.recentStudents.map(
                  (student) => (
                    <div
                      key={String(student._id)}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                    >

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <UserRound size={18} />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-slate-800">
                          {student.firstName}{" "}
                          {student.lastName}
                        </p>

                        <p className="truncate text-xs text-slate-500">
                          {student.email}
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No students available yet.
              </p>
            )}

            <Link
              href="/students"
              className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all students
              <ArrowRight size={16} />
            </Link>

          </DashboardCard>

        </div>

        {/* =================================================
            ADDITIONAL FACILITATOR OVERVIEW
        ================================================= */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <DashboardCard
            title="Program Overview"
            description="Current platform activity"
            icon={<ChartNoAxesCombined size={20} />}
          >

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

              <MiniStat
                label="Students"
                value={data?.totalStudents ?? 0}
                icon={<Users size={17} />}
              />

              <MiniStat
                label="Projects"
                value={data?.activeProjects ?? 0}
                icon={<FolderKanban size={17} />}
              />

              <MiniStat
                label="Resources"
                value={data?.resources ?? 0}
                icon={<BookOpen size={17} />}
              />

            </div>

          </DashboardCard>

          <DashboardCard
            title="Application Status"
            description="Student registration workflow"
            icon={<FileCheck2 size={20} />}
          >

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-sm font-semibold text-slate-800">
                    Applications awaiting review
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Review applications and approve
                    eligible students.
                  </p>

                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {pendingCount}
                </div>

              </div>

              <Link
                href="/student-requests"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Open application management
                <ArrowRight size={15} />
              </Link>

            </div>

          </DashboardCard>

        </div>

        {/* =================================================
            ANNOUNCEMENTS
        ================================================= */}

        <div className="mt-6">
          <Announcements role={user?.role} />
        </div>

      </div>
    );
  }

  // =========================================================
  // PENDING STUDENT
  // =========================================================

  if (
    user?.role === "student" &&
    studentData?.pending
  ) {
    return (
      <div className="p-4 sm:p-6">

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm sm:p-8">

            <div className="text-center">

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Application Pending Approval
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Your application has been
                submitted successfully and is
                currently being reviewed by a
                facilitator.
              </p>

            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-white p-5">

              <div className="flex items-start gap-3">

                <div className="mt-0.5 shrink-0">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>

                <div>

                  <h2 className="font-semibold text-slate-900">
                    Check Your Email for Approval
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Please check the email address
                    you used to register for an
                    approval notification from
                    Dodoo Coding Club.
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    If you do not see the message
                    in your Inbox, please check
                    your{" "}
                    <strong>Spam/Junk</strong>{" "}
                    folder.
                  </p>

                  {studentData.email && (
                    <div className="mt-4 rounded-lg bg-slate-50 p-3">

                      <p className="text-xs text-slate-500">
                        Notification email
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-slate-800">
                        {studentData.email}
                      </p>

                    </div>
                  )}

                </div>

              </div>

            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-center">

              <p className="text-sm text-slate-500">

                <strong className="text-slate-700">
                  Status: Pending Review
                </strong>

              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You will receive an email once a
                facilitator reviews your
                application.
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // =========================================================
  // STUDENT DASHBOARD
  // =========================================================

  const profile = studentData?.profile;

  const overallProgress =
    studentData?.overallProgress ?? 0;

  const projectProgress =
    studentData?.projectProgress ?? 0;

  return (
    <div className="p-4 sm:p-6">

      {/* =================================================
          STUDENT WELCOME
      ================================================= */}

      <section className="relative mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-6 text-white shadow-[0_20px_60px_-25px_rgba(30,64,175,0.45)] sm:p-8 lg:p-9">

        {/* Subtle portal grid */}

        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "linear-gradient(to right, black, transparent 85%)",
            WebkitMaskImage:
              "linear-gradient(to right, black, transparent 85%)",
          }}
        />

        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">

          {/* STUDENT IDENTITY */}

          <div className="min-w-0">

            <div className="flex flex-wrap items-center gap-2.5">

              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur-sm">

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                  <GraduationCap className="h-3.5 w-3.5" />
                </span>

                DCC Student Portal

              </div>

              <span className="h-1 w-1 rounded-full bg-white/40" />

              <span className="text-xs font-medium uppercase tracking-[0.16em] text-blue-100/70">
                Learning Workspace
              </span>

            </div>

            <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">

              {/* PROFILE IMAGE */}

              <div className="relative shrink-0">

                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm sm:h-28 sm:w-28">

                  {profile?.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt={`${profile?.firstName || "Student"} ${
                        profile?.lastName || ""
                      }`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-12 w-12 text-blue-100/60" />
                  )}

                </div>

                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-indigo-700 bg-emerald-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-white" />
                </div>

              </div>

              <div className="min-w-0">

                <p className="text-sm font-semibold text-blue-100">
                  Student Developer Dashboard
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.65rem]">
                  Welcome back,{" "}
                  {profile?.firstName ||
                    user?.name ||
                    "Student"}.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-50/80 sm:text-base">
                  Stay on top of your learning journey,
                  track your progress, manage projects,
                  and build the skills you need to turn
                  ideas into practical solutions.
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">

                  {profile?.program && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-blue-50 backdrop-blur-sm">

                      <GraduationCap className="h-4 w-4" />

                      {profile.program}

                    </span>
                  )}

                  {user?.studentId && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-blue-50 backdrop-blur-sm">

                      <UserRound className="h-4 w-4" />

                      Student ID: {user.studentId}

                    </span>
                  )}

                </div>

              </div>

            </div>

            <div className="mt-7 flex flex-wrap gap-3">

              <Link
                href="/progress"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
              >
                <ChartNoAxesCombined className="h-4 w-4" />

                View My Progress

                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/projects"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <FolderKanban className="h-4 w-4" />

                My Projects

              </Link>

            </div>

          </div>

          {/* LEARNING SNAPSHOT */}

          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/25 p-4 shadow-xl backdrop-blur-md sm:p-5">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100/60">
                  Learning snapshot
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  Your current activity
                </p>

              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>

            </div>

            <div className="space-y-4">

              <div>

                <div className="mb-2 flex items-center justify-between text-xs">

                  <span className="text-blue-100/70">
                    Overall progress
                  </span>

                  <span className="font-semibold text-white">
                    {overallProgress}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">

                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width: `${overallProgress}%`,
                    }}
                  />

                </div>

              </div>

              <div>

                <div className="mb-2 flex items-center justify-between text-xs">

                  <span className="text-blue-100/70">
                    Attendance
                  </span>

                  <span className="font-semibold text-white">
                    {studentData?.attendanceRate ?? 0}%
                  </span>

                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/10">

                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{
                      width: `${studentData?.attendanceRate ?? 0}%`,
                    }}
                  />

                </div>

              </div>

            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">

                <div className="flex items-center gap-2 text-blue-100/60">

                  <FolderKanban className="h-3.5 w-3.5" />

                  <span className="text-[11px]">
                    Projects
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  {studentData?.projects?.length ?? 0}
                </p>

              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">

                <div className="flex items-center gap-2 text-blue-100/60">

                  <CheckCircle2 className="h-3.5 w-3.5" />

                  <span className="text-[11px]">
                    Present
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  {studentData?.present ?? 0}
                </p>

              </div>

            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/5 px-3 py-2.5 text-xs text-blue-50/75">

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />

              Your student workspace is active

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          ANNOUNCEMENTS
      ================================================= */}

      <Announcements role={user?.role} />

      {/* =================================================
          STUDENT STATISTICS
      ================================================= */}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Overall Progress"
          value={`${overallProgress}%`}
          icon={<ChartNoAxesCombined size={22} />}
          href="/progress"
        />

        <StatCard
          title="My Attendance"
          value={`${studentData?.attendanceRate ?? 0}%`}
          icon={<CalendarCheck size={22} />}
          href="/student/attendance"
        />

        <StatCard
          title="My Projects"
          value={studentData?.projects?.length ?? 0}
          icon={<FolderKanban size={22} />}
          href="/projects"
        />

        <StatCard
          title="Learning Resources"
          value="View"
          icon={<BookOpen size={22} />}
          href="/resources"
        />

      </div>

      {/* =================================================
          PROGRESS OVERVIEW
      ================================================= */}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">

        {/* OVERALL PROGRESS */}

        <DashboardCard
          title="Overall Progress"
          description="Your combined learning progress"
          icon={<ChartNoAxesCombined size={20} />}
        >

          <div>

            <div className="mb-2 flex items-center justify-between">

              <span className="text-sm text-slate-500">
                Overall progress
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {overallProgress}%
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${overallProgress}%`,
                }}
              />

            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>0%</span>
              <span>100%</span>
            </div>

          </div>

          <Link
            href="/progress"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View detailed progress
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

        {/* ATTENDANCE PROGRESS */}

        <DashboardCard
          title="Attendance Progress"
          description="Your attendance performance"
          icon={<CalendarCheck size={20} />}
        >

          <div>

            <div className="mb-2 flex items-center justify-between">

              <span className="text-sm text-slate-500">
                Attendance rate
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {studentData?.attendanceRate ?? 0}%
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      studentData?.attendanceRate ?? 0
                    )
                  )}%`,
                }}
              />

            </div>

          </div>

          <Link
            href="/student/attendance"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my attendance
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

        {/* PROJECT PROGRESS */}

        <DashboardCard
          title="Project Progress"
          description="Your average project completion"
          icon={<FolderKanban size={20} />}
        >

          <div>

            <div className="mb-2 flex items-center justify-between">

              <span className="text-sm text-slate-500">
                Project progress
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {projectProgress}%
              </span>

            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      projectProgress
                    )
                  )}%`,
                }}
              />

            </div>

          </div>

          <Link
            href="/projects"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my projects
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

      </div>

      {/* =================================================
          STUDENT MAIN CARDS
      ================================================= */}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* MY PROFILE */}

        <DashboardCard
          title="My Profile"
          description="Keep your personal information updated"
          icon={<UserRound size={20} />}
        >

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm font-semibold text-slate-800">
              {profile?.firstName || ""}{" "}
              {profile?.lastName || ""}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {profile?.email ||
                user?.email ||
                ""}
            </p>

            {profile?.program && (
              <p className="mt-2 text-xs text-slate-500">
                Program: {profile.program}
              </p>
            )}

          </div>

          <Link
            href="/student/profile"
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View and edit my profile
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

        {/* ATTENDANCE SUMMARY */}

        <DashboardCard
          title="Attendance Summary"
          description="Your attendance records"
          icon={<CalendarCheck size={20} />}
        >

          <div className="grid grid-cols-3 gap-3">

            <MiniStat
              label="Present"
              value={studentData?.present ?? 0}
              icon={<CheckCircle2 size={17} />}
            />

            <MiniStat
              label="Late"
              value={studentData?.late ?? 0}
              icon={<Clock3 size={17} />}
            />

            <MiniStat
              label="Absent"
              value={studentData?.absent ?? 0}
              icon={<AlertCircle size={17} />}
            />

          </div>

          <Link
            href="/student/attendance"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my attendance
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

        {/* MY PROJECTS */}

        <DashboardCard
          title="My Projects"
          description="Projects you are working on"
          icon={<FolderKanban size={20} />}
        >

          {studentData?.projects?.length > 0 ? (
            <div className="space-y-3">

              {studentData.projects
                .slice(0, 3)
                .map((project) => (
                  <div
                    key={String(project._id)}
                    className="rounded-xl bg-slate-50 p-3"
                  >

                    <div className="flex items-center justify-between gap-3">

                      <p className="truncate text-sm font-semibold text-slate-800">
                        {project.title}
                      </p>

                      <span className="text-xs font-medium text-blue-600">
                        {project.progress || 0}%
                      </span>

                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">

                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Number(
                                project.progress
                              ) || 0
                            )
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                ))}

            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              You have not added a project yet.
            </div>
          )}

          <Link
            href="/projects"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my projects
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

        {/* PROGRESS BREAKDOWN */}

        <DashboardCard
          title="Progress Breakdown"
          description="Key areas contributing to your progress"
          icon={<Target size={20} />}
        >

          <div className="space-y-4">

            <ProgressItem
              label="Attendance"
              value={studentData?.attendanceRate ?? 0}
            />

            <ProgressItem
              label="Projects"
              value={projectProgress}
            />

            <ProgressItem
              label="Overall"
              value={overallProgress}
            />

          </div>

          <Link
            href="/progress"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View full progress report
            <ArrowRight size={16} />
          </Link>

        </DashboardCard>

      </div>

      {/* =================================================
          DEVELOPER TOOLS
      ================================================= */}

      <div className="mt-6">

        <DashboardCard
          title="Developer Tools"
          description="Continue building your skills"
          icon={<Code2 size={20} />}
        >

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <QuickAction
              href="/student/profile"
              icon={<UserRound size={18} />}
              text="My Profile"
            />

            <QuickAction
              href="/student/attendance"
              icon={<CalendarCheck size={18} />}
              text="My Attendance"
            />

            <QuickAction
              href="/progress"
              icon={<ChartNoAxesCombined size={18} />}
              text="My Progress"
            />

            <QuickAction
              href="/projects"
              icon={<FolderKanban size={18} />}
              text="My Projects"
            />

          </div>

        </DashboardCard>

      </div>

    </div>
  );
}

// =========================================================
// NORMALIZE PROGRESS VALUE
// =========================================================

function normalizeProgressValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(number))
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  icon,
  href,
  highlight = false,
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "border-blue-300 ring-1 ring-blue-100"
          : "border-slate-200"
      }`}
    >

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              highlight && Number(value) > 0
                ? "text-blue-600"
                : "text-slate-900"
            }`}
          >
            {value}
          </p>

        </div>

        <div
          className={`rounded-xl p-3 ${
            highlight && Number(value) > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-blue-50 text-blue-600"
          }`}
        >
          {icon}
        </div>

      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600">
        Open
        <ArrowRight size={14} />
      </div>

    </Link>
  );
}

// =========================================================
// DASHBOARD CARD
// =========================================================

function DashboardCard({
  title,
  description,
  icon,
  children,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="mb-5 flex items-start gap-3">

        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          {icon}
        </div>

        <div>

          <h2 className="font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>

        </div>

      </div>

      {children}

    </section>
  );
}

// =========================================================
// MINI STAT
// =========================================================

function MiniStat({
  label,
  value,
  icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">

      <div className="mx-auto mb-1 flex w-fit text-slate-500">
        {icon}
      </div>

      <p className="text-lg font-bold text-slate-900">
        {value}
      </p>

      <p className="text-xs text-slate-500">
        {label}
      </p>

    </div>
  );
}

// =========================================================
// PROGRESS ITEM
// =========================================================

function ProgressItem({
  label,
  value,
}) {
  const normalizedValue =
    normalizeProgressValue(value);

  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm text-slate-600">
          {label}
        </span>

        <span className="text-sm font-semibold text-slate-800">
          {normalizedValue}%
        </span>

      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">

        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${normalizedValue}%`,
          }}
        />

      </div>

    </div>
  );
}

// =========================================================
// QUICK ACTION
// =========================================================

function QuickAction({
  href,
  icon,
  text,
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50"
    >

      <div className="flex items-center gap-3">

        <div className="text-blue-600">
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-700">
          {text}
        </span>

      </div>

      <ArrowRight
        size={16}
        className="text-slate-400"
      />

    </Link>
  );
}