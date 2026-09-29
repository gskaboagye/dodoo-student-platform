import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";

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

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const token =
      typeof body?.token === "string"
        ? body.token.trim()
        : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    const confirmPassword =
      typeof body?.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!token || !email) {
      return NextResponse.json(
        {
          error:
            "Invalid or incomplete password reset request.",
        },
        {
          status: 400,
        }
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        {
          error:
            "New password and password confirmation are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          error:
            "Passwords do not match.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
        },
        {
          status: 400,
        }
      );
    }

    const client = await clientPromise;

    const dbName =
      process.env.DB_NAME || "DCCPlatform";

    const db = client.db(dbName);

    const tokenHash =
      hashToken(token);

    const user =
      await db.collection("users").findOne({
        email,

        passwordResetToken:
          tokenHash,

        passwordResetExpiresAt: {
          $gt: new Date(),
        },
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "This password reset link is invalid or has expired. Please request a new password reset link.",
        },
        {
          status: 400,
        }
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const result =
      await db.collection("users").updateOne(
        {
          _id: user._id,

          passwordResetToken:
            tokenHash,

          passwordResetExpiresAt: {
            $gt: new Date(),
          },
        },
        {
          $set: {
            passwordHash,

            updatedAt: new Date(),
          },

          $unset: {
            passwordResetToken: "",

            passwordResetExpiresAt: "",
          },
        }
      );

    if (result.modifiedCount !== 1) {
      return NextResponse.json(
        {
          error:
            "Your password could not be updated. Please request a new reset link.",
        },
        {
          status: 409,
        }
      );
    }

    console.log(
      "PASSWORD RESET SUCCESSFUL:",
      {
        userId:
          user._id?.toString(),

        email,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Your password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while resetting your password.",
      },
      {
        status: 500,
      }
    );
  }
}