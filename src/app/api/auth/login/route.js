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

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

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

    if (user.role === "student" && user.status === "pending") {
      return NextResponse.json(
        {
          error:
            "Your account is waiting for facilitator approval.",
        },
        { status: 403 }
      );
    }

    if (user.role === "student" && user.status === "rejected") {
      return NextResponse.json(
        {
          error:
            "Your student registration was not approved.",
        },
        { status: 403 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Your account is not active. Please contact the facilitator.",
        },
        { status: 403 }
      );
    }

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

    const cookieStore = await cookies();

    cookieStore.set("dcc_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

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
        error: "Something went wrong during login.",
      },
      { status: 500 }
    );
  }
}