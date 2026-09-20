import { NextResponse } from "next/server";
import { Resend } from "resend";
import clientPromise from "@/lib/mongodb";

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    if (!process.env.EMAIL_FROM) {
      return NextResponse.json(
        { error: "Email sender is not configured." },
        { status: 500 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);
    const users = db.collection("users");

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account exists with this email, a verification code will be sent.",
        },
        { status: 200 }
      );
    }

    if (user.emailVerified === true) {
      return NextResponse.json(
        {
          error:
            "This email address is already verified. You can log in.",
        },
        { status: 400 }
      );
    }

    if (user.verificationLastSentAt) {
      const secondsSinceLastRequest =
        (Date.now() -
          new Date(user.verificationLastSentAt).getTime()) /
        1000;

      if (secondsSinceLastRequest < 60) {
        const secondsRemaining = Math.ceil(
          60 - secondsSinceLastRequest
        );

        return NextResponse.json(
          {
            error: `Please wait ${secondsRemaining} seconds before requesting another code.`,
          },
          { status: 429 }
        );
      }
    }

    const verificationCode = generateVerificationCode();

    const verificationExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationCode: verificationCode,
          emailVerificationExpiresAt: verificationExpiresAt,
          verificationLastSentAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    const resend = new Resend(process.env.RESEND_API_KEY);

    const accountType =
      user.role === "facilitator" ? "Facilitator" : "Student";

    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: "Dodoo Coding Club - New Verification Code",

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
              Hello <strong>${user.name || "there"}</strong>,
            </p>

            <p>
              You requested a new verification code for your
              ${accountType} account.
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
              Your previous verification code is no longer valid.
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

Hello ${user.name || "there"},

You requested a new verification code for your ${accountType} account.

Your new verification code is:

${verificationCode}

This verification code will expire in 10 minutes.

Your previous verification code is no longer valid.

Regards,
Dodoo Coding Club
      `,
    });

    if (emailResult?.error) {
      console.error("RESEND EMAIL ERROR:", emailResult.error);

      return NextResponse.json(
        {
          error:
            emailResult.error.message ||
            "The verification email could not be sent.",
        },
        { status: 500 }
      );
    }

    console.log(`New verification code sent to ${email}`);
    console.log("Resend message ID:", emailResult?.data?.id);

    return NextResponse.json(
      {
        message:
          "A new verification code has been sent to your email address.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while sending the new verification code.",
      },
      { status: 500 }
    );
  }
}