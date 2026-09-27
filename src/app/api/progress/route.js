import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =====================================================
// DATABASE
// =====================================================

async function getDatabase() {
  const client =
    await clientPromise;

  return client.db(
    process.env.DB_NAME ||
      "DCCPlatform"
  );
}

// =====================================================
// SESSION
// =====================================================

async function getSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      "dcc_session"
    )?.value;

  if (!token) {
    return null;
  }

  return await verifySession(
    token
  );
}

// =====================================================
// GET CURRENT USER
// =====================================================

async function getCurrentUser(
  db,
  session
) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  // Try MongoDB ObjectId.
  if (
    ObjectId.isValid(
      session.userId
    )
  ) {
    user =
      await db
        .collection("users")
        .findOne({
          _id: new ObjectId(
            session.userId
          ),
        });
  }

  // Fallback for older string IDs.
  if (!user) {
    user =
      await db
        .collection("users")
        .findOne({
          _id: session.userId,
        });
  }

  return user;
}

// =====================================================
// RESOLVE STUDENT
// =====================================================
// This is the important part.
//
// Student login account:
// users._id
//
// Student profile:
// students._id
//
// Link:
// users.studentId -> students._id
// =====================================================

async function resolveStudent(
  db,
  session
) {
  if (
    !session ||
    session.role !==
      "student"
  ) {
    return null;
  }

  // ---------------------------------------------
  // Get logged-in user
  // ---------------------------------------------

  const user =
    await getCurrentUser(
      db,
      session
    );

  if (!user) {
    return null;
  }

  // ---------------------------------------------
  // Get studentId
  //
  // Prefer the database user record.
  // ---------------------------------------------

  let studentId =
    user.studentId ||
    session.studentId ||
    null;

  if (!studentId) {
    return null;
  }

  studentId =
    studentId.toString();

  // ---------------------------------------------
  // Make possible ID formats.
  // ---------------------------------------------

  const studentQueries = [];

  if (
    ObjectId.isValid(
      studentId
    )
  ) {
    studentQueries.push({
      _id: new ObjectId(
        studentId
      ),
    });
  }

  studentQueries.push({
    _id: studentId,
  });

  // ---------------------------------------------
  // Find student profile
  // ---------------------------------------------

  let student = null;

  for (
    const query of studentQueries
  ) {
    student =
      await db
        .collection("students")
        .findOne(query);

    if (student) {
      break;
    }
  }

  // ---------------------------------------------
  // Fallback: match by email.
  //
  // This helps older student accounts where
  // users.studentId was not saved correctly.
  // ---------------------------------------------

  if (!student && user.email) {
    student =
      await db
        .collection("students")
        .findOne({
          email:
            user.email
              .trim()
              .toLowerCase(),
        });
  }

  return student;
}

// =====================================================
// CALCULATE TIMELINE PROGRESS
// =====================================================

function calculateTimelineProgress(
  student
) {
  if (
    !student?.enrollmentDate
  ) {
    return 0;
  }

  const start =
    new Date(
      student.enrollmentDate
    );

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return 0;
  }

  let end;

  if (
    student.expectedCompletionDate
  ) {
    end =
      new Date(
        student.expectedCompletionDate
      );
  } else {
    end =
      new Date(start);

    end.setMonth(
      end.getMonth() + 24
    );
  }

  if (
    Number.isNaN(
      end.getTime()
    )
  ) {
    return 0;
  }

  const now =
    new Date();

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  const total =
    end.getTime() -
    start.getTime();

  const elapsed =
    now.getTime() -
    start.getTime();

  return Math.min(
    Math.max(
      Math.round(
        (elapsed /
          total) *
          100
      ),
      0
    ),
    100
  );
}

// =====================================================
// CALCULATE ATTENDANCE PROGRESS
// =====================================================

function calculateAttendanceProgress(
  attendance
) {
  if (
    !Array.isArray(
      attendance
    ) ||
    attendance.length === 0
  ) {
    return 0;
  }

  let totalScore = 0;

  for (
    const record of attendance
  ) {
    if (
      record.status ===
      "Present"
    ) {
      totalScore += 100;
    } else if (
      record.status ===
      "Late"
    ) {
      totalScore += 50;
    } else if (
      record.status ===
      "Absent"
    ) {
      totalScore += 0;
    }
  }

  return Math.round(
    totalScore /
      attendance.length
  );
}

// =====================================================
// CALCULATE PROJECT PROGRESS
// =====================================================

function calculateProjectProgress(
  projects
) {
  if (
    !Array.isArray(
      projects
    ) ||
    projects.length === 0
  ) {
    return 0;
  }

  const total =
    projects.reduce(
      (sum, project) =>
        sum +
        Number(
          project.progress || 0
        ),
      0
    );

  return Math.round(
    total /
      projects.length
  );
}

// =====================================================
// CALCULATE OVERALL PROGRESS
// =====================================================
//
// Timeline = 20%
// Attendance = 30%
// Projects = 50%
//
// =====================================================

function calculateOverallProgress(
  timelineProgress,
  attendanceProgress,
  projectProgress
) {
  return Math.round(
    timelineProgress *
      0.2 +
      attendanceProgress *
        0.3 +
      projectProgress *
        0.5
  );
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
    calculateOverallProgress(
      timelineProgress,
      attendanceProgress,
      projectProgress
    );

  return {
    _id:
      student._id?.toString(),

    firstName:
      student.firstName ||
      "",

    lastName:
      student.lastName ||
      "",

    name:
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim(),

    email:
      student.email ||
      "",

    phone:
      student.phone ||
      "",

    program:
      student.program ||
      "",

    status:
      student.status ||
      "",

    profileImage:
      student.profileImage ||
      "",

    enrollmentDate:
      student.enrollmentDate ||
      null,

    expectedCompletionDate:
      student.expectedCompletionDate ||
      null,

    timelineProgress,

    attendanceProgress,

    projectProgress,

    overallProgress,

    attendanceCount:
      attendance.length,

    projectCount:
      projects.length,

    attendance,

    projects,
  };
}

// =====================================================
// GET PROGRESS
// =====================================================

export async function GET() {
  try {
    // ---------------------------------------------
    // SESSION
    // ---------------------------------------------

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

    // ---------------------------------------------
    // DATABASE
    // ---------------------------------------------

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

      // ---------------------------------------------
      // Attendance
      // ---------------------------------------------

      const attendance =
        await db
          .collection(
            "attendance"
          )
          .find({
            studentId: {
              $in: [
                studentId,
                studentId.toString(),
              ],
            },
          })
          .sort({
            date: -1,
          })
          .toArray();

      // ---------------------------------------------
      // Projects
      // ---------------------------------------------

      const projects =
        await db
          .collection(
            "projects"
          )
          .find({
            studentId: {
              $in: [
                studentId,
                studentId.toString(),
              ],
            },
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

      const formatted =
        formatStudent(
          student,
          attendance,
          projects
        );

      return NextResponse.json({
        students: [
          formatted,
        ],

        student:
          formatted,

        totalStudents: 1,
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

        const attendance =
          await db
            .collection(
              "attendance"
            )
            .find({
              studentId: {
                $in: [
                  studentId,
                  studentId.toString(),
                ],
              },
            })
            .sort({
              date: -1,
            })
            .toArray();

        const projects =
          await db
            .collection(
              "projects"
            )
            .find({
              studentId: {
                $in: [
                  studentId,
                  studentId.toString(),
                ],
              },
            })
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

      return NextResponse.json({
        students:
          formattedStudents,

        totalStudents:
          formattedStudents.length,
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