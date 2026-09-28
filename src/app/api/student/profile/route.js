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
// STUDENTS ONLY
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

  const userId = String(session.userId);

  // Normal MongoDB ObjectId
  if (ObjectId.isValid(userId)) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });
  }

  // Support older records that may use string _id
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
// CLEAN STRING
// =====================================================

function cleanString(value, maxLength = 200) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

// =====================================================
// VALIDATE PHONE
// =====================================================

function isValidPhone(phone) {
  if (!phone) {
    return true;
  }

  // Allows Ghana/international-style phone numbers,
  // spaces, +, -, and parentheses.
  return /^[+0-9()\-\s]{7,20}$/.test(phone);
}

// =====================================================
// VALIDATE PROFILE IMAGE
// =====================================================

function isValidProfileImage(image) {
  if (!image) {
    return true;
  }

  // Allow normal URLs
  if (/^https?:\/\/.+/i.test(image)) {
    return true;
  }

  // Allow data URLs if your upload system uses them
  if (/^data:image\/[a-zA-Z]+;base64,/.test(image)) {
    return true;
  }

  return false;
}

// =====================================================
// FORMAT STUDENT
// =====================================================

function formatStudent(student) {
  if (!student) {
    return null;
  }

  return {
    ...student,
    _id: student._id.toString(),
  };
}

// =====================================================
// GET CURRENT STUDENT PROFILE
// =====================================================

export async function GET() {
  try {
    // ===================================================
    // AUTHENTICATION
    // ===================================================

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    // ===================================================
    // DATABASE
    // ===================================================

    const db = await getDatabase();

    // ===================================================
    // FIND CURRENT USER
    // ===================================================

    const user = await getCurrentUser(session, db);

    if (!user) {
      return NextResponse.json(
        {
          error: "Student account could not be found.",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // GET STUDENT ID
    // ===================================================

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

    // ===================================================
    // FIND STUDENT PROFILE
    // ===================================================

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

    // ===================================================
    // RETURN PROFILE
    // ===================================================

    return NextResponse.json(
      {
        student: formatStudent(student),
      },
      { status: 200 }
    );
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
// STUDENTS ONLY
// =====================================================

export async function PUT(request) {
  try {
    // ===================================================
    // AUTHENTICATION
    // ===================================================

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Student authentication required.",
        },
        { status: 401 }
      );
    }

    // ===================================================
    // DATABASE
    // ===================================================

    const db = await getDatabase();

    // ===================================================
    // FIND CURRENT USER
    // ===================================================

    const user = await getCurrentUser(session, db);

    if (!user) {
      return NextResponse.json(
        {
          error: "Student account could not be found.",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // GET STUDENT ID
    // ===================================================

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

    // ===================================================
    // READ REQUEST BODY
    // ===================================================

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Invalid profile data.",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // CLEAN PROFILE DATA
    // ===================================================

    const firstName = cleanString(body.firstName, 80);
    const lastName = cleanString(body.lastName, 80);

    const phone = cleanString(body.phone, 30);

    const dateOfBirth = cleanString(
      body.dateOfBirth,
      30
    );

    const gender = cleanString(
      body.gender,
      50
    );

    const program = cleanString(
      body.program,
      150
    );

    const educationLevel = cleanString(
      body.educationLevel,
      150
    );

    const school = cleanString(
      body.school,
      200
    );

    const address = cleanString(
      body.address,
      300
    );

    const emergencyContactName = cleanString(
      body.emergencyContactName,
      120
    );

    const emergencyContactPhone = cleanString(
      body.emergencyContactPhone,
      30
    );

    const profileImage = cleanString(
      body.profileImage,
      200000
    );

    // ===================================================
    // REQUIRED FIELDS
    // ===================================================

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "First name and last name are required.",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // PHONE VALIDATION
    // ===================================================

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid phone number.",
        },
        { status: 400 }
      );
    }

    if (!isValidPhone(emergencyContactPhone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid emergency contact phone number.",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // PROFILE IMAGE VALIDATION
    // ===================================================

    if (!isValidProfileImage(profileImage)) {
      return NextResponse.json(
        {
          error:
            "The profile image must be a valid image URL or supported image data.",
        },
        { status: 400 }
      );
    }

    // ===================================================
    // UPDATE PROFILE
    // ===================================================

    const updates = {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      program,
      educationLevel,
      school,
      address,
      emergencyContactName,
      emergencyContactPhone,
      profileImage,
      updatedAt: new Date(),
    };

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

    // ===================================================
    // PROFILE NOT FOUND
    // ===================================================

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          error: "Student profile not found.",
        },
        { status: 404 }
      );
    }

    // ===================================================
    // GET UPDATED PROFILE
    // ===================================================

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

    // ===================================================
    // SUCCESS
    // ===================================================

    return NextResponse.json(
      {
        message: "Profile updated successfully.",
        student: formatStudent(updatedStudent),
      },
      { status: 200 }
    );
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