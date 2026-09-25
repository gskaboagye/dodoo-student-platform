import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { verifySession } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        "dcc_session"
      )?.value;

    // =======================================================
    // NO SESSION
    // =======================================================

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          message:
            "No active session.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // VERIFY SESSION
    // =======================================================

    const session =
      await verifySession(token);

    // =======================================================
    // EXPIRED / INVALID SESSION
    // =======================================================

    if (!session) {
      /*
       * Remove the invalid cookie.
       */
      cookieStore.set(
        "dcc_session",
        "",
        {
          httpOnly: true,

          secure:
            process.env.NODE_ENV ===
            "production",

          sameSite: "lax",

          expires:
            new Date(0),

          path: "/",
        }
      );

      return NextResponse.json(
        {
          authenticated: false,
          message:
            "Invalid or expired session.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // DATABASE
    // =======================================================

    const client =
      await clientPromise;

    const dbName =
      process.env.DB_NAME ||
      "DCCPlatform";

    const db =
      client.db(dbName);

    // =======================================================
    // FIND USER
    // =======================================================

    let user = null;

    if (session.userId) {
      if (
        ObjectId.isValid(
          session.userId
        )
      ) {
        user =
          await db
            .collection("users")
            .findOne({
              _id:
                new ObjectId(
                  session.userId
                ),
            });
      }

      if (!user) {
        user =
          await db
            .collection("users")
            .findOne({
              _id:
                session.userId,
            });
      }
    }

    // =======================================================
    // USER DOES NOT EXIST
    // =======================================================

    if (!user) {
      cookieStore.set(
        "dcc_session",
        "",
        {
          httpOnly: true,

          secure:
            process.env.NODE_ENV ===
            "production",

          sameSite: "lax",

          expires:
            new Date(0),

          path: "/",
        }
      );

      return NextResponse.json(
        {
          authenticated: false,
          message:
            "User account not found.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // FULL NAME
    // =======================================================

    const fullName =
      [
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      user.name ||
      user.email ||
      "User";

    // =======================================================
    // CHECK ACCOUNT STATUS
    // =======================================================

    if (
      user.status &&
      user.status !== "active"
    ) {
      cookieStore.set(
        "dcc_session",
        "",
        {
          httpOnly: true,

          secure:
            process.env.NODE_ENV ===
            "production",

          sameSite: "lax",

          expires:
            new Date(0),

          path: "/",
        }
      );

      return NextResponse.json(
        {
          authenticated: false,

          message:
            "Your account is not active.",
        },
        {
          status: 401,
        }
      );
    }

    // =======================================================
    // AUTHENTICATED USER
    // =======================================================

    return NextResponse.json(
      {
        authenticated: true,

        user: {
          id:
            user._id?.toString() ||
            session.userId,

          firstName:
            user.firstName || "",

          lastName:
            user.lastName || "",

          name:
            fullName,

          email:
            user.email || "",

          role:
            user.role ||
            session.role,

          studentId:
            user.studentId ||
            session.studentId ||
            null,

          status:
            user.status ||
            session.status ||
            "active",
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "SESSION ERROR:",
      error
    );

    return NextResponse.json(
      {
        authenticated: false,

        message:
          "Unable to retrieve session.",
      },
      {
        status: 401,
      }
    );
  }
}