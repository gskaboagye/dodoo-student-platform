import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

/* =========================================================
   DATABASE
========================================================= */

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

/* =========================================================
   SESSION
========================================================= */

async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

/* =========================================================
   DATE VALIDATION
========================================================= */

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

  const [year, month, day] = date
    .split("-")
    .map(Number);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

/* =========================================================
   FORMAT ATTENDANCE RECORD
========================================================= */

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

/* =========================================================
   STUDENT ID QUERY
========================================================= */

function buildStudentIdQuery(studentId) {
  const idString = String(studentId);

  const values = [idString];

  if (ObjectId.isValid(idString)) {
    values.push(new ObjectId(idString));
  }

  return {
    $in: values,
  };
}

/* =========================================================
   RESOLVE STUDENT PROFILE
========================================================= */

/*
 * This is important.
 *
 * Instead of trusting only session.studentId, we first try
 * to find the current user in the users collection.
 *
 * Then we use that user's studentId to find the actual
 * student profile in the students collection.
 *
 * We also have fallbacks for older sessions.
 */

async function resolveStudentProfile(db, session) {
  const usersCollection = db.collection("users");
  const studentsCollection = db.collection("students");

  let studentId = session?.studentId || null;

  /* -------------------------------------------------------
     Try to resolve from the current user account
  ------------------------------------------------------- */

  if (
    session?.userId &&
    ObjectId.isValid(String(session.userId))
  ) {
    const user = await usersCollection.findOne({
      _id: new ObjectId(String(session.userId)),
    });

    if (user?.studentId) {
      studentId = user.studentId;
    }
  }

  /* -------------------------------------------------------
     Find student using studentId
  ------------------------------------------------------- */

  if (
    studentId &&
    ObjectId.isValid(String(studentId))
  ) {
    const student = await studentsCollection.findOne({
      _id: new ObjectId(String(studentId)),
    });

    if (student) {
      return student;
    }
  }

  /* -------------------------------------------------------
     Fallback: find student by email
  ------------------------------------------------------- */

  if (session?.email) {
    const student = await studentsCollection.findOne({
      email: String(session.email).toLowerCase(),
    });

    if (student) {
      return student;
    }
  }

  return null;
}

/* =========================================================
   GET ATTENDANCE
========================================================= */

export async function GET(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const date = searchParams.get("date");

    const db = await getDatabase();

    const attendanceCollection =
      db.collection("attendance");

    /* =====================================================
       STUDENT VIEW
    ===================================================== */

    if (session.role === "student") {
      /*
       * Resolve the student's actual profile.
       */
      const student =
        await resolveStudentProfile(
          db,
          session
        );

      if (!student) {
        return NextResponse.json(
          {
            message:
              "Your account is not linked to a student profile.",
          },
          { status: 400 }
        );
      }

      /*
       * Find attendance using the student's actual
       * database _id.
       *
       * This supports both ObjectId and string records.
       */
      const query = {
        studentId: buildStudentIdQuery(
          student._id
        ),
      };

      /*
       * If a date was selected, return only
       * that day's attendance.
       */
      if (date) {
        if (!isValidDateString(date)) {
          return NextResponse.json(
            {
              message:
                "Invalid date format. Use YYYY-MM-DD.",
            },
            { status: 400 }
          );
        }

        query.date = date;
      }

      /*
       * Without a date, ALL attendance records
       * for the student are returned.
       */
      const attendance =
        await attendanceCollection
          .find(query)
          .sort({
            date: -1,
          })
          .toArray();

      return NextResponse.json({
        attendance:
          attendance.map(
            formatAttendanceRecord
          ),
      });
    }

    /* =====================================================
       FACILITATOR VIEW
    ===================================================== */

    if (session.role === "facilitator") {
      const query = {};

      /*
       * Facilitators can select any date.
       */
      if (date) {
        if (!isValidDateString(date)) {
          return NextResponse.json(
            {
              message:
                "Invalid date format. Use YYYY-MM-DD.",
            },
            { status: 400 }
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
      { status: 403 }
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
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST ATTENDANCE
   FACILITATORS ONLY
========================================================= */

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can record attendance.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      studentId,
      studentName,
      date,
      status,
    } = body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!studentId) {
      return NextResponse.json(
        {
          message: "Student ID is required.",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(studentId)) {
      return NextResponse.json(
        {
          message: "Invalid student ID.",
        },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          message:
            "Attendance date is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidDateString(date)) {
      return NextResponse.json(
        {
          message:
            "Invalid date. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "Present",
      "Late",
      "Absent",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance status. Use Present, Late, or Absent.",
        },
        { status: 400 }
      );
    }

    /* =====================================================
       DATABASE
    ===================================================== */

    const db = await getDatabase();

    const attendanceCollection =
      db.collection("attendance");

    const studentsCollection =
      db.collection("students");

    const studentObjectId =
      new ObjectId(studentId);

    /* =====================================================
       FIND STUDENT PROFILE
    ===================================================== */

    const student =
      await studentsCollection.findOne({
        _id: studentObjectId,
      });

    if (!student) {
      console.error(
        "ATTENDANCE STUDENT NOT FOUND:",
        {
          studentId,
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
        { status: 404 }
      );
    }

    /* =====================================================
       STUDENT NAME
    ===================================================== */

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

    /* =====================================================
       FIND EXISTING ATTENDANCE
    ===================================================== */

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

    /* =====================================================
       UPDATE EXISTING ATTENDANCE
    ===================================================== */

    if (existingRecord) {
      await attendanceCollection.updateOne(
        {
          _id: existingRecord._id,
        },
        {
          $set: {
            studentId: studentObjectId,
            studentName: finalStudentName,
            date,
            status,
            updatedAt: new Date(),
          },
        }
      );

      const updatedRecord =
        await attendanceCollection.findOne({
          _id: existingRecord._id,
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
        { status: 200 }
      );
    }

    /* =====================================================
       CREATE NEW ATTENDANCE
    ===================================================== */

    const newRecord = {
      studentId: studentObjectId,

      studentName: finalStudentName,

      date,

      status,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result =
      await attendanceCollection.insertOne(
        newRecord
      );

    const createdRecord =
      await attendanceCollection.findOne({
        _id: result.insertedId,
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
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST ATTENDANCE ERROR:",
      error
    );

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          message:
            "Attendance already exists for this student and date.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Failed to save attendance.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PUT ATTENDANCE
   FACILITATORS ONLY
========================================================= */

export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can update attendance.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

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
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(attendanceId)) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance ID.",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "Present",
      "Late",
      "Absent",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance status. Use Present, Late, or Absent.",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const attendanceCollection =
      db.collection("attendance");

    const attendanceObjectId =
      new ObjectId(attendanceId);

    const result =
      await attendanceCollection.updateOne(
        {
          _id: attendanceObjectId,
        },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        { status: 404 }
      );
    }

    const updatedRecord =
      await attendanceCollection.findOne({
        _id: attendanceObjectId,
      });

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
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE ATTENDANCE
   FACILITATORS ONLY
========================================================= */

export async function DELETE(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can delete attendance.",
        },
        { status: 403 }
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
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(attendanceId)) {
      return NextResponse.json(
        {
          message:
            "Invalid attendance ID.",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const attendanceCollection =
      db.collection("attendance");

    const result =
      await attendanceCollection.deleteOne({
        _id: new ObjectId(attendanceId),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Attendance record not found.",
        },
        { status: 404 }
      );
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
        error: error.message,
      },
      { status: 500 }
    );
  }
}