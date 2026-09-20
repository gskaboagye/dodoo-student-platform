import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

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
          error: "Only facilitators can perform this action.",
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export async function GET() {
  try {
    const auth = await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const client = await clientPromise;
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const requests = await db
      .collection("users")
      .find({
        role: "student",
        status: "pending",
        emailVerified: true,
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedRequests = requests.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      program: user.program || "",
      status: user.status,
      emailVerified: user.emailVerified === true,
      createdAt: user.createdAt || null,
    }));

    return NextResponse.json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error("STUDENT REQUESTS GET ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load student requests.",
      },
      { status: 500 }
    );
  }
}

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
          error: "User ID and action are required.",
        },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        {
          error: "Invalid action.",
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
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
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
        { status: 404 }
      );
    }

    if (action === "reject") {
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            status: "rejected",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        message: "Student request rejected.",
      });
    }

    const existingStudent = await db.collection("students").findOne({
      email: user.email,
    });

    let studentId;

    if (existingStudent) {
      studentId = existingStudent._id;

      await db.collection("students").updateOne(
        { _id: existingStudent._id },
        {
          $set: {
            status: "Active",
            updatedAt: new Date(),
          },
        }
      );
    } else {
      const nameParts = (user.name || "").trim().split(/\s+/);

      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ") || "";

      const enrollmentDate = new Date();

      const expectedCompletionDate = new Date(enrollmentDate);
      expectedCompletionDate.setMonth(
        expectedCompletionDate.getMonth() + 24
      );

      const student = {
        firstName,
        lastName,
        email: user.email,
        phone: "",
        dateOfBirth: "",
        gender: "",
        program: user.program || "Software Development",
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
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          status: "active",
          studentId,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Student accepted successfully.",
      studentId: studentId.toString(),
    });
  } catch (error) {
    console.error("STUDENT REQUEST POST ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to process student request.",
      },
      { status: 500 }
    );
  }
}