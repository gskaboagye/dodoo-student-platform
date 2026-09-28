import { NextResponse } from "next/server";
import { Resend } from "resend";

import clientPromise from "@/lib/mongodb";

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // =======================================================
    // VALIDATE EMAIL
    // =======================================================

    if (!email) {
      return NextResponse.json(
        {
          error: "Email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // CHECK EMAIL CONFIGURATION
    // =======================================================

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured.");

      return NextResponse.json(
        {
          error: "Email service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    if (!process.env.EMAIL_FROM) {
      console.error("EMAIL_FROM is not configured.");

      return NextResponse.json(
        {
          error: "Email sender is not configured.",
        },
        {
          status: 500,
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

    /*
     * Do not reveal whether an email address exists in the
     * database.
     */
    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account exists with this email, a verification code will be sent.",
        },
        {
          status: 200,
        }
      );
    }

    // =======================================================
    // ALREADY VERIFIED
    // =======================================================

    if (user.emailVerified === true) {
      return NextResponse.json(
        {
          error:
            "This email address is already verified. You can log in.",
        },
        {
          status: 400,
        }
      );
    }

    // =======================================================
    // RATE LIMIT
    // =======================================================

    if (user.verificationLastSentAt) {
      const lastSentTime = new Date(
        user.verificationLastSentAt
      ).getTime();

      if (!Number.isNaN(lastSentTime)) {
        const secondsSinceLastRequest =
          (Date.now() - lastSentTime) / 1000;

        if (secondsSinceLastRequest < 60) {
          const secondsRemaining = Math.ceil(
            60 - secondsSinceLastRequest
          );

          return NextResponse.json(
            {
              error: `Please wait ${secondsRemaining} seconds before requesting another code.`,
            },
            {
              status: 429,
            }
          );
        }
      }
    }

    // =======================================================
    // GENERATE VERIFICATION CODE
    // =======================================================

    const verificationCode =
      generateVerificationCode();

    const verificationExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    const now = new Date();

    // =======================================================
    // SAVE VERIFICATION CODE
    // =======================================================

    await users.updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          emailVerificationCode:
            verificationCode,

          emailVerificationExpiresAt:
            verificationExpiresAt,

          verificationLastSentAt: now,

          updatedAt: now,
        },
      }
    );

    // =======================================================
    // PREPARE EMAIL
    // =======================================================

    const resend = new Resend(
      process.env.RESEND_API_KEY
    );

    const accountType =
      user.role === "facilitator"
        ? "Facilitator"
        : "Student";

    const recipientName =
      user.name ||
      [
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ") ||
      "there";

    // =======================================================
    // SEND EMAIL
    // =======================================================

    const emailResult =
      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject:
          "Dodoo Coding Club - New Verification Code",

        html: `
          <div style="
            font-family: Arial, Helvetica, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            color: #172033;
          ">

            <div style="
              background: #2563eb;
              padding: 25px;
              border-radius: 12px 12px 0 0;
              text-align: center;
            ">
              <h1 style="
                color: white;
                margin: 0;
                font-size: 24px;
              ">
                Dodoo Coding Club
              </h1>
            </div>

            <div style="
              border: 1px solid #e2e8f0;
              border-top: none;
              padding: 30px;
              border-radius: 0 0 12px 12px;
            ">

              <h2 style="margin-top: 0;">
                New Verification Code
              </h2>

              <p>
                Hello <strong>${recipientName}</strong>,
              </p>

              <p>
                You requested a new verification code
                for your ${accountType} account.
              </p>

              <p>
                Please enter the verification code below:
              </p>

              <div style="
                margin: 30px 0;
                padding: 25px;
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 10px;
                text-align: center;
              ">

                <div style="
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 10px;
                  color: #2563eb;
                ">
                  ${verificationCode}
                </div>

              </div>

              <p>
                This verification code will expire in
                <strong>10 minutes</strong>.
              </p>

              <p>
                Your previous verification code is no
                longer valid.
              </p>

              <p style="
                margin-top: 30px;
                color: #64748b;
              ">
                Regards,<br>
                <strong>Dodoo Coding Club</strong>
              </p>

            </div>
          </div>
        `,

        text: `
DODOO CODING CLUB

NEW VERIFICATION CODE

Hello ${recipientName},

You requested a new verification code for your ${accountType} account.

Your new verification code is:

${verificationCode}

This verification code will expire in 10 minutes.

Your previous verification code is no longer valid.

Regards,

Dodoo Coding Club
        `,
      });

    // =======================================================
    // EMAIL ERROR
    // =======================================================

    if (emailResult?.error) {
      console.error(
        "RESEND EMAIL ERROR:",
        emailResult.error
      );

      /*
       * Clear the newly generated verification code
       * because the email was not successfully sent.
       */
      await users.updateOne(
        {
          _id: user._id,
        },
        {
          $unset: {
            emailVerificationCode: "",
            emailVerificationExpiresAt: "",
          },
        }
      );

      return NextResponse.json(
        {
          error:
            emailResult.error.message ||
            "The verification email could not be sent.",
        },
        {
          status: 500,
        }
      );
    }

    // =======================================================
    // SUCCESS
    // =======================================================

    console.log(
      `New verification code sent to ${email}`
    );

    console.log(
      "Resend message ID:",
      emailResult?.data?.id || "Unavailable"
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "A new verification code has been sent to your email address.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "RESEND VERIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while sending the new verification code.",
      },
      {
        status: 500,
      }
    );
  }
}