import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "dcc_session";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to log out.",
      },
      {
        status: 500,
      }
    );
  }
}