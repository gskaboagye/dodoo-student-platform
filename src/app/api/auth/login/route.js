import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          error:
            "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const dbName =
      process.env.DB_NAME || "DCCPlatform";

    const db = client.db(dbName);

    const user = await db
      .collection("users")
      .findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // CHECK PASSWORD
    // ---------------------------------------------

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
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // CHECK ACCOUNT STATUS
    // ---------------------------------------------

    const accountStatus =
      user.status || "active";

    // ---------------------------------------------
    // PENDING STUDENT
    // ---------------------------------------------

    if (
      user.role === "student" &&
      accountStatus === "pending"
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is awaiting facilitator approval. You cannot access the dashboard until your registration has been accepted.",
          status: "pending",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------
    // REJECTED STUDENT
    // ---------------------------------------------

    if (
      user.role === "student" &&
      accountStatus === "rejected"
    ) {
      return NextResponse.json(
        {
          error:
            "Your student registration has been rejected. Please contact Dodoo Coding Club for more information.",
          status: "rejected",
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------
    // INACTIVE ACCOUNT
    // ---------------------------------------------

    if (accountStatus !== "active") {
      return NextResponse.json(
        {
          error:
            "Your account is not active. Please contact a facilitator.",
          status: accountStatus,
        },
        { status: 403 }
      );
    }

    // ---------------------------------------------
    // CREATE SESSION
    // ---------------------------------------------

    const userForSession = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.studentId
        ? user.studentId.toString()
        : null,
      status: user.status || "active",
    };

    const sessionToken =
      await createSession(userForSession);

    const cookieStore = await cookies();

    cookieStore.set(
      "dcc_session",
      sessionToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        maxAge:
          60 * 60 * 24 * 7,
        path: "/",
      }
    );

    return NextResponse.json({
      message: "Login successful.",
      user: userForSession,
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to login. Please try again.",
      },
      { status: 500 }
    );
  }
}