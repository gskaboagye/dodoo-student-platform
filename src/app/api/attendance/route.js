import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// =========================================================
// DATABASE
// =========================================================

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

// =========================================================
// SESSION
// =========================================================

async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =========================================================
// DATE VALIDATION
// =========================================================

function isValidDateString(date) {
  if (!date || typeof date !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

// =========================================================
// FORMAT ATTENDANCE RECORD
// =========================================================

function formatAttendanceRecord(record) {
  if (!record) {
    return null;
  }

  return {
    ...record,

    _id: record._id
      ? record._id.toString()
      : null,

    studentId:
      record.studentId instanceof ObjectId
        ? record.studentId.toString()
        : record.studentId,
  };
}

// =========================================================
// STUDENT ID VALUES
// =========================================================

function getPossibleIdValues(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return [];
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return [];
  }

  const values = [stringValue];

  if (ObjectId.isValid(stringValue)) {
    values.push(new ObjectId(stringValue));
  }

  return values;
}

// =========================================================
// STUDENT ID QUERY
// =========================================================

function buildStudentIdQuery(studentId) {
  const values = getPossibleIdValues(studentId);

  if (values.length === 0) {
    return {
      studentId: null,
    };
  }

  return {
    studentId: {
      $in: values,
    },
  };
}

// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(value) {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

// =========================================================
// EMAIL QUERY
// =========================================================

function buildEmailQuery(email) {
  if (!email) {
    return null;
  }

  const normalizedEmail = String(email)
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  return {
    email: {
      $regex: `^${escapeRegex(normalizedEmail)}$`,
      $options: "i",
    },
  };
}

// =========================================================
// RESOLVE STUDENT PROFILE
//
// IMPORTANT:
// We resolve the profile using the CURRENT USER first.
// We verify that a studentId actually belongs to the
// student's account before trusting it.
//
// If the stored studentId is stale or mismatched,
// we fall back to the student's email.
// =========================================================

async function resolveStudentProfile(db, session) {
  const usersCollection = db.collection("users");
  const studentsCollection = db.collection("students");

  let user = null;

  // -------------------------------------------------------
  // 1. Find current user by session userId
  // -------------------------------------------------------

  if (
    session?.userId &&
    ObjectId.isValid(String(session.userId))
  ) {
    user = await usersCollection.findOne({
      _id: new ObjectId(String(session.userId)),
    });
  }

  // -------------------------------------------------------
  // 2. Fallback to session email
  // -------------------------------------------------------

  if (!user && session?.email) {
    const emailQuery = buildEmailQuery(session.email);

    if (emailQuery) {
      user = await usersCollection.findOne(
        emailQuery
      );
    }
  }

  // -------------------------------------------------------
  // 3. Determine the user's student ID
  // -------------------------------------------------------

  const possibleStudentIds = [];

  if (user?.studentId) {
    possibleStudentIds.push(
      ...getPossibleIdValues(user.studentId)
    );
  }

  if (session?.studentId) {
    possibleStudentIds.push(
      ...getPossibleIdValues(session.studentId)
    );
  }

  // Remove duplicate IDs.
  const uniqueStudentIds = [];

  for (const value of possibleStudentIds) {
    const key =
      value instanceof ObjectId
        ? value.toString()
        : String(value);

    if (
      !uniqueStudentIds.some(
        (existing) => existing.key === key
      )
    ) {
      uniqueStudentIds.push({
        key,
        value,
      });
    }
  }

  // -------------------------------------------------------
  // 4. Try to find the student profile by ID
  //
  // If the user has an email, make sure the profile's
  // email also matches when possible. This prevents a
  // stale studentId from pointing to another student.
  // -------------------------------------------------------

  if (uniqueStudentIds.length > 0) {
    for (const idEntry of uniqueStudentIds) {
      let student = null;

      if (idEntry.value instanceof ObjectId) {
        student =
          await studentsCollection.findOne({
            _id: idEntry.value,
          });
      } else if (
        ObjectId.isValid(String(idEntry.value))
      ) {
        student =
          await studentsCollection.findOne({
            _id: new ObjectId(
              String(idEntry.value)
            ),
          });
      }

      if (!student) {
        continue;
      }

      // If both user and student have emails,
      // verify they belong together.
      if (
        user?.email &&
        student?.email
      ) {
        const userEmail = String(user.email)
          .trim()
          .toLowerCase();

        const studentEmail = String(
          student.email
        )
          .trim()
          .toLowerCase();

        if (
          userEmail !== studentEmail
        ) {
          continue;
        }
      }

      return student;
    }
  }

  // -------------------------------------------------------
  // 5. Fallback: find student by user/session email
  // -------------------------------------------------------

  const email =
    user?.email ||
    session?.email ||
    null;

  if (email) {
    const emailQuery =
      buildEmailQuery(email);

    if (emailQuery) {
      const student =
        await studentsCollection.findOne(
          emailQuery
        );

      if (student) {
        return student;
      }
    }
  }

  return null;
}

// =========================================================
// FIND USER ACCOUNT FOR STUDENT
// =========================================================

async function findStudentUser(db, student) {
  if (!student?._id) {
    return null;
  }

  const usersCollection =
    db.collection("users");

  const possibleStudentIds =
    getPossibleIdValues(student._id);

  // -------------------------------------------------------
  // 1. Try studentId in both ObjectId and string formats
  // -------------------------------------------------------

  if (possibleStudentIds.length > 0) {
    const userByStudentId =
      await usersCollection.findOne({
        studentId: {
          $in: possibleStudentIds,
        },
      });

    if (userByStudentId) {
      return userByStudentId;
    }
  }

  // -------------------------------------------------------
  // 2. Fallback to email
  // -------------------------------------------------------

  if (student.email) {
    const emailQuery =
      buildEmailQuery(student.email);

    if (emailQuery) {
      const userByEmail =
        await usersCollection.findOne(
          emailQuery
        );

      if (userByEmail) {
        return userByEmail;
      }
    }
  }

  return null;
}

// =========================================================
// CREATE ATTENDANCE NOTIFICATION
// =========================================================

async function notifyAttendanceChange({
  db,
  student,
  date,
  status,
  action,
}) {
  try {
    const studentUser =
      await findStudentUser(
        db,
        student
      );

    if (!studentUser?._id) {
      console.warn(
        "No user account found for student:",
        student?._id?.toString()
      );

      return;
    }

    let title =
      "Attendance Updated";

    let message =
      `Your attendance for ${date} has been updated to ${status}.`;

    if (action === "created") {
      title =
        "Attendance Recorded";

      message =
        `Your attendance for ${date} has been recorded as ${status}.`;
    }

    if (action === "deleted") {
      title =
        "Attendance Removed";

      message =
        `Your attendance record for ${date} has been removed.`;
    }

    await createNotification({
      userId:
        studentUser._id.toString(),

      title,

      message,

      type: "attendance",

      link: "/student/attendance",
    });
  } catch (error) {
    // Notification errors must never prevent
    // attendance from succeeding.
    console.error(
      "ATTENDANCE NOTIFICATION ERROR:",
      error
    );
  }
}

// =========================================================
// PROGRESS HELPERS
// =========================================================

function normalizeProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(
    Math.max(Math.round(number), 0),
    100
  );
}

// =========================================================
// TIMELINE PROGRESS
// =========================================================

function calculateTimelineProgress(student) {
  if (!student?.enrollmentDate) {
    return 0;
  }

  const start =
    new Date(
      student.enrollmentDate
    );

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let end;

  if (student.expectedCompletionDate) {
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

  if (Number.isNaN(end.getTime())) {
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

  const totalDuration =
    end.getTime() -
    start.getTime();

  const elapsed =
    now.getTime() -
    start.getTime();

  if (totalDuration <= 0) {
    return 0;
  }

  return normalizeProgress(
    (elapsed / totalDuration) *
      100
  );
}

// =========================================================
// ATTENDANCE PROGRESS
// =========================================================

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
    const status =
      String(
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

  return normalizeProgress(
    totalScore /
      attendance.length
  );
}

// =========================================================
// PROJECT PROGRESS
// =========================================================

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
    total +=
      normalizeProgress(
        project?.progress ?? 0
      );
  }

  return normalizeProgress(
    total /
      projects.length
  );
}

// =========================================================
// OVERALL PROGRESS
// =========================================================

function calculateOverallProgress({
  timelineProgress,
  attendanceProgress,
  projectProgress,
}) {
  const timeline =
    normalizeProgress(
      timelineProgress
    );

  const attendance =
    normalizeProgress(
      attendanceProgress
    );

  const projects =
    normalizeProgress(
      projectProgress
    );

  return normalizeProgress(
    timeline * 0.2 +
    attendance * 0.3 +
    projects * 0.5
  );
}

// =========================================================
// GET STUDENT OVERALL PROGRESS
// =========================================================

async function getStudentOverallProgress(
  db,
  student
) {
  if (!student?._id) {
    return 0;
  }

  const attendance =
    await db
      .collection("attendance")
      .find(
        buildStudentIdQuery(
          student._id
        )
      )
      .toArray();

  const projects =
    await db
      .collection("projects")
      .find(
        buildStudentIdQuery(
          student._id
        )
      )
      .toArray();

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

  return calculateOverallProgress({
    timelineProgress,
    attendanceProgress,
    projectProgress,
  });
}

// =========================================================
// PROGRESS CHANGE NOTIFICATION
// =========================================================

async function notifyProgressChange({
  db,
  student,
  previousProgress,
}) {
  try {
    const currentProgress =
      await getStudentOverallProgress(
        db,
        student
      );

    const previous =
      normalizeProgress(
        previousProgress
      );

    const current =
      normalizeProgress(
        currentProgress
      );

    if (previous === current) {
      return;
    }

    const studentUser =
      await findStudentUser(
        db,
        student
      );

    if (!studentUser?._id) {
      console.warn(
        "PROGRESS NOTIFICATION: User account not found for student:",
        student?._id?.toString()
      );

      return;
    }

    const message =
      current > previous
        ? `Your overall progress has increased from ${previous}% to ${current}%.`
        : `Your overall progress has changed from ${previous}% to ${current}%.`;

    await createNotification({
      userId:
        studentUser._id.toString(),

      title:
        "Progress Updated",

      message,

      type: "progress",

      link: "/progress",
    });

    console.log(
      "PROGRESS NOTIFICATION CREATED:",
      {
        student:
          `${student.firstName || ""} ${
            student.lastName || ""
          }`.trim(),

        previous,

        current,
      }
    );
  } catch (error) {
    console.error(
      "PROGRESS NOTIFICATION ERROR:",
      error
    );
  }
}

// =========================================================
// GET ATTENDANCE
// =========================================================

export async function GET(request) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const date =
      searchParams.get("date");

    const db =
      await getDatabase();

    const attendanceCollection =
      db.collection(
        "attendance"
      );

    // =====================================================
    // STUDENT VIEW
    // =====================================================

    if (
      session.role ===
      "student"
    ) {
      const student =
        await resolveStudentProfile(
          db,
          session
        );

      if (!student) {
        console.error(
          "STUDENT ATTENDANCE: Could not resolve student profile.",
          {
            userId:
              session?.userId || null,

            sessionStudentId:
              session?.studentId || null,

            email:
              session?.email || null,
          }
        );

        return NextResponse.json(
          {
            message:
              "Your account is not linked to a student profile.",
          },
          {
            status: 400,
          }
        );
      }

      // ---------------------------------------------------
      // IMPORTANT:
      // Query using BOTH ObjectId and string forms.
      // This allows older attendance records to continue
      // working even if their studentId was stored as a
      // string instead of an ObjectId.
      // ---------------------------------------------------

      const studentIdValues =
        getPossibleIdValues(
          student._id
        );

      const query = {
        studentId: {
          $in: studentIdValues,
        },
      };

      if (date) {
        if (
          !isValidDateString(
            date
          )
        ) {
          return NextResponse.json(
            {
              message:
                "Invalid date format. Use YYYY-MM-DD.",
            },
            {
              status: 400,
            }
          );
        }

        query.date = date;
      }

      const attendance =
        await attendanceCollection
          .find(query)
          .sort({
            date: -1,
          })
          .toArray();

      console.log(
        "STUDENT ATTENDANCE LOADED:",
        {
          userId:
            session?.userId || null,

          studentId:
            student?._id?.toString() ||
            null,

          date:
            date || "all",

          records:
            attendance.length,
        }
      );

      return NextResponse.json({
        attendance:
          attendance.map(
            formatAttendanceRecord
          ),
      });
    }

    // =====================================================
    // FACILITATOR VIEW
    // =====================================================

    if (
      session.role ===
      "facilitator"
    ) {
      const query = {};

      if (date) {
        if (
          !isValidDateString(
            date
          )
        ) {
          return NextResponse.json(
            {
              message:
                "Invalid date format. Use YYYY-MM-DD.",
            },
            {
              status: 400,
            }
          );
        }

        query.date = date;
      }

      const attendance =
        await attendanceCollection
          .find(query)
          .sort({
            date: -1,
            studentName: 1,
          })
          .toArray();

      return NextResponse.json({
        attendance:
          attendance.map(
            formatAttendanceRecord
          ),
      });
    }

    return NextResponse.json(
      {
        message:
          "You do not have permission to view attendance.",
      },
      {
        status: 403,
      }
    );
  } catch (error) {
    console.error(
      "GET ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to load attendance.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// POST ATTENDANCE
// FACILITATORS ONLY
// =========================================================

export async function POST(request) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.role !==
      "facilitator"
    ) {
      return NextResponse.json(
        {
          message:
            "Only facilitators can record attendance.",
        },
        {
          status: 403,
        }
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      studentId,
      studentName,
      date,
      status,
    } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!studentId) {
      return NextResponse.json(
        {
          message:
            "Student ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ObjectId.isValid(
        String(studentId)
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid student ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          message:
            "Attendance date is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidDateString(
        date
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid date. Use YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses = [
      "Present",
      "Late",
      "Absent",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance status. Use Present, Late, or Absent.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // DATABASE
    // =====================================================

    const db =
      await getDatabase();

    const attendanceCollection =
      db.collection(
        "attendance"
      );

    const studentsCollection =
      db.collection(
        "students"
      );

    const studentObjectId =
      new ObjectId(
        String(studentId)
      );

    // =====================================================
    // FIND STUDENT PROFILE
    // =====================================================

    const student =
      await studentsCollection.findOne({
        _id:
          studentObjectId,
      });

    if (!student) {
      console.error(
        "ATTENDANCE STUDENT NOT FOUND:",
        {
          studentId:
            String(studentId),

          database:
            process.env.DB_NAME ||
            "DCCPlatform",
        }
      );

      return NextResponse.json(
        {
          message:
            "Student profile was not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // STUDENT NAME
    // =====================================================

    const databaseStudentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim();

    const finalStudentName =
      databaseStudentName ||
      student.name ||
      student.fullName ||
      studentName ||
      "Student";

    // =====================================================
    // FIND EXISTING ATTENDANCE
    // =====================================================

    const existingRecord =
      await attendanceCollection.findOne({
        studentId: {
          $in: [
            studentObjectId,
            studentObjectId.toString(),
          ],
        },

        date,
      });

    // =====================================================
    // UPDATE EXISTING ATTENDANCE
    // =====================================================

    if (existingRecord) {
      const previousProgress =
        await getStudentOverallProgress(
          db,
          student
        );

      await attendanceCollection.updateOne(
        {
          _id:
            existingRecord._id,
        },
        {
          $set: {
            // ALWAYS normalize the ID to ObjectId.
            studentId:
              studentObjectId,

            studentName:
              finalStudentName,

            date,

            status,

            updatedAt:
              new Date(),
          },
        }
      );

      const updatedRecord =
        await attendanceCollection.findOne({
          _id:
            existingRecord._id,
        });

      await notifyAttendanceChange({
        db,
        student,
        date,
        status,
        action:
          "updated",
      });

      await notifyProgressChange({
        db,
        student,
        previousProgress,
      });

      return NextResponse.json(
        {
          message:
            "Attendance updated successfully.",

          attendance:
            formatAttendanceRecord(
              updatedRecord
            ),
        },
        {
          status: 200,
        }
      );
    }

    // =====================================================
    // CREATE NEW ATTENDANCE
    // =====================================================

    const previousProgress =
      await getStudentOverallProgress(
        db,
        student
      );

    const newRecord = {
      // ALWAYS store studentId as ObjectId.
      studentId:
        studentObjectId,

      studentName:
        finalStudentName,

      date,

      status,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    const result =
      await attendanceCollection.insertOne(
        newRecord
      );

    const createdRecord =
      await attendanceCollection.findOne({
        _id:
          result.insertedId,
      });

    // =====================================================
    // NOTIFY STUDENT
    // =====================================================

    await notifyAttendanceChange({
      db,
      student,
      date,
      status,
      action:
        "created",
    });

    // =====================================================
    // NOTIFY PROGRESS CHANGE
    // =====================================================

    await notifyProgressChange({
      db,
      student,
      previousProgress,
    });

    return NextResponse.json(
      {
        message:
          "Attendance recorded successfully.",

        attendance:
          formatAttendanceRecord(
            createdRecord
          ),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST ATTENDANCE ERROR:",
      error
    );

    if (
      error?.code ===
      11000
    ) {
      return NextResponse.json(
        {
          message:
            "Attendance already exists for this student and date.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Failed to save attendance.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// PUT ATTENDANCE
// FACILITATORS ONLY
// =========================================================

export async function PUT(request) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.role !==
      "facilitator"
    ) {
      return NextResponse.json(
        {
          message:
            "Only facilitators can update attendance.",
        },
        {
          status: 403,
        }
      );
    }

    let body;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          message:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      attendanceId,
      status,
    } = body;

    if (!attendanceId) {
      return NextResponse.json(
        {
          message:
            "Attendance ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ObjectId.isValid(
        String(attendanceId)
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance ID.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses = [
      "Present",
      "Late",
      "Absent",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance status. Use Present, Late, or Absent.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    const attendanceCollection =
      db.collection(
        "attendance"
      );

    const studentsCollection =
      db.collection(
        "students"
      );

    const attendanceObjectId =
      new ObjectId(
        String(attendanceId)
      );

    // =====================================================
    // GET EXISTING RECORD
    // =====================================================

    const existingRecord =
      await attendanceCollection.findOne({
        _id:
          attendanceObjectId,
      });

    if (!existingRecord) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // FIND STUDENT
    // =====================================================

    let student = null;

    if (
      existingRecord.studentId
    ) {
      const studentId =
        String(
          existingRecord.studentId
        );

      if (
        ObjectId.isValid(
          studentId
        )
      ) {
        student =
          await studentsCollection.findOne({
            _id:
              new ObjectId(
                studentId
              ),
          });
      }
    }

    // =====================================================
    // GET PREVIOUS PROGRESS
    // =====================================================

    const previousProgress =
      student
        ? await getStudentOverallProgress(
            db,
            student
          )
        : 0;

    // =====================================================
    // UPDATE ATTENDANCE
    // =====================================================

    const result =
      await attendanceCollection.updateOne(
        {
          _id:
            attendanceObjectId,
        },
        {
          $set: {
            status,

            updatedAt:
              new Date(),
          },
        }
      );

    if (
      result.matchedCount ===
      0
    ) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updatedRecord =
      await attendanceCollection.findOne({
        _id:
          attendanceObjectId,
      });

    // =====================================================
    // NOTIFY STUDENT
    // =====================================================

    if (student) {
      await notifyAttendanceChange({
        db,
        student,

        date:
          updatedRecord?.date ||
          existingRecord.date,

        status,

        action:
          "updated",
      });

      await notifyProgressChange({
        db,
        student,
        previousProgress,
      });
    }

    return NextResponse.json({
      message:
        "Attendance updated successfully.",

      attendance:
        formatAttendanceRecord(
          updatedRecord
        ),
    });
  } catch (error) {
    console.error(
      "PUT ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to update attendance.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// DELETE ATTENDANCE
// FACILITATORS ONLY
// =========================================================

export async function DELETE(
  request
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.role !==
      "facilitator"
    ) {
      return NextResponse.json(
        {
          message:
            "Only facilitators can delete attendance.",
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const attendanceId =
      searchParams.get("id");

    if (!attendanceId) {
      return NextResponse.json(
        {
          message:
            "Attendance ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ObjectId.isValid(
        String(attendanceId)
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance ID.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    const attendanceCollection =
      db.collection(
        "attendance"
      );

    const studentsCollection =
      db.collection(
        "students"
      );

    const attendanceObjectId =
      new ObjectId(
        String(attendanceId)
      );

    // =====================================================
    // GET RECORD BEFORE DELETING
    // =====================================================

    const existingRecord =
      await attendanceCollection.findOne({
        _id:
          attendanceObjectId,
      });

    if (!existingRecord) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // FIND STUDENT
    // =====================================================

    let student = null;

    if (
      existingRecord.studentId
    ) {
      const studentId =
        String(
          existingRecord.studentId
        );

      if (
        ObjectId.isValid(
          studentId
        )
      ) {
        student =
          await studentsCollection.findOne({
            _id:
              new ObjectId(
                studentId
              ),
          });
      }
    }

    // =====================================================
    // GET PREVIOUS PROGRESS
    // =====================================================

    const previousProgress =
      student
        ? await getStudentOverallProgress(
            db,
            student
          )
        : 0;

    // =====================================================
    // DELETE ATTENDANCE
    // =====================================================

    const result =
      await attendanceCollection.deleteOne({
        _id:
          attendanceObjectId,
      });

    if (
      result.deletedCount ===
      0
    ) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // NOTIFY STUDENT
    // =====================================================

    if (student) {
      await notifyAttendanceChange({
        db,
        student,

        date:
          existingRecord.date,

        status:
          existingRecord.status,

        action:
          "deleted",
      });

      await notifyProgressChange({
        db,
        student,
        previousProgress,
      });
    }

    return NextResponse.json({
      message:
        "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE ATTENDANCE ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to delete attendance.",
        error:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}