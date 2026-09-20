import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =====================================================
// GET CURRENT STUDENT SESSION
// =====================================================

async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (
    !session ||
    session.role !== "student" ||
    !session.studentId
  ) {
    return null;
  }

  return session;
}

// =====================================================
// GET CURRENT STUDENT PROFILE
// =====================================================

export async function GET() {
  try {
    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(session.studentId)) {
      return NextResponse.json(
        {
          error: "Invalid student account.",
        },
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
        _id: new ObjectId(session.studentId),
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
    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    if (!ObjectId.isValid(session.studentId)) {
      return NextResponse.json(
        {
          error: "Invalid student account.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // =================================================
    // ONLY THE LOGGED-IN STUDENT'S PROFILE FIELDS
    // CAN BE EDITED
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

      // STUDENT CAN NOW SAVE THEIR PREFERRED PROGRAM
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

      // Cloudinary image URL
      profileImage:
        typeof body.profileImage === "string"
          ? body.profileImage.trim()
          : "",

      updatedAt: new Date(),
    };

    // =================================================
    // VALIDATE REQUIRED INFORMATION
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
    // UPDATE ONLY THE LOGGED-IN STUDENT
    // =================================================

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result = await db
      .collection("students")
      .updateOne(
        {
          _id: new ObjectId(session.studentId),
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
        _id: new ObjectId(session.studentId),
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