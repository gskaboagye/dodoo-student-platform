import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =========================================================
// PASSWORD VALIDATION
// =========================================================

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

// =========================================================
// GET DATABASE
// =========================================================

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

// =========================================================
// GET CURRENT SESSION
// =========================================================

async function getSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =========================================================
// GET CURRENT USER
// =========================================================

async function getCurrentUser(db, session) {
  if (!session?.userId) {
    return null;
  }

  const { ObjectId } = await import("mongodb");

  let user = null;

  if (ObjectId.isValid(session.userId)) {
    user = await db
      .collection("users")
      .findOne({
        _id: new ObjectId(session.userId),
      });
  }

  if (!user) {
    user = await db
      .collection("users")
      .findOne({
        _id: session.userId,
      });
  }

  return user;
}

// =========================================================
// POST - CHANGE PASSWORD
// =========================================================

export async function POST(request) {
  try {
    // -------------------------------------------------------
    // CHECK SESSION
    // -------------------------------------------------------

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          error:
            "Your session has expired. Please log in again.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------------
    // DATABASE
    // -------------------------------------------------------

    const db = await getDatabase();

    // -------------------------------------------------------
    // CURRENT USER
    // -------------------------------------------------------

    const user = await getCurrentUser(
      db,
      session
    );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Your account could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // REQUEST BODY
    // -------------------------------------------------------

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    // -------------------------------------------------------
    // REQUIRED FIELDS
    // -------------------------------------------------------

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete all password fields.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CURRENT PASSWORD
    // -------------------------------------------------------

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Your account does not have a valid password record. Please contact the administrator.",
        },
        {
          status: 500,
        }
      );
    }

    const currentPasswordMatches =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        {
          error:
            "Your current password is incorrect.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // NEW PASSWORD VALIDATION
    // -------------------------------------------------------

    if (!isStrongPassword(newPassword)) {
      return NextResponse.json(
        {
          error:
            "New password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CONFIRM NEW PASSWORD
    // -------------------------------------------------------

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          error:
            "New password and confirmation password do not match.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // PREVENT SAME PASSWORD
    // -------------------------------------------------------

    const sameAsCurrent =
      await bcrypt.compare(
        newPassword,
        user.passwordHash
      );

    if (sameAsCurrent) {
      return NextResponse.json(
        {
          error:
            "Your new password must be different from your current password.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // HASH NEW PASSWORD
    // -------------------------------------------------------

    const newPasswordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    // -------------------------------------------------------
    // UPDATE DATABASE
    // -------------------------------------------------------

    const result = await db
      .collection("users")
      .updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            passwordHash:
              newPasswordHash,
            updatedAt: new Date(),
          },
        }
      );

    // -------------------------------------------------------
    // CHECK UPDATE
    // -------------------------------------------------------

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          error:
            "Your account could not be updated.",
        },
        {
          status: 500,
        }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        {
          error:
            "Your password could not be changed.",
        },
        {
          status: 500,
        }
      );
    }

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message:
          "Your password has been changed successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "CHANGE PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while changing your password. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}