import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =====================================================
// SESSION
// =====================================================

async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return null;
    }

    const session = await verifySession(token);

    return session || null;
  } catch (error) {
    console.error("GET SESSION ERROR:", error);
    return null;
  }
}

// =====================================================
// FACILITATOR AUTHORIZATION
// =====================================================

async function requireFacilitator() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          message: "Authentication required.",
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "facilitator") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          message:
            "Only facilitators can access the student management system.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
  };
}

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
// HELPERS
// =====================================================

function isValidObjectId(id) {
  return Boolean(id) && ObjectId.isValid(id);
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

// =====================================================
// GET
// =====================================================
// Facilitators can view all students.
// Students are NOT allowed to access this endpoint.
// =====================================================

export async function GET() {
  try {
    // ---------------------------------------------
    // FACILITATOR AUTHORIZATION
    // ---------------------------------------------

    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    // ---------------------------------------------
    // DATABASE
    // ---------------------------------------------

    const db = await getDatabase();

    // ---------------------------------------------
    // GET STUDENTS
    // ---------------------------------------------

    const students = await db
      .collection("students")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(students);
  } catch (error) {
    console.error("Students GET Error:", error);

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
// =====================================================
// Facilitators can edit student records.
// =====================================================

export async function PUT(request) {
  try {
    // ---------------------------------------------
    // FACILITATOR AUTHORIZATION
    // ---------------------------------------------

    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    // ---------------------------------------------
    // READ REQUEST BODY
    // ---------------------------------------------

    let body;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // VALIDATE STUDENT ID
    // ---------------------------------------------

    const id = body?.id;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        {
          message: "A valid student ID is required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // DATABASE
    // ---------------------------------------------

    const db = await getDatabase();

    const studentObjectId = new ObjectId(id);

    // ---------------------------------------------
    // FIND EXISTING STUDENT
    // ---------------------------------------------

    const existingStudent = await db
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

    // ---------------------------------------------
    // PREPARE UPDATE
    // ---------------------------------------------

    const updateData = {
      updatedAt: new Date(),
    };

    // ---------------------------------------------
    // FIRST NAME
    // ---------------------------------------------

    if (body.firstName !== undefined) {
      const firstName = cleanString(body.firstName);

      if (!firstName) {
        return NextResponse.json(
          {
            message: "First name cannot be empty.",
          },
          { status: 400 }
        );
      }

      updateData.firstName = firstName;
    }

    // ---------------------------------------------
    // LAST NAME
    // ---------------------------------------------

    if (body.lastName !== undefined) {
      const lastName = cleanString(body.lastName);

      if (!lastName) {
        return NextResponse.json(
          {
            message: "Last name cannot be empty.",
          },
          { status: 400 }
        );
      }

      updateData.lastName = lastName;
    }

    // ---------------------------------------------
    // EMAIL
    // ---------------------------------------------

    if (body.email !== undefined) {
      const email = cleanEmail(body.email);

      if (!email) {
        return NextResponse.json(
          {
            message: "Email cannot be empty.",
          },
          { status: 400 }
        );
      }

      // Check whether another student already
      // uses this email address.
      const emailOwner = await db
        .collection("students")
        .findOne({
          email,
          _id: {
            $ne: studentObjectId,
          },
        });

      if (emailOwner) {
        return NextResponse.json(
          {
            message:
              "Another student is already using this email address.",
          },
          { status: 409 }
        );
      }

      updateData.email = email;
    }

    // ---------------------------------------------
    // PHONE
    // ---------------------------------------------

    if (body.phone !== undefined) {
      updateData.phone = cleanString(body.phone);
    }

    // ---------------------------------------------
    // PROGRAM
    // ---------------------------------------------

    if (body.program !== undefined) {
      updateData.program = cleanString(body.program);
    }

    // ---------------------------------------------
    // STATUS
    // ---------------------------------------------

    if (body.status !== undefined) {
      const allowedStatuses = [
        "active",
        "inactive",
        "pending",
        "completed",
        "suspended",
      ];

      if (
        typeof body.status !== "string" ||
        !allowedStatuses.includes(
          body.status.toLowerCase()
        )
      ) {
        return NextResponse.json(
          {
            message: "Invalid student status.",
          },
          { status: 400 }
        );
      }

      updateData.status =
        body.status.toLowerCase();
    }

    // ---------------------------------------------
    // PROFILE IMAGE
    // ---------------------------------------------

    if (body.profileImage !== undefined) {
      updateData.profileImage =
        body.profileImage;
    }

    // ---------------------------------------------
    // ENROLLMENT DATE
    // ---------------------------------------------

    if (body.enrollmentDate !== undefined) {
      if (!isValidDate(body.enrollmentDate)) {
        return NextResponse.json(
          {
            message:
              "A valid enrollment date is required.",
          },
          { status: 400 }
        );
      }

      const enrollmentDate = new Date(
        body.enrollmentDate
      );

      updateData.enrollmentDate =
        enrollmentDate;

      updateData.expectedCompletionDate =
        addMonths(enrollmentDate, 24);
    }

    // ---------------------------------------------
    // UPDATE STUDENT
    // ---------------------------------------------

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

    // ---------------------------------------------
    // GET UPDATED STUDENT
    // ---------------------------------------------

    const updatedStudent = await db
      .collection("students")
      .findOne({
        _id: studentObjectId,
      });

    return NextResponse.json({
      message: "Student updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Students PUT Error:", error);

    return NextResponse.json(
      {
        message: "Failed to update student.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE
// =====================================================
// Facilitators can permanently remove students.
//
// This deletes:
// 1. Student record
// 2. Student login account
//
// The linked user account is found using:
// - studentId
// - OR student email
// =====================================================

export async function DELETE(request) {
  try {
    // ---------------------------------------------
    // FACILITATOR AUTHORIZATION
    // ---------------------------------------------

    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    // ---------------------------------------------
    // GET STUDENT ID
    // ---------------------------------------------

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

    // ---------------------------------------------
    // DATABASE
    // ---------------------------------------------

    const db = await getDatabase();

    const studentObjectId =
      new ObjectId(id);

    // ---------------------------------------------
    // FIND STUDENT
    // ---------------------------------------------

    const student = await db
      .collection("students")
      .findOne({
        _id: studentObjectId,
      });

    if (!student) {
      return NextResponse.json(
        {
          message: "Student not found.",
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------
    // DELETE STUDENT RECORD
    // ---------------------------------------------

    const studentDeleteResult =
      await db
        .collection("students")
        .deleteOne({
          _id: studentObjectId,
        });

    if (
      studentDeleteResult.deletedCount !== 1
    ) {
      return NextResponse.json(
        {
          message:
            "The student record could not be deleted.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------
    // DELETE LINKED LOGIN ACCOUNT
    //
    // Match using studentId OR email.
    //
    // This protects against older accounts that
    // may not have studentId stored correctly.
    // ---------------------------------------------

    const userDeleteConditions = [
      {
        studentId: studentObjectId,
      },
    ];

    if (student.email) {
      userDeleteConditions.push({
        email: cleanEmail(student.email),
      });
    }

    const userDeleteResult =
      await db
        .collection("users")
        .deleteMany({
          role: "student",
          $or: userDeleteConditions,
        });

    // ---------------------------------------------
    // SUCCESS
    // ---------------------------------------------

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