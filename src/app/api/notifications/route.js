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
// SESSION
// =====================================================

async function getSession() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get("dcc_session")?.value;

    if (!token) {
      return null;
    }

    return await verifySession(token);
  } catch (error) {
    console.error(
      "NOTIFICATION SESSION ERROR:",
      error
    );

    return null;
  }
}

// =====================================================
// USER ID QUERY
// =====================================================

function buildUserIdQuery(userId) {
  const values = [
    String(userId),
  ];

  if (
    ObjectId.isValid(
      String(userId)
    )
  ) {
    values.push(
      new ObjectId(
        String(userId)
      )
    );
  }

  return {
    userId: {
      $in: values,
    },
  };
}

// =====================================================
// FORMAT NOTIFICATION
// =====================================================

function formatNotification(
  notification
) {
  if (!notification) {
    return null;
  }

  return {
    id: notification._id
      ? notification._id.toString()
      : null,

    title:
      notification.title ||
      "Notification",

    message:
      notification.message ||
      "",

    type:
      notification.type ||
      "general",

    link:
      notification.link ||
      "",

    read:
      notification.read === true,

    createdAt:
      notification.createdAt ||
      null,

    updatedAt:
      notification.updatedAt ||
      null,
  };
}

// =====================================================
// GET NOTIFICATIONS
// =====================================================

export async function GET() {
  try {
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error:
            "You must be logged in to view notifications.",
        },
        {
          status: 401,
        }
      );
    }

    const db =
      await getDatabase();

    const notificationsCollection =
      db.collection(
        "notifications"
      );

    const userQuery =
      buildUserIdQuery(
        session.userId
      );

    // ---------------------------------------------------
    // GET USER NOTIFICATIONS
    // ---------------------------------------------------

    const notifications =
      await notificationsCollection
        .find(userQuery)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .limit(50)
        .toArray();

    // ---------------------------------------------------
    // COUNT UNREAD
    // ---------------------------------------------------

    const unreadCount =
      await notificationsCollection.countDocuments(
        {
          ...userQuery,
          read: {
            $ne: true,
          },
        }
      );

    return NextResponse.json(
      {
        notifications:
          notifications.map(
            formatNotification
          ),

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
        error:
          "Unable to load notifications.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// MARK NOTIFICATIONS AS READ
// =====================================================

export async function PATCH(
  request
) {
  try {
    const session =
      await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          error:
            "You must be logged in.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const db =
      await getDatabase();

    const notificationsCollection =
      db.collection(
        "notifications"
      );

    const userQuery =
      buildUserIdQuery(
        session.userId
      );

    // =================================================
    // MARK ALL AS READ
    // =================================================

    if (
      body?.markAllRead === true
    ) {
      const result =
        await notificationsCollection.updateMany(
          {
            ...userQuery,

            read: {
              $ne: true,
            },
          },

          {
            $set: {
              read: true,
              updatedAt:
                new Date(),
            },
          }
        );

      return NextResponse.json(
        {
          success: true,

          markedRead:
            result.modifiedCount,
        },
        {
          status: 200,
        }
      );
    }

    // =================================================
    // MARK ONE AS READ
    // =================================================

    const notificationId =
      body?.id;

    if (
      !notificationId ||
      !ObjectId.isValid(
        String(notificationId)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A valid notification ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await notificationsCollection.updateOne(
        {
          ...userQuery,

          _id: new ObjectId(
            String(notificationId)
          ),
        },

        {
          $set: {
            read: true,

            updatedAt:
              new Date(),
          },
        }
      );

    if (
      result.matchedCount === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Notification not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
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
        error:
          "Unable to update notification.",
      },
      {
        status: 500,
      }
    );
  }
}