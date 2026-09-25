import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// Get the database using the same database name everywhere.
async function getDatabase() {
  const client = await clientPromise;
  const dbName = process.env.DB_NAME || "DCCPlatform";
  return client.db(dbName);
}

// Build the actual user's full name from the users collection.
function getFullName(user) {
  if (!user) return "";

  const firstName = user.firstName?.trim() || "";
  const lastName = user.lastName?.trim() || "";

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || user.name?.trim() || user.email?.trim() || "";
}

// Find the logged-in user.
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

// GET - Students see their own reports.
// Facilitators see all reports.
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

    const query =
      session.role === "facilitator"
        ? {}
        : { studentId: session.studentId };

    const reports = await db
      .collection("reports")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedReports = reports.map((report) => ({
      ...report,
      _id: report._id.toString(),
    }));

    return NextResponse.json(
      { reports: formattedReports },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET REPORTS ERROR:", error);

    return NextResponse.json(
      { message: "Unable to retrieve reports." },
      { status: 500 }
    );
  }
}

// POST - Students submit a report.
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
        { message: "Only students can submit reports." },
        { status: 403 }
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
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get the actual student account from MongoDB.
    const studentUser = await getCurrentUser(session, db);

    if (!studentUser) {
      return NextResponse.json(
        { message: "Student account could not be found." },
        { status: 404 }
      );
    }

    const studentName = getFullName(studentUser);
    const studentEmail =
      studentUser.email?.trim() || session.email || "";

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
      studentId:
        studentUser.studentId || session.studentId || "",

      // Actual student information from MongoDB.
      studentName,
      studentEmail,

      title,
      category,
      description,
      priority,

      status: "Open",

      // Facilitator response information.
      response: "",
      facilitatorId: "",
      facilitatorName: "",
      facilitatorEmail: "",
      respondedAt: null,

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
      { message: "Unable to submit report." },
      { status: 500 }
    );
  }
}

// DELETE - Facilitators can delete reports.
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

    if (!session || session.role !== "facilitator") {
      return NextResponse.json(
        { message: "Only facilitators can delete reports." },
        { status: 403 }
      );
    }

    const { id } = await request.json();

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid report ID." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const result = await db.collection("reports").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Report not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Report deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE REPORT ERROR:", error);

    return NextResponse.json(
      { message: "Unable to delete report." },
      { status: 500 }
    );
  }
}

// PATCH - Facilitators can update report status and response.
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

    if (!session || session.role !== "facilitator") {
      return NextResponse.json(
        { message: "Only facilitators can update reports." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = body.id;
    const status = body.status?.trim();
    const response = body.response?.trim() || "";

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid report ID." },
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
        { message: "Invalid report status." },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get the actual facilitator account from MongoDB.
    const facilitatorUser = await getCurrentUser(
      session,
      db
    );

    if (!facilitatorUser) {
      return NextResponse.json(
        { message: "Facilitator account could not be found." },
        { status: 404 }
      );
    }

    const facilitatorName =
      getFullName(facilitatorUser);

    const facilitatorEmail =
      facilitatorUser.email?.trim() ||
      session.email ||
      "";

    const updateData = {
      status,
      updatedAt: new Date(),
    };

    if (response) {
      updateData.response = response;

      // Actual facilitator information from MongoDB.
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

    const result = await db.collection("reports").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Report not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Report updated successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE REPORT ERROR:", error);

    return NextResponse.json(
      { message: "Unable to update report." },
      { status: 500 }
    );
  }
}