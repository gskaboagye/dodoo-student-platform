import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import clientPromise from "@/lib/mongodb";

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role?.trim().toLowerCase();
    const program = body.program?.trim() || "";
    const facilitatorCode = body.facilitatorCode?.trim() || "";

    // ---------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        {
          error: "Name, email, password, and role are required.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.",
        },
        { status: 400 }
      );
    }

    if (!["student", "facilitator"].includes(role)) {
      return NextResponse.json(
        {
          error: "Invalid account role.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // STUDENT VALIDATION
    // ---------------------------------------

    if (role === "student" && !program) {
      return NextResponse.json(
        {
          error: "Please select your program.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // FACILITATOR VALIDATION
    // ---------------------------------------

    if (role === "facilitator") {
      if (!facilitatorCode) {
        return NextResponse.json(
          {
            error: "Facilitator invitation code is required.",
          },
          { status: 400 }
        );
      }

      if (
        !process.env.FACILITATOR_CODE ||
        facilitatorCode !== process.env.FACILITATOR_CODE
      ) {
        return NextResponse.json(
          {
            error: "Invalid facilitator invitation code.",
          },
          { status: 403 }
        );
      }
    }

    // ---------------------------------------
    // EMAIL CONFIGURATION
    // ---------------------------------------

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Email service is not configured. Please contact the administrator.",
        },
        { status: 500 }
      );
    }

    if (!process.env.EMAIL_FROM) {
      return NextResponse.json(
        {
          error:
            "Email sender is not configured. Please contact the administrator.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // DATABASE
    // ---------------------------------------

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const existingUser = await db.collection("users").findOne({
      email,
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------
    // PASSWORD
    // ---------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // ---------------------------------------
    // VERIFICATION CODE
    // ---------------------------------------

    const verificationCode = generateVerificationCode();

    const verificationExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // ---------------------------------------
    // USER ACCOUNT
    // ---------------------------------------

    const user = {
      name,
      email,
      passwordHash,

      role,

      program: role === "student" ? program : "",

      // Students need facilitator approval.
      // Facilitators become active after email verification.
      status: role === "student" ? "pending" : "active",

      studentId: null,

      emailVerified: false,

      emailVerificationCode: verificationCode,

      emailVerificationExpiresAt: verificationExpiresAt,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(user);

    // ---------------------------------------
    // SEND VERIFICATION EMAIL
    // ---------------------------------------

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const accountType =
        role === "facilitator" ? "Facilitator" : "Student";

      const emailResult = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject: `Dodoo Coding Club - Verify Your ${accountType} Account`,
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
                Verify Your Email
              </h2>

              <p>
                Hello <strong>${name}</strong>,
              </p>

              <p>
                Thank you for registering as a
                <strong>${accountType}</strong>
                with Dodoo Coding Club.
              </p>

              <p>
                Please enter the verification code below
                to verify your email address:
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

              ${
                role === "student"
                  ? `
                    <p>
                      After verifying your email, your student
                      account will remain pending until a
                      facilitator reviews and approves your
                      registration.
                    </p>
                  `
                  : `
                    <p>
                      After verifying your email, you can log
                      in to your facilitator account.
                    </p>
                  `
              }

              <p>
                If you did not create this account, you can
                safely ignore this email.
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
      });

      // ---------------------------------------
      // CHECK RESEND RESPONSE
      // ---------------------------------------

      if (emailResult?.error) {
        console.error(
          "RESEND EMAIL ERROR:",
          emailResult.error
        );

        // Delete account because email verification
        // could not be completed.
        await db.collection("users").deleteOne({
          _id: result.insertedId,
        });

        return NextResponse.json(
          {
            error:
              emailResult.error.message ||
              "The verification email could not be sent.",
          },
          { status: 500 }
        );
      }

      console.log(
        `Verification email sent successfully to ${email}`
      );

      console.log(
        "Resend message ID:",
        emailResult?.data?.id
      );
    } catch (emailError) {
      console.error(
        "VERIFICATION EMAIL EXCEPTION:",
        emailError
      );

      // Remove account if email could not be sent.
      await db.collection("users").deleteOne({
        _id: result.insertedId,
      });

      return NextResponse.json(
        {
          error:
            emailError?.message ||
            "We could not send the verification email.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------
    // SUCCESS
    // ---------------------------------------

    return NextResponse.json(
      {
        message:
          "Registration successful. A verification code has been sent to your email.",
        email,
        role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong during registration.",
      },
      { status: 500 }
    );
  }
}