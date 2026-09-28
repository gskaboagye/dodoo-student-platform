import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth";

// =========================================================
// HELPERS
// =========================================================

function normalizeEmail(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function normalizeRole(value) {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function getDisplayName(user) {
  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.name ||
    user.email ||
    "User"
  );
}

// =========================================================
// LOGIN
// =========================================================

export async function POST(request) {
  try {
    // -------------------------------------------------------
    // READ REQUEST
    // -------------------------------------------------------

    let body;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const email = normalizeEmail(body.email);

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const role = normalizeRole(body.role);

    const facilitatorCode =
      typeof body.facilitatorCode === "string"
        ? body.facilitatorCode.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATE INPUT
    // -------------------------------------------------------

    if (!email || !password || !role) {
      return NextResponse.json(
        {
          error:
            "Email, password, and role are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !["student", "facilitator"].includes(role)
    ) {
      return NextResponse.json(
        {
          error: "Invalid account type.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // FACILITATOR CODE REQUIRED
    // -------------------------------------------------------

    if (
      role === "facilitator" &&
      !facilitatorCode
    ) {
      return NextResponse.json(
        {
          error:
            "Facilitator invitation code is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // DATABASE
    // -------------------------------------------------------

    const client =
      await clientPromise;

    const dbName =
      process.env.DB_NAME ||
      "DCCPlatform";

    const db =
      client.db(dbName);

    // -------------------------------------------------------
    // FIND USER
    // -------------------------------------------------------

    const user =
      await db
        .collection("users")
        .findOne({
          email,
        });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------------
    // PASSWORD
    // -------------------------------------------------------

    if (!user.passwordHash) {
      console.error(
        "LOGIN ERROR: User has no password hash.",
        {
          userId:
            user._id?.toString(),
          email: user.email,
        }
      );

      return NextResponse.json(
        {
          error:
            "This account cannot be logged in at the moment. Please contact the administrator.",
        },
        {
          status: 500,
        }
      );
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // -------------------------------------------------------
    // ROLE CHECK
    // -------------------------------------------------------

    if (user.role !== role) {
      return NextResponse.json(
        {
          error:
            "The selected account type does not match this account.",
        },
        {
          status: 403,
        }
      );
    }

    // -------------------------------------------------------
    // FACILITATOR INVITATION CODE
    // -------------------------------------------------------

    if (role === "facilitator") {
      const expectedCode =
        process.env.FACILITATOR_CODE;

      if (
        !expectedCode ||
        facilitatorCode !== expectedCode
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid facilitator invitation code.",
          },
          {
            status: 403,
          }
        );
      }
    }

    // -------------------------------------------------------
    // EMAIL VERIFICATION
    // -------------------------------------------------------

    if (user.emailVerified !== true) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before logging in.",
        },
        {
          status: 403,
        }
      );
    }

    // =======================================================
    // STUDENT ACCOUNT STATUS
    // =======================================================

    if (user.role === "student") {
      // -----------------------------------------------------
      // Pending
      // -----------------------------------------------------

      if (user.status === "pending") {
        return NextResponse.json(
          {
            error:
              "Your account is waiting for facilitator approval.",
            status: "pending",
          },
          {
            status: 403,
          }
        );
      }

      // -----------------------------------------------------
      // Rejected
      // -----------------------------------------------------

      if (user.status === "rejected") {
        return NextResponse.json(
          {
            error:
              "Your student account was not approved.",
            status: "rejected",
          },
          {
            status: 403,
          }
        );
      }
    }

    // =======================================================
    // GENERAL ACCOUNT STATUS
    // =======================================================

    if (user.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Your account is not active.",
          status:
            user.status || "unknown",
        },
        {
          status: 403,
        }
      );
    }

    // =======================================================
    // STUDENT SAFETY CHECK
    // =======================================================

    if (
      user.role === "student" &&
      !user.studentId
    ) {
      console.error(
        "LOGIN ERROR: Active student has no studentId.",
        {
          userId:
            user._id?.toString(),
          email: user.email,
        }
      );

      return NextResponse.json(
        {
          error:
            "Your student account is not fully configured yet. Please contact the administrator.",
        },
        {
          status: 403,
        }
      );
    }

    // =======================================================
    // CREATE SESSION
    // =======================================================

    const displayName =
      getDisplayName(user);

    const token =
      await createSession({
        id:
          user._id.toString(),

        userId:
          user._id.toString(),

        role:
          user.role,

        studentId:
          user.studentId || null,

        name:
          displayName,

        email:
          user.email,

        status:
          user.status,
      });

    // =======================================================
    // SESSION COOKIE
    // =======================================================

    const cookieStore =
      await cookies();

    /*
     * Session cookie:
     *
     * - httpOnly prevents JavaScript access
     * - secure is enabled in production
     * - sameSite=lax helps protect against CSRF
     * - path=/ makes it available throughout the platform
     *
     * No maxAge or expires is specified, so the cookie
     * behaves as a browser session cookie.
     */

    cookieStore.set(
      "dcc_session",
      token,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        path: "/",
      }
    );

    // =======================================================
    // SUCCESS RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,

      message:
        "Login successful.",

      user: {
        id:
          user._id.toString(),

        name:
          displayName,

        email:
          user.email,

        role:
          user.role,

        studentId:
          user.studentId ||
          null,

        status:
          user.status,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong during login.",
      },
      {
        status: 500,
      }
    );
  }
}