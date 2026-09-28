import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

export async function GET() {
  try {
    // ---------------------------------------------------------
    // 1. Authenticate the current user
    // ---------------------------------------------------------
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    if (!session?.userId) {
      return NextResponse.json(
        { message: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    // ---------------------------------------------------------
    // 2. Only facilitators can access the facilitator dashboard
    // ---------------------------------------------------------
    if (session.role !== "facilitator") {
      return NextResponse.json(
        { message: "Access denied. Facilitator access is required." },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 3. Connect to MongoDB
    // ---------------------------------------------------------
    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    // ---------------------------------------------------------
    // 4. Total active students
    // ---------------------------------------------------------
    const totalStudents = await db.collection("students").countDocuments({
      status: { $in: ["active", "Active", "enrolled", "Enrolled"] },
    });

    // ---------------------------------------------------------
    // 5. Recent students
    // ---------------------------------------------------------
    const recentStudents = await db
      .collection("students")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    // Convert MongoDB ObjectId to string so it can safely be
    // returned as JSON to the frontend.
    const formattedRecentStudents = recentStudents.map((student) => ({
      ...student,
      _id: student._id?.toString(),
      studentId: student.studentId?.toString?.() || student.studentId,
    }));

    // ---------------------------------------------------------
    // 6. Today's attendance
    // ---------------------------------------------------------
    const today = new Date();

    // Use YYYY-MM-DD because attendance records use this format.
    const dateString = today.toISOString().split("T")[0];

    const attendanceRecords = await db
      .collection("attendance")
      .find({ date: dateString })
      .toArray();

    const presentToday = attendanceRecords.filter(
      (record) => record.status === "Present"
    ).length;

    const lateToday = attendanceRecords.filter(
      (record) => record.status === "Late"
    ).length;

    const absentToday = attendanceRecords.filter(
      (record) => record.status === "Absent"
    ).length;

    // ---------------------------------------------------------
    // 7. Active projects
    // ---------------------------------------------------------
    const activeProjects = await db.collection("projects").countDocuments({
      status: {
        $in: ["Planning", "In Progress"],
      },
    });

    // ---------------------------------------------------------
    // 8. Total resources
    // ---------------------------------------------------------
    const resources = await db.collection("resources").countDocuments();

    // ---------------------------------------------------------
    // 9. Pending student applications
    //
    // Applications are stored in the users collection while
    // the student account is still pending.
    // ---------------------------------------------------------
    const pendingApplications = await db
      .collection("users")
      .countDocuments({
        role: "student",
        status: "pending",
        emailVerified: true,
      });

    // ---------------------------------------------------------
    // 10. Return dashboard data
    // ---------------------------------------------------------
    return NextResponse.json({
      success: true,

      totalStudents,

      presentToday,
      lateToday,
      absentToday,

      activeProjects,

      resources,

      pendingApplications,

      recentStudents: formattedRecentStudents,

      attendance: {
        date: dateString,
        total: attendanceRecords.length,
        present: presentToday,
        late: lateToday,
        absent: absentToday,
      },
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard data",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}