import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifySession } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Verify the session
    const session = await verifySession(token);

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;

    const db = process.env.MONGODB_DB
      ? client.db(process.env.MONGODB_DB)
      : client.db();

    // Find the user safely
    let user = null;

    if (session.userId) {
      // If the session contains a valid MongoDB ObjectId
      if (ObjectId.isValid(session.userId)) {
        user = await db.collection("users").findOne({
          _id: new ObjectId(session.userId),
        });
      }

      // If the ID is stored as a string instead
      if (!user) {
        user = await db.collection("users").findOne({
          _id: session.userId,
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "User account not found.",
        },
        { status: 401 }
      );
    }

    // Build the user's full name
    const fullName =
      [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user.name ||
      user.email ||
      "User";

    return NextResponse.json({
      authenticated: true,

      user: {
        id: user._id?.toString() || session.userId,

        firstName: user.firstName || "",

        lastName: user.lastName || "",

        name: fullName,

        email: user.email || "",

        role: user.role || session.role,

        studentId:
          user.studentId ||
          session.studentId ||
          null,
      },
    });
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
        message: "Unable to retrieve session.",
      },
      { status: 401 }
    );
  }
}