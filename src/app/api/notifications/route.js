import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

// =====================================================
// DATABASE
// =====================================================

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

// =====================================================
// GET SESSION
// =====================================================

async function getSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =====================================================
// GET NOTIFICATIONS
// =====================================================

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

    if (!session.userId) {
      return NextResponse.json(
        {
          message: "User ID was not found.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = String(session.userId);

    const db = await getDatabase();

    const notifications =
      await db
        .collection("notifications")
        .find({
          userId,
        })
        .sort({
          createdAt: -1,
        })
        .limit(50)
        .toArray();

    const unreadCount =
      await db
        .collection("notifications")
        .countDocuments({
          userId,
          read: false,
        });

    const formattedNotifications =
      notifications.map(
        (notification) => ({
          ...notification,

          _id:
            notification._id.toString(),

          createdAt:
            notification.createdAt instanceof Date
              ? notification.createdAt.toISOString()
              : notification.createdAt,

          updatedAt:
            notification.updatedAt instanceof Date
              ? notification.updatedAt.toISOString()
              : notification.updatedAt,
        })
      );

    return NextResponse.json({
      notifications:
        formattedNotifications,

      unreadCount,

      total:
        formattedNotifications.length,
    });
  } catch (error) {
    console.error(
      "GET NOTIFICATIONS ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to load notifications.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// MARK NOTIFICATION AS READ
// =====================================================

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

    if (!session.userId) {
      return NextResponse.json(
        {
          message: "User ID was not found.",
        },
        {
          status: 400,
        }
      );
    }

    const userId = String(session.userId);

    const body = await request.json();

    const action = body?.action;

    const db = await getDatabase();

    // =================================================
    // MARK ALL NOTIFICATIONS AS READ
    // =================================================

    if (action === "markAllRead") {
      const result =
        await db
          .collection("notifications")
          .updateMany(
            {
              userId,
              read: false,
            },
            {
              $set: {
                read: true,
                updatedAt: new Date(),
              },
            }
          );

      return NextResponse.json({
        success: true,

        message:
          "All notifications marked as read.",

        modifiedCount:
          result.modifiedCount,
      });
    }

    // =================================================
    // MARK ONE NOTIFICATION AS READ
    // =================================================

    if (action === "markRead") {
      const notificationId =
        body?.notificationId;

      if (
        !notificationId ||
        !ObjectId.isValid(
          String(notificationId)
        )
      ) {
        return NextResponse.json(
          {
            message:
              "A valid notification ID is required.",
          },
          {
            status: 400,
          }
        );
      }

      const result =
        await db
          .collection("notifications")
          .updateOne(
            {
              _id: new ObjectId(
                String(notificationId)
              ),

              userId,
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

      return NextResponse.json({
        success: true,

        message:
          "Notification marked as read.",
      });
    }

    return NextResponse.json(
      {
        message:
          "Invalid notification action.",
      },
      {
        status: 400,
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
          "Failed to update notification.",
      },
      {
        status: 500,
      }
    );
  }
}