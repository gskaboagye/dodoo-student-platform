import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

import clientPromise from "@/lib/mongodb";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

    const email = body?.email
      ?.trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Please contact the administrator.",
        },
        {
          status: 500,
        }
      );
    }

    if (!process.env.EMAIL_FROM) {
      return NextResponse.json(
        {
          error:
            "Email sender is not configured. Please contact the administrator.",
        },
        {
          status: 500,
        }
      );
    }

    const client = await clientPromise;

    const dbName =
      process.env.DB_NAME || "DCCPlatform";

    const db = client.db(dbName);

    const user =
      await db.collection("users").findOne({
        email,
      });

    /*
     * Always return the same successful response
     * whether the email exists or not.
     *
     * This prevents someone from discovering
     * which email addresses have accounts.
     */

    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with that email address, a password reset link has been sent.",
      });
    }

    /*
     * Only allow password recovery for supported
     * student and facilitator accounts.
     */

    const role =
      String(user.role || "").toLowerCase();

    if (
      role !== "student" &&
      role !== "facilitator"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with that email address, a password reset link has been sent.",
      });
    }

    /*
     * Generate a cryptographically secure token.
     */

    const resetToken =
      crypto.randomBytes(32).toString("hex");

    /*
     * Store only the SHA-256 hash of the token.
     */

    const resetTokenHash =
      hashToken(resetToken);

    /*
     * Reset link expires after 30 minutes.
     */

    const resetTokenExpiresAt =
      new Date(
        Date.now() + 30 * 60 * 1000
      );

    await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          passwordResetToken:
            resetTokenHash,

          passwordResetExpiresAt:
            resetTokenExpiresAt,

          updatedAt: new Date(),
        },
      }
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://dccstudentplatform.com";

    const resetUrl =
      `${baseUrl}/reset-password?token=${encodeURIComponent(
        resetToken
      )}&email=${encodeURIComponent(email)}`;

    const resend =
      new Resend(
        process.env.RESEND_API_KEY
      );

    const studentName =
      String(
        user.name || "User"
      ).trim();

    const emailResult =
      await resend.emails.send({
        from: process.env.EMAIL_FROM,

        to: [email],

        subject:
          "Dodoo Coding Club - Reset Your Password",

        html: `
          <div
            style="
              font-family: Arial, Helvetica, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 30px;
              color: #172033;
            "
          >

            <div
              style="
                background: #2563eb;
                padding: 25px;
                border-radius: 12px 12px 0 0;
                text-align: center;
              "
            >
              <h1
                style="
                  color: white;
                  margin: 0;
                  font-size: 24px;
                "
              >
                Dodoo Coding Club
              </h1>
            </div>

            <div
              style="
                border: 1px solid #e2e8f0;
                border-top: none;
                padding: 30px;
                border-radius: 0 0 12px 12px;
              "
            >

              <h2>
                Reset Your Password
              </h2>

              <p>
                Hello
                <strong>${studentName}</strong>,
              </p>

              <p>
                We received a request to reset
                your Dodoo Coding Club account
                password.
              </p>

              <p>
                Click the button below to create
                a new password.
              </p>

              <div
                style="
                  text-align: center;
                  margin: 30px 0;
                "
              >
                <a
                  href="${resetUrl}"
                  style="
                    display: inline-block;
                    padding: 14px 28px;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                  "
                >
                  Reset Password
                </a>
              </div>

              <p>
                This password reset link will expire
                in <strong>30 minutes</strong>.
              </p>

              <p>
                If you did not request a password
                reset, you can safely ignore this
                email.
              </p>

              <p
                style="
                  margin-top: 30px;
                  color: #64748b;
                "
              >
                Regards,<br />
                <strong>Dodoo Coding Club</strong>
              </p>

            </div>
          </div>
        `,
      });

    if (emailResult?.error) {
      console.error(
        "PASSWORD RESET EMAIL ERROR:",
        emailResult.error
      );

      /*
       * Remove the reset token if the email
       * could not be sent.
       */

      await db
        .collection("users")
        .updateOne(
          {
            _id: user._id,
          },
          {
            $unset: {
              passwordResetToken: "",
              passwordResetExpiresAt: "",
            },
          }
        );

      return NextResponse.json(
        {
          error:
            "The password reset email could not be sent. Please try again later.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "PASSWORD RESET EMAIL SENT:",
      {
        email,
        userId:
          user._id?.toString(),
        resendId:
          emailResult?.data?.id,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with that email address, a password reset link has been sent.",
    });
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again later.",
      },
      {
        status: 500,
      }
    );
  }
}