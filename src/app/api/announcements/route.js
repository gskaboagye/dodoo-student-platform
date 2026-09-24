import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =========================================================
// GET ANNOUNCEMENTS
// Students and facilitators can view announcements
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

    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const announcements = await db
      .collection("announcements")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(
      {
        announcements: announcements.map((announcement) => ({
          id: announcement._id.toString(),
          title: announcement.title,
          message: announcement.message,
          createdAt: announcement.createdAt,
          createdByName:
            announcement.createdByName || "Facilitator",
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET ANNOUNCEMENTS ERROR:", error);

    return NextResponse.json(
      { message: "Unable to load announcements." },
      { status: 500 }
    );
  }
}

// =========================================================
// CREATE ANNOUNCEMENT
// FACILITATORS ONLY
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

    // Only facilitators can create announcements
    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can create announcements.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title = body.title?.trim();
    const message = body.message?.trim();

    if (!title || !message) {
      return NextResponse.json(
        {
          message: "Title and message are required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const announcement = {
      title,
      message,
      createdAt: new Date(),
      createdBy: session.userId || null,
      createdByName: session.name || "Facilitator",
    };

    const result = await db
      .collection("announcements")
      .insertOne(announcement);

    return NextResponse.json(
      {
        message: "Announcement created successfully.",
        announcement: {
          id: result.insertedId.toString(),
          ...announcement,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to create announcement.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE ANNOUNCEMENT
// FACILITATORS ONLY
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

    // Only facilitators can delete announcements
    if (session.role !== "facilitator") {
      return NextResponse.json(
        {
          message:
            "Only facilitators can delete announcements.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const id = body.id;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message:
            "A valid announcement ID is required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const result = await db
      .collection("announcements")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          message: "Announcement not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message:
          "Announcement deleted successfully.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "DELETE ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        message: "Unable to delete announcement.",
      },
      { status: 500 }
    );
  }
}