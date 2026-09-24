import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    // No session
    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        }
      );
    }

    // Verify session
    const session = await verifySession(token);

    // Invalid or expired session
    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        }
      );
    }

    // Return the information already stored in the session
    return NextResponse.json(
      {
        authenticated: true,

        user: {
          id: session.userId,
          name: session.name || "User",
          email: session.email || "",
          role: session.role,
          studentId: session.studentId || null,
          status: session.status || "active",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("SESSION ERROR:", error);

    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
      }
    );
  }
}