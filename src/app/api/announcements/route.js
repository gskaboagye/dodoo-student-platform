import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import { createNotifications } from "@/lib/notifications";

// =========================================================
// GET CURRENT SESSION
// =========================================================

async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return null;
    }

    const session = await verifySession(token);

    return session || null;
  } catch (error) {
    console.error("GET SESSION ERROR:", error);
    return null;
  }
}

// =========================================================
// REQUIRE FACILITATOR
// =========================================================

async function requireFacilitator() {
  const session = await getSession();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  if (session.role !== "facilitator") {
    return {
      session: null,
      error: NextResponse.json(
        {
          message:
            "Only facilitators can manage announcements.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    session,
    error: null,
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
// NOTIFY ACTIVE STUDENTS
// =========================================================

async function notifyActiveStudents({
  db,
  title,
  message,
}) {
  try {
    const students = await db
      .collection("users")
      .find({
        role: "student",
        status: "active",
      })
      .project({
        _id: 1,
      })
      .toArray();

    if (!students.length) {
      return;
    }

    await createNotifications(
      students.map((student) => ({
        userId: student._id.toString(),
        title,
        message,
        type: "announcement",
        link: "/",
      }))
    );
  } catch (error) {
    // Notification failures should not
    // prevent announcement operations.
    console.error(
      "ANNOUNCEMENT NOTIFICATION ERROR:",
      error
    );
  }
}

// =========================================================
// GET ANNOUNCEMENTS
// Students and facilitators can view announcements
// =========================================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const db = await getDatabase();

    const announcements = await db
      .collection("announcements")
      .find({})
      .sort({
        createdAt: -1,
      })
      .toArray();

    return NextResponse.json(
      {
        announcements: announcements.map(
          (announcement) => ({
            id: announcement._id.toString(),

            title:
              announcement.title || "",

            message:
              announcement.message || "",

            createdAt:
              announcement.createdAt || null,

            updatedAt:
              announcement.updatedAt || null,

            createdByName:
              announcement.createdByName ||
              "Facilitator",
          })
        ),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET ANNOUNCEMENTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load announcements.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// CREATE ANNOUNCEMENT
// FACILITATORS ONLY
// =========================================================

export async function POST(request) {
  try {
    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!title || !message) {
      return NextResponse.json(
        {
          message:
            "Title and message are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (title.length > 150) {
      return NextResponse.json(
        {
          message:
            "Announcement title must be 150 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          message:
            "Announcement message must be 2000 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    const now = new Date();

    const announcement = {
      title,
      message,
      createdAt: now,
      updatedAt: now,
      createdBy:
        auth.session.userId || null,
      createdByName:
        auth.session.name ||
        "Facilitator",
    };

    const result = await db
      .collection("announcements")
      .insertOne(announcement);

    // -------------------------------------------------------
    // NOTIFY ACTIVE STUDENTS
    // -------------------------------------------------------

    await notifyActiveStudents({
      db,
      title: "New Announcement",
      message: title,
    });

    return NextResponse.json(
      {
        message:
          "Announcement created successfully.",

        announcement: {
          id:
            result.insertedId.toString(),

          ...announcement,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to create announcement.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// UPDATE ANNOUNCEMENT
// FACILITATORS ONLY
// =========================================================

export async function PUT(request) {
  try {
    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const id = body?.id;

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          message:
            "A valid announcement ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!title || !message) {
      return NextResponse.json(
        {
          message:
            "Title and message are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (title.length > 150) {
      return NextResponse.json(
        {
          message:
            "Announcement title must be 150 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          message:
            "Announcement message must be 2000 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    const announcementId =
      new ObjectId(id);

    const existingAnnouncement =
      await db
        .collection("announcements")
        .findOne({
          _id: announcementId,
        });

    if (!existingAnnouncement) {
      return NextResponse.json(
        {
          message:
            "Announcement not found.",
        },
        {
          status: 404,
        }
      );
    }

    const updatedAt = new Date();

    const result = await db
      .collection("announcements")
      .updateOne(
        {
          _id: announcementId,
        },
        {
          $set: {
            title,
            message,
            updatedAt,
            updatedBy:
              auth.session.userId ||
              null,
            updatedByName:
              auth.session.name ||
              "Facilitator",
          },
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Announcement not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // NOTIFY ACTIVE STUDENTS
    // -------------------------------------------------------

    await notifyActiveStudents({
      db,
      title: "Announcement Updated",
      message: title,
    });

    return NextResponse.json(
      {
        message:
          "Announcement updated successfully.",

        announcement: {
          id,
          title,
          message,
          createdAt:
            existingAnnouncement.createdAt ||
            null,
          updatedAt,
          createdByName:
            existingAnnouncement.createdByName ||
            "Facilitator",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "UPDATE ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to update announcement.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// DELETE ANNOUNCEMENT
// FACILITATORS ONLY
// =========================================================

export async function DELETE(request) {
  try {
    const auth =
      await requireFacilitator();

    if (auth.error) {
      return auth.error;
    }

    const body = await request.json();

    const id = body?.id;

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return NextResponse.json(
        {
          message:
            "A valid announcement ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const db = await getDatabase();

    const result = await db
      .collection("announcements")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Announcement not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Announcement deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE ANNOUNCEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to delete announcement.",
      },
      {
        status: 500,
      }
    );
  }
}