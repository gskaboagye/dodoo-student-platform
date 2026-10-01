import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

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
    console.error("NOTIFICATION SESSION ERROR:", error);
    return null;
  }
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
// CLEAN OLD NOTIFICATIONS
//
// Read notifications:
// - Deleted after 7 days.
//
// Unread notifications:
// - Kept for up to 30 days.
//
// Any notification older than 30 days:
// - Deleted regardless of read status.
//
// This cleanup runs automatically whenever the
// notifications API is requested.
// =========================================================

async function cleanupOldNotifications(db) {
  try {
    const now = Date.now();

    const sevenDaysAgo = new Date(
      now - 7 * 24 * 60 * 60 * 1000
    );

    const thirtyDaysAgo = new Date(
      now - 30 * 24 * 60 * 60 * 1000
    );

    // -------------------------------------------------------
    // 1. Delete READ notifications older than 7 days
    // -------------------------------------------------------

    const readCleanup = await db
      .collection("notifications")
      .deleteMany({
        read: true,
        createdAt: {
          $lt: sevenDaysAgo,
        },
      });

    // -------------------------------------------------------
    // 2. Delete ALL notifications older than 30 days
    // -------------------------------------------------------

    const oldCleanup = await db
      .collection("notifications")
      .deleteMany({
        createdAt: {
          $lt: thirtyDaysAgo,
        },
      });

    if (
      readCleanup.deletedCount > 0 ||
      oldCleanup.deletedCount > 0
    ) {
      console.log(
        `Notification cleanup: deleted ${
          readCleanup.deletedCount
        } read notifications and ${
          oldCleanup.deletedCount
        } notifications older than 30 days.`
      );
    }
  } catch (error) {
    // Cleanup failure should never prevent the user
    // from seeing their current notifications.
    console.error(
      "NOTIFICATION CLEANUP ERROR:",
      error
    );
  }
}

// =========================================================
// GET NOTIFICATIONS
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

    // -------------------------------------------------------
    // CLEAN OLD NOTIFICATIONS
    // -------------------------------------------------------

    await cleanupOldNotifications(db);

    // -------------------------------------------------------
    // GET CURRENT USER'S NOTIFICATIONS
    // -------------------------------------------------------

    const notifications = await db
      .collection("notifications")
      .find({
        userId: String(session.userId),
      })
      .sort({
        createdAt: -1,
      })
      .limit(50)
      .toArray();

    // -------------------------------------------------------
    // COUNT UNREAD NOTIFICATIONS
    // -------------------------------------------------------

    const unreadCount = await db
      .collection("notifications")
      .countDocuments({
        userId: String(session.userId),
        read: {
          $ne: true,
        },
      });

    // -------------------------------------------------------
    // FORMAT NOTIFICATIONS
    // -------------------------------------------------------

    const formattedNotifications =
      notifications.map((notification) => ({
        id: notification._id.toString(),

        title:
          notification.title || "",

        message:
          notification.message || "",

        type:
          notification.type || "info",

        link:
          notification.link || "",

        read:
          notification.read === true,

        createdAt:
          notification.createdAt || null,

        updatedAt:
          notification.updatedAt || null,
      }));

    return NextResponse.json(
      {
        notifications: formattedNotifications,

        unreadCount,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET NOTIFICATIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to load notifications.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// PATCH NOTIFICATIONS
//
// Supports:
//
// 1. Mark one notification as read
//    { id: "notificationId" }
//
// 2. Mark all notifications as read
//    { markAllRead: true }
// =========================================================

export async function PATCH(request) {
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

    const body = await request.json();

    const db = await getDatabase();

    // -------------------------------------------------------
    // MARK ALL AS READ
    // -------------------------------------------------------

    if (body?.markAllRead === true) {
      const result = await db
        .collection("notifications")
        .updateMany(
          {
            userId: String(session.userId),

            read: {
              $ne: true,
            },
          },
          {
            $set: {
              read: true,

              updatedAt: new Date(),
            },
          }
        );

      return NextResponse.json(
        {
          message:
            "All notifications marked as read.",

          updatedCount:
            result.modifiedCount,
        },
        {
          status: 200,
        }
      );
    }

    // -------------------------------------------------------
    // MARK ONE NOTIFICATION AS READ
    // -------------------------------------------------------

    const id = body?.id;

    if (!id) {
      return NextResponse.json(
        {
          message:
            "Notification ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { ObjectId } =
      await import("mongodb");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          message:
            "Invalid notification ID.",
        },
        {
          status: 400,
        }
      );
    }

    const result = await db
      .collection("notifications")
      .updateOne(
        {
          _id: new ObjectId(id),

          userId: String(session.userId),
        },
        {
          $set: {
            read: true,

            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          message:
            "Notification not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Notification marked as read.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PATCH NOTIFICATIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Unable to update notification.",
      },
      {
        status: 500,
      }
    );
  }
}