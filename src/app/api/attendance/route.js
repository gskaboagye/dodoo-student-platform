import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

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
// AUTHORIZATION
// =========================================================

async function requireFacilitator() {
  const session = await getSession();

  if (!session || session.role !== "facilitator") {
    return null;
  }

  return session;
}

async function requireStudent() {
  const session = await getSession();

  if (
    !session ||
    session.role !== "student" ||
    !session.studentId
  ) {
    return null;
  }

  return session;
}

// =========================================================
// DATE VALIDATION
// =========================================================

function isValidDateString(date) {
  if (!date) {
    return false;
  }

  // Must be YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const year = parsed.getFullYear();
  const month = String(
    parsed.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    parsed.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}` === date;
}

// =========================================================
// NORMALIZE DATE
// =========================================================

function normalizeDate(date) {
  if (!date) {
    return null;
  }

  return String(date).trim();
}

// =========================================================
// NORMALIZE STUDENT ID
// =========================================================

function buildStudentIdQuery(studentId) {
  const values = [String(studentId)];

  if (ObjectId.isValid(studentId)) {
    values.push(new ObjectId(studentId));
  }

  return {
    $in: values,
  };
}

// =========================================================
// FORMAT ATTENDANCE RECORD
// =========================================================

function formatAttendanceRecord(record) {
  return {
    ...record,

    _id: record._id?.toString(),

    studentId:
      record.studentId?.toString() || null,

    date: record.date || null,

    status: record.status || null,

    studentName:
      record.studentName || "",
  };
}

// =========================================================
// GET
//
// Facilitator:
//   View attendance for all students.
//
// Student:
//   View ONLY their own attendance.
//
// Date:
//   ?date=2026-09-26
//
// If a date is supplied, ONLY that day's records are returned.
// =========================================================

export async function GET(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const requestedDate =
      searchParams.get("date");

    const date = normalizeDate(
      requestedDate
    );

    // -------------------------------------------------------
    // Validate date
    // -------------------------------------------------------

    if (date && !isValidDateString(date)) {
      return NextResponse.json(
        {
          error:
            "Invalid date. Use YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    // =======================================================
    // STUDENT
    // =======================================================

    if (session.role === "student") {
      const studentSession =
        await requireStudent();

      if (!studentSession) {
        return NextResponse.json(
          {
            error:
              "Student profile is not linked.",
          },
          {
            status: 403,
          }
        );
      }

      const studentId =
        studentSession.studentId;

      const query = {
        studentId:
          buildStudentIdQuery(studentId),
      };

      // -----------------------------------------------------
      // If date exists, return ONLY that day.
      // Otherwise return complete history.
      // -----------------------------------------------------

      if (date) {
        query.date = date;
      }

      const records = await db
        .collection("attendance")
        .find(query)
        .sort({
          date: -1,
          createdAt: -1,
        })
        .toArray();

      return NextResponse.json({
        attendance:
          records.map(
            formatAttendanceRecord
          ),
      });
    }

    // =======================================================
    // FACILITATOR
    // =======================================================

    if (session.role === "facilitator") {
      const query = {};

      // -----------------------------------------------------
      // When a date is selected, return ONLY that date.
      // -----------------------------------------------------

      if (date) {
        query.date = date;
      }

      const records = await db
        .collection("attendance")
        .find(query)
        .sort({
          date: -1,
          createdAt: -1,
        })
        .toArray();

      return NextResponse.json({
        attendance:
          records.map(
            formatAttendanceRecord
          ),
      });
    }

    // =======================================================
    // UNKNOWN ROLE
    // =======================================================

    return NextResponse.json(
      {
        error: "Access denied.",
      },
      {
        status: 403,
      }
    );
  } catch (error) {
    console.error(
      "Attendance GET Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load attendance.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// POST
//
// ONLY FACILITATORS.
//
// Creates attendance if the student has no record for
// the selected date.
//
// If the record already exists for:
//     studentId + date
//
// the existing record is UPDATED instead.
//
// Therefore:
//
// September 26 + Student A
// = ONE attendance record.
//
// September 27 + Student A
// = ANOTHER attendance record.
//
// =========================================================

export async function POST(request) {
  try {
    const session =
      await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can take attendance.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const studentId =
      body.studentId;

    const date = normalizeDate(
      body.date
    );

    const status =
      body.status;

    // -------------------------------------------------------
    // Required fields
    // -------------------------------------------------------

    if (
      !studentId ||
      !date ||
      !status
    ) {
      return NextResponse.json(
        {
          error:
            "Student, date and attendance status are required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Validate date
    // -------------------------------------------------------

    if (!isValidDateString(date)) {
      return NextResponse.json(
        {
          error:
            "Invalid attendance date. Use YYYY-MM-DD.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Validate status
    // -------------------------------------------------------

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
          error:
            "Invalid attendance status. Use Present, Late or Absent.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Validate student ID
    // -------------------------------------------------------

    if (
      !ObjectId.isValid(
        studentId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid student ID.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    const studentObjectId =
      new ObjectId(studentId);

    // =======================================================
    // VERIFY STUDENT EXISTS
    // =======================================================

    const student =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!student) {
      return NextResponse.json(
        {
          error:
            "Student not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =======================================================
    // FIND EXISTING RECORD
    //
    // We support both ObjectId and string studentId records
    // because older records may have been saved differently.
    // =======================================================

    const existing =
      await db
        .collection("attendance")
        .findOne({
          studentId: {
            $in: [
              studentObjectId,
              String(studentId),
            ],
          },
          date,
        });

    // =======================================================
    // UPDATE EXISTING RECORD
    // =======================================================

    if (existing) {
      const updateResult =
        await db
          .collection("attendance")
          .updateOne(
            {
              _id: existing._id,
            },
            {
              $set: {
                studentId:
                  studentObjectId,

                studentName:
                  `${student.firstName || ""} ${
                    student.lastName || ""
                  }`.trim(),

                date,

                status,

                updatedAt:
                  new Date(),
              },
            }
          );

      if (
        updateResult.matchedCount ===
        0
      ) {
        return NextResponse.json(
          {
            error:
              "Attendance record could not be updated.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        message:
          "Attendance updated successfully.",

        attendance: {
          _id:
            existing._id.toString(),

          studentId:
            studentObjectId.toString(),

          studentName:
            `${student.firstName || ""} ${
              student.lastName || ""
            }`.trim(),

          date,

          status,
        },
      });
    }

    // =======================================================
    // CREATE NEW RECORD
    // =======================================================

    const now =
      new Date();

    const result =
      await db
        .collection("attendance")
        .insertOne({
          studentId:
            studentObjectId,

          studentName:
            `${student.firstName || ""} ${
              student.lastName || ""
            }`.trim(),

          date,

          status,

          createdAt: now,

          updatedAt: now,
        });

    return NextResponse.json(
      {
        message:
          "Attendance recorded successfully.",

        attendance: {
          _id:
            result.insertedId.toString(),

          studentId:
            studentObjectId.toString(),

          studentName:
            `${student.firstName || ""} ${
              student.lastName || ""
            }`.trim(),

          date,

          status,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Attendance POST Error:",
      error
    );

    // -------------------------------------------------------
    // Duplicate-key protection
    // -------------------------------------------------------

    if (
      error?.code === 11000
    ) {
      return NextResponse.json(
        {
          error:
            "Attendance already exists for this student and date. Please reload and try again.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to save attendance.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// PUT
//
// ONLY FACILITATORS.
//
// Updates an existing attendance record by ID.
// =========================================================

export async function PUT(request) {
  try {
    const session =
      await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can edit attendance.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id =
      body.id;

    const status =
      body.status;

    // -------------------------------------------------------
    // Required fields
    // -------------------------------------------------------

    if (!id || !status) {
      return NextResponse.json(
        {
          error:
            "Attendance ID and status are required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Validate status
    // -------------------------------------------------------

    if (
      ![
        "Present",
        "Late",
        "Absent",
      ].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attendance status.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Validate ID
    // -------------------------------------------------------

    if (
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid attendance ID.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    // -------------------------------------------------------
    // Find attendance first
    // -------------------------------------------------------

    const existing =
      await db
        .collection("attendance")
        .findOne({
          _id:
            new ObjectId(id),
        });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // Update status
    // -------------------------------------------------------

    await db
      .collection("attendance")
      .updateOne(
        {
          _id:
            new ObjectId(id),
        },
        {
          $set: {
            status,

            updatedAt:
              new Date(),
          },
        }
      );

    return NextResponse.json({
      message:
        "Attendance updated successfully.",

      attendance: {
        _id:
          existing._id.toString(),

        studentId:
          existing.studentId?.toString() ||
          null,

        date:
          existing.date || null,

        status,
      },
    });
  } catch (error) {
    console.error(
      "Attendance PUT Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update attendance.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// DELETE
//
// ONLY FACILITATORS.
//
// Deletes one attendance record.
// =========================================================

export async function DELETE(request) {
  try {
    const session =
      await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can delete attendance.",
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid attendance ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    const result =
      await db
        .collection("attendance")
        .deleteOne({
          _id:
            new ObjectId(id),
        });

    if (
      result.deletedCount === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Attendance record not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      message:
        "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Attendance DELETE Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete attendance.",
      },
      {
        status: 500,
      }
    );
  }
}