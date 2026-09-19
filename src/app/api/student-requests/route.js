import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

async function requireFacilitator() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          error: "Authentication required.",
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
            "Only facilitators can manage student requests.",
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

// =====================================================
// GET
// Get all pending student registrations
// =====================================================

export async function GET() {
  try {
    const auth = await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const requests = await db
      .collection("users")
      .find({
        role: "student",
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedRequests = requests.map(
      (request) => ({
        _id: request._id.toString(),
        name: request.name,
        email: request.email,
        program: request.program || "",
        status: request.status,
        createdAt: request.createdAt,
      })
    );

    return NextResponse.json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error(
      "Student Requests GET Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load student requests.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST
// Accept or reject a student registration
// =====================================================

export async function POST(request) {
  try {
    const auth = await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const userId = body.userId;
    const action = body.action;

    if (!userId || !action) {
      return NextResponse.json(
        {
          error:
            "User ID and action are required.",
        },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        {
          error:
            "Action must be accept or reject.",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          error: "Invalid user ID.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const user = await db
      .collection("users")
      .findOne({
        _id: new ObjectId(userId),
        role: "student",
        status: "pending",
      });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Pending student registration not found.",
        },
        { status: 404 }
      );
    }

    // =================================================
    // REJECT
    // =================================================

    if (action === "reject") {
      await db.collection("users").updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            status: "rejected",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        message:
          "Student registration rejected.",
      });
    }

    // =================================================
    // ACCEPT
    // =================================================

    const existingStudent = await db
      .collection("students")
      .findOne({
        email: user.email,
      });

    let studentId;

    if (existingStudent) {
      studentId = existingStudent._id;
    } else {
      const now = new Date();

      const enrollmentDate = now;

      const expectedCompletionDate =
        new Date(now);

      expectedCompletionDate.setMonth(
        expectedCompletionDate.getMonth() + 24
      );

      const student = {
        firstName:
          user.name?.split(" ")[0] || "",
        lastName:
          user.name
            ?.split(" ")
            .slice(1)
            .join(" ") || "",

        email: user.email,

        program: user.program || "",

        status: "Active",

        enrollmentDate,

        expectedCompletionDate,

        programDurationMonths: 24,

        progress: 0,

        profileImage: "",

        createdAt: now,
        updatedAt: now,
      };

      const studentResult = await db
        .collection("students")
        .insertOne(student);

      studentId = studentResult.insertedId;
    }

    // =================================================
    // ACTIVATE USER ACCOUNT
    // =================================================

    await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          status: "active",
          studentId,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message:
        "Student registration accepted successfully.",
      studentId: studentId.toString(),
    });
  } catch (error) {
    console.error(
      "Student Request Action Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process student registration.",
      },
      { status: 500 }
    );
  }
}