import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const role = body.role;
    const program = body.program?.trim() || "";
    const facilitatorCode =
      body.facilitatorCode?.trim() || "";

    // ---------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        {
          error:
            "Name, email, password and account type are required.",
        },
        { status: 400 }
      );
    }

    if (!["student", "facilitator"].includes(role)) {
      return NextResponse.json(
        {
          error: "Invalid account type.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;

    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    // ---------------------------------------------
    // PREVENT DUPLICATE ACCOUNTS
    // ---------------------------------------------

    const existingUser = await db
      .collection("users")
      .findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------
    // FACILITATOR REGISTRATION
    // ---------------------------------------------

    if (role === "facilitator") {
      const correctCode =
        process.env.FACILITATOR_CODE;

      if (
        !correctCode ||
        facilitatorCode !== correctCode
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid facilitator registration code.",
          },
          { status: 403 }
        );
      }
    }

    // ---------------------------------------------
    // HASH PASSWORD
    // ---------------------------------------------

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const now = new Date();

    // ---------------------------------------------
    // STUDENT REGISTRATION
    // ---------------------------------------------
    //
    // A student can sign up without a student
    // record being created first.
    //
    // The account starts as PENDING.
    //
    // A facilitator must approve the account
    // before the student can access the system.
    // ---------------------------------------------

    if (role === "student") {
      const user = {
        name,
        email,
        passwordHash,

        role: "student",

        program,

        status: "pending",

        // This stays null until the facilitator
        // approves the registration.
        studentId: null,

        createdAt: now,
        updatedAt: now,
      };

      const result = await db
        .collection("users")
        .insertOne(user);

      return NextResponse.json(
        {
          message:
            "Registration successful. Your account is awaiting facilitator approval.",

          user: {
            id: result.insertedId.toString(),
            name,
            email,
            role: "student",
            status: "pending",
          },
        },
        { status: 201 }
      );
    }

    // ---------------------------------------------
    // FACILITATOR REGISTRATION
    // ---------------------------------------------

    const user = {
      name,
      email,
      passwordHash,

      role: "facilitator",

      status: "active",

      studentId: null,

      program: "",

      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .collection("users")
      .insertOne(user);

    return NextResponse.json(
      {
        message:
          "Facilitator account created successfully.",

        user: {
          id: result.insertedId.toString(),
          name,
          email,
          role: "facilitator",
          status: "active",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Registration Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create account.",
      },
      { status: 500 }
    );
  }
}