import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

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

/*
 * GET
 *
 * Facilitator:
 *   Can view attendance for all students.
 *
 * Student:
 *   Can view ONLY their own attendance.
 */
export async function GET(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    // Student can only access their own records.
    if (session.role === "student") {
      if (!session.studentId) {
        return NextResponse.json(
          { error: "Student profile is not linked." },
          { status: 403 }
        );
      }

      const studentId = session.studentId;

      const studentIds = [studentId];

      if (ObjectId.isValid(studentId)) {
        studentIds.push(new ObjectId(studentId));
      }

      const query = {
        studentId: { $in: studentIds },
      };

      if (date) {
        query.date = date;
      }

      const records = await db
        .collection("attendance")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      return NextResponse.json({
        attendance: records.map((record) => ({
          ...record,
          _id: record._id.toString(),
          studentId:
            record.studentId?.toString() || null,
        })),
      });
    }

    // Facilitator can view all attendance.
    if (session.role === "facilitator") {
      const query = date ? { date } : {};

      const records = await db
        .collection("attendance")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      return NextResponse.json({
        attendance: records.map((record) => ({
          ...record,
          _id: record._id.toString(),
          studentId:
            record.studentId?.toString() || null,
        })),
      });
    }

    return NextResponse.json(
      { error: "Access denied." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Attendance GET Error:", error);

    return NextResponse.json(
      { error: "Unable to load attendance." },
      { status: 500 }
    );
  }
}

/*
 * POST
 *
 * ONLY FACILITATORS can create or update attendance.
 */
export async function POST(request) {
  try {
    const session = await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can take attendance.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      studentId,
      date,
      status,
    } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json(
        {
          error:
            "Student, date and attendance status are required.",
        },
        { status: 400 }
      );
    }

    if (!["Present", "Late", "Absent"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid attendance status." },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { error: "Invalid student ID." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const student = await db
      .collection("students")
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    const existing = await db
      .collection("attendance")
      .findOne({
        studentId: new ObjectId(studentId),
        date,
      });

    if (existing) {
      await db.collection("attendance").updateOne(
        { _id: existing._id },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        message: "Attendance updated successfully.",
      });
    }

    const result = await db
      .collection("attendance")
      .insertOne({
        studentId: new ObjectId(studentId),
        studentName:
          `${student.firstName || ""} ${
            student.lastName || ""
          }`.trim(),
        date,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json(
      {
        message: "Attendance recorded successfully.",
        id: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Attendance POST Error:", error);

    return NextResponse.json(
      { error: "Unable to save attendance." },
      { status: 500 }
    );
  }
}

/*
 * PUT
 *
 * ONLY FACILITATORS can edit attendance.
 */
export async function PUT(request) {
  try {
    const session = await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can edit attendance.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      id,
      status,
    } = body;

    if (!id || !status) {
      return NextResponse.json(
        {
          error:
            "Attendance ID and status are required.",
        },
        { status: 400 }
      );
    }

    if (!["Present", "Late", "Absent"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid attendance status." },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid attendance ID." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result = await db
      .collection("attendance")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Attendance record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Attendance updated successfully.",
    });
  } catch (error) {
    console.error("Attendance PUT Error:", error);

    return NextResponse.json(
      { error: "Unable to update attendance." },
      { status: 500 }
    );
  }
}

/*
 * DELETE
 *
 * ONLY FACILITATORS can delete attendance.
 */
export async function DELETE(request) {
  try {
    const session = await requireFacilitator();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Only facilitators can delete attendance.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid attendance ID is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result = await db
      .collection("attendance")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Attendance record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Attendance deleted successfully.",
    });
  } catch (error) {
    console.error("Attendance DELETE Error:", error);

    return NextResponse.json(
      { error: "Unable to delete attendance." },
      { status: 500 }
    );
  }
}