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

    // No session cookie
    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No active session.",
        },
        {
          status: 401,
        }
      );
    }

    // Verify the session
    const session = await verifySession(token);

    // Invalid or expired session
    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;

    // Use the same database as the login route
    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    // Find the user
    let user = null;

    if (session.userId) {
      // MongoDB ObjectId
      if (ObjectId.isValid(session.userId)) {
        user = await db.collection("users").findOne({
          _id: new ObjectId(session.userId),
        });
      }

      // Fallback if the ID is stored as a string
      if (!user) {
        user = await db.collection("users").findOne({
          _id: session.userId,
        });
      }
    }

    // User does not exist
    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "User account not found.",
        },
        {
          status: 401,
        }
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

    // Return authenticated user
    return NextResponse.json(
      {
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

          status:
            user.status ||
            session.status ||
            "active",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
        message: "Unable to retrieve session.",
      },
      {
        status: 401,
      }
    );
  }
}