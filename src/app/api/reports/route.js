import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// ---------------------------------------------------------
// DATABASE
// ---------------------------------------------------------

async function getDatabase() {
  const client = await clientPromise;
  const dbName = process.env.DB_NAME || "DCCPlatform";

  return client.db(dbName);
}

// ---------------------------------------------------------
// USER NAME
// ---------------------------------------------------------

function getFullName(user) {
  if (!user) {
    return "";
  }

  const firstName = user.firstName?.trim() || "";
  const lastName = user.lastName?.trim() || "";

  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (user.name?.trim()) {
    return user.name.trim();
  }

  return user.email?.trim() || "";
}

// ---------------------------------------------------------
// CURRENT USER
// ---------------------------------------------------------

async function getCurrentUser(session, db) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  // Try ObjectId first.
  if (ObjectId.isValid(session.userId)) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    });
  }

  // Some older records may use a string ID.
  if (!user) {
    user = await db.collection("users").findOne({
      _id: session.userId,
    });
  }

  return user;
}

// ---------------------------------------------------------
// GET REPORTS
// ---------------------------------------------------------
// Student:
//   - sees only their own reports
//
// Facilitator:
//   - sees all reports
// ---------------------------------------------------------

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    const db = await getDatabase();

    let query = {};

    // -----------------------------------------------------
    // STUDENT
    // -----------------------------------------------------
    if (session.role === "student") {
      /*
       * IMPORTANT:
       * Do NOT rely only on session.studentId.
       *
       * Get the real logged-in student from MongoDB and
       * use the studentId stored on that account.
       */
      const studentUser = await getCurrentUser(session, db);

      if (!studentUser) {
        return NextResponse.json(
          {
            message: "Student account could not be found.",
          },
          {
            status: 404,
          }
        );
      }

      const studentId =
        studentUser.studentId ||
        session.studentId ||
        "";

      if (!studentId) {
        return NextResponse.json(
          {
            message:
              "Your account is not linked to a student record.",
          },
          {
            status: 400,
          }
        );
      }

      /*
       * This must match the studentId saved when the
       * student originally submitted the report.
       */
      query = {
        studentId: studentId,
      };
    }

    // -----------------------------------------------------
    // FACILITATOR
    // -----------------------------------------------------
    else if (session.role === "facilitator") {
      // Facilitators can see all reports.
      query = {};
    }

    // -----------------------------------------------------
    // UNKNOWN ROLE
    // -----------------------------------------------------
    else {
      return NextResponse.json(
        {
          message: "Unauthorized role.",
        },
        {
          status: 403,
        }
      );
    }

    // -----------------------------------------------------
    // FIND REPORTS
    // -----------------------------------------------------

    const reports = await db
      .collection("reports")
      .find(query)
      .sort({
        createdAt: -1,
      })
      .toArray();

    // -----------------------------------------------------
    // FORMAT REPORTS
    // -----------------------------------------------------

    const formattedReports = reports.map((report) => ({
      ...report,

      _id: report._id.toString(),

      // Student information
      studentId: report.studentId || "",
      studentName: report.studentName || "",
      studentEmail: report.studentEmail || "",

      // Report information
      title: report.title || "",
      category: report.category || "",
      description: report.description || "",
      priority: report.priority || "Normal",
      status: report.status || "Open",

      // Facilitator response
      response: report.response || "",
      facilitatorId: report.facilitatorId || "",
      facilitatorName: report.facilitatorName || "",
      facilitatorEmail: report.facilitatorEmail || "",
      respondedAt: report.respondedAt || null,

      // Dates
      createdAt: report.createdAt || null,
      updatedAt: report.updatedAt || null,
    }));

    return NextResponse.json(
      {
        reports: formattedReports,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET REPORTS ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to retrieve reports.",
      },
      {
        status: 500,
      }
    );
  }
}

// ---------------------------------------------------------
// POST REPORT
// ---------------------------------------------------------
// Only students can submit reports.
// ---------------------------------------------------------

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    if (session.role !== "student") {
      return NextResponse.json(
        {
          message: "Only students can submit reports.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const title = body.title?.trim();
    const category = body.category?.trim();
    const description = body.description?.trim();
    const priority = body.priority?.trim() || "Normal";

    if (!title || !category || !description) {
      return NextResponse.json(
        {
          message:
            "Title, category, and description are required.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    // Get the real logged-in student.
    const studentUser = await getCurrentUser(session, db);

    if (!studentUser) {
      return NextResponse.json(
        {
          message: "Student account could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const studentName = getFullName(studentUser);

    const studentEmail =
      studentUser.email?.trim() ||
      session.email?.trim() ||
      "";

    /*
     * Always prefer the studentId from the MongoDB
     * user account.
     */
    const studentId =
      studentUser.studentId ||
      session.studentId ||
      "";

    if (!studentId) {
      return NextResponse.json(
        {
          message:
            "Your account is not linked to a student record. Please contact a facilitator.",
        },
        {
          status: 400,
        }
      );
    }

    if (!studentName) {
      return NextResponse.json(
        {
          message:
            "Your account does not have a name configured. Please contact a facilitator.",
        },
        {
          status: 400,
        }
      );
    }

    const report = {
      // REAL STUDENT INFORMATION
      studentId,
      studentName,
      studentEmail,

      // REPORT INFORMATION
      title,
      category,
      description,
      priority,

      // REPORT STATUS
      status: "Open",

      // FACILITATOR RESPONSE
      response: "",
      facilitatorId: "",
      facilitatorName: "",
      facilitatorEmail: "",
      respondedAt: null,

      // DATES
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("reports")
      .insertOne(report);

    return NextResponse.json(
      {
        message: "Report submitted successfully.",

        report: {
          ...report,
          _id: result.insertedId.toString(),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("CREATE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to submit report.",
      },
      {
        status: 500,
      }
    );
  }
}

// ---------------------------------------------------------
// DELETE REPORT
// ---------------------------------------------------------
// Only facilitators can delete reports.
// ---------------------------------------------------------

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await verifySession(token);

    if (!session || session.role !== "facilitator") {
      return NextResponse.json(
        {
          message: "Only facilitators can delete reports.",
        },
        {
          status: 403,
        }
      );
    }

    const { id } = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid report ID.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    const result = await db
      .collection("reports")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          message: "Report not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        message: "Report deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("DELETE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to delete report.",
      },
      {
        status: 500,
      }
    );
  }
}

// ---------------------------------------------------------
// PATCH REPORT
// ---------------------------------------------------------
// Only facilitators can update reports.
// ---------------------------------------------------------

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await verifySession(token);

    if (!session || session.role !== "facilitator") {
      return NextResponse.json(
        {
          message: "Only facilitators can update reports.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const id = body.id;
    const status = body.status?.trim();
    const response = body.response?.trim() || "";

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid report ID.",
        },
        {
          status: 400,
        }
      );
    }

    const allowedStatuses = [
      "Open",
      "In Progress",
      "Resolved",
      "Closed",
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          message: "Invalid report status.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    // Get the real logged-in facilitator.
    const facilitatorUser = await getCurrentUser(
      session,
      db
    );

    if (!facilitatorUser) {
      return NextResponse.json(
        {
          message: "Facilitator account could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const facilitatorName = getFullName(
      facilitatorUser
    );

    const facilitatorEmail =
      facilitatorUser.email?.trim() ||
      session.email?.trim() ||
      "";

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    // -----------------------------------------------------
    // SAVE RESPONSE
    // -----------------------------------------------------

    if (response) {
      updateData.response = response;

      updateData.facilitatorId =
        facilitatorUser._id?.toString() ||
        session.userId ||
        "";

      updateData.facilitatorName =
        facilitatorName || "Facilitator";

      updateData.facilitatorEmail =
        facilitatorEmail;

      updateData.respondedAt = new Date();
    } else {
      updateData.response = "";
      updateData.facilitatorId = "";
      updateData.facilitatorName = "";
      updateData.facilitatorEmail = "";
      updateData.respondedAt = null;
    }

    const result = await db
      .collection("reports")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: updateData,
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message: "Report not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updatedReport = await db
      .collection("reports")
      .findOne({
        _id: new ObjectId(id),
      });

    return NextResponse.json(
      {
        message: "Report updated successfully.",

        report: updatedReport
          ? {
              ...updatedReport,
              _id: updatedReport._id.toString(),
            }
          : null,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("UPDATE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to update report.",
      },
      {
        status: 500,
      }
    );
  }
}