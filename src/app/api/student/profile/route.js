import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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
// GET CURRENT SESSION
// =====================================================

async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session || session.role !== "student") {
    return null;
  }

  return session;
}

// =====================================================
// FIND CURRENT USER
// =====================================================

async function getCurrentUser(session, db) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  // Normal MongoDB ObjectId
  if (ObjectId.isValid(String(session.userId))) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(String(session.userId)),
    });
  }

  // Support older records that may use a string _id
  if (!user) {
    user = await db.collection("users").findOne({
      _id: session.userId,
    });
  }

  return user;
}

// =====================================================
// GET STUDENT ID FROM USER
// =====================================================

function getStudentId(user) {
  if (!user?.studentId) {
    return null;
  }

  const studentId =
    user.studentId instanceof ObjectId
      ? user.studentId.toString()
      : String(user.studentId);

  if (!ObjectId.isValid(studentId)) {
    return null;
  }

  return studentId;
}

// =====================================================
// GET CURRENT STUDENT PROFILE
// =====================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    // =================================================
    // GET THE REAL USER FROM MONGODB
    // =================================================

    const user = await getCurrentUser(session, db);

    if (!user) {
      return NextResponse.json(
        {
          error: "Student account could not be found.",
        },
        { status: 404 }
      );
    }

    // =================================================
    // GET CURRENT STUDENT ID FROM USER RECORD
    // =================================================

    const studentId = getStudentId(user);

    if (!studentId) {
      return NextResponse.json(
        {
          error:
            "Your account is not linked to a student profile. Please contact a facilitator.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // FIND STUDENT PROFILE
    // =================================================

    const student = await db
      .collection("students")
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!student) {
      return NextResponse.json(
        {
          error: "Student profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      student: {
        ...student,
        _id: student._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Student Profile GET Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to load student profile.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// UPDATE CURRENT STUDENT PROFILE
// =====================================================

export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    // =================================================
    // GET THE REAL USER FROM MONGODB
    // =================================================

    const user = await getCurrentUser(session, db);

    if (!user) {
      return NextResponse.json(
        {
          error: "Student account could not be found.",
        },
        { status: 404 }
      );
    }

    // =================================================
    // GET CURRENT STUDENT ID
    // =================================================

    const studentId = getStudentId(user);

    if (!studentId) {
      return NextResponse.json(
        {
          error:
            "Your account is not linked to a student profile. Please contact a facilitator.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // READ REQUEST BODY
    // =================================================

    const body = await request.json();

    // =================================================
    // PROFILE UPDATES
    // =================================================

    const updates = {
      firstName:
        typeof body.firstName === "string"
          ? body.firstName.trim()
          : "",

      lastName:
        typeof body.lastName === "string"
          ? body.lastName.trim()
          : "",

      phone:
        typeof body.phone === "string"
          ? body.phone.trim()
          : "",

      dateOfBirth:
        typeof body.dateOfBirth === "string"
          ? body.dateOfBirth.trim()
          : "",

      gender:
        typeof body.gender === "string"
          ? body.gender.trim()
          : "",

      program:
        typeof body.program === "string"
          ? body.program.trim()
          : "",

      educationLevel:
        typeof body.educationLevel === "string"
          ? body.educationLevel.trim()
          : "",

      school:
        typeof body.school === "string"
          ? body.school.trim()
          : "",

      address:
        typeof body.address === "string"
          ? body.address.trim()
          : "",

      emergencyContactName:
        typeof body.emergencyContactName === "string"
          ? body.emergencyContactName.trim()
          : "",

      emergencyContactPhone:
        typeof body.emergencyContactPhone === "string"
          ? body.emergencyContactPhone.trim()
          : "",

      profileImage:
        typeof body.profileImage === "string"
          ? body.profileImage.trim()
          : "",

      updatedAt: new Date(),
    };

    // =================================================
    // VALIDATE REQUIRED FIELDS
    // =================================================

    if (!updates.firstName || !updates.lastName) {
      return NextResponse.json(
        {
          error:
            "First name and last name are required.",
        },
        { status: 400 }
      );
    }

    // =================================================
    // UPDATE ONLY THIS STUDENT
    // =================================================

    const result = await db
      .collection("students")
      .updateOne(
        {
          _id: new ObjectId(studentId),
        },
        {
          $set: updates,
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          error: "Student profile not found.",
        },
        { status: 404 }
      );
    }

    // =================================================
    // GET UPDATED PROFILE
    // =================================================

    const updatedStudent = await db
      .collection("students")
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!updatedStudent) {
      return NextResponse.json(
        {
          error: "Student profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Profile updated successfully.",
      student: {
        ...updatedStudent,
        _id: updatedStudent._id.toString(),
      },
    });
  } catch (error) {
    console.error(
      "Student Profile PUT Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to update student profile.",
      },
      { status: 500 }
    );
  }
}