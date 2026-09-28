import { ObjectId } from "mongodb";

import clientPromise from "@/lib/mongodb";

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
// CREATE NOTIFICATION
// =====================================================

export async function createNotification({
  userId,
  title,
  message,
  type = "general",
  link = "",
}) {
  if (!userId) {
    throw new Error(
      "Cannot create notification without a userId."
    );
  }

  if (!title) {
    throw new Error(
      "Cannot create notification without a title."
    );
  }

  if (!message) {
    throw new Error(
      "Cannot create notification without a message."
    );
  }

  const db = await getDatabase();

  const notification = {
    userId:
      userId instanceof ObjectId
        ? userId.toString()
        : String(userId),

    title: String(title),

    message: String(message),

    type: String(type),

    link: link ? String(link) : "",

    read: false,

    createdAt: new Date(),

    updatedAt: new Date(),
  };

  const result = await db
    .collection("notifications")
    .insertOne(notification);

  return {
    ...notification,

    _id: result.insertedId.toString(),
  };
}

// =====================================================
// CREATE MULTIPLE NOTIFICATIONS
// =====================================================

export async function createNotifications(
  notifications
) {
  if (
    !Array.isArray(notifications) ||
    notifications.length === 0
  ) {
    return [];
  }

  const db = await getDatabase();

  const documents = notifications.map(
    (notification) => ({
      userId:
        notification.userId instanceof ObjectId
          ? notification.userId.toString()
          : String(notification.userId),

      title: String(notification.title),

      message: String(notification.message),

      type:
        String(notification.type || "general"),

      link:
        notification.link
          ? String(notification.link)
          : "",

      read: false,

      createdAt: new Date(),

      updatedAt: new Date(),
    })
  );

  const result = await db
    .collection("notifications")
    .insertMany(documents);

  return documents.map((notification, index) => ({
    ...notification,

    _id:
      result.insertedIds[index].toString(),
  }));
}