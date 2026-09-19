import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import { verifySession } from "@/lib/auth";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("dcc_session")?.value;

  if (!token) {
    return null;
  }

  return await verifySession(token);
}

/*
|--------------------------------------------------------------------------
| GET - View Projects
|--------------------------------------------------------------------------
| Facilitators:
|   - Can see all projects.
|
| Students:
|   - Can see ONLY their own projects.
|
| No public project listing.
*/
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message: "You must be logged in to view projects.",
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    let filter = {};

    // Student can only see their own projects.
    if (session.role === "student") {
      if (!session.studentId) {
        return Response.json(
          {
            message:
              "Your account is not linked to a student profile.",
          },
          { status: 403 }
        );
      }

      let studentObjectId;

      try {
        studentObjectId = new ObjectId(
          session.studentId.toString()
        );
      } catch {
        return Response.json(
          {
            message: "Invalid student account.",
          },
          { status: 403 }
        );
      }

      filter = {
        studentId: studentObjectId,
      };
    }

    // Only students and facilitators can access projects.
    if (
      session.role !== "student" &&
      session.role !== "facilitator"
    ) {
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
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(projects);
  } catch (error) {
    console.error("Projects GET error:", error);

    return Response.json(
      {
        message: "Failed to load projects.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST - Create Project
|--------------------------------------------------------------------------
| Students:
|   - Can create unlimited projects.
|   - Project automatically belongs to logged-in student.
|
| Facilitators:
|   - Can create projects for any student.
*/
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

    if (!title || !description || !technology) {
      return Response.json(
        {
          message:
            "Title, description and technology are required.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Project Owner
    |--------------------------------------------------------------------------
    */

    let studentId;

    if (session.role === "student") {
      // Students can ONLY create projects for themselves.
      if (!session.studentId) {
        return Response.json(
          {
            message:
              "Your account is not linked to a student profile.",
          },
          { status: 403 }
        );
      }

      studentId = session.studentId;
    } else if (session.role === "facilitator") {
      // Facilitator must select the student.
      if (!body.studentId) {
        return Response.json(
          {
            message:
              "A student must be selected for this project.",
          },
          { status: 400 }
        );
      }

      if (!ObjectId.isValid(body.studentId)) {
        return Response.json(
          {
            message: "Invalid student ID.",
          },
          { status: 400 }
        );
      }

      studentId = body.studentId;
    } else {
      return Response.json(
        {
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Progress
    |--------------------------------------------------------------------------
    */

    const numericProgress = Number(progress);

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

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    /*
    |--------------------------------------------------------------------------
    | Find Student
    |--------------------------------------------------------------------------
    */

    if (!ObjectId.isValid(studentId)) {
      return Response.json(
        {
          message: "Invalid student ID.",
        },
        { status: 400 }
      );
    }

    const student = await db
      .collection("students")
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!student) {
      return Response.json(
        {
          message: "Student not found.",
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Project
    |--------------------------------------------------------------------------
    */

    const project = {
      title: title.trim(),

      description: description.trim(),

      studentId: new ObjectId(studentId),

      studentName:
        `${student.firstName || ""} ${student.lastName || ""}`.trim(),

      technology: technology.trim(),

      status: String(status).trim(),

      progress: Math.round(numericProgress),

      projectUrl: projectUrl.trim(),

      githubUrl: githubUrl.trim(),

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result = await db
      .collection("projects")
      .insertOne(project);

    return Response.json(
      {
        message: "Project created successfully.",

        project: {
          ...project,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Projects POST error:", error);

    return Response.json(
      {
        message: "Failed to create project.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT - Update Project
|--------------------------------------------------------------------------
| Facilitators:
|   - Can edit any project.
|
| Students:
|   - Can edit ONLY their own projects.
|   - Cannot change project ownership.
*/
export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to edit a project.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

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

    /*
    |--------------------------------------------------------------------------
    | Validate Project ID
    |--------------------------------------------------------------------------
    */

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        {
          message:
            "Valid project ID is required.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Required Fields
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Validate Progress
    |--------------------------------------------------------------------------
    */

    const numericProgress = Number(progress);

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

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    /*
    |--------------------------------------------------------------------------
    | Find Existing Project
    |--------------------------------------------------------------------------
    */

    const existingProject =
      await db.collection("projects").findOne({
        _id: new ObjectId(id),
      });

    if (!existingProject) {
      return Response.json(
        {
          message: "Project not found.",
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Ownership Check
    |--------------------------------------------------------------------------
    */

    if (session.role === "student") {
      if (!session.studentId) {
        return Response.json(
          {
            message:
              "Your account is not linked to a student profile.",
          },
          { status: 403 }
        );
      }

      const sessionStudentId =
        session.studentId.toString();

      const projectStudentId =
        existingProject.studentId?.toString();

      if (
        sessionStudentId !== projectStudentId
      ) {
        return Response.json(
          {
            message:
              "You can only edit your own projects.",
          },
          { status: 403 }
        );
      }
    } else if (session.role !== "facilitator") {
      return Response.json(
        {
          message: "Unauthorized.",
        },
        { status: 403 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Student
    |--------------------------------------------------------------------------
    */

    let studentId;

    if (session.role === "student") {
      // Students cannot change ownership.
      studentId = existingProject.studentId;
    } else {
      // Facilitators can change the assigned student.
      if (
        body.studentId &&
        ObjectId.isValid(body.studentId)
      ) {
        studentId = new ObjectId(
          body.studentId
        );
      } else {
        studentId =
          existingProject.studentId;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Find Student
    |--------------------------------------------------------------------------
    */

    const student = await db
      .collection("students")
      .findOne({
        _id: new ObjectId(studentId),
      });

    if (!student) {
      return Response.json(
        {
          message: "Student not found.",
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Update Project
    |--------------------------------------------------------------------------
    */

    const result = await db
      .collection("projects")
      .updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: {
            title: title.trim(),

            description:
              description.trim(),

            studentId:
              new ObjectId(studentId),

            studentName:
              `${student.firstName || ""} ${student.lastName || ""}`.trim(),

            technology:
              technology.trim(),

            status:
              String(status).trim(),

            progress:
              Math.round(numericProgress),

            projectUrl:
              projectUrl.trim(),

            githubUrl:
              githubUrl.trim(),

            updatedAt:
              new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return Response.json(
        {
          message: "Project not found.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      message:
        "Project updated successfully.",
    });
  } catch (error) {
    console.error("Projects PUT error:", error);

    return Response.json(
      {
        message:
          "Failed to update project.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE - Delete Project
|--------------------------------------------------------------------------
| Facilitators only.
*/
export async function DELETE(request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          message:
            "You must be logged in to delete a project.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "facilitator") {
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

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        {
          message:
            "Valid project ID is required.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result =
      await db.collection("projects").deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return Response.json(
        {
          message: "Project not found.",
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