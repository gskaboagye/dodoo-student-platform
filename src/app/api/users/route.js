import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "DCCPlatform");

    const users = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(users);
  } catch (error) {
    console.error("Users GET Error:", error);

    return Response.json(
      { message: "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      role,
      studentId = null,
    } = body;

    if (!name || !email || !role) {
      return Response.json(
        {
          message: "Name, email, and role are required",
        },
        { status: 400 }
      );
    }

    if (!["facilitator", "student"].includes(role)) {
      return Response.json(
        {
          message: "Role must be facilitator or student",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "DCCPlatform");

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await db
      .collection("users")
      .findOne({ email: normalizedEmail });

    if (existingUser) {
      return Response.json(
        {
          message: "A user with this email already exists",
        },
        { status: 409 }
      );
    }

    let linkedStudentId = null;

    if (role === "student" && studentId) {
      if (!ObjectId.isValid(studentId)) {
        return Response.json(
          {
            message: "Invalid student ID",
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
            message: "Student not found",
          },
          { status: 404 }
        );
      }

      linkedStudentId = new ObjectId(studentId);
    }

    const user = {
      name: name.trim(),
      email: normalizedEmail,
      role,
      studentId: linkedStudentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("users")
      .insertOne(user);

    return Response.json(
      {
        message: "User created successfully",
        user: {
          ...user,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Users POST Error:", error);

    return Response.json(
      {
        message: "Failed to create user",
      },
      { status: 500 }
    );
  }
}