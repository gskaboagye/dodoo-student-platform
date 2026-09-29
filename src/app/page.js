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
  const [pendingApplications, setPendingApplications] = useState([]);
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

      /* =====================================================
         CURRENT USER
      ===================================================== */

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

      /* =====================================================
         FACILITATOR
      ===================================================== */

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

      /* =====================================================
         STUDENT
      ===================================================== */

      if (currentUser.role === "student") {
        if (
          ["pending", "pending_approval"].includes(
            String(currentUser.status || "").toLowerCase()
          )
        ) {
          setStudentData({
            pending: true,
            email: currentUser.email || "",
          });

          return;
        }

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

        const profileData = profileResponse.ok
          ? await profileResponse.json()
          : null;

        const attendanceData = attendanceResponse.ok
          ? await attendanceResponse.json()
          : { attendance: [] };

        const projectsData = projectsResponse.ok
          ? await projectsResponse.json()
          : { projects: [] };

        const progressData = progressResponse.ok
          ? await progressResponse.json()
          : null;

        /* =====================================================
           ATTENDANCE
        ===================================================== */

        const attendance = Array.isArray(attendanceData)
          ? attendanceData
          : Array.isArray(attendanceData?.attendance)
          ? attendanceData.attendance
          : [];

        const present = attendance.filter(
          (record) =>
            String(record.status).toLowerCase() ===
            "present"
        ).length;

        const late = attendance.filter(
          (record) =>
            String(record.status).toLowerCase() ===
            "late"
        ).length;

        const absent = attendance.filter(
          (record) =>
            String(record.status).toLowerCase() ===
            "absent"
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

        /* =====================================================
           PROJECTS
        ===================================================== */

        const projects = Array.isArray(projectsData)
          ? projectsData
          : Array.isArray(projectsData?.projects)
          ? projectsData.projects
          : [];

        const myProjects = projects.filter((project) => {
          if (!currentUser.studentId) {
            return false;
          }

          return (
            String(project.studentId) ===
            String(currentUser.studentId)
          );
        });

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

        /* =====================================================
           OVERALL PROGRESS
        ===================================================== */

        const overallProgress =
          normalizeProgressValue(
            progressData?.progress?.overall ??
              progressData?.overallProgress ??
              progressData?.progress?.percentage ??
              progressData?.percentage ??
              0
          );

        const progressDetails =
          progressData?.progressDetails ||
          progressData?.progress?.details ||
          null;

        const progressItems = normalizeProgressItems(
          progressDetails
        );

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

          progressDetails,
          progressItems,
        });

        return;
      }

      setError(
        "Your account role is not recognized."
      );
    } catch (err) {
      console.error("Dashboard error:", err);

      setError(
        err.message ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     REFRESH APPLICATIONS
  ========================================================== */

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

  /* =========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#F3F4F6] p-4 sm:p-6">
        <div className="mx-auto flex min-h-[55vh] max-w-7xl items-center justify-center">
          <div className="dcc-card-motion w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#1961D6]">
              <RefreshCw className="h-7 w-7 animate-spin" />
            </div>

            <h2 className="mt-5 text-lg font-extrabold text-[#111111]">
              Loading dashboard
            </h2>

            <p className="mt-2 text-sm text-[#64748B]">
              Preparing your DCC learning workspace...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================== */

  if (error) {
    return (
      <div className="min-h-[60vh] bg-[#F3F4F6] p-4 sm:p-6">
        <div className="mx-auto flex min-h-[55vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-[#111111]">
              Unable to load dashboard
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              {error}
            </p>

            <button
              type="button"
              onClick={loadDashboard}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1961D6] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#1554B8]"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     FACILITATOR DASHBOARD
  ========================================================== */

  if (user?.role === "facilitator") {
    const pendingCount =
      pendingApplications.length;

    return (
      <div className="min-h-screen bg-[#F3F4F6] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl">

          {/* =================================================
             HERO
          ================================================= */}

          <section className="dcc-hero relative mb-8 overflow-hidden rounded-[28px] bg-[#1961D6] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9 lg:px-10 lg:py-10">
            <div className="dcc-grid dcc-grid-motion pointer-events-none absolute inset-0 opacity-20" />

            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 dcc-gentle-float" />

            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[#F4B400]/10 dcc-float" />

            <div className="dcc-hero-shine pointer-events-none absolute inset-0" />

            <div className="relative grid gap-8 lg:grid-cols-[1fr_310px] lg:items-center">

              <div className="dcc-hero-enter">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">
                    <Terminal className="h-3.5 w-3.5" />
                    DCC Code Lab
                  </span>

                  <span className="text-xs text-white/60">
                    Facilitator Workspace
                  </span>
                </div>

                <p className="mt-6 text-sm font-bold text-[#F4B400]">
                  Tech Facilitator Dashboard
                </p>

                <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Welcome back,{" "}
                  {user.name || "Facilitator"}.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                  Guide students from their first line of code
                  to practical projects. Manage learning,
                  track progress, review applications, and keep
                  the DCC learning community moving forward.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/student-requests"
                    className="dcc-button-motion inline-flex items-center gap-2 rounded-xl bg-[#F4B400] px-4 py-2.5 text-sm font-extrabold text-[#111111] shadow-lg transition hover:bg-[#D99D00]"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Review Applications

                    {pendingCount > 0 && (
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">
                        {pendingCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/students"
                    className="dcc-button-motion inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                  >
                    <Users className="h-4 w-4" />
                    Manage Students
                  </Link>
                </div>
              </div>

              {/* Snapshot */}

              <div className="dcc-panel-enter rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                      At a glance
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      Code Lab activity
                    </p>
                  </div>

                  <div className="dcc-pulse-soft flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4B400] text-[#111111]">
                    <Code2 className="h-5 w-5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    label="Students"
                    value={data?.totalStudents ?? 0}
                    icon={<Users className="h-4 w-4" />}
                  />

                  <MiniStat
                    label="Pending"
                    value={pendingCount}
                    icon={<FileCheck2 className="h-4 w-4" />}
                    accent="yellow"
                  />

                  <MiniStat
                    label="Projects"
                    value={data?.activeProjects ?? 0}
                    icon={<FolderKanban className="h-4 w-4" />}
                  />

                  <MiniStat
                    label="Present"
                    value={data?.presentToday ?? 0}
                    icon={<CalendarCheck className="h-4 w-4" />}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
             STATISTICS
          ================================================= */}

          <div className="dcc-fade-up grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
             APPLICATIONS
          ================================================= */}

          <section className="mt-8 dcc-fade-up">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1961D6]">
                  Admissions
                </p>

                <h2 className="mt-1 text-2xl font-extrabold text-[#111111]">
                  Pending Applications
                </h2>

                <p className="mt-1 text-sm text-[#64748B]">
                  Review students waiting for approval.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={refreshPendingApplications}
                  disabled={refreshingApplications}
                  className="dcc-button-motion inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-bold text-[#64748B] transition hover:border-[#BFD5FF] hover:bg-[#EAF1FF] disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshingApplications
                        ? "animate-spin"
                        : ""
                    }`}
                  />
                  Refresh
                </button>

                <Link
                  href="/student-requests"
                  className="dcc-primary-button dcc-button-motion inline-flex items-center gap-2 rounded-xl bg-[#1961D6] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1554B8]"
                >
                  View all
                  <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
                </Link>
              </div>
            </div>

            {pendingApplications.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {pendingApplications
                  .slice(0, 6)
                  .map((application, index) => {
                    const name =
                      application.name ||
                      `${application.firstName || ""} ${
                        application.lastName || ""
                      }`.trim() ||
                      "Student Applicant";

                    const email =
                      application.email ||
                      "No email provided";

                    return (
                      <div
                        key={
                          application._id ||
                          application.id ||
                          application.email ||
                          index
                        }
                        className="dcc-card-motion rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] font-extrabold text-[#1961D6]">
                              {name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-extrabold text-[#111111]">
                                {name}
                              </h3>

                              <p className="truncate text-sm text-[#64748B]">
                                {email}
                              </p>
                            </div>
                          </div>

                          <span className="dcc-status-pulse shrink-0 rounded-full bg-[#FFF7D6] px-3 py-1 text-xs font-bold text-[#8A6500]">
                            Pending
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
                          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                            <UserPlus className="h-4 w-4 text-[#1961D6]" />
                            New student
                          </span>

                          <Link
                            href="/student-requests"
                            className="dcc-button-motion inline-flex items-center gap-1.5 text-sm font-extrabold text-[#1961D6]"
                          >
                            Review
                            <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="dcc-card-motion rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#1961D6] dcc-float">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <h3 className="mt-4 font-extrabold text-[#111111]">
                  No pending applications
                </h3>

                <p className="mt-2 text-sm text-[#64748B]">
                  There are currently no student applications
                  waiting for review.
                </p>
              </div>
            )}
          </section>

          {/* =================================================
             FACILITATOR OVERVIEW
          ================================================= */}

          <section className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardCard
                title="Today's Attendance"
                description="Current student attendance activity."
                icon={<CalendarCheck className="h-5 w-5" />}
              >
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat
                    label="Present"
                    value={data?.presentToday ?? 0}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />

                  <MiniStat
                    label="Late"
                    value={data?.lateToday ?? 0}
                    icon={<Clock3 className="h-4 w-4" />}
                    accent="yellow"
                  />

                  <MiniStat
                    label="Absent"
                    value={data?.absentToday ?? 0}
                    icon={<AlertCircle className="h-4 w-4" />}
                  />
                </div>

                <Link
                  href="/attendance"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
                >
                  Manage attendance
                  <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
                </Link>
              </DashboardCard>
            </div>

            <DashboardCard
              title="Quick Actions"
              description="Common facilitator tasks."
              icon={<Terminal className="h-5 w-5" />}
            >
              <div className="space-y-3">
                <QuickAction
                  href="/student-requests"
                  icon={<FileCheck2 className="h-5 w-5" />}
                  text="Review Applications"
                />

                <QuickAction
                  href="/students"
                  icon={<Users className="h-5 w-5" />}
                  text="Manage Students"
                />

                <QuickAction
                  href="/attendance"
                  icon={<CalendarCheck className="h-5 w-5" />}
                  text="Record Attendance"
                />

                <QuickAction
                  href="/projects"
                  icon={<FolderKanban className="h-5 w-5" />}
                  text="Manage Projects"
                />
              </div>
            </DashboardCard>
          </section>

          {/* =================================================
             RECENT STUDENTS / PROGRAM
          ================================================= */}

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <DashboardCard
              title="Recent Students"
              description="Recently registered students."
              icon={<Users className="h-5 w-5" />}
            >
              {data?.recentStudents?.length > 0 ? (
                <div className="space-y-3">
                  {data.recentStudents.map(
                    (student, index) => (
                      <div
                        key={
                          student._id ||
                          student.id ||
                          index
                        }
                        className="dcc-card-motion flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1961D6]">
                          <UserRound className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-[#111111]">
                            {student.firstName}{" "}
                            {student.lastName}
                          </p>

                          <p className="truncate text-xs text-[#64748B]">
                            {student.email}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">
                  No students available yet.
                </p>
              )}

              <Link
                href="/students"
                className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
              >
                View all students
                <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
              </Link>
            </DashboardCard>

            <DashboardCard
              title="Program Overview"
              description="Current platform activity."
              icon={<ChartNoAxesCombined className="h-5 w-5" />}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Students"
                  value={data?.totalStudents ?? 0}
                  icon={<Users className="h-4 w-4" />}
                />

                <MiniStat
                  label="Projects"
                  value={data?.activeProjects ?? 0}
                  icon={<FolderKanban className="h-4 w-4" />}
                />

                <MiniStat
                  label="Resources"
                  value={data?.resources ?? 0}
                  icon={<BookOpen className="h-4 w-4" />}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-[#EAF1FF] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#1961D6]">
                    <Target className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-[#111111]">
                      Keep students moving forward
                    </p>

                    <p className="mt-1 text-xs text-[#64748B]">
                      Track progress, attendance, and project
                      activity from the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </section>

          {/* =================================================
             ANNOUNCEMENTS
          ================================================= */}

          <section className="mt-8">
            <DashboardCard
              title="Announcements"
              description="Important updates for the DCC learning community."
              icon={<BookOpen className="h-5 w-5" />}
            >
              <Announcements role={user?.role} />
            </DashboardCard>
          </section>
        </div>
      </div>
    );
  }

  /* =========================================================
     PENDING STUDENT
  ========================================================== */

  if (
    user?.role === "student" &&
    studentData?.pending
  ) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] p-4 sm:p-6">
        <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center">
          <div className="dcc-panel-enter w-full overflow-hidden rounded-3xl border border-[#D6E4FF] bg-white shadow-xl">

            <div className="relative overflow-hidden bg-[#1961D6] px-6 py-10 text-center sm:px-10">
              <div className="dcc-grid dcc-grid-motion pointer-events-none absolute inset-0 opacity-20" />

              <div className="relative">
                <div className="dcc-pulse-soft mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#1961D6]">
                  <Clock3 className="h-8 w-8" />
                </div>

                <h1 className="mt-5 text-2xl font-extrabold text-white sm:text-3xl">
                  Application Pending Approval
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/75">
                  Your application has been submitted
                  successfully and is currently being reviewed
                  by a facilitator.
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border border-[#D6E4FF] bg-[#EAF1FF] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1961D6]">
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-extrabold text-[#111111]">
                      Check your email
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      Please check the email address you used
                      during registration for an approval
                      notification from Dodoo Coding Club.
                    </p>

                    <p className="mt-3 text-sm leading-6 text-[#64748B]">
                      If you do not see the message in your
                      inbox, please check your Spam or Junk
                      folder.
                    </p>

                    {studentData.email && (
                      <div className="mt-4 rounded-xl bg-white p-3">
                        <p className="text-xs font-semibold text-[#64748B]">
                          Notification email
                        </p>

                        <p className="mt-1 break-all text-sm font-bold text-[#111111]">
                          {studentData.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E5E7EB] p-5 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF7D6] px-3 py-1.5 text-xs font-extrabold text-[#8A6500]">
                  <Clock3 className="h-3.5 w-3.5" />
                  Pending Review
                </span>

                <p className="mt-3 text-sm leading-6 text-[#64748B]">
                  You will receive an email once a facilitator
                  reviews your application.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================
     STUDENT DASHBOARD
  ========================================================== */

  const profile = studentData?.profile || {};

  const overallProgress =
    normalizeProgressValue(
      studentData?.overallProgress ?? 0
    );

  const projectProgress =
    normalizeProgressValue(
      studentData?.projectProgress ?? 0
    );

  const attendanceRate =
    normalizeProgressValue(
      studentData?.attendanceRate ?? 0
    );

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
           STUDENT HERO
        ================================================= */}

        <section className="dcc-hero relative mb-8 overflow-hidden rounded-[28px] bg-[#1961D6] px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="dcc-grid dcc-grid-motion pointer-events-none absolute inset-0 opacity-20" />

          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 dcc-gentle-float" />

          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#F4B400]/10 dcc-float" />

          <div className="dcc-hero-shine pointer-events-none absolute inset-0" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_310px] lg:items-center">

            <div className="dcc-hero-enter">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">
                  <GraduationCap className="h-3.5 w-3.5" />
                  DCC Student Portal
                </span>

                <span className="text-xs text-white/60">
                  Learning Workspace
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center">

                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm sm:h-28 sm:w-28">
                    {profile?.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="Student profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-12 w-12 text-white/60" />
                    )}
                  </div>

                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#1961D6] bg-[#F4B400]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#111111]" />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#F4B400]">
                    Student Developer Dashboard
                  </p>

                  <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Welcome back,{" "}
                    {profile?.firstName ||
                      user?.name?.split(" ")[0] ||
                      "Student"}.
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                    Stay on top of your learning journey,
                    track your progress, manage projects, and
                    build practical development skills.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {profile?.program && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
                        <GraduationCap className="h-4 w-4" />
                        {profile.program}
                      </span>
                    )}

                    {user?.studentId && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
                        <UserRound className="h-4 w-4" />
                        {user.studentId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/progress"
                  className="dcc-button-motion inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-[#1961D6] shadow-lg transition hover:bg-[#EAF1FF]"
                >
                  <ChartNoAxesCombined className="h-4 w-4" />
                  View My Progress
                  <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
                </Link>

                <Link
                  href="/projects"
                  className="dcc-button-motion inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  <FolderKanban className="h-4 w-4" />
                  My Projects
                </Link>
              </div>
            </div>

            {/* LEARNING SNAPSHOT */}

            <div className="dcc-panel-enter rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                    Learning Snapshot
                  </p>

                  <p className="mt-1 text-3xl font-extrabold">
                    {overallProgress}%
                  </p>
                </div>

                <div className="dcc-pulse-soft flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4B400] text-[#111111]">
                  <Target className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="dcc-progress-grow h-full rounded-full bg-[#F4B400]"
                  style={{
                    width: `${overallProgress}%`,
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-white/60">
                    Attendance
                  </p>

                  <p className="mt-1 text-xl font-extrabold">
                    {attendanceRate}%
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-xs text-white/60">
                    Projects
                  </p>

                  <p className="mt-1 text-xl font-extrabold">
                    {studentData?.projects?.length ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
           ANNOUNCEMENTS
        ================================================= */}

        <section className="dcc-fade-up">
          <DashboardCard
            title="Announcements"
            description="Stay updated with important DCC messages."
            icon={<BookOpen className="h-5 w-5" />}
          >
            <Announcements role={user?.role} />
          </DashboardCard>
        </section>

        {/* =================================================
           STUDENT STATISTICS
        ================================================= */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Overall Progress"
            value={`${overallProgress}%`}
            icon={<ChartNoAxesCombined size={22} />}
            href="/progress"
          />

          <StatCard
            title="Attendance"
            value={`${attendanceRate}%`}
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
            title="Resources"
            value="View"
            icon={<BookOpen size={22} />}
            href="/resources"
          />
        </section>

        {/* =================================================
           PROGRESS
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <DashboardCard
            title="Overall Progress"
            description="Your combined learning progress."
            icon={<ChartNoAxesCombined className="h-5 w-5" />}
          >
            <ProgressBar
              value={overallProgress}
              label="Overall progress"
            />

            <Link
              href="/progress"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View detailed progress
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>

          <DashboardCard
            title="Attendance"
            description="Your attendance performance."
            icon={<CalendarCheck className="h-5 w-5" />}
          >
            <ProgressBar
              value={attendanceRate}
              label="Attendance rate"
            />

            <Link
              href="/student/attendance"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View attendance
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>

          <DashboardCard
            title="Project Progress"
            description="Your average project completion."
            icon={<FolderKanban className="h-5 w-5" />}
          >
            <ProgressBar
              value={projectProgress}
              label="Project progress"
            />

            <Link
              href="/projects"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View projects
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>
        </section>

        {/* =================================================
           PROFILE / ATTENDANCE
        ================================================= */}

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <DashboardCard
            title="My Profile"
            description="Your student information."
            icon={<UserRound className="h-5 w-5" />}
          >
            <div className="dcc-card-motion rounded-2xl bg-[#F8FAFC] p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#EAF1FF] text-[#1961D6]">
                  {profile?.profileImage ? (
                    <img
                      src={profile.profileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#111111]">
                    {profile?.firstName || ""}{" "}
                    {profile?.lastName || ""}
                  </h3>

                  <p className="truncate text-sm text-[#64748B]">
                    {profile?.email ||
                      user?.email ||
                      ""}
                  </p>
                </div>
              </div>

              {profile?.program && (
                <div className="mt-4 rounded-xl bg-white p-3">
                  <p className="text-xs font-semibold text-[#64748B]">
                    Program
                  </p>

                  <p className="mt-1 text-sm font-bold text-[#111111]">
                    {profile.program}
                  </p>
                </div>
              )}
            </div>

            <Link
              href="/student/profile"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View my profile
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>

          <DashboardCard
            title="Attendance Summary"
            description="Your attendance records."
            icon={<CalendarCheck className="h-5 w-5" />}
          >
            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Present"
                value={studentData?.present ?? 0}
                icon={<CheckCircle2 className="h-4 w-4" />}
              />

              <MiniStat
                label="Late"
                value={studentData?.late ?? 0}
                icon={<Clock3 className="h-4 w-4" />}
                accent="yellow"
              />

              <MiniStat
                label="Absent"
                value={studentData?.absent ?? 0}
                icon={<AlertCircle className="h-4 w-4" />}
              />
            </div>

            <Link
              href="/student/attendance"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View my attendance
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>
        </section>

        {/* =================================================
           PROJECTS
        ================================================= */}

        <section className="mt-6">
          <DashboardCard
            title="My Projects"
            description="Projects you are currently working on."
            icon={<FolderKanban className="h-5 w-5" />}
          >
            {studentData?.projects?.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {studentData.projects
                  .slice(0, 6)
                  .map((project, index) => {
                    const progress =
                      normalizeProgressValue(
                        project.progress || 0
                      );

                    return (
                      <div
                        key={
                          project._id ||
                          project.id ||
                          index
                        }
                        className="dcc-card-motion rounded-2xl border border-[#E5E7EB] bg-white p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="dcc-icon-motion flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1961D6]">
                              <Code2 className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-extrabold text-[#111111]">
                                {project.title ||
                                  project.name ||
                                  "Student Project"}
                              </h3>

                              {project.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B]">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-[#EAF1FF] px-2.5 py-1 text-xs font-extrabold text-[#1961D6]">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 flex justify-between text-xs font-semibold">
                            <span className="text-[#64748B]">
                              Progress
                            </span>

                            <span className="text-[#1961D6]">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                            <div
                              className="dcc-progress-grow h-full rounded-full bg-[#1961D6]"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF1FF] text-[#1961D6] dcc-float">
                  <FolderKanban className="h-6 w-6" />
                </div>

                <h3 className="mt-4 font-extrabold text-[#111111]">
                  No projects yet
                </h3>

                <p className="mt-2 text-sm text-[#64748B]">
                  Your projects will appear here when they
                  are added to your student profile.
                </p>
              </div>
            )}

            <Link
              href="/projects"
              className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#1961D6]"
            >
              View all projects
              <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
            </Link>
          </DashboardCard>
        </section>

        {/* =================================================
           QUICK ACTIONS
        ================================================= */}

        <section className="mt-6">
          <DashboardCard
            title="Quick Actions"
            description="Access the areas you use most."
            icon={<Terminal className="h-5 w-5" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/projects"
                icon={<FolderKanban className="h-5 w-5" />}
                text="My Projects"
              />

              <QuickAction
                href="/student/attendance"
                icon={<CalendarCheck className="h-5 w-5" />}
                text="My Attendance"
              />

              <QuickAction
                href="/progress"
                icon={<ChartNoAxesCombined className="h-5 w-5" />}
                text="My Progress"
              />

              <QuickAction
                href="/resources"
                icon={<BookOpen className="h-5 w-5" />}
                text="Learning Resources"
              />
            </div>
          </DashboardCard>
        </section>

        {/* =================================================
           PROGRESS BREAKDOWN
        ================================================= */}

        <section className="mt-6">
          <DashboardCard
            title="Progress Breakdown"
            description="Key areas contributing to your learning journey."
            icon={<Target className="h-5 w-5" />}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <ProgressItem
                label="Attendance"
                value={attendanceRate}
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
          </DashboardCard>
        </section>

        {/* =================================================
           END PANEL
        ================================================= */}

        <section className="mt-8 overflow-hidden rounded-3xl bg-[#1961D6] shadow-xl">
          <div className="dcc-grid dcc-grid-motion relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 dcc-float" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Keep Learning
                </span>

                <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
                  Keep building your skills.
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                  Stay consistent with your attendance,
                  complete your projects, and continue
                  developing practical skills.
                </p>
              </div>

              <Link
                href="/projects"
                className="dcc-accent-button dcc-button-motion inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#F4B400] px-5 py-3 text-sm font-extrabold text-[#111111] transition hover:bg-[#D99D00]"
              >
                <FolderKanban className="h-4 w-4" />
                Continue Learning
                <ArrowRight className="h-4 w-4 dcc-arrow-motion" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   NORMALIZE PROGRESS
========================================================= */

function normalizeProgressValue(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

/* =========================================================
   NORMALIZE PROGRESS ITEMS
========================================================= */

function normalizeProgressItems(details) {
  if (!details) {
    return [];
  }

  if (Array.isArray(details)) {
    return details.map((item, index) => ({
      id: item.id || item._id || index,
      label:
        item.label ||
        item.title ||
        item.name ||
        `Activity ${index + 1}`,
      progress: normalizeProgressValue(
        item.progress ??
          item.percentage ??
          item.value ??
          0
      ),
    }));
  }

  if (typeof details === "object") {
    return Object.entries(details).map(
      ([key, value]) => ({
        id: key,
        label: formatLabel(key),
        progress:
          typeof value === "object"
            ? normalizeProgressValue(
                value.progress ??
                  value.percentage ??
                  value.value ??
                  0
              )
            : normalizeProgressValue(value),
      })
    );
  }

  return [];
}

/* =========================================================
   FORMAT LABEL
========================================================= */

function formatLabel(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* =========================================================
   STAT CARD
========================================================= */

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
      className={`dcc-card-motion group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm ${
        highlight
          ? "border-[#F0DF9A] ring-1 ring-[#FFF7D6]"
          : "border-[#E5E7EB]"
      }`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#1961D6]/5 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#64748B]">
            {title}
          </p>

          <p className="mt-2 text-3xl font-extrabold tracking-tight text-[#111111]">
            {value}
          </p>
        </div>

        <div
          className={`dcc-icon-motion flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? "bg-[#FFF7D6] text-[#D99D00]"
              : "bg-[#EAF1FF] text-[#1961D6]"
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-1.5 text-xs font-extrabold text-[#1961D6]">
        Open
        <ArrowRight className="h-3.5 w-3.5 dcc-arrow-motion" />
      </div>
    </Link>
  );
}

/* =========================================================
   DASHBOARD CARD
========================================================= */

function DashboardCard({
  title,
  description,
  icon,
  children,
}) {
  return (
    <section className="dcc-card-motion rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        {icon && (
          <div className="dcc-icon-motion flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1961D6]">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-lg font-extrabold tracking-tight text-[#111111]">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-sm leading-5 text-[#64748B]">
              {description}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
  label,
  value,
  icon,
  accent = "blue",
}) {
  const yellow = accent === "yellow";

  return (
    <div className="dcc-card-motion rounded-xl border border-[#E5E7EB] bg-white p-3">
      <div
        className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${
          yellow
            ? "bg-[#FFF7D6] text-[#D99D00]"
            : "bg-[#EAF1FF] text-[#1961D6]"
        }`}
      >
        {icon}
      </div>

      <p className="text-lg font-extrabold text-[#111111]">
        {value}
      </p>

      <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
        {label}
      </p>
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({
  value,
  label,
}) {
  const normalized =
    normalizeProgressValue(value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#64748B]">
          {label}
        </span>

        <span className="text-sm font-extrabold text-[#1961D6]">
          {normalized}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="dcc-progress-grow h-full rounded-full bg-[#1961D6]"
          style={{
            width: `${normalized}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS ITEM
========================================================= */

function ProgressItem({
  label,
  value,
}) {
  const normalized =
    normalizeProgressValue(value);

  return (
    <div className="dcc-card-motion rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#111111]">
          {label}
        </span>

        <span className="text-sm font-extrabold text-[#1961D6]">
          {normalized}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div
          className="dcc-progress-grow h-full rounded-full bg-[#1961D6]"
          style={{
            width: `${normalized}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  href,
  icon,
  text,
}) {
  return (
    <Link
      href={href}
      className="dcc-interactive group flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm transition hover:border-[#BFD5FF] hover:bg-[#EAF1FF]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="dcc-icon-motion flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1961D6]">
          {icon}
        </div>

        <span className="truncate text-sm font-extrabold text-[#111111]">
          {text}
        </span>
      </div>

      <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#1961D6]" />
    </Link>
  );
}