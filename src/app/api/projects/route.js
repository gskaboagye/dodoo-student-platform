import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

/* =========================================================
   GET SESSION
========================================================= */

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

/* =========================================================
   GET DATABASE
========================================================= */

async function getDatabase() {
  const client = await clientPromise;

  return client.db(
    process.env.DB_NAME || "DCCPlatform"
  );
}

/* =========================================================
   GET USER
========================================================= */

async function getCurrentUser(db, session) {
  if (!session?.userId) {
    return null;
  }

  let user = null;

  /*
   * Normal case:
   * users._id is a MongoDB ObjectId.
   */

  if (ObjectId.isValid(session.userId)) {
    user = await db.collection("users").findOne({
      _id: new ObjectId(session.userId),
    });
  }

  /*
   * Fallback for older accounts where _id may be stored
   * differently.
   */

  if (!user) {
    user = await db.collection("users").findOne({
      _id: session.userId,
    });
  }

  return user;
}

/* =========================================================
   RESOLVE STUDENT PROFILE
========================================================= */

async function resolveStudent(db, session) {
  if (!session || session.role !== "student") {
    return null;
  }

  /*
   * Find the actual logged-in user.
   */

  const user = await getCurrentUser(db, session);

  if (!user) {
    return null;
  }

  /*
   * The users collection should contain the student's
   * studentId, which points to students._id.
   */

  let studentId =
    user.studentId ||
    session.studentId ||
    null;

  if (!studentId) {
    return null;
  }

  /*
   * Convert the ID safely to ObjectId.
   */

  if (!ObjectId.isValid(studentId.toString())) {
    return null;
  }

  const studentObjectId =
    new ObjectId(studentId.toString());

  /*
   * Find the actual student profile.
   */

  const student = await db
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
    studentId: studentObjectId,
  };
}

/* =========================================================
   GET - VIEW PROJECTS
=========================================================

Facilitators:
  - Can see all projects.

Students:
  - Can see only their own projects.
========================================================= */

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to view projects.",
        },
        { status: 401 }
      );
    }

    const db = await getDatabase();

    let filter = {};

    /* -----------------------------------------------------
       STUDENT
    ----------------------------------------------------- */

    if (session.role === "student") {
      const resolvedStudent =
        await resolveStudent(db, session);

      if (!resolvedStudent) {
        return Response.json(
          {
            message:
              "Your account is not linked to a valid student profile.",
          },
          { status: 403 }
        );
      }

      filter = {
        studentId:
          resolvedStudent.studentId,
      };
    }

    /* -----------------------------------------------------
       FACILITATOR
    ----------------------------------------------------- */

    else if (session.role === "facilitator") {
      /*
       * Facilitators can see all projects.
       */
      filter = {};
    }

    /* -----------------------------------------------------
       UNKNOWN ROLE
    ----------------------------------------------------- */

    else {
      return Response.json(
        {
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    const projects = await db
      .collection("projects")
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .toArray();

    return Response.json(projects);
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
      { status: 500 }
    );
  }
}

/* =========================================================
   POST - CREATE PROJECT
=========================================================

Students:
  - Can create unlimited projects.
  - Project automatically belongs to themselves.

Facilitators:
  - Can create projects for any student.
========================================================= */

export async function POST(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to create a project.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      technology,
      status = "Planning",
      progress = 0,
      projectUrl = "",
      githubUrl = "",
    } = body;

    /* -----------------------------------------------------
       REQUIRED FIELDS
    ----------------------------------------------------- */

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
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       DATABASE
    ----------------------------------------------------- */

    const db = await getDatabase();

    /* -----------------------------------------------------
       DETERMINE PROJECT OWNER
    ----------------------------------------------------- */

    let studentId;
    let student;

    /* =====================================================
       STUDENT
    ===================================================== */

    if (session.role === "student") {
      /*
       * IMPORTANT:
       *
       * Do NOT trust a studentId sent from the browser.
       *
       * Resolve the student from the authenticated
       * user's database record.
       */

      const resolvedStudent =
        await resolveStudent(db, session);

      if (!resolvedStudent) {
        return Response.json(
          {
            message:
              "Your account is not linked to a valid student profile.",
          },
          { status: 403 }
        );
      }

      studentId =
        resolvedStudent.studentId;

      student =
        resolvedStudent.student;
    }

    /* =====================================================
       FACILITATOR
    ===================================================== */

    else if (session.role === "facilitator") {
      /*
       * Facilitators must specify which student owns
       * the project.
       */

      if (!body.studentId) {
        return Response.json(
          {
            message:
              "A student must be selected for this project.",
          },
          { status: 400 }
        );
      }

      if (
        !ObjectId.isValid(
          body.studentId.toString()
        )
      ) {
        return Response.json(
          {
            message:
              "Invalid student ID.",
          },
          { status: 400 }
        );
      }

      studentId =
        new ObjectId(
          body.studentId.toString()
        );

      student = await db
        .collection("students")
        .findOne({
          _id: studentId,
        });

      if (!student) {
        return Response.json(
          {
            message:
              "Student not found.",
          },
          { status: 404 }
        );
      }
    }

    /* =====================================================
       UNKNOWN ROLE
    ===================================================== */

    else {
      return Response.json(
        {
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       VALIDATE PROGRESS
    ----------------------------------------------------- */

    const numericProgress =
      Number(progress);

    if (
      Number.isNaN(numericProgress) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return Response.json(
        {
          message:
            "Progress must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       CREATE PROJECT
    ----------------------------------------------------- */

    const studentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() ||
      student.name ||
      student.fullName ||
      student.email ||
      "Student";

    const project = {
      title: title.trim(),

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
        String(projectUrl).trim(),

      githubUrl:
        String(githubUrl).trim(),

      createdAt:
        new Date(),

      updatedAt:
        new Date(),
    };

    const result =
      await db
        .collection("projects")
        .insertOne(project);

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
      { status: 201 }
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
      { status: 500 }
    );
  }
}

/* =========================================================
   PUT - UPDATE PROJECT
=========================================================

Facilitators:
  - Can edit any project.

Students:
  - Can edit only their own projects.
  - Cannot change project ownership.
========================================================= */

export async function PUT(request) {
  try {
    const session =
      await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to edit a project.",
        },
        { status: 401 }
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

    /* -----------------------------------------------------
       VALIDATE PROJECT ID
    ----------------------------------------------------- */

    if (
      !id ||
      !ObjectId.isValid(id)
    ) {
      return Response.json(
        {
          message:
            "Valid project ID is required.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       VALIDATE REQUIRED FIELDS
    ----------------------------------------------------- */

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
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       VALIDATE PROGRESS
    ----------------------------------------------------- */

    const numericProgress =
      Number(progress);

    if (
      Number.isNaN(numericProgress) ||
      numericProgress < 0 ||
      numericProgress > 100
    ) {
      return Response.json(
        {
          message:
            "Progress must be between 0 and 100.",
        },
        { status: 400 }
      );
    }

    const db =
      await getDatabase();

    /* -----------------------------------------------------
       FIND EXISTING PROJECT
    ----------------------------------------------------- */

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
        { status: 404 }
      );
    }

    /* -----------------------------------------------------
       DETERMINE STUDENT
    ----------------------------------------------------- */

    let studentId;
    let student;

    /* =====================================================
       STUDENT EDIT
    ===================================================== */

    if (
      session.role === "student"
    ) {
      /*
       * Resolve the real logged-in student.
       */

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
          { status: 403 }
        );
      }

      studentId =
        resolvedStudent.studentId;

      student =
        resolvedStudent.student;

      /*
       * Make sure this project belongs to
       * the logged-in student.
       */

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
          { status: 403 }
        );
      }
    }

    /* =====================================================
       FACILITATOR EDIT
    ===================================================== */

    else if (
      session.role ===
      "facilitator"
    ) {
      /*
       * Facilitators may change the student
       * assigned to the project.
       */

      if (
        body.studentId
      ) {
        if (
          !ObjectId.isValid(
            body.studentId.toString()
          )
        ) {
          return Response.json(
            {
              message:
                "Invalid student ID.",
            },
            { status: 400 }
          );
        }

        studentId =
          new ObjectId(
            body.studentId.toString()
          );
      } else {
        studentId =
          existingProject.studentId;
      }

      if (
        !studentId ||
        !ObjectId.isValid(
          studentId.toString()
        )
      ) {
        return Response.json(
          {
            message:
              "The project is not linked to a valid student.",
          },
          { status: 400 }
        );
      }

      student =
        await db
          .collection("students")
          .findOne({
            _id:
              new ObjectId(
                studentId.toString()
              ),
          });

      if (!student) {
        return Response.json(
          {
            message:
              "Student not found.",
          },
          { status: 404 }
        );
      }

      studentId =
        new ObjectId(
          studentId.toString()
        );
    }

    /* =====================================================
       UNKNOWN ROLE
    ===================================================== */

    else {
      return Response.json(
        {
          message:
            "Unauthorized.",
        },
        { status: 403 }
      );
    }

    /* -----------------------------------------------------
       STUDENT NAME
    ----------------------------------------------------- */

    const studentName =
      `${student.firstName || ""} ${
        student.lastName || ""
      }`.trim() ||
      student.name ||
      student.fullName ||
      student.email ||
      "Student";

    /* -----------------------------------------------------
       UPDATE PROJECT
    ----------------------------------------------------- */

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

              updatedAt:
                new Date(),
            },
          }
        );

    if (
      result.matchedCount === 0
    ) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        { status: 404 }
      );
    }

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
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE - DELETE PROJECT
=========================================================

Facilitators only.
========================================================= */

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
        { status: 401 }
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
        { status: 403 }
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
        { status: 400 }
      );
    }

    const db =
      await getDatabase();

    const result =
      await db
        .collection("projects")
        .deleteOne({
          _id:
            new ObjectId(id),
        });

    if (
      result.deletedCount === 0
    ) {
      return Response.json(
        {
          message:
            "Project not found.",
        },
        { status: 404 }
      );
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
      { status: 500 }
    );
  }
}