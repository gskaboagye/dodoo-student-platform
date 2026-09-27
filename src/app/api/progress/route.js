import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =====================================================
// DATABASE
// =====================================================

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

// =====================================================
// SESSION
// =====================================================

async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =====================================================
// GET CURRENT USER
// =====================================================

async function getCurrentUser(db, session) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  // Try ObjectId
  if (ObjectId.isValid(String(session.userId))) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(String(session.userId)),
    });
  }

  // Fallback for older string IDs
  if (!user) {
    user = await db.collection("users").findOne({
      _id: session.userId,
    });
  }

  return user;
}

// =====================================================
// RESOLVE STUDENT
// =====================================================

async function resolveStudent(db, session) {
  if (!session || session.role !== "student") {
    return null;
  }

  const user = await getCurrentUser(db, session);

  if (!user) {
    return null;
  }

  // Prefer database user.studentId
  let studentId =
    user.studentId ||
    session.studentId ||
    null;

  // ---------------------------------------------------
  // Find student by ID
  // ---------------------------------------------------

  if (studentId) {
    studentId = String(studentId);

    const possibleQueries = [];

    if (ObjectId.isValid(studentId)) {
      possibleQueries.push({
        _id: new ObjectId(studentId),
      });
    }

    possibleQueries.push({
      _id: studentId,
    });

    for (const query of possibleQueries) {
      const student = await db
        .collection("students")
        .findOne(query);

      if (student) {
        return student;
      }
    }
  }

  // ---------------------------------------------------
  // Fallback: email
  // ---------------------------------------------------

  if (user.email) {
    const student = await db
      .collection("students")
      .findOne({
        email: user.email
          .trim()
          .toLowerCase(),
      });

    if (student) {
      return student;
    }
  }

  return null;
}

// =====================================================
// STUDENT ID QUERY
// =====================================================

function buildStudentIdQuery(studentId) {
  const values = [];

  if (studentId instanceof ObjectId) {
    values.push(studentId);
    values.push(studentId.toString());
  } else {
    const stringId = String(studentId);

    if (ObjectId.isValid(stringId)) {
      values.push(new ObjectId(stringId));
    }

    values.push(stringId);
  }

  return {
    studentId: {
      $in: values,
    },
  };
}

// =====================================================
// NORMALIZE NUMBER
// =====================================================

function normalizePercentage(value) {
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
// TIMELINE PROGRESS
// =====================================================

function calculateTimelineProgress(student) {
  if (!student?.enrollmentDate) {
    return 0;
  }

  const start = new Date(
    student.enrollmentDate
  );

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let end;

  if (student.expectedCompletionDate) {
    end = new Date(
      student.expectedCompletionDate
    );
  } else {
    end = new Date(start);

    end.setMonth(
      end.getMonth() + 24
    );
  }

  if (Number.isNaN(end.getTime())) {
    return 0;
  }

  const now = new Date();

  // Program has not started
  if (now <= start) {
    return 0;
  }

  // Program has finished
  if (now >= end) {
    return 100;
  }

  const totalDuration =
    end.getTime() -
    start.getTime();

  const elapsed =
    now.getTime() -
    start.getTime();

  if (totalDuration <= 0) {
    return 0;
  }

  return normalizePercentage(
    (elapsed / totalDuration) * 100
  );
}

// =====================================================
// ATTENDANCE PROGRESS
// =====================================================

function calculateAttendanceProgress(
  attendance
) {
  if (
    !Array.isArray(attendance) ||
    attendance.length === 0
  ) {
    return 0;
  }

  let totalScore = 0;

  for (const record of attendance) {
    const status = String(
      record?.status || ""
    )
      .trim()
      .toLowerCase();

    if (status === "present") {
      totalScore += 100;
    } else if (status === "late") {
      totalScore += 50;
    } else if (status === "absent") {
      totalScore += 0;
    }
  }

  return normalizePercentage(
    totalScore /
      attendance.length
  );
}

// =====================================================
// PROJECT PROGRESS
// =====================================================

function calculateProjectProgress(
  projects
) {
  if (
    !Array.isArray(projects) ||
    projects.length === 0
  ) {
    return 0;
  }

  let total = 0;

  for (const project of projects) {
    total += normalizePercentage(
      project?.progress ?? 0
    );
  }

  return normalizePercentage(
    total / projects.length
  );
}

// =====================================================
// OVERALL PROGRESS
// =====================================================

function calculateOverallProgress({
  timelineProgress,
  attendanceProgress,
  projectProgress,
}) {
  const timeline =
    normalizePercentage(
      timelineProgress
    );

  const attendance =
    normalizePercentage(
      attendanceProgress
    );

  const projects =
    normalizePercentage(
      projectProgress
    );

  const result =
    timeline * 0.2 +
    attendance * 0.3 +
    projects * 0.5;

  return normalizePercentage(result);
}

// =====================================================
// FORMAT STUDENT SUMMARY
// =====================================================
//
// Used for the facilitator student list.
//
// IMPORTANT:
// We deliberately DO NOT include the full
// attendance/project arrays here.
// Those are loaded only when the facilitator
// selects a specific student.
//

function formatStudentSummary(
  student,
  attendance,
  projects
) {
  const timelineProgress =
    calculateTimelineProgress(
      student
    );

  const attendanceProgress =
    calculateAttendanceProgress(
      attendance
    );

  const projectProgress =
    calculateProjectProgress(
      projects
    );

  const overallProgress =
    calculateOverallProgress({
      timelineProgress,
      attendanceProgress,
      projectProgress,
    });

  const completedProjects =
    projects.filter((project) => {
      const status = String(
        project?.status || ""
      )
        .trim()
        .toLowerCase();

      const progress =
        normalizePercentage(
          project?.progress ?? 0
        );

      return (
        progress >= 100 ||
        status === "completed"
      );
    }).length;

  return {
    _id: student._id
      ? student._id.toString()
      : "",

    firstName:
      student.firstName || "",

    lastName:
      student.lastName || "",

    name:
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim(),

    email:
      student.email || "",

    phone:
      student.phone || "",

    program:
      student.program || "",

    status:
      student.status || "",

    profileImage:
      student.profileImage || "",

    enrollmentDate:
      student.enrollmentDate || null,

    expectedCompletionDate:
      student.expectedCompletionDate ||
      null,

    // Progress
    timelineProgress,

    attendanceProgress,

    projectProgress,

    overallProgress,

    progress: overallProgress,

    // Summary counts only
    projectCount:
      projects.length,

    completedProjects,

    attendanceCount:
      attendance.length,

    // Keep this lightweight
    progressDetails: {
      timelineProgress,
      attendanceProgress,
      projectProgress,
      overallProgress,

      timelineWeight: 20,
      attendanceWeight: 30,
      projectWeight: 50,

      timelineContribution:
        Math.round(
          timelineProgress * 0.2
        ),

      attendanceContribution:
        Math.round(
          attendanceProgress * 0.3
        ),

      projectContribution:
        Math.round(
          projectProgress * 0.5
        ),
    },
  };
}

// =====================================================
// FORMAT STUDENT DETAILS
// =====================================================
//
// Used when one specific student is selected.
//
// This includes the complete projects,
// attendance and progress information.
//

function formatStudentDetails(
  student,
  attendance,
  projects
) {
  const summary =
    formatStudentSummary(
      student,
      attendance,
      projects
    );

  const timelineProgress =
    summary.timelineProgress;

  const attendanceProgress =
    summary.attendanceProgress;

  const projectProgress =
    summary.projectProgress;

  const overallProgress =
    summary.overallProgress;

  // Attendance counts
  const presentCount =
    attendance.filter(
      (record) =>
        String(
          record?.status || ""
        )
          .trim()
          .toLowerCase() ===
        "present"
    ).length;

  const lateCount =
    attendance.filter(
      (record) =>
        String(
          record?.status || ""
        )
          .trim()
          .toLowerCase() ===
        "late"
    ).length;

  const absentCount =
    attendance.filter(
      (record) =>
        String(
          record?.status || ""
        )
          .trim()
          .toLowerCase() ===
        "absent"
    ).length;

  // Timeline information
  const enrollmentDate =
    student.enrollmentDate ||
    null;

  const expectedCompletionDate =
    student.expectedCompletionDate ||
    null;

  const monthsCompleted =
    calculateMonthsCompleted(
      enrollmentDate
    );

  const monthsRemaining =
    calculateMonthsRemaining(
      enrollmentDate,
      expectedCompletionDate
    );

  const programYear =
    calculateProgramYear(
      enrollmentDate
    );

  return {
    ...summary,

    // Detailed progress
    progressDetails: {
      timelineProgress,
      attendanceProgress,
      projectProgress,
      overallProgress,

      timelineWeight: 20,
      attendanceWeight: 30,
      projectWeight: 50,

      timelineContribution:
        Math.round(
          timelineProgress * 0.2
        ),

      attendanceContribution:
        Math.round(
          attendanceProgress * 0.3
        ),

      projectContribution:
        Math.round(
          projectProgress * 0.5
        ),

      monthsCompleted,
      monthsRemaining,
      programYear,
    },

    // Detailed attendance
    attendanceCount:
      attendance.length,

    presentCount,

    lateCount,

    absentCount,

    attendance,

    // Detailed projects
    projectCount:
      projects.length,

    completedProjects:
      summary.completedProjects,

    projects,
  };
}

// =====================================================
// LOAD STUDENT RECORDS
// =====================================================

async function loadStudentData(
  db,
  student
) {
  const studentId =
    student._id;

  // -----------------------------------------------
  // Attendance
  // -----------------------------------------------

  const attendance =
    await db
      .collection("attendance")
      .find(
        buildStudentIdQuery(
          studentId
        )
      )
      .sort({
        date: -1,
      })
      .toArray();

  // -----------------------------------------------
  // Projects
  // -----------------------------------------------

  const projects =
    await db
      .collection("projects")
      .find(
        buildStudentIdQuery(
          studentId
        )
      )
      .sort({
        createdAt: -1,
      })
      .toArray();

  return {
    attendance,
    projects,
  };
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

  const end =
    expectedCompletionDate
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

// =====================================================
// GET PROGRESS
// =====================================================

export async function GET() {
  try {
    // -------------------------------------------------
    // SESSION
    // -------------------------------------------------

    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Authentication required. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------
    // DATABASE
    // -------------------------------------------------

    const db =
      await getDatabase();

    // =================================================
    // STUDENT
    // =================================================

    if (
      session.role ===
      "student"
    ) {
      const student =
        await resolveStudent(
          db,
          session
        );

      if (!student) {
        console.error(
          "PROGRESS STUDENT RESOLUTION FAILED:",
          {
            userId:
              session.userId,

            sessionStudentId:
              session.studentId,

            email:
              session.email,
          }
        );

        return NextResponse.json(
          {
            message:
              "Invalid student account.",
          },
          {
            status: 404,
          }
        );
      }

      const {
        attendance,
        projects,
      } =
        await loadStudentData(
          db,
          student
        );

      const formatted =
        formatStudentDetails(
          student,
          attendance,
          projects
        );

      return NextResponse.json({
        student:
          formatted,

        students: [
          formatted,
        ],

        totalStudents: 1,

        progress:
          formatted.overallProgress,

        progressDetails:
          formatted.progressDetails,
      });
    }

    // =================================================
    // FACILITATOR
    // =================================================

    if (
      session.role ===
      "facilitator"
    ) {
      const students =
        await db
          .collection("students")
          .find({})
          .sort({
            createdAt: -1,
          })
          .toArray();

      const formattedStudents =
        [];

      for (
        const student of students
      ) {
        const {
          attendance,
          projects,
        } =
          await loadStudentData(
            db,
            student
          );

        /*
          IMPORTANT:

          Only the summary is returned here.

          Projects and attendance details are NOT
          sent for every student.

          The frontend can request the selected
          student's details separately.
        */

        formattedStudents.push(
          formatStudentSummary(
            student,
            attendance,
            projects
          )
        );
      }

      // =================================================
      // FACILITATOR SUMMARY
      // =================================================

      const totalStudents =
        formattedStudents.length;

      const averageProgress =
        totalStudents > 0
          ? normalizePercentage(
              formattedStudents.reduce(
                (
                  sum,
                  student
                ) =>
                  sum +
                  Number(
                    student.progress ||
                      0
                  ),
                0
              ) /
                totalStudents
            )
          : 0;

      const completed =
        formattedStudents.filter(
          (student) =>
            Number(
              student.progress ||
                0
            ) >= 100
        ).length;

      const needsAttention =
        formattedStudents.filter(
          (student) =>
            Number(
              student.progress ||
                0
            ) < 50
        ).length;

      return NextResponse.json({
        students:
          formattedStudents,

        totalStudents,

        averageProgress,

        completed,

        needsAttention,
      });
    }

    // =================================================
    // UNKNOWN ROLE
    // =================================================

    return NextResponse.json(
      {
        message:
          "Your account role is not recognized.",
      },
      {
        status: 403,
      }
    );
  } catch (error) {
    console.error(
      "PROGRESS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to load student progress.",

        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}