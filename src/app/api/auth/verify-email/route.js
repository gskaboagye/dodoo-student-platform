import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
  try {
    // =======================================================
    // READ REQUEST
    // =======================================================

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

    const email = body?.email?.trim()?.toLowerCase();
    const code = body?.code?.trim();

    // =======================================================
    // VALIDATE INPUT
    // =======================================================

    if (!email || !code) {
      return NextResponse.json(
        {
          error:
            "Email and verification code are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Verification code must contain 6 digits.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // DATABASE
    // =======================================================

    const client = await clientPromise;

    const dbName =
      process.env.DB_NAME || "DCCPlatform";

    const db = client.db(dbName);
    const users = db.collection("users");

    // =======================================================
    // FIND USER
    // =======================================================

    const user = await users.findOne({
      email,
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account was found with this email address.",
        },
        {
          status: 404,
        }
      );
    }

    // =======================================================
    // ALREADY VERIFIED
    // =======================================================

    if (user.emailVerified === true) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Your email is already verified.",
        },
        {
          status: 200,
        }
      );
    }

    // =======================================================
    // CHECK VERIFICATION CODE
    // =======================================================

    if (!user.emailVerificationCode) {
      return NextResponse.json(
        {
          error:
            "No verification code is available. Please request a new code.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // CHECK CODE EXPIRATION
    // =======================================================

    if (!user.emailVerificationExpiresAt) {
      return NextResponse.json(
        {
          error:
            "Your verification code is no longer valid. Please request a new code.",
        },
        {
          status: 400,
        }
      );
    }

    const expirationTime = new Date(
      user.emailVerificationExpiresAt
    ).getTime();

    if (
      Number.isNaN(expirationTime) ||
      expirationTime <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Your verification code has expired. Please request a new code.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // CHECK CODE
    // =======================================================

    if (
      String(user.emailVerificationCode) !== code
    ) {
      return NextResponse.json(
        {
          error:
            "Incorrect verification code.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // VERIFY EMAIL
    // =======================================================

    const now = new Date();

    const updateResult = await users.updateOne(
      {
        _id: user._id,

        // Re-check these values during the update
        // to avoid verifying an outdated code.
        emailVerified: {
          $ne: true,
        },

        emailVerificationCode:
          user.emailVerificationCode,
      },
      {
        $set: {
          emailVerified: true,
          updatedAt: now,
        },

        $unset: {
          emailVerificationCode: "",
          emailVerificationExpiresAt: "",
          verificationLastSentAt: "",
        },
      }
    );

    // =======================================================
    // CHECK UPDATE RESULT
    // =======================================================

    if (updateResult.modifiedCount !== 1) {
      return NextResponse.json(
        {
          error:
            "The verification code is no longer valid. Please request a new code.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // SUCCESS
    // =======================================================

    return NextResponse.json(
      {
        success: true,
        message:
          "Your email has been verified successfully. You can now log in.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "EMAIL VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while verifying your email.",
      },
      {
        status: 500,
      }
    );
  }
}