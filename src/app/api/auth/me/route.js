import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Verify session
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

    // Find the logged-in user
    const user = await db.collection("users").findOne(
      {
        _id: new (await import("mongodb")).ObjectId(session.userId),
      },
      {
        projection: {
          password: 0,
          verificationCode: 0,
          verificationCodeExpires: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
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
        id: user._id.toString(),

        firstName: user.firstName || "",

        lastName: user.lastName || "",

        name: fullName,

        email: user.email || "",

        role: user.role,

        studentId: user.studentId || session.studentId || null,
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