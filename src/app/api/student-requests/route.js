import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// =========================================================
// SESSION
// =========================================================

async function getSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =========================================================
// FACILITATOR AUTHORIZATION
// =========================================================

async function requireFacilitator() {
  const session =
    await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  if (
    session.role !==
    "facilitator"
  ) {
    return {
      error: NextResponse.json(
        {
          error:
            "Only facilitators can perform this action.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    session,
  };
}

// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(value = "") {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

// =========================================================
// SEND STUDENT APPROVAL EMAIL
// =========================================================

async function sendApprovalEmail({
  name,
  email,
}) {
  const apiKey =
    process.env.RESEND_API_KEY;

  const fromEmail =
    process.env.EMAIL_FROM ||
    "Dodoo Coding Club <hello@dccstudentplatform.com>";

  // -------------------------------------------------------
  // Check Resend configuration
  // -------------------------------------------------------

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  if (!fromEmail) {
    throw new Error(
      "EMAIL_FROM is not configured."
    );
  }

  if (!email) {
    throw new Error(
      "Student email address is missing."
    );
  }

  // -------------------------------------------------------
  // Student name
  // -------------------------------------------------------

  const studentName =
    name?.trim() ||
    "Student";

  const safeStudentName =
    escapeHtml(studentName);

  // -------------------------------------------------------
  // Email HTML
  // -------------------------------------------------------

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Dodoo Coding Club - Application Approved
  </title>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    background-color: #f1f5f9;
    font-family: Arial, Helvetica, sans-serif;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color: #f1f5f9;
      padding: 40px 20px;
    "
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
          "
        >

          <!-- HEADER -->

          <tr>
            <td
              style="
                background-color: #0f172a;
                padding: 30px;
                text-align: center;
              "
            >
              <h1
                style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 26px;
                "
              >
                Dodoo Coding Club
              </h1>

              <p
                style="
                  margin: 8px 0 0;
                  color: #cbd5e1;
                  font-size: 14px;
                "
              >
                Student Success &amp; Impact Platform
              </p>
            </td>
          </tr>

          <!-- CONTENT -->

          <tr>
            <td
              style="
                padding: 40px 35px;
                color: #334155;
              "
            >

              <h2
                style="
                  margin: 0 0 20px;
                  color: #0f172a;
                  font-size: 24px;
                "
              >
                Your Application Has Been Approved!
              </h2>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                "
              >
                Hello
                <strong>${safeStudentName}</strong>,
              </p>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 16px;
                  line-height: 1.7;
                "
              >
                We are pleased to let you know that
                your request to join the
                <strong>
                  Dodoo Coding Club Student Platform
                </strong>
                has been approved.
              </p>

              <p
                style="
                  margin: 0 0 25px;
                  font-size: 16px;
                  line-height: 1.7;
                "
              >
                Your student account is now active.
                You can log in to the platform and
                access your student resources,
                profile, attendance, progress,
                projects, and other available features.
              </p>

              <!-- LOGIN BUTTON -->

              <div
                style="
                  text-align: center;
                  margin: 30px 0;
                "
              >
                <a
                  href="https://dccstudentplatform.com/login"
                  style="
                    display: inline-block;
                    padding: 14px 28px;
                    background-color: #0f172a;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: bold;
                  "
                >
                  Log In to Student Platform
                </a>
              </div>

              <p
                style="
                  margin: 0 0 16px;
                  font-size: 15px;
                  line-height: 1.7;
                  color: #64748b;
                "
              >
                If you did not request to join Dodoo
                Coding Club, please contact the
                platform administrator.
              </p>

              <p
                style="
                  margin: 25px 0 0;
                  font-size: 16px;
                  line-height: 1.7;
                "
              >
                Welcome to Dodoo Coding Club!
              </p>

              <p
                style="
                  margin: 20px 0 0;
                  font-size: 15px;
                  line-height: 1.6;
                "
              >
                Best regards,<br />

                <strong>
                  Dodoo Coding Club
                </strong><br />

                Student Success &amp; Impact Platform
              </p>

            </td>
          </tr>

          <!-- FOOTER -->

          <tr>
            <td
              style="
                background-color: #f8fafc;
                padding: 20px 30px;
                text-align: center;
              "
            >
              <p
                style="
                  margin: 0;
                  color: #94a3b8;
                  font-size: 12px;
                "
              >
                This is an automated message from
                the Dodoo Coding Club Student Platform.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  // -------------------------------------------------------
  // Plain-text email
  // -------------------------------------------------------

  const text = `Hello ${studentName},

Your request to join the Dodoo Coding Club Student Platform has been approved.

Your student account is now active.

You can log in to the platform here:

https://dccstudentplatform.com/login

You can now access your student resources, profile, attendance, progress, projects, and other available features.

Welcome to Dodoo Coding Club!

Best regards,
Dodoo Coding Club
Student Success & Impact Platform`;

  // -------------------------------------------------------
  // Send through Resend
  // -------------------------------------------------------

  console.log(
    "SENDING STUDENT APPROVAL EMAIL:",
    {
      to: email,
      from: fromEmail,
    }
  );

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from: fromEmail,

          to: [email],

          subject:
            "Your Dodoo Coding Club Application Has Been Approved",

          text,

          html,
        }),
      }
    );

  // -------------------------------------------------------
  // Read Resend response
  // -------------------------------------------------------

  let data = {};

  try {
    data =
      await response.json();
  } catch (jsonError) {
    console.error(
      "RESEND RESPONSE JSON ERROR:",
      jsonError
    );
  }

  console.log(
    "RESEND APPROVAL EMAIL RESPONSE:",
    {
      status:
        response.status,

      ok:
        response.ok,

      data,
    }
  );

  // -------------------------------------------------------
  // Handle Resend failure
  // -------------------------------------------------------

  if (!response.ok) {
    console.error(
      "RESEND APPROVAL EMAIL ERROR:",
      {
        status:
          response.status,

        data,

        recipient:
          email,
      }
    );

    throw new Error(
      data?.message ||
        data?.error ||
        `Resend request failed with status ${response.status}.`
    );
  }

  // -------------------------------------------------------
  // Successful email
  // -------------------------------------------------------

  console.log(
    "RESEND APPROVAL EMAIL SUCCESS:",
    {
      id:
        data?.id ||
        null,

      recipient:
        email,
    }
  );

  return data;
}

// =========================================================
// CREATE NOTIFICATION FOR STUDENT REQUEST
// =========================================================

async function notifyStudentRequest({
  user,
  action,
}) {
  if (!user?._id) {
    return;
  }

  try {
    let title =
      "Student Request Updated";

    let message =
      "Your student platform request has been updated.";

    if (action === "accept") {
      title =
        "Application Approved";

      message =
        "Your request to join the Dodoo Coding Club Student Platform has been approved. Your student account is now active.";
    }

    if (action === "reject") {
      title =
        "Application Not Approved";

      message =
        "Your request to join the Dodoo Coding Club Student Platform was not approved.";
    }

    await createNotification({
      userId:
        user._id.toString(),

      title,

      message,

      type:
        "student-request",

      link:
        action === "accept"
          ? "/dashboard"
          : "/login",
    });
  } catch (notificationError) {
    // A notification failure must never
    // undo the request decision.
    console.error(
      "STUDENT REQUEST NOTIFICATION ERROR:",
      notificationError
    );
  }
}

// =========================================================
// GET STUDENT REQUESTS
// =========================================================

export async function GET() {
  try {
    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const client =
      await clientPromise;

    const dbName =
      process.env.DB_NAME ||
      "DCCPlatform";

    const db =
      client.db(dbName);

    const requests =
      await db
        .collection("users")
        .find({
          role: "student",
          status: "pending",
          emailVerified: true,
        })
        .sort({
          createdAt: -1,
        })
        .toArray();

    const formattedRequests =
      requests.map(
        (user) => ({
          id:
            user._id.toString(),

          name:
            user.name || "",

          email:
            user.email || "",

          program:
            user.program || "",

          status:
            user.status,

          emailVerified:
            user.emailVerified ===
            true,

          createdAt:
            user.createdAt ||
            null,
        })
      );

    return NextResponse.json({
      requests:
        formattedRequests,
    });
  } catch (error) {
    console.error(
      "STUDENT REQUESTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load student requests.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// ACCEPT / REJECT STUDENT REQUEST
// =========================================================

export async function POST(
  request
) {
  try {
    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const body =
      await request.json();

    const userId =
      body.userId;

    const action =
      body.action;

    // -------------------------------------------------------
    // Validate request
    // -------------------------------------------------------

    if (
      !userId ||
      !action
    ) {
      return NextResponse.json(
        {
          error:
            "User ID and action are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "accept",
        "reject",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ObjectId.isValid(
        userId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Database
    // -------------------------------------------------------

    const client =
      await clientPromise;

    const dbName =
      process.env.DB_NAME ||
      "DCCPlatform";

    const db =
      client.db(dbName);

    // -------------------------------------------------------
    // Find pending student
    // -------------------------------------------------------

    const user =
      await db
        .collection("users")
        .findOne({
          _id:
            new ObjectId(
              userId
            ),

          role:
            "student",

          status:
            "pending",

          emailVerified:
            true,
        });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Student request was not found, is already processed, or the email has not been verified.",
        },
        {
          status: 404,
        }
      );
    }

    // =======================================================
    // REJECT
    // =======================================================

    if (
      action === "reject"
    ) {
      await db
        .collection("users")
        .updateOne(
          {
            _id:
              user._id,
          },
          {
            $set: {
              status:
                "rejected",

              updatedAt:
                new Date(),
            },
          }
        );

      // -----------------------------------------------------
      // CREATE NOTIFICATION
      // -----------------------------------------------------

      await notifyStudentRequest({
        user,
        action:
          "reject",
      });

      return NextResponse.json({
        message:
          "Student request rejected.",
      });
    }

    // =======================================================
    // ACCEPT
    // =======================================================

    const existingStudent =
      await db
        .collection("students")
        .findOne({
          email:
            user.email,
        });

    let studentId;

    // -------------------------------------------------------
    // Existing student
    // -------------------------------------------------------

    if (
      existingStudent
    ) {
      studentId =
        existingStudent._id;

      await db
        .collection("students")
        .updateOne(
          {
            _id:
              existingStudent._id,
          },
          {
            $set: {
              status:
                "Active",

              updatedAt:
                new Date(),
            },
          }
        );
    }

    // -------------------------------------------------------
    // Create new student
    // -------------------------------------------------------

    else {
      const nameParts =
        (
          user.name ||
          ""
        )
          .trim()
          .split(/\s+/);

      const firstName =
        nameParts.shift() ||
        "";

      const lastName =
        nameParts.join(" ") ||
        "";

      const enrollmentDate =
        new Date();

      const expectedCompletionDate =
        new Date(
          enrollmentDate
        );

      expectedCompletionDate.setMonth(
        expectedCompletionDate.getMonth() +
          24
      );

      const student = {
        firstName,

        lastName,

        email:
          user.email,

        phone:
          "",

        dateOfBirth:
          "",

        gender:
          "",

        program:
          user.program ||
          "Software Development",

        educationLevel:
          "",

        school:
          "",

        address:
          "",

        emergencyContactName:
          "",

        emergencyContactPhone:
          "",

        enrollmentDate,

        expectedCompletionDate,

        programDurationMonths:
          24,

        status:
          "Active",

        progress:
          0,

        profileImage:
          "",

        createdAt:
          new Date(),

        updatedAt:
          new Date(),
      };

      const result =
        await db
          .collection("students")
          .insertOne(
            student
          );

      studentId =
        result.insertedId;
    }

    // =======================================================
    // ACTIVATE USER ACCOUNT
    // =======================================================

    await db
      .collection("users")
      .updateOne(
        {
          _id:
            user._id,
        },
        {
          $set: {
            status:
              "active",

            studentId,

            updatedAt:
              new Date(),
          },
        }
      );

    // =======================================================
    // CREATE APPROVAL NOTIFICATION
    // =======================================================

    await notifyStudentRequest({
      user,
      action:
        "accept",
    });

    // =======================================================
    // SEND APPROVAL EMAIL
    // =======================================================

    let emailSent =
      false;

    let emailResponseId =
      null;

    let emailErrorMessage =
      "";

    try {
      const emailResult =
        await sendApprovalEmail({
          name:
            user.name ||
            `${user.firstName || ""} ${
              user.lastName || ""
            }`.trim(),

          email:
            user.email,
        });

      emailSent =
        true;

      emailResponseId =
        emailResult?.id ||
        null;

      console.log(
        "STUDENT APPROVAL EMAIL SENT:",
        {
          studentEmail:
            user.email,

          resendId:
            emailResponseId,
        }
      );
    } catch (emailError) {
      /*
       * IMPORTANT:
       *
       * The student has already been approved.
       * We do not undo the approval if Resend
       * fails.
       */

      emailErrorMessage =
        emailError?.message ||
        "Unknown email error.";

      console.error(
        "STUDENT APPROVAL EMAIL FAILED:",
        {
          message:
            emailError?.message,

          stack:
            emailError?.stack,

          studentEmail:
            user.email,
        }
      );
    }

    // =======================================================
    // SUCCESS
    // =======================================================

    return NextResponse.json({
      message:
        emailSent
          ? "Student accepted successfully. An approval email has been sent to the student."
          : "Student accepted successfully, but the approval email could not be sent.",

      studentId:
        studentId.toString(),

      emailSent,

      emailResponseId,

      emailError:
        emailSent
          ? null
          : emailErrorMessage,
    });
  } catch (error) {
    console.error(
      "STUDENT REQUEST POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to process student request.",
      },
      {
        status: 500,
      }
    );
  }
}