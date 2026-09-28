import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// =========================================================
// GET SESSION
// =========================================================

async function getSession() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// =========================================================
// GET DATABASE
// =========================================================

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

// =========================================================
// GET USER
// =========================================================

async function getCurrentUser(
  db,
  session
) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  if (
    ObjectId.isValid(
      String(session.userId)
    )
  ) {
    user =
      await db
        .collection("users")
        .findOne({
          _id: new ObjectId(
            String(session.userId)
          ),
        });
  }

  if (!user) {
    user =
      await db
        .collection("users")
        .findOne({
          _id: session.userId,
        });
  }

  return user;
}

// =========================================================
// RESOLVE STUDENT PROFILE
// =========================================================

async function resolveStudent(
  db,
  session
) {
  if (
    !session ||
    session.role !== "student"
  ) {
    return null;
  }

  const user =
    await getCurrentUser(
      db,
      session
    );

  if (!user) {
    return null;
  }

  let studentId =
    user.studentId ||
    session.studentId ||
    null;

  if (!studentId) {
    return null;
  }

  if (
    !ObjectId.isValid(
      String(studentId)
    )
  ) {
    return null;
  }

  const studentObjectId =
    new ObjectId(
      String(studentId)
    );

  const student =
    await db
      .collection("students")
      .findOne({
        _id: studentObjectId,
      });

  if (!student) {
    return null;
  }

  return {
    user,
    student,
    studentId:
      studentObjectId,
  };
}

// =========================================================
// FIND USER ACCOUNT FOR STUDENT
// =========================================================

async function findStudentUser(
  db,
  student
) {
  if (!student) {
    return null;
  }

  const usersCollection =
    db.collection("users");

  // Try ObjectId studentId
  const userByStudentId =
    await usersCollection.findOne({
      studentId: student._id,
    });

  if (userByStudentId) {
    return userByStudentId;
  }

  // Try string studentId
  const userByStudentIdString =
    await usersCollection.findOne({
      studentId:
        student._id.toString(),
    });

  if (userByStudentIdString) {
    return userByStudentIdString;
  }

  // Fallback to email
  if (student.email) {
    const userByEmail =
      await usersCollection.findOne({
        email: String(
          student.email
        ).toLowerCase(),
      });

    if (userByEmail) {
      return userByEmail;
    }
  }

  return null;
}

// =========================================================
// NOTIFY STUDENT
// =========================================================

async function notifyStudent({
  db,
  student,
  title,
  message,
  type = "project",
  link = "/projects",
}) {
  try {
    const studentUser =
      await findStudentUser(
        db,
        student
      );

    if (!studentUser?._id) {
      console.warn(
        "No user account found for student:",
        student?._id?.toString()
      );

      return;
    }

    await createNotification({
      userId:
        studentUser._id.toString(),

      title,

      message,

      type,

      link,
    });
  } catch (error) {
    // Notification failure must never
    // break the project operation.
    console.error(
      "PROJECT NOTIFICATION ERROR:",
      error
    );
  }
}

// =========================================================
// PROGRESS HELPERS
// =========================================================

function normalizeProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(
    Math.max(Math.round(number), 0),
    100
  );
}

// =========================================================
// TIMELINE PROGRESS
// =========================================================

function calculateTimelineProgress(
  student
) {
  if (!student?.enrollmentDate) {
    return 0;
  }

  const start =
    new Date(
      student.enrollmentDate
    );

  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  let end;

  if (student.expectedCompletionDate) {
    end =
      new Date(
        student.expectedCompletionDate
      );
  } else {
    end =
      new Date(start);

    end.setMonth(
      end.getMonth() + 24
    );
  }

  if (Number.isNaN(end.getTime())) {
    return 0;
  }

  const now =
    new Date();

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  const totalDuration =
    end.getTime() -
    start.getTime();

  const elapsed =
    now.getTime() -
    start.getTime();

  if (totalDuration <= 0) {
    return 0;
  }

  return normalizeProgress(
    (elapsed / totalDuration) *
      100
  );
}

// =========================================================
// ATTENDANCE PROGRESS
// =========================================================

function calculateAttendanceProgress(
  attendance
) {
  if (
    !Array.isArray(attendance) ||
    attendance.length === 0
  ) {
    return 0;
  }

  let totalScore = 0;

  for (
    const record of attendance
  ) {
    const status =
      String(
        record?.status || ""
      )
        .trim()
        .toLowerCase();

    if (
      status === "present"
    ) {
      totalScore += 100;
    } else if (
      status === "late"
    ) {
      totalScore += 50;
    }
  }

  return normalizeProgress(
    totalScore /
      attendance.length
  );
}

// =========================================================
// PROJECT PROGRESS
// =========================================================

function calculateProjectProgress(
  projects
) {
  if (
    !Array.isArray(projects) ||
    projects.length === 0
  ) {
    return 0;
  }

  let total = 0;

  for (
    const project of projects
  ) {
    total +=
      normalizeProgress(
        project?.progress ?? 0
      );
  }

  return normalizeProgress(
    total /
      projects.length
  );
}

// =========================================================
// OVERALL PROGRESS
// =========================================================

function calculateOverallProgress({
  timelineProgress,
  attendanceProgress,
  projectProgress,
}) {
  return normalizeProgress(
    normalizeProgress(
      timelineProgress
    ) * 0.2 +
      normalizeProgress(
        attendanceProgress
      ) * 0.3 +
      normalizeProgress(
        projectProgress
      ) * 0.5
  );
}

// =========================================================
// GET CURRENT OVERALL PROGRESS
// =========================================================

async function getStudentOverallProgress(
  db,
  student
) {
  if (!student?._id) {
    return 0;
  }

  const attendance =
    await db
      .collection("attendance")
      .find({
        studentId: {
          $in: [
            student._id,
            student._id.toString(),
          ],
        },
      })
      .toArray();

  const projects =
    await db
      .collection("projects")
      .find({
        studentId: {
          $in: [
            student._id,
            student._id.toString(),
          ],
        },
      })
      .toArray();

  const timelineProgress =
    calculateTimelineProgress(
      student
    );

  const attendanceProgress =
    calculateAttendanceProgress(
      attendance
    );

  const projectProgress =
    calculateProjectProgress(
      projects
    );

  return calculateOverallProgress({
    timelineProgress,
    attendanceProgress,
    projectProgress,
  });
}

// =========================================================
// PROGRESS CHANGE NOTIFICATION
// =========================================================

async function notifyProgressChange({
  db,
  student,
  previousProgress,
}) {
  try {
    const currentProgress =
      await getStudentOverallProgress(
        db,
        student
      );

    const previous =
      normalizeProgress(
        previousProgress
      );

    const current =
      normalizeProgress(
        currentProgress
      );

    // No notification if progress
    // did not actually change.
    if (
      previous === current
    ) {
      return;
    }

    const studentUser =
      await findStudentUser(
        db,
        student
      );

    if (!studentUser?._id) {
      console.warn(
        "PROGRESS NOTIFICATION: User account not found:",
        student?._id?.toString()
      );

      return;
    }

    const message =
      current > previous
        ? `Your overall progress has increased from ${previous}% to ${current}%.`
        : `Your overall progress has changed from ${previous}% to ${current}%.`;

    await createNotification({
      userId:
        studentUser._id.toString(),

      title:
        "Progress Updated",

      message,

      type:
        "progress",

      link:
        "/progress",
    });

    console.log(
      "PROJECT PROGRESS NOTIFICATION CREATED:",
      {
        student:
          `${student.firstName || ""} ${
            student.lastName || ""
          }`.trim(),

        previous,

        current,
      }
    );
  } catch (error) {
    // Never allow notification errors
    // to break project operations.
    console.error(
      "PROGRESS NOTIFICATION ERROR:",
      error
    );
  }
}

// =========================================================
// GET - VIEW PROJECTS
// =========================================================

export async function GET() {
  try {
    const session =
      await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to view projects.",
        },
        {
          status: 401,
        }
      );
    }

    const db =
      await getDatabase();

    let filter = {};

    // =====================================================
    // STUDENT
    // =====================================================

    if (
      session.role === "student"
    ) {
      const resolvedStudent =
        await resolveStudent(
          db,
          session
        );

      if (!resolvedStudent) {
        return Response.json(
          {
            message:
              "Your account is not linked to a valid student profile.",
          },
          {
            status: 403,
          }
        );
      }

      filter = {
        studentId:
          resolvedStudent.studentId,
      };
    }

    // =====================================================
    // FACILITATOR
    // =====================================================

    else if (
      session.role === "facilitator"
    ) {
      filter = {};
    }

    // =====================================================
    // UNKNOWN ROLE
    // =====================================================

    else {
      return Response.json(
        {
          message:
            "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    const projects =
      await db
        .collection("projects")
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .toArray();

    return Response.json(
      projects
    );
  } catch (error) {
    console.error(
      "Projects GET error:",
      error
    );

    return Response.json(
      {
        message:
          "Failed to load projects.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// POST - CREATE PROJECT
// =========================================================

export async function POST(
  request
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to create a project.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const {
      title,
      description,
      technology,
      status = "Planning",
      progress = 0,
      projectUrl = "",
      githubUrl = "",
    } = body;

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================

    if (
      !title ||
      !description ||
      !technology
    ) {
      return Response.json(
        {
          message:
            "Title, description and technology are required.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    // =====================================================
    // DETERMINE PROJECT OWNER
    // =====================================================

    let studentId;
    let student;

    // =====================================================
    // STUDENT
    // =====================================================

    if (
      session.role === "student"
    ) {
      const resolvedStudent =
        await resolveStudent(
          db,
          session
        );

      if (!resolvedStudent) {
        return Response.json(
          {
            message:
              "Your account is not linked to a valid student profile.",
          },
          {
            status: 403,
          }
        );
      }

      studentId =
        resolvedStudent.studentId;

      student =
        resolvedStudent.student;
    }

    // =====================================================
    // FACILITATOR
    // =====================================================

    else if (
      session.role === "facilitator"
    ) {
      if (!body.studentId) {
        return Response.json(
          {
            message:
              "A student must be selected for this project.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !ObjectId.isValid(
          String(body.studentId)
        )
      ) {
        return Response.json(
          {
            message:
              "Invalid student ID.",
          },
          {
            status: 400,
          }
        );
      }

      studentId =
        new ObjectId(
          String(body.studentId)
        );

      student =
        await db
          .collection("students")
          .findOne({
            _id:
              studentId,
          });

      if (!student) {
        return Response.json(
          {
            message:
              "Student not found.",
          },
          {
            status: 404,
          }
        );
      }
    }

    // =====================================================
    // UNKNOWN ROLE
    // =====================================================

    else {
      return Response.json(
        {
          message:
            "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // VALIDATE PROGRESS
    // =====================================================

    const numericProgress =
      Number(progress);

    if (
      Number.isNaN(
        numericProgress
      ) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return Response.json(
        {
          message:
            "Progress must be between 0 and 100.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // GET PROGRESS BEFORE PROJECT CREATION
    // =====================================================

    const previousProgress =
      await getStudentOverallProgress(
        db,
        student
      );

    // =====================================================
    // STUDENT NAME
    // =====================================================

    const studentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() ||
      student.name ||
      student.fullName ||
      student.email ||
      "Student";

    // =====================================================
    // CREATE PROJECT
    // =====================================================

    const project = {
      title:
        title.trim(),

      description:
        description.trim(),

      studentId,

      studentName,

      technology:
        technology.trim(),

      status:
        String(status).trim(),

      progress:
        Math.round(
          numericProgress
        ),

      projectUrl:
        String(
          projectUrl
        ).trim(),

      githubUrl:
        String(
          githubUrl
        ).trim(),

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    const result =
      await db
        .collection("projects")
        .insertOne(
          project
        );

    // =====================================================
    // PROJECT NOTIFICATION
    // =====================================================

    await notifyStudent({
      db,
      student,

      title:
        "New Project",

      message:
        `A new project "${project.title}" has been added to your account.`,

      type:
        "project",

      link:
        "/projects",
    });

    // =====================================================
    // PROGRESS NOTIFICATION
    // =====================================================

    await notifyProgressChange({
      db,
      student,
      previousProgress,
    });

    return Response.json(
      {
        message:
          "Project created successfully.",

        project: {
          ...project,

          _id:
            result.insertedId,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Projects POST error:",
      error
    );

    return Response.json(
      {
        message:
          "Failed to create project.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// PUT - UPDATE PROJECT
// =========================================================

export async function PUT(
  request
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to edit a project.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const {
      id,
      title,
      description,
      technology,
      status,
      progress,
      projectUrl = "",
      githubUrl = "",
    } = body;

    // =====================================================
    // VALIDATE PROJECT ID
    // =====================================================

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return Response.json(
        {
          message:
            "Valid project ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // VALIDATE REQUIRED FIELDS
    // =====================================================

    if (
      !title ||
      !description ||
      !technology ||
      !status
    ) {
      return Response.json(
        {
          message:
            "Title, description, technology and status are required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // VALIDATE PROGRESS
    // =====================================================

    const numericProgress =
      Number(progress);

    if (
      Number.isNaN(
        numericProgress
      ) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return Response.json(
        {
          message:
            "Progress must be between 0 and 100.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    // =====================================================
    // FIND EXISTING PROJECT
    // =====================================================

    const existingProject =
      await db
        .collection("projects")
        .findOne({
          _id:
            new ObjectId(id),
        });

    if (!existingProject) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // DETERMINE STUDENT
    // =====================================================

    let studentId;
    let student;

    // =====================================================
    // STUDENT EDIT
    // =====================================================

    if (
      session.role === "student"
    ) {
      const resolvedStudent =
        await resolveStudent(
          db,
          session
        );

      if (!resolvedStudent) {
        return Response.json(
          {
            message:
              "Your account is not linked to a valid student profile.",
          },
          {
            status: 403,
          }
        );
      }

      studentId =
        resolvedStudent.studentId;

      student =
        resolvedStudent.student;

      const projectStudentId =
        existingProject.studentId
          ?.toString();

      if (
        studentId.toString() !==
        projectStudentId
      ) {
        return Response.json(
          {
            message:
              "You can only edit your own projects.",
          },
          {
            status: 403,
          }
        );
      }
    }

    // =====================================================
    // FACILITATOR EDIT
    // =====================================================

    else if (
      session.role ===
      "facilitator"
    ) {
      if (body.studentId) {
        if (
          !ObjectId.isValid(
            String(
              body.studentId
            )
          )
        ) {
          return Response.json(
            {
              message:
                "Invalid student ID.",
            },
            {
              status: 400,
            }
          );
        }

        studentId =
          new ObjectId(
            String(
              body.studentId
            )
          );
      } else {
        studentId =
          existingProject.studentId;
      }

      if (
        !studentId ||
        !ObjectId.isValid(
          String(studentId)
        )
      ) {
        return Response.json(
          {
            message:
              "The project is not linked to a valid student.",
          },
          {
            status: 400,
          }
        );
      }

      student =
        await db
          .collection("students")
          .findOne({
            _id:
              new ObjectId(
                String(studentId)
              ),
          });

      if (!student) {
        return Response.json(
          {
            message:
              "Student not found.",
          },
          {
            status: 404,
          }
        );
      }

      studentId =
        new ObjectId(
          String(studentId)
        );
    }

    // =====================================================
    // UNKNOWN ROLE
    // =====================================================

    else {
      return Response.json(
        {
          message:
            "Unauthorized.",
        },
        {
          status: 403,
        }
      );
    }

    // =====================================================
    // GET PREVIOUS OVERALL PROGRESS
    // =====================================================

    const previousProgress =
      await getStudentOverallProgress(
        db,
        student
      );

    // =====================================================
    // STUDENT NAME
    // =====================================================

    const studentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() ||
      student.name ||
      student.fullName ||
      student.email ||
      "Student";

    // =====================================================
    // CHECK IMPORTANT CHANGES
    // =====================================================

    const oldStatus =
      existingProject.status;

    const oldProgress =
      Number(
        existingProject.progress || 0
      );

    const oldStudentId =
      existingProject.studentId
        ?.toString();

    const newStatus =
      String(status).trim();

    const newProgress =
      Math.round(
        numericProgress
      );

    const newStudentId =
      studentId.toString();

    // =====================================================
    // UPDATE PROJECT
    // =====================================================

    const result =
      await db
        .collection("projects")
        .updateOne(
          {
            _id:
              new ObjectId(id),
          },
          {
            $set: {
              title:
                title.trim(),

              description:
                description.trim(),

              studentId:
                new ObjectId(
                  studentId.toString()
                ),

              studentName,

              technology:
                technology.trim(),

              status:
                newStatus,

              progress:
                newProgress,

              projectUrl:
                String(
                  projectUrl
                ).trim(),

              githubUrl:
                String(
                  githubUrl
                ).trim(),

              updatedAt:
                new Date(),
            },
          }
        );

    if (
      result.matchedCount ===
      0
    ) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // PROJECT NOTIFICATIONS
    // =====================================================

    if (
      oldStatus !==
      newStatus
    ) {
      await notifyStudent({
        db,
        student,

        title:
          "Project Status Updated",

        message:
          `Your project "${title.trim()}" is now ${newStatus}.`,

        type:
          "project",

        link:
          "/projects",
      });
    }

    if (
      oldProgress !==
      newProgress
    ) {
      await notifyStudent({
        db,
        student,

        title:
          "Project Progress Updated",

        message:
          `Your project "${title.trim()}" is now ${newProgress}% complete.`,

        type:
          "project",

        link:
          "/projects",
      });
    }

    // If neither status nor progress
    // changed, notify about the edit.
    if (
      oldStatus ===
        newStatus &&
      oldProgress ===
        newProgress &&
      oldStudentId ===
        newStudentId
    ) {
      await notifyStudent({
        db,
        student,

        title:
          "Project Updated",

        message:
          `Your project "${title.trim()}" has been updated.`,

        type:
          "project",

        link:
          "/projects",
      });
    }

    // =====================================================
    // OVERALL PROGRESS NOTIFICATION
    // =====================================================

    await notifyProgressChange({
      db,
      student,
      previousProgress,
    });

    return Response.json({
      message:
        "Project updated successfully.",
    });
  } catch (error) {
    console.error(
      "Projects PUT error:",
      error
    );

    return Response.json(
      {
        message:
          "Failed to update project.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// DELETE - DELETE PROJECT
// FACILITATORS ONLY
// =========================================================

export async function DELETE(
  request
) {
  try {
    const session =
      await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to delete a project.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      session.role !==
      "facilitator"
    ) {
      return Response.json(
        {
          message:
            "Only facilitators can delete projects.",
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return Response.json(
        {
          message:
            "Valid project ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      await getDatabase();

    // =====================================================
    // GET PROJECT BEFORE DELETING
    // =====================================================

    const existingProject =
      await db
        .collection("projects")
        .findOne({
          _id:
            new ObjectId(id),
        });

    if (!existingProject) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // FIND STUDENT
    // =====================================================

    let student =
      null;

    if (
      existingProject.studentId
    ) {
      const studentId =
        String(
          existingProject.studentId
        );

      if (
        ObjectId.isValid(
          studentId
        )
      ) {
        student =
          await db
            .collection("students")
            .findOne({
              _id:
                new ObjectId(
                  studentId
                ),
            });
      }
    }

    // =====================================================
    // GET PROGRESS BEFORE DELETE
    // =====================================================

    const previousProgress =
      student
        ? await getStudentOverallProgress(
            db,
            student
          )
        : 0;

    // =====================================================
    // DELETE PROJECT
    // =====================================================

    const result =
      await db
        .collection("projects")
        .deleteOne({
          _id:
            new ObjectId(id),
        });

    if (
      result.deletedCount ===
      0
    ) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // PROJECT REMOVED NOTIFICATION
    // =====================================================

    if (student) {
      await notifyStudent({
        db,
        student,

        title:
          "Project Removed",

        message:
          `Your project "${existingProject.title}" has been removed.`,

        type:
          "project",

        link:
          "/projects",
      });

      // ===================================================
      // OVERALL PROGRESS NOTIFICATION
      // ===================================================

      await notifyProgressChange({
        db,
        student,
        previousProgress,
      });
    }

    return Response.json({
      message:
        "Project deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Projects DELETE error:",
      error
    );

    return Response.json(
      {
        message:
          "Failed to delete project.",
      },
      {
        status: 500,
      }
    );
  }
}