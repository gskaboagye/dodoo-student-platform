import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { verifySession } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const SESSION_COOKIE = "dcc_session";

function clearSessionCookie(cookieStore) {
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export async function GET() {
  try {
    // =======================================================
    // GET SESSION COOKIE
    // =======================================================

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No active session.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // VERIFY JWT SESSION
    // =======================================================

    const session = await verifySession(token);

    if (!session) {
      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // VALIDATE SESSION USER ID
    // =======================================================

    if (!session.userId) {
      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message: "Invalid session.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // DATABASE
    // =======================================================

    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    // =======================================================
    // FIND USER
    // =======================================================

    let user = null;

    const userId = String(session.userId);

    if (ObjectId.isValid(userId)) {
      user = await db.collection("users").findOne({
        _id: new ObjectId(userId),
      });
    }

    // Fallback for legacy records where _id may be stored as a string
    if (!user) {
      user = await db.collection("users").findOne({
        _id: userId,
      });
    }

    // =======================================================
    // USER DOES NOT EXIST
    // =======================================================

    if (!user) {
      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message: "User account not found.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // ACCOUNT STATUS
    // =======================================================

    const accountStatus = String(
      user.status || session.status || "active"
    ).toLowerCase();

    if (accountStatus !== "active") {
      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message: "Your account is not active.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // ROLE
    // =======================================================

    const role = String(
      user.role || session.role || ""
    ).toLowerCase();

    if (!["student", "facilitator"].includes(role)) {
      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message: "Invalid account role.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // FULL NAME
    // =======================================================

    const fullName =
      [
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user.name ||
      user.email ||
      "User";

    // =======================================================
    // STUDENT ID
    // =======================================================

    const studentId =
      user.studentId ||
      session.studentId ||
      null;

    // =======================================================
    // STUDENT SAFETY CHECK
    // =======================================================

    if (role === "student" && !studentId) {
      console.error(
        "ACTIVE STUDENT HAS NO STUDENT ID:",
        user._id?.toString()
      );

      clearSessionCookie(cookieStore);

      return NextResponse.json(
        {
          authenticated: false,
          message:
            "Your student account is not properly linked. Please contact a facilitator.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // AUTHENTICATED USER
    // =======================================================

    return NextResponse.json(
      {
        authenticated: true,

        user: {
          id:
            user._id?.toString() ||
            userId,

          firstName:
            user.firstName || "",

          lastName:
            user.lastName || "",

          name:
            fullName,

          email:
            user.email ||
            session.email ||
            "",

          role:
            role,

          studentId:
            studentId,

          status:
            accountStatus,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "AUTH ME SESSION ERROR:",
      error
    );

    try {
      const cookieStore = await cookies();
      clearSessionCookie(cookieStore);
    } catch (cookieError) {
      console.error(
        "SESSION COOKIE CLEAR ERROR:",
        cookieError
      );
    }

    return NextResponse.json(
      {
        authenticated: false,
        message:
          "Unable to retrieve session.",
      },
      {
        status: 401,
      }
    );
  }
}