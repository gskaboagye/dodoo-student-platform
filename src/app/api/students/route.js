import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

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

function addMonths(date, months) {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months
  );

  return result;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidPhone(phone) {
  if (!phone) {
    return true;
  }

  const normalized = String(phone)
    .replace(/[\s()-]/g, "");

  return /^\+?[0-9]{7,15}$/.test(
    normalized
  );
}

function isValidProfileImage(value) {
  if (!value) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  );
}

function formatDateForDatabase(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// =====================================================
// GET
// =====================================================
// Facilitators can view all students.
// Students are NOT allowed to access this endpoint.
// =====================================================

export async function GET() {
  try {
    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    const db = await getDatabase();

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
// =====================================================
// Facilitators can edit student records.
// =====================================================

export async function PUT(request) {
  try {
    // -------------------------------------------------
    // FACILITATOR AUTHORIZATION
    // -------------------------------------------------

    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    // -------------------------------------------------
    // READ REQUEST BODY
    // -------------------------------------------------

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

    // -------------------------------------------------
    // VALIDATE STUDENT ID
    // -------------------------------------------------

    const id = body?.id;

    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        {
          message:
            "A valid student ID is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // DATABASE
    // -------------------------------------------------

    const db = await getDatabase();

    const studentObjectId =
      new ObjectId(id);

    // -------------------------------------------------
    // FIND EXISTING STUDENT
    // -------------------------------------------------

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

    // -------------------------------------------------
    // PREPARE UPDATE
    // -------------------------------------------------

    const updateData = {
      updatedAt: new Date(),
    };

    const changedFields = [];

    // =================================================
    // FIRST NAME
    // =================================================

    if (body.firstName !== undefined) {
      const firstName = cleanString(
        body.firstName
      );

      if (!firstName) {
        return NextResponse.json(
          {
            message:
              "First name cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (firstName.length > 100) {
        return NextResponse.json(
          {
            message:
              "First name is too long.",
          },
          { status: 400 }
        );
      }

      updateData.firstName = firstName;

      if (
        firstName !==
        cleanString(existingStudent.firstName)
      ) {
        changedFields.push(
          "first name"
        );
      }
    }

    // =================================================
    // LAST NAME
    // =================================================

    if (body.lastName !== undefined) {
      const lastName = cleanString(
        body.lastName
      );

      if (!lastName) {
        return NextResponse.json(
          {
            message:
              "Last name cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (lastName.length > 100) {
        return NextResponse.json(
          {
            message:
              "Last name is too long.",
          },
          { status: 400 }
        );
      }

      updateData.lastName = lastName;

      if (
        lastName !==
        cleanString(existingStudent.lastName)
      ) {
        changedFields.push(
          "last name"
        );
      }
    }

    // =================================================
    // EMAIL
    // =================================================

    if (body.email !== undefined) {
      const email = cleanEmail(
        body.email
      );

      if (!email) {
        return NextResponse.json(
          {
            message:
              "Email cannot be empty.",
          },
          { status: 400 }
        );
      }

      if (!isValidEmail(email)) {
        return NextResponse.json(
          {
            message:
              "Please provide a valid email address.",
          },
          { status: 400 }
        );
      }

      const emailOwner =
        await db
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

      if (
        email !==
        cleanEmail(existingStudent.email)
      ) {
        changedFields.push("email");
      }
    }

    // =================================================
    // PHONE
    // =================================================

    if (body.phone !== undefined) {
      const phone = cleanString(
        body.phone
      );

      if (!isValidPhone(phone)) {
        return NextResponse.json(
          {
            message:
              "Please provide a valid phone number.",
          },
          { status: 400 }
        );
      }

      updateData.phone = phone;

      if (
        phone !==
        cleanString(existingStudent.phone)
      ) {
        changedFields.push("phone");
      }
    }

    // =================================================
    // DATE OF BIRTH
    // =================================================

    if (body.dateOfBirth !== undefined) {
      if (
        body.dateOfBirth === null ||
        body.dateOfBirth === ""
      ) {
        updateData.dateOfBirth = null;

        if (existingStudent.dateOfBirth) {
          changedFields.push(
            "date of birth"
          );
        }
      } else {
        if (
          !isValidDate(
            body.dateOfBirth
          )
        ) {
          return NextResponse.json(
            {
              message:
                "Please provide a valid date of birth.",
            },
            { status: 400 }
          );
        }

        const dateOfBirth =
          formatDateForDatabase(
            body.dateOfBirth
          );

        updateData.dateOfBirth =
          dateOfBirth;

        changedFields.push(
          "date of birth"
        );
      }
    }

    // =================================================
    // GENDER
    // =================================================

    if (body.gender !== undefined) {
      const gender = cleanString(
        body.gender
      );

      updateData.gender = gender;

      if (
        gender !==
        cleanString(existingStudent.gender)
      ) {
        changedFields.push("gender");
      }
    }

    // =================================================
    // PROGRAM
    // =================================================

    if (body.program !== undefined) {
      const program = cleanString(
        body.program
      );

      updateData.program = program;

      if (
        program !==
        cleanString(existingStudent.program)
      ) {
        changedFields.push("program");
      }
    }

    // =================================================
    // EDUCATION LEVEL
    // =================================================

    if (
      body.educationLevel !==
      undefined
    ) {
      const educationLevel =
        cleanString(
          body.educationLevel
        );

      updateData.educationLevel =
        educationLevel;

      if (
        educationLevel !==
        cleanString(
          existingStudent.educationLevel
        )
      ) {
        changedFields.push(
          "education level"
        );
      }
    }

    // =================================================
    // SCHOOL
    // =================================================

    if (body.school !== undefined) {
      const school = cleanString(
        body.school
      );

      updateData.school = school;

      if (
        school !==
        cleanString(existingStudent.school)
      ) {
        changedFields.push("school");
      }
    }

    // =================================================
    // ADDRESS
    // =================================================

    if (body.address !== undefined) {
      const address = cleanString(
        body.address
      );

      updateData.address = address;

      if (
        address !==
        cleanString(existingStudent.address)
      ) {
        changedFields.push("address");
      }
    }

    // =================================================
    // EMERGENCY CONTACT NAME
    // =================================================

    if (
      body.emergencyContactName !==
      undefined
    ) {
      const emergencyContactName =
        cleanString(
          body.emergencyContactName
        );

      updateData.emergencyContactName =
        emergencyContactName;

      if (
        emergencyContactName !==
        cleanString(
          existingStudent.emergencyContactName
        )
      ) {
        changedFields.push(
          "emergency contact"
        );
      }
    }

    // =================================================
    // EMERGENCY CONTACT PHONE
    // =================================================

    if (
      body.emergencyContactPhone !==
      undefined
    ) {
      const emergencyContactPhone =
        cleanString(
          body.emergencyContactPhone
        );

      if (
        !isValidPhone(
          emergencyContactPhone
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Please provide a valid emergency contact phone number.",
          },
          { status: 400 }
        );
      }

      updateData.emergencyContactPhone =
        emergencyContactPhone;

      if (
        emergencyContactPhone !==
        cleanString(
          existingStudent.emergencyContactPhone
        )
      ) {
        changedFields.push(
          "emergency contact"
        );
      }
    }

    // =================================================
    // STATUS
    // =================================================

    if (body.status !== undefined) {
      const allowedStatuses = [
        "active",
        "inactive",
        "pending",
        "completed",
        "suspended",
      ];

      if (
        typeof body.status !==
          "string" ||
        !allowedStatuses.includes(
          body.status.toLowerCase()
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Invalid student status.",
          },
          { status: 400 }
        );
      }

      const status =
        body.status.toLowerCase();

      updateData.status = status;

      if (
        status !==
        String(
          existingStudent.status || ""
        ).toLowerCase()
      ) {
        changedFields.push("status");
      }
    }

    // =================================================
    // PROFILE IMAGE
    // =================================================

    if (
      body.profileImage !== undefined
    ) {
      const profileImage =
        cleanString(
          body.profileImage
        );

      if (
        !isValidProfileImage(
          profileImage
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Invalid profile image.",
          },
          { status: 400 }
        );
      }

      updateData.profileImage =
        profileImage;

      if (
        profileImage !==
        cleanString(
          existingStudent.profileImage
        )
      ) {
        changedFields.push(
          "profile picture"
        );
      }
    }

    // =================================================
    // ENROLLMENT DATE
    // =================================================

    if (
      body.enrollmentDate !==
      undefined
    ) {
      if (
        !isValidDate(
          body.enrollmentDate
        )
      ) {
        return NextResponse.json(
          {
            message:
              "A valid enrollment date is required.",
          },
          { status: 400 }
        );
      }

      const enrollmentDate =
        formatDateForDatabase(
          body.enrollmentDate
        );

      updateData.enrollmentDate =
        enrollmentDate;

      // Keep the standard program duration.
      updateData.expectedCompletionDate =
        addMonths(
          enrollmentDate,
          24
        );

      changedFields.push(
        "enrollment date"
      );
    }

    // =================================================
    // EXPECTED COMPLETION DATE
    // =================================================

    if (
      body.expectedCompletionDate !==
      undefined &&
      body.enrollmentDate ===
        undefined
    ) {
      if (
        !isValidDate(
          body.expectedCompletionDate
        )
      ) {
        return NextResponse.json(
          {
            message:
              "Please provide a valid expected completion date.",
          },
          { status: 400 }
        );
      }

      updateData.expectedCompletionDate =
        formatDateForDatabase(
          body.expectedCompletionDate
        );

      changedFields.push(
        "expected completion date"
      );
    }

    // =================================================
    // PROGRAM DURATION
    // =================================================

    if (
      body.programDurationMonths !==
      undefined
    ) {
      const duration = Number(
        body.programDurationMonths
      );

      if (
        !Number.isInteger(duration) ||
        duration <= 0 ||
        duration > 120
      ) {
        return NextResponse.json(
          {
            message:
              "Program duration must be a valid number of months.",
          },
          { status: 400 }
        );
      }

      updateData.programDurationMonths =
        duration;

      changedFields.push(
        "program duration"
      );

      // If enrollment date exists,
      // calculate completion date from
      // the selected duration.
      const enrollmentDate =
        updateData.enrollmentDate ||
        existingStudent.enrollmentDate;

      if (
        enrollmentDate instanceof Date
      ) {
        updateData.expectedCompletionDate =
          addMonths(
            enrollmentDate,
            duration
          );
      }
    }

    // =================================================
    // DO NOT UPDATE IF NOTHING CHANGED
    // =================================================

    if (changedFields.length === 0) {
      return NextResponse.json({
        message:
          "No changes were made.",
        student: existingStudent,
      });
    }

    // =================================================
    // UPDATE STUDENT RECORD
    // =================================================

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

    // =================================================
    // UPDATE LINKED USER ACCOUNT
    // =================================================

    const linkedUserQuery = {
      role: "student",
      $or: [
        {
          studentId:
            studentObjectId,
        },
      ],
    };

    if (existingStudent.email) {
      linkedUserQuery.$or.push({
        email: cleanEmail(
          existingStudent.email
        ),
      });
    }

    const userUpdateData = {};

    if (
      updateData.firstName !==
      undefined
    ) {
      userUpdateData.firstName =
        updateData.firstName;
    }

    if (
      updateData.lastName !==
      undefined
    ) {
      userUpdateData.lastName =
        updateData.lastName;
    }

    if (
      updateData.email !==
      undefined
    ) {
      userUpdateData.email =
        updateData.email;
    }

    if (
      updateData.phone !==
      undefined
    ) {
      userUpdateData.phone =
        updateData.phone;
    }

    if (
      updateData.status !==
      undefined
    ) {
      userUpdateData.status =
        updateData.status;
    }

    if (
      Object.keys(userUpdateData)
        .length > 0
    ) {
      userUpdateData.updatedAt =
        new Date();

      await db
        .collection("users")
        .updateMany(
          linkedUserQuery,
          {
            $set: userUpdateData,
          }
        );
    }

    // =================================================
    // GET UPDATED STUDENT
    // =================================================

    const updatedStudent =
      await db
        .collection("students")
        .findOne({
          _id: studentObjectId,
        });

    // =================================================
    // CREATE STUDENT NOTIFICATION
    // =================================================

    try {
      const studentUser =
        await db
          .collection("users")
          .findOne({
            role: "student",
            $or: [
              {
                studentId:
                  studentObjectId,
              },
              ...(updatedStudent.email
                ? [
                    {
                      email: cleanEmail(
                        updatedStudent.email
                      ),
                    },
                  ]
                : []),
            ],
          });

      if (studentUser?._id) {
        await createNotification({
          userId:
            studentUser._id.toString(),
          title:
            "Profile Updated",
          message:
            "Your student profile has been updated by a facilitator.",
          type:
            "profile-update",
          link:
            "/student/profile",
        });
      }
    } catch (notificationError) {
      console.error(
        "STUDENT UPDATE NOTIFICATION ERROR:",
        notificationError
      );

      // Do not fail the student update
      // because notification creation failed.
    }

    // =================================================
    // SUCCESS
    // =================================================

    return NextResponse.json({
      message:
        "Student updated successfully.",
      student: updatedStudent,
      changedFields,
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
// =====================================================
// Facilitators can permanently remove students.
//
// Deletes:
// 1. Student record
// 2. Student login account
//
// The linked user account is found using:
// - studentId
// - OR student email
// =====================================================

export async function DELETE(request) {
  try {
    // -------------------------------------------------
    // FACILITATOR AUTHORIZATION
    // -------------------------------------------------

    const auth = await requireFacilitator();

    if (!auth.authorized) {
      return auth.response;
    }

    // -------------------------------------------------
    // GET STUDENT ID
    // -------------------------------------------------

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return NextResponse.json(
        {
          message:
            "A valid student ID is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // DATABASE
    // -------------------------------------------------

    const db = await getDatabase();

    const studentObjectId =
      new ObjectId(id);

    // -------------------------------------------------
    // FIND STUDENT
    // -------------------------------------------------

    const student =
      await db
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

    // -------------------------------------------------
    // DELETE STUDENT RECORD
    // -------------------------------------------------

    const studentDeleteResult =
      await db
        .collection("students")
        .deleteOne({
          _id: studentObjectId,
        });

    if (
      studentDeleteResult.deletedCount !==
      1
    ) {
      return NextResponse.json(
        {
          message:
            "The student record could not be deleted.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------
    // DELETE LINKED LOGIN ACCOUNT
    // -------------------------------------------------

    const userDeleteConditions = [
      {
        studentId:
          studentObjectId,
      },
    ];

    if (student.email) {
      userDeleteConditions.push({
        email: cleanEmail(
          student.email
        ),
      });
    }

    const userDeleteResult =
      await db
        .collection("users")
        .deleteMany({
          role: "student",
          $or:
            userDeleteConditions,
        });

    // -------------------------------------------------
    // SUCCESS
    // -------------------------------------------------

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