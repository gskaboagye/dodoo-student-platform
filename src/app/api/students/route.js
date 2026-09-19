import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
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

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

// =====================================================
// GET
// Facilitators can view all students.
// =====================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can access the student management list.",
        },
        { status: 403 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const students = await db
      .collection("students")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(students);
  } catch (error) {
    console.error(
      "Students GET Error:",
      error
    );

    return NextResponse.json(
      {
        message: "Failed to load students.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT
// Facilitators can edit student records.
// =====================================================

export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can edit student records.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = body.id;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        {
          message:
            "A valid student ID is required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const studentObjectId =
      new ObjectId(id);

    const existingStudent =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!existingStudent) {
      return NextResponse.json(
        {
          message: "Student not found.",
        },
        { status: 404 }
      );
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (body.firstName !== undefined) {
      updateData.firstName =
        body.firstName.trim();
    }

    if (body.lastName !== undefined) {
      updateData.lastName =
        body.lastName.trim();
    }

    if (body.email !== undefined) {
      updateData.email =
        body.email.trim().toLowerCase();
    }

    if (body.phone !== undefined) {
      updateData.phone =
        body.phone.trim();
    }

    if (body.program !== undefined) {
      updateData.program =
        body.program.trim();
    }

    if (body.status !== undefined) {
      updateData.status =
        body.status;
    }

    if (body.profileImage !== undefined) {
      updateData.profileImage =
        body.profileImage;
    }

    if (body.enrollmentDate !== undefined) {
      const enrollmentDate =
        new Date(body.enrollmentDate);

      updateData.enrollmentDate =
        enrollmentDate;

      updateData.expectedCompletionDate =
        addMonths(
          enrollmentDate,
          24
        );
    }

    await db
      .collection("students")
      .updateOne(
        {
          _id: studentObjectId,
        },
        {
          $set: updateData,
        }
      );

    const updatedStudent =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    return NextResponse.json({
      message:
        "Student updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error(
      "Students PUT Error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to update student.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE
// Facilitators can permanently remove students.
//
// This deletes:
// 1. Student record
// 2. Student login account
//
// The user account is found using BOTH:
// - studentId
// - student email
// =====================================================

export async function DELETE(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can delete students.",
        },
        { status: 403 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        {
          message:
            "A valid student ID is required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const studentObjectId =
      new ObjectId(id);

    // ---------------------------------------------
    // FIND STUDENT
    // ---------------------------------------------

    const student =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    if (!student) {
      return NextResponse.json(
        {
          message:
            "Student not found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------
    // DELETE STUDENT RECORD
    // ---------------------------------------------

    await db
      .collection("students")
      .deleteOne({
        _id: studentObjectId,
      });

    // ---------------------------------------------
    // DELETE LINKED LOGIN ACCOUNT
    //
    // Match using studentId OR email.
    // This protects against older accounts that
    // may not have studentId stored correctly.
    // ---------------------------------------------

    const userDeleteResult =
      await db
        .collection("users")
        .deleteMany({
          role: "student",
          $or: [
            {
              studentId:
                studentObjectId,
            },
            {
              email:
                student.email,
            },
          ],
        });

    return NextResponse.json({
      message:
        "Student and associated login account deleted successfully.",

      deletedStudentId:
        studentObjectId.toString(),

      deletedAccounts:
        userDeleteResult.deletedCount,
    });
  } catch (error) {
    console.error(
      "Students DELETE Error:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to delete student and associated account.",
      },
      { status: 500 }
    );
  }
}