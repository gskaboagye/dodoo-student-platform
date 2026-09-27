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
//
// users._id
//     |
//     | users.studentId
//     v
// students._id
//
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
//
// Attendance and projects may contain studentId as:
// - ObjectId
// - string ObjectId
//
// Support both.
//
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
//
// Program Timeline = 20%
//
// Uses:
// enrollmentDate
// expectedCompletionDate
//
// If expectedCompletionDate does not exist,
// the program is assumed to be 24 months.
//
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
//
// Present = 100
// Late    = 50
// Absent  = 0
//
// Attendance = 30%
//
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
//
// Project progress is the average progress
// of all projects belonging to the student.
//
// Projects = 50%
//
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
//
// Timeline = 20%
// Attendance = 30%
// Projects = 50%
//
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
// FORMAT STUDENT
// =====================================================

function formatStudent(
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

  // ---------------------------------------------------
  // Attendance counts
  // ---------------------------------------------------

  const presentCount =
    attendance.filter(
      (record) =>
        String(record?.status || "")
          .trim()
          .toLowerCase() ===
        "present"
    ).length;

  const lateCount =
    attendance.filter(
      (record) =>
        String(record?.status || "")
          .trim()
          .toLowerCase() ===
        "late"
    ).length;

  const absentCount =
    attendance.filter(
      (record) =>
        String(record?.status || "")
          .trim()
          .toLowerCase() ===
        "absent"
    ).length;

  // ---------------------------------------------------
  // Project counts
  // ---------------------------------------------------

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

  // ---------------------------------------------------
  // IMPORTANT
  // ---------------------------------------------------
  //
  // The progress page expects:
  //
  // student.progress
  //
  // and:
  //
  // student.progressDetails
  //
  // So we provide BOTH the new names and
  // the detailed values.
  //
  // ---------------------------------------------------

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

    // -------------------------------------------------
    // Component progress
    // -------------------------------------------------

    timelineProgress,

    attendanceProgress,

    projectProgress,

    // -------------------------------------------------
    // FINAL OVERALL PROGRESS
    // -------------------------------------------------

    overallProgress,

    // IMPORTANT:
    // progress page uses student.progress
    progress: overallProgress,

    // -------------------------------------------------
    // Progress details
    // -------------------------------------------------

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

    // -------------------------------------------------
    // Attendance details
    // -------------------------------------------------

    attendanceCount:
      attendance.length,

    presentCount,

    lateCount,

    absentCount,

    attendance,

    // -------------------------------------------------
    // Project details
    // -------------------------------------------------

    projectCount:
      projects.length,

    completedProjects,

    projects,
  };
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

      const studentId =
        student._id;

      // ------------------------------------------------
      // Attendance
      // ------------------------------------------------

      const attendance =
        await db
          .collection(
            "attendance"
          )
          .find(
            buildStudentIdQuery(
              studentId
            )
          )
          .sort({
            date: -1,
          })
          .toArray();

      // ------------------------------------------------
      // Projects
      // ------------------------------------------------

      const projects =
        await db
          .collection(
            "projects"
          )
          .find(
            buildStudentIdQuery(
              studentId
            )
          )
          .sort({
            createdAt: -1,
          })
          .toArray();

      // ------------------------------------------------
      // Format
      // ------------------------------------------------

      const formatted =
        formatStudent(
          student,
          attendance,
          projects
        );

      console.log(
        "STUDENT PROGRESS:",
        {
          student:
            formatted.name,

          timeline:
            formatted.timelineProgress,

          attendance:
            formatted.attendanceProgress,

          projects:
            formatted.projectProgress,

          overall:
            formatted.overallProgress,
        }
      );

      return NextResponse.json({
        students: [
          formatted,
        ],

        student:
          formatted,

        totalStudents: 1,

        // Useful for the student progress page
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
          .collection(
            "students"
          )
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
        const studentId =
          student._id;

        // ----------------------------------------------
        // Attendance
        // ----------------------------------------------

        const attendance =
          await db
            .collection(
              "attendance"
            )
            .find(
              buildStudentIdQuery(
                studentId
              )
            )
            .sort({
              date: -1,
            })
            .toArray();

        // ----------------------------------------------
        // Projects
        // ----------------------------------------------

        const projects =
          await db
            .collection(
              "projects"
            )
            .find(
              buildStudentIdQuery(
                studentId
              )
            )
            .sort({
              createdAt: -1,
            })
            .toArray();

        formattedStudents.push(
          formatStudent(
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
                (sum, student) =>
                  sum +
                  Number(
                    student.progress || 0
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
              student.progress || 0
            ) >= 100
        ).length;

      const needsAttention =
        formattedStudents.filter(
          (student) =>
            Number(
              student.progress || 0
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