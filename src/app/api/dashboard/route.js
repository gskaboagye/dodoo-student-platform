import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;

    const dbName = process.env.DB_NAME || "DCCPlatform";
    const db = client.db(dbName);

    const totalStudents = await db
      .collection("students")
      .countDocuments();

    const recentStudents = await db
      .collection("students")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const today = new Date();
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

    const activeProjects = await db
      .collection("projects")
      .countDocuments({
        status: { $in: ["Planning", "In Progress"] },
      });

    const resources = await db
      .collection("resources")
      .countDocuments();

    return Response.json({
      totalStudents,
      presentToday,
      lateToday,
      absentToday,
      activeProjects,
      resources,
      recentStudents,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    return Response.json(
      {
        message: "Failed to load dashboard data",
        error: error.message,
      },
      { status: 500 }
    );
  }
}