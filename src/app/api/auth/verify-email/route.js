import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();

    if (!email || !code) {
      return NextResponse.json(
        {
          error: "Email and verification code are required.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error: "Verification code must contain exactly 6 digits.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "No account was found with this email address.",
        },
        { status: 404 }
      );
    }

    if (user.emailVerified === true) {
      return NextResponse.json(
        {
          message: "Your email is already verified.",
        },
        { status: 200 }
      );
    }

    if (!user.emailVerificationCode) {
      return NextResponse.json(
        {
          error:
            "No verification code is available for this account.",
        },
        { status: 400 }
      );
    }

    if (
      user.emailVerificationExpiresAt &&
      new Date(user.emailVerificationExpiresAt) < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "Your verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    if (user.emailVerificationCode !== code) {
      return NextResponse.json(
        {
          error: "Incorrect verification code.",
        },
        { status: 400 }
      );
    }

    await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date(),
        },
        $unset: {
          emailVerificationCode: "",
          emailVerificationExpiresAt: "",
        },
      }
    );

    return NextResponse.json(
      {
        message:
          "Email verified successfully. You can now log in.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while verifying your email.",
      },
      { status: 500 }
    );
  }
}