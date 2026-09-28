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

  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySession(token);
  } catch (error) {
    console.error("SESSION VERIFICATION ERROR:", error);
    return null;
  }
}

// =========================================================
// FACILITATOR AUTHORIZATION
// =========================================================

async function requireFacilitator() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "facilitator") {
    return {
      error: NextResponse.json(
        {
          error:
            "Only facilitators can perform this action.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    session,
  };
}

// =========================================================
// DATABASE
// =========================================================

async function getDatabase() {
  const client = await clientPromise;

  const dbName =
    process.env.DB_NAME || "DCCPlatform";

  return client.db(dbName);
}

// =========================================================
// HELPERS
// =========================================================

function isValidObjectId(value) {
  return (
    typeof value === "string" &&
    ObjectId.isValid(value)
  );
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStudentNames(name = "") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = parts.shift() || "";
  const lastName = parts.join(" ") || "";

  return {
    firstName,
    lastName,
  };
}

// =========================================================
// SEND APPROVAL EMAIL
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

  const studentName =
    String(name || "Student").trim();

  const safeStudentName =
    escapeHtml(studentName);

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

  console.log(
    "SENDING STUDENT APPROVAL EMAIL:",
    {
      to: email,
      from: fromEmail,
    }
  );

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
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

  let data = {};

  try {
    data = await response.json();
  } catch (jsonError) {
    console.error(
      "RESEND RESPONSE JSON ERROR:",
      jsonError
    );
  }

  console.log(
    "RESEND APPROVAL EMAIL RESPONSE:",
    {
      status: response.status,
      ok: response.ok,
      data,
    }
  );

  if (!response.ok) {
    console.error(
      "RESEND APPROVAL EMAIL ERROR:",
      {
        status: response.status,
        data,
        recipient: email,
      }
    );

    throw new Error(
      data?.message ||
        data?.error ||
        `Resend request failed with status ${response.status}.`
    );
  }

  return data;
}

// =========================================================
// STUDENT NOTIFICATION
// =========================================================

async function notifyStudentRequest({
  user,
  action,
}) {
  if (!user?._id) {
    return;
  }

  let title =
    "Student Request Updated";

  let message =
    "Your student platform request has been updated.";

  let link = "/login";

  if (action === "accept") {
    title = "Application Approved";

    message =
      "Your request to join the Dodoo Coding Club Student Platform has been approved. Your student account is now active.";

    link = "/dashboard";
  }

  if (action === "reject") {
    title = "Application Not Approved";

    message =
      "Your request to join the Dodoo Coding Club Student Platform was not approved.";

    link = "/login";
  }

  try {
    await createNotification({
      userId: user._id.toString(),
      title,
      message,
      type: "student-request",
      link,
    });
  } catch (notificationError) {
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

    const db = await getDatabase();

    const requests = await db
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
      requests.map((user) => ({
        id: user._id.toString(),

        name: user.name || "",

        email: user.email || "",

        program: user.program || "",

        status: user.status,

        emailVerified:
          user.emailVerified === true,

        createdAt:
          user.createdAt || null,
      }));

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      total: formattedRequests.length,
    });
  } catch (error) {
    console.error(
      "STUDENT REQUESTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
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

export async function POST(request) {
  try {
    // -------------------------------------------------------
    // Authorization
    // -------------------------------------------------------

    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    // -------------------------------------------------------
    // Read request body
    // -------------------------------------------------------

    let body;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = body.userId;
    const action = body.action;

    // -------------------------------------------------------
    // Validate request
    // -------------------------------------------------------

    if (!userId || !action) {
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
      !["accept", "reject"].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action. Use accept or reject.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        {
          error: "Invalid user ID.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // Database
    // -------------------------------------------------------

    const db = await getDatabase();

    const userObjectId =
      new ObjectId(userId);

    // -------------------------------------------------------
    // Find pending, verified student
    // -------------------------------------------------------

    const user = await db
      .collection("users")
      .findOne({
        _id: userObjectId,
        role: "student",
        status: "pending",
        emailVerified: true,
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

    if (action === "reject") {
      const updateResult = await db
        .collection("users")
        .updateOne(
          {
            _id: user._id,
            role: "student",
            status: "pending",
          },
          {
            $set: {
              status: "rejected",
              updatedAt: new Date(),
            },
          }
        );

      if (updateResult.modifiedCount === 0) {
        return NextResponse.json(
          {
            error:
              "The student request could not be rejected because it may have already been processed.",
          },
          {
            status: 409,
          }
        );
      }

      // Notify student
      await notifyStudentRequest({
        user,
        action: "reject",
      });

      return NextResponse.json({
        success: true,
        message:
          "Student request rejected.",
      });
    }

    // =======================================================
    // ACCEPT
    // =======================================================

    // -------------------------------------------------------
    // Check whether a student record already exists
    // -------------------------------------------------------

    const existingStudent =
      await db
        .collection("students")
        .findOne({
          email: user.email,
        });

    let studentId;
    let studentWasCreated = false;

    // -------------------------------------------------------
    // Existing student
    // -------------------------------------------------------

    if (existingStudent) {
      studentId = existingStudent._id;

      await db
        .collection("students")
        .updateOne(
          {
            _id: existingStudent._id,
          },
          {
            $set: {
              status: "Active",
              updatedAt: new Date(),
            },
          }
        );
    }

    // -------------------------------------------------------
    // Create new student
    // -------------------------------------------------------

    else {
      const {
        firstName,
        lastName,
      } = getStudentNames(user.name);

      const enrollmentDate =
        new Date();

      const expectedCompletionDate =
        new Date(enrollmentDate);

      expectedCompletionDate.setMonth(
        expectedCompletionDate.getMonth() +
          24
      );

      const student = {
        firstName,
        lastName,

        email: user.email,

        phone: "",

        dateOfBirth: "",

        gender: "",

        program:
          user.program ||
          "Software Development",

        educationLevel: "",

        school: "",

        address: "",

        emergencyContactName: "",

        emergencyContactPhone: "",

        enrollmentDate,

        expectedCompletionDate,

        programDurationMonths: 24,

        status: "Active",

        progress: 0,

        profileImage: "",

        createdAt: new Date(),

        updatedAt: new Date(),
      };

      const result = await db
        .collection("students")
        .insertOne(student);

      studentId = result.insertedId;
      studentWasCreated = true;
    }

    // =======================================================
    // ACTIVATE USER ACCOUNT
    // =======================================================

    const userUpdateResult =
      await db
        .collection("users")
        .updateOne(
          {
            _id: user._id,
            role: "student",
            status: "pending",
          },
          {
            $set: {
              status: "active",

              studentId,

              updatedAt: new Date(),
            },
          }
        );

    // -------------------------------------------------------
    // Safety check
    // -------------------------------------------------------

    if (
      userUpdateResult.modifiedCount === 0
    ) {
      // If we created a brand-new student record but
      // could not activate the user, remove the student
      // record so we do not leave an orphaned student.
      if (studentWasCreated && studentId) {
        await db
          .collection("students")
          .deleteOne({
            _id: studentId,
          });
      }

      return NextResponse.json(
        {
          error:
            "The student account could not be activated. Please try again.",
        },
        {
          status: 409,
        }
      );
    }

    // =======================================================
    // CREATE APPROVAL NOTIFICATION
    // =======================================================

    await notifyStudentRequest({
      user,
      action: "accept",
    });

    // =======================================================
    // SEND APPROVAL EMAIL
    // =======================================================

    let emailSent = false;
    let emailResponseId = null;
    let emailErrorMessage = "";

    try {
      const emailResult =
        await sendApprovalEmail({
          name:
            user.name ||
            `${user.firstName || ""} ${
              user.lastName || ""
            }`.trim(),

          email: user.email,
        });

      emailSent = true;

      emailResponseId =
        emailResult?.id || null;

      console.log(
        "STUDENT APPROVAL EMAIL SENT:",
        {
          studentEmail: user.email,
          resendId: emailResponseId,
        }
      );
    } catch (emailError) {
      /*
       * The student has already been approved.
       *
       * We do NOT undo the approval if the
       * approval email fails.
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
      success: true,

      message: emailSent
        ? "Student accepted successfully. An approval email has been sent to the student."
        : "Student accepted successfully, but the approval email could not be sent.",

      studentId:
        studentId.toString(),

      emailSent,

      emailResponseId,

      emailError: emailSent
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
        success: false,
        error:
          error?.message ||
          "Failed to process student request.",
      },
      {
        status: 500,
      }
    );
  }
}