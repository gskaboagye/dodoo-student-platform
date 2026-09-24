import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const cookieStore = await cookies();

    cookieStore.set("dcc_session", "", {
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
    console.error("Logout error:", error);

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