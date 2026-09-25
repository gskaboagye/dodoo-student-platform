import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =========================================================
// DATABASE
// =========================================================

async function getDatabase() {
  const client = await clientPromise;
  return client.db(process.env.DB_NAME || "DCCPlatform");
}

// =========================================================
// USER NAME
// =========================================================

function getFullName(user) {
  if (!user) return "";

  const firstName = user.firstName?.trim() || "";
  const lastName = user.lastName?.trim() || "";

  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) return fullName;

  if (user.name?.trim()) {
    return user.name.trim();
  }

  return user.email?.trim() || "";
}

// =========================================================
// NORMALIZE ID
// =========================================================

function normalizeId(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return value.toString().trim();
}

// =========================================================
// CURRENT USER
// =========================================================

async function getCurrentUser(session, db) {
  if (!session?.userId) return null;

  let user = null;

  if (ObjectId.isValid(session.userId)) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    });
  }

  if (!user) {
    user = await db.collection("users").findOne({
      _id: session.userId,
    });
  }

  return user;
}

// =========================================================
// GET REPORTS
// =========================================================

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    // =======================================================
    // STUDENT
    // =======================================================

    if (session.role === "student") {
      const studentUser = await getCurrentUser(session, db);

      if (!studentUser) {
        return NextResponse.json(
          {
            message: "Student account could not be found.",
          },
          { status: 404 }
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
          { status: 400 }
        );
      }

      /*
       * Students always see their own reports.
       *
       * A facilitator hiding a report from their own
       * dashboard does NOT hide it from the student.
       */
      const reports = await db
        .collection("reports")
        .find({
          studentId,
        })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedReports = reports.map((report) => ({
        ...report,

        _id: report._id.toString(),

        studentId: normalizeId(report.studentId),
        studentName: report.studentName || "",
        studentEmail: report.studentEmail || "",

        title: report.title || "",
        category: report.category || "",
        description: report.description || "",
        priority: report.priority || "Normal",
        status: report.status || "Open",

        response: report.response || "",
        facilitatorId: report.facilitatorId || "",
        facilitatorName: report.facilitatorName || "",
        facilitatorEmail: report.facilitatorEmail || "",
        respondedAt: report.respondedAt || null,

        createdAt: report.createdAt || null,
        updatedAt: report.updatedAt || null,

        hiddenForFacilitators:
          report.hiddenForFacilitators || [],
      }));

      return NextResponse.json(
        {
          reports: formattedReports,
        },
        { status: 200 }
      );
    }

    // =======================================================
    // FACILITATOR
    // =======================================================

    if (session.role === "facilitator") {
      const facilitatorUser = await getCurrentUser(
        session,
        db
      );

      if (!facilitatorUser) {
        return NextResponse.json(
          {
            message:
              "Facilitator account could not be found.",
          },
          { status: 404 }
        );
      }

      /*
       * The unique ID of THIS facilitator.
       *
       * This is what makes report removal personal to
       * the facilitator performing the removal.
       */
      const facilitatorId =
        normalizeId(facilitatorUser._id) ||
        normalizeId(session.userId);

      if (!facilitatorId) {
        return NextResponse.json(
          {
            message:
              "Facilitator account ID could not be determined.",
          },
          { status: 400 }
        );
      }

      /*
       * A facilitator sees a report if their own ID is
       * NOT inside hiddenForFacilitators.
       *
       * Therefore:
       *
       * Facilitator A removes report
       *       ↓
       * A's ID is added to hiddenForFacilitators
       *       ↓
       * A cannot see it
       *       ↓
       * Facilitator B can still see it
       *       ↓
       * Student can still see it
       */
      const reports = await db
        .collection("reports")
        .find({
          hiddenForFacilitators: {
            $nin: [facilitatorId],
          },
        })
        .sort({ createdAt: -1 })
        .toArray();

      const formattedReports = reports.map((report) => ({
        ...report,

        _id: report._id.toString(),

        studentId: normalizeId(report.studentId),
        studentName: report.studentName || "",
        studentEmail: report.studentEmail || "",

        title: report.title || "",
        category: report.category || "",
        description: report.description || "",
        priority: report.priority || "Normal",
        status: report.status || "Open",

        response: report.response || "",
        facilitatorId: report.facilitatorId || "",
        facilitatorName: report.facilitatorName || "",
        facilitatorEmail: report.facilitatorEmail || "",
        respondedAt: report.respondedAt || null,

        createdAt: report.createdAt || null,
        updatedAt: report.updatedAt || null,

        hiddenForFacilitators:
          report.hiddenForFacilitators || [],
      }));

      return NextResponse.json(
        {
          reports: formattedReports,
        },
        { status: 200 }
      );
    }

    // =======================================================
    // INVALID ROLE
    // =======================================================

    return NextResponse.json(
      {
        message: "Unauthorized role.",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("GET REPORTS ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to retrieve reports.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST REPORT
// =========================================================

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return NextResponse.json(
        {
          message: "Only students can submit reports.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title = body.title?.trim();
    const category = body.category?.trim();
    const description = body.description?.trim();

    const priority =
      body.priority?.trim() || "Normal";

    if (!title || !category || !description) {
      return NextResponse.json(
        {
          message:
            "Title, category, and description are required.",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const studentUser = await getCurrentUser(
      session,
      db
    );

    if (!studentUser) {
      return NextResponse.json(
        {
          message: "Student account could not be found.",
        },
        { status: 404 }
      );
    }

    const studentName = getFullName(studentUser);

    const studentEmail =
      studentUser.email?.trim() ||
      session.email?.trim() ||
      "";

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
        { status: 400 }
      );
    }

    if (!studentName) {
      return NextResponse.json(
        {
          message:
            "Your account does not have a name configured. Please contact a facilitator.",
        },
        { status: 400 }
      );
    }

    const report = {
      studentId,
      studentName,
      studentEmail,

      title,
      category,
      description,
      priority,

      status: "Open",

      response: "",
      facilitatorId: "",
      facilitatorName: "",
      facilitatorEmail: "",
      respondedAt: null,

      /*
       * IMPORTANT:
       *
       * This is now an array.
       *
       * Each facilitator gets their own hidden state.
       *
       * Example:
       *
       * hiddenForFacilitators: [
       *   "facilitatorA",
       *   "facilitatorB"
       * ]
       */
      hiddenForFacilitators: [],

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
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to submit report.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE / REMOVE REPORT
// =========================================================
//
// STUDENT:
//   Permanently deletes ONLY their own report.
//
// FACILITATOR:
//   Hides the report ONLY from that facilitator's dashboard.
//
//   It does NOT:
//   - delete the report
//   - hide it from students
//   - hide it from other facilitators
// =========================================================

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { message: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = body.id;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid report ID.",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const report = await db
      .collection("reports")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!report) {
      return NextResponse.json(
        {
          message: "Report not found.",
        },
        { status: 404 }
      );
    }

    // =======================================================
    // FACILITATOR REMOVE
    // =======================================================

    if (session.role === "facilitator") {
      const facilitatorUser =
        await getCurrentUser(session, db);

      if (!facilitatorUser) {
        return NextResponse.json(
          {
            message:
              "Facilitator account could not be found.",
          },
          { status: 404 }
        );
      }

      const facilitatorId =
        normalizeId(facilitatorUser._id) ||
        normalizeId(session.userId);

      if (!facilitatorId) {
        return NextResponse.json(
          {
            message:
              "Facilitator account ID could not be determined.",
          },
          { status: 400 }
        );
      }

      /*
       * Add THIS facilitator's ID to the hidden list.
       *
       * $addToSet prevents duplicate IDs.
       *
       * Other facilitators are completely unaffected.
       */
      const result = await db
        .collection("reports")
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $addToSet: {
              hiddenForFacilitators: facilitatorId,
            },

            $set: {
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          {
            message: "Report could not be removed.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message:
            "Report removed from your dashboard.",
        },
        { status: 200 }
      );
    }

    // =======================================================
    // STUDENT DELETE
    // =======================================================

    if (session.role === "student") {
      const studentUser = await getCurrentUser(
        session,
        db
      );

      if (!studentUser) {
        return NextResponse.json(
          {
            message:
              "Student account could not be found.",
          },
          { status: 404 }
        );
      }

      /*
       * Possible identifiers belonging to the
       * currently logged-in student.
       */
      const possibleStudentIds = [
        normalizeId(studentUser.studentId),
        normalizeId(session.studentId),
        normalizeId(studentUser._id),
        normalizeId(session.userId),
      ].filter(Boolean);

      const reportStudentId =
        normalizeId(report.studentId);

      /*
       * SECURITY:
       *
       * The report must belong to this student.
       */
      const ownsReport =
        possibleStudentIds.includes(reportStudentId);

      if (!ownsReport) {
        console.error(
          "REPORT DELETE OWNERSHIP CHECK FAILED:",
          {
            reportStudentId,
            possibleStudentIds,
            reportId: id,
          }
        );

        return NextResponse.json(
          {
            message:
              "You are not authorized to delete this report.",
          },
          { status: 403 }
        );
      }

      /*
       * Ownership has already been verified.
       *
       * Delete using MongoDB _id only so that an
       * ObjectId/string mismatch on studentId does not
       * prevent deletion.
       */
      const result = await db
        .collection("reports")
        .deleteOne({
          _id: new ObjectId(id),
        });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          {
            message:
              "Report could not be deleted.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          message:
            "Your report was deleted successfully.",
        },
        { status: 200 }
      );
    }

    // =======================================================
    // INVALID ROLE
    // =======================================================

    return NextResponse.json(
      {
        message: "Unauthorized role.",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("DELETE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Unable to process report deletion.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PATCH REPORT
// =========================================================

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (
      !session ||
      session.role !== "facilitator"
    ) {
      return NextResponse.json(
        {
          message:
            "Only facilitators can update reports.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = body.id;
    const status = body.status?.trim();

    const response =
      body.response?.trim() || "";

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message: "Invalid report ID.",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const facilitatorUser =
      await getCurrentUser(session, db);

    if (!facilitatorUser) {
      return NextResponse.json(
        {
          message:
            "Facilitator account could not be found.",
        },
        { status: 404 }
      );
    }

    const facilitatorName =
      getFullName(facilitatorUser);

    const facilitatorEmail =
      facilitatorUser.email?.trim() ||
      session.email?.trim() ||
      "";

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    // =======================================================
    // SAVE RESPONSE
    // =======================================================

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
      /*
       * Clearing the response removes the old response.
       */
      updateData.response = "";
      updateData.facilitatorId = "";
      updateData.facilitatorName = "";
      updateData.facilitatorEmail = "";
      updateData.respondedAt = null;
    }

    /*
     * IMPORTANT:
     *
     * Do NOT modify hiddenForFacilitators here.
     *
     * If Facilitator A removed a report, updating the report
     * should NOT automatically make it appear again for A.
     *
     * Other facilitators remain unaffected.
     */
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
        { status: 404 }
      );
    }

    const updatedReport =
      await db.collection("reports").findOne({
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
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE REPORT ERROR:", error);

    return NextResponse.json(
      {
        message: "Unable to update report.",
      },
      { status: 500 }
    );
  }
}