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

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required." },
        { status: 400 }
      );
    }

    if (!["student", "facilitator"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid account type." },
        { status: 400 }
      );
    }

    if (role === "facilitator" && !facilitatorCode) {
      return NextResponse.json(
        { error: "Facilitator invitation code is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.role !== role) {
      return NextResponse.json(
        {
          error:
            "The selected account type does not match this account.",
        },
        { status: 403 }
      );
    }

    if (role === "facilitator") {
      const expectedCode = process.env.FACILITATOR_CODE;

      if (!expectedCode || facilitatorCode !== expectedCode) {
        return NextResponse.json(
          { error: "Invalid facilitator invitation code." },
          { status: 403 }
        );
      }
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before logging in.",
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
          error: "Your student account was not approved.",
        },
        { status: 403 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        {
          error: "Your account is not active.",
        },
        { status: 403 }
      );
    }

    const token = await createSession({
      id: user._id.toString(),
      role: user.role,
      studentId: user.studentId || null,
      name:
        [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        user.name ||
        user.email,
      email: user.email,
      status: user.status,
    });

    const cookieStore = await cookies();

    cookieStore.set("dcc_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      message: "Login successful.",
      user: {
        id: user._id.toString(),
        name:
          [user.firstName, user.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          user.name ||
          user.email,
        email: user.email,
        role: user.role,
        studentId: user.studentId || null,
        status: user.status,
      },
    });
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