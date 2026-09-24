import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;
    const facilitatorCode = body.facilitatorCode?.trim();

    // Basic validation
    if (!email || !password || !role) {
      return NextResponse.json(
        {
          error:
            "Email, password, and account type are required.",
        },
        { status: 400 }
      );
    }

    // Only these two roles are allowed
    if (role !== "student" && role !== "facilitator") {
      return NextResponse.json(
        {
          error: "Please select Student or Facilitator.",
        },
        { status: 400 }
      );
    }

    // Facilitators must provide the invitation code
    if (role === "facilitator" && !facilitatorCode) {
      return NextResponse.json(
        {
          error:
            "The facilitator invitation code is required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const dbName =
      process.env.DB_NAME || "DCCPlatform";

    const db = client.db(dbName);

    // Find account
    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Check password
    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Make sure selected role matches the actual account role
    if (user.role !== role) {
      return NextResponse.json(
        {
          error:
            user.role === "student"
              ? "This account is registered as a student. Please select Student to continue."
              : "This account is registered as a facilitator. Please select Facilitator to continue.",
        },
        { status: 403 }
      );
    }

    // Verify facilitator invitation code
    if (role === "facilitator") {
      const expectedFacilitatorCode =
        process.env.FACILITATOR_CODE;

      if (!expectedFacilitatorCode) {
        console.error(
          "FACILITATOR_CODE is not configured."
        );

        return NextResponse.json(
          {
            error:
              "Facilitator login is temporarily unavailable. Please contact the administrator.",
          },
          { status: 500 }
        );
      }

      if (facilitatorCode !== expectedFacilitatorCode) {
        return NextResponse.json(
          {
            error:
              "Invalid facilitator invitation code.",
          },
          { status: 403 }
        );
      }
    }

    // Email verification
    if (user.emailVerified !== true) {
      return NextResponse.json(
        {
          error:
            "Please verify your email address before logging in.",
          emailVerificationRequired: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Student approval checks
    if (
      user.role === "student" &&
      user.status === "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is waiting for facilitator approval.",
        },
        { status: 403 }
      );
    }

    if (
      user.role === "student" &&
      user.status === "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Your student registration was not approved.",
        },
        { status: 403 }
      );
    }

    // Account must be active
    if (user.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Your account is not active. Please contact the facilitator.",
        },
        { status: 403 }
      );
    }

    // Create session
    const sessionToken = await createSession({
      id: user._id.toString(),
      role: user.role,
      studentId: user.studentId
        ? user.studentId.toString()
        : null,
      name: user.name,
      email: user.email,
      status: user.status,
    });

    // Set secure session cookie
    const cookieStore = await cookies();

    cookieStore.set(
      "dcc_session",
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      }
    );

    return NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId
            ? user.studentId.toString()
            : null,
          status: user.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong during login.",
      },
      { status: 500 }
    );
  }
}