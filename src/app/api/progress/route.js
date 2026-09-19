import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function getStudentIdValues(student) {
  const values = [student._id.toString()];

  if (student._id instanceof ObjectId) {
    values.push(student._id);
  }

  return values;
}

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

async function calculateStudentProgress(db, student) {
  const enrollmentDate = student.enrollmentDate
    ? new Date(student.enrollmentDate)
    : new Date(student.createdAt || new Date());

  const expectedCompletionDate = student.expectedCompletionDate
    ? new Date(student.expectedCompletionDate)
    : addMonths(enrollmentDate, 24);

  const now = new Date();

  const periodEnd =
    now < expectedCompletionDate
      ? now
      : expectedCompletionDate;

  /*
   * ---------------------------------------------------------
   * 1. PROGRAM TIMELINE — 20%
   * ---------------------------------------------------------
   */

  const totalProgramTime =
    expectedCompletionDate.getTime() -
    enrollmentDate.getTime();

  const elapsedProgramTime =
    periodEnd.getTime() -
    enrollmentDate.getTime();

  let timelineProgress = 0;

  if (totalProgramTime > 0) {
    timelineProgress =
      (elapsedProgramTime / totalProgramTime) * 100;
  }

  timelineProgress = Math.round(
    clamp(timelineProgress)
  );

  /*
   * ---------------------------------------------------------
   * 2. PROJECT PROGRESS — 50%
   * ---------------------------------------------------------
   */

  const studentIdValues =
    getStudentIdValues(student);

  const projects = await db
    .collection("projects")
    .find({
      studentId: {
        $in: studentIdValues,
      },
    })
    .toArray();

  let projectProgress = 0;

  if (projects.length > 0) {
    const totalProjectProgress =
      projects.reduce(
        (total, project) =>
          total + (Number(project.progress) || 0),
        0
      );

    projectProgress =
      totalProjectProgress / projects.length;
  }

  projectProgress = Math.round(
    clamp(projectProgress)
  );

  /*
   * ---------------------------------------------------------
   * 3. ATTENDANCE — 30%
   * ---------------------------------------------------------
   */

  const enrollmentDateString =
    enrollmentDate.toISOString().split("T")[0];

  const periodEndString =
    periodEnd.toISOString().split("T")[0];

  const attendanceRecords = await db
    .collection("attendance")
    .find({
      studentId: {
        $in: studentIdValues,
      },
      date: {
        $gte: enrollmentDateString,
        $lte: periodEndString,
      },
    })
    .toArray();

  let attendanceProgress = 0;

  if (attendanceRecords.length > 0) {
    let attendancePoints = 0;

    attendanceRecords.forEach((record) => {
      if (record.status === "Present") {
        attendancePoints += 100;
      } else if (record.status === "Late") {
        attendancePoints += 50;
      } else if (record.status === "Absent") {
        attendancePoints += 0;
      }
    });

    attendanceProgress =
      attendancePoints /
      attendanceRecords.length;
  }

  attendanceProgress = Math.round(
    clamp(attendanceProgress)
  );

  /*
   * ---------------------------------------------------------
   * 4. OVERALL PROGRESS
   * ---------------------------------------------------------
   */

  const overallProgress = Math.round(
    timelineProgress * 0.2 +
      attendanceProgress * 0.3 +
      projectProgress * 0.5
  );

  /*
   * ---------------------------------------------------------
   * 5. PROGRAM YEAR
   * ---------------------------------------------------------
   */

  const monthsElapsed = Math.max(
    0,
    (periodEnd.getFullYear() -
      enrollmentDate.getFullYear()) *
      12 +
      (periodEnd.getMonth() -
        enrollmentDate.getMonth())
  );

  const programYear =
    monthsElapsed < 12 ? 1 : 2;

  const monthsCompleted = Math.min(
    monthsElapsed,
    24
  );

  const monthsRemaining = Math.max(
    0,
    24 - monthsCompleted
  );

  return {
    ...student,

    _id: student._id.toString(),

    progress: overallProgress,

    progressDetails: {
      overallProgress,
      projectProgress,
      attendanceProgress,
      timelineProgress,

      projectCount: projects.length,
      attendanceRecords:
        attendanceRecords.length,

      programDurationMonths: 24,
      monthsCompleted,
      monthsRemaining,
      programYear,

      enrollmentDate,
      expectedCompletionDate,
    },
  };
}

export async function GET() {
  try {
    /*
     * ---------------------------------------------------------
     * AUTHENTICATION
     * ---------------------------------------------------------
     */

    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    /*
     * ---------------------------------------------------------
     * FACILITATOR
     * ---------------------------------------------------------
     *
     * Facilitators can see all student progress.
     */

    if (session.role === "facilitator") {
      const students = await db
        .collection("students")
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      const calculatedStudents =
        await Promise.all(
          students.map((student) =>
            calculateStudentProgress(
              db,
              student
            )
          )
        );

      calculatedStudents.sort(
        (a, b) =>
          b.progress - a.progress
      );

      const totalStudents =
        calculatedStudents.length;

      const averageProgress =
        totalStudents > 0
          ? Math.round(
              calculatedStudents.reduce(
                (total, student) =>
                  total + student.progress,
                0
              ) / totalStudents
            )
          : 0;

      const completed =
        calculatedStudents.filter(
          (student) =>
            student.progress >= 100
        ).length;

      const onTrack =
        calculatedStudents.filter(
          (student) =>
            student.progress >= 70 &&
            student.progress < 100
        ).length;

      const needsAttention =
        calculatedStudents.filter(
          (student) =>
            student.progress < 70
        ).length;

      return Response.json({
        totalStudents,
        averageProgress,
        completed,
        onTrack,
        needsAttention,
        students: calculatedStudents,
      });
    }

    /*
     * ---------------------------------------------------------
     * STUDENT
     * ---------------------------------------------------------
     *
     * Students can see ONLY their own progress.
     */

    if (
      session.role === "student" &&
      session.studentId
    ) {
      if (
        !ObjectId.isValid(
          session.studentId.toString()
        )
      ) {
        return Response.json(
          {
            message:
              "Invalid student account.",
          },
          { status: 400 }
        );
      }

      const student =
        await db
          .collection("students")
          .findOne({
            _id: new ObjectId(
              session.studentId
            ),
          });

      if (!student) {
        return Response.json(
          {
            message:
              "Student record not found.",
          },
          { status: 404 }
        );
      }

      const calculatedStudent =
        await calculateStudentProgress(
          db,
          student
        );

      return Response.json({
        totalStudents: 1,
        averageProgress:
          calculatedStudent.progress,
        completed:
          calculatedStudent.progress >= 100
            ? 1
            : 0,
        onTrack:
          calculatedStudent.progress >= 70 &&
          calculatedStudent.progress < 100
            ? 1
            : 0,
        needsAttention:
          calculatedStudent.progress < 70
            ? 1
            : 0,
        students: [
          calculatedStudent,
        ],
      });
    }

    return Response.json(
      {
        message:
          "You are not authorized to view progress.",
      },
      { status: 403 }
    );
  } catch (error) {
    console.error(
      "Progress API Error:",
      error
    );

    return Response.json(
      {
        message:
          "Failed to calculate student progress",
      },
      { status: 500 }
    );
  }
}