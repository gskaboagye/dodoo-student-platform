import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifySession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const token =
      cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          message: "You are not logged in.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        {
          message: "Invalid or expired session.",
        },
        { status: 401 }
      );
    }

    const notification = await createNotification({
      userId: String(session.userId),
      title: "Notification Test",
      message:
        "Your DCC notification system is working successfully.",
      type: "general",
      link: "/dashboard",
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "TEST NOTIFICATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        message:
          "Failed to create test notification.",
      },
      { status: 500 }
    );
  }
}