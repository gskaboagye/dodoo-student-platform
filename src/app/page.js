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
  Plus,
  GraduationCap,
  ClipboardCheck,
  Target,
} from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

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

      if (currentUser.role === "facilitator") {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load facilitator dashboard.");
        }

        const dashboardData = await response.json();
        setData(dashboardData);
        return;
      }

      if (currentUser.role === "student") {
        const [profileResponse, attendanceResponse, projectsResponse] =
          await Promise.all([
            fetch("/api/student/profile", {
              cache: "no-store",
            }),
            fetch("/api/attendance", {
              cache: "no-store",
            }),
            fetch("/api/projects", {
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

        const attendance = Array.isArray(attendanceData)
          ? attendanceData
          : Array.isArray(attendanceData?.attendance)
            ? attendanceData.attendance
            : [];

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
            String(project.studentId) === String(currentUser.studentId)
          );
        });

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
                ((present + late * 0.5) / totalAttendance) * 100
              )
            : 0;

        const projectProgress =
          myProjects.length > 0
            ? Math.round(
                myProjects.reduce(
                  (sum, project) =>
                    sum + Number(project.progress || 0),
                  0
                ) / myProjects.length
              )
            : 0;

        setStudentData({
          profile: profileData?.student || profileData || null,
          attendance,
          projects: myProjects,
          present,
          late,
          absent,
          attendanceRate,
          projectProgress,
        });

        return;
      }

      setError("Your account role is not recognized.");
    } catch (err) {
      console.error("Dashboard error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

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

  /*
   * =========================================================
   * FACILITATOR DASHBOARD
   * =========================================================
   */

  if (user?.role === "facilitator") {
    return (
      <div className="p-4 sm:p-6">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">
            Facilitator Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Welcome back, {user.name || "Facilitator"}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage students, attendance, progress, resources and
            projects from one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Students"
            value={data?.totalStudents ?? 0}
            icon={<Users size={22} />}
            href="/students"
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

          <StatCard
            title="Resources"
            value={data?.resources ?? 0}
            icon={<BookOpen size={22} />}
            href="/resources"
          />
        </div>

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
                href="/students"
                icon={<Plus size={18} />}
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
                {data.recentStudents.map((student) => (
                  <div
                    key={String(student._id)}
                    className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {student.firstName} {student.lastName}
                      </p>

                      <p className="truncate text-xs text-slate-500">
                        {student.email}
                      </p>
                    </div>
                  </div>
                ))}
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
      </div>
    );
  }

  /*
   * =========================================================
   * STUDENT DASHBOARD
   * =========================================================
   */

  const profile = studentData?.profile;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">
          Student Dashboard
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Welcome back,{" "}
          {profile?.firstName || user?.name || "Student"}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Track your attendance, progress, projects and learning
          resources.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="My Attendance"
          value={`${studentData?.attendanceRate ?? 0}%`}
          icon={<CalendarCheck size={22} />}
          href="/attendance"
        />

        <StatCard
          title="Project Progress"
          value={`${studentData?.projectProgress ?? 0}%`}
          icon={<ChartNoAxesCombined size={22} />}
          href="/progress"
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DashboardCard
          title="My Profile"
          description="Keep your personal information updated"
          icon={<UserRound size={20} />}
        >
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              {profile?.firstName || ""} {profile?.lastName || ""}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {profile?.email || user?.email || ""}
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
            href="/attendance"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my attendance
            <ArrowRight size={16} />
          </Link>
        </DashboardCard>

        <DashboardCard
          title="My Progress"
          description="Your current project progress"
          icon={<ChartNoAxesCombined size={20} />}
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Project progress
              </span>

              <span className="text-sm font-semibold text-slate-800">
                {studentData?.projectProgress ?? 0}%
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${studentData?.projectProgress ?? 0}%`,
                }}
              />
            </div>
          </div>

          <Link
            href="/progress"
            className="mt-5 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View my progress
            <ArrowRight size={16} />
          </Link>
        </DashboardCard>

        <DashboardCard
          title="My Projects"
          description="Projects you are working on"
          icon={<FolderKanban size={20} />}
        >
          {studentData?.projects?.length > 0 ? (
            <div className="space-y-3">
              {studentData.projects.slice(0, 3).map((project) => (
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
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${project.progress || 0}%`,
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
      </div>

      <div className="mt-6">
        <DashboardCard
          title="Quick Access"
          description="Access your main student features"
          icon={<GraduationCap size={20} />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/student/profile"
              icon={<UserRound size={18} />}
              text="My Profile"
            />

            <QuickAction
              href="/attendance"
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

function StatCard({ title, value, icon, href }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
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

function DashboardCard({ title, description, icon, children }) {
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

function MiniStat({ label, value, icon }) {
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

function QuickAction({ href, icon, text }) {
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

      <ArrowRight size={16} className="text-slate-400" />
    </Link>
  );
}