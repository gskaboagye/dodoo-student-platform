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

async function requireFacilitator() {
  const session = await getSession();

  if (!session) {
    return {
      error: Response.json(
        { message: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "facilitator") {
    return {
      error: Response.json(
        {
          message:
            "Only facilitators can add, edit, or delete resources.",
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/*
|--------------------------------------------------------------------------
| GET - View Resources
|--------------------------------------------------------------------------
| Facilitators and students can view resources.
*/
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const resources = await db
      .collection("resources")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json(resources);
  } catch (error) {
    console.error("Resources GET error:", error);

    return Response.json(
      { message: "Failed to load resources" },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST - Create Resource
|--------------------------------------------------------------------------
| Facilitators only.
*/
export async function POST(request) {
  try {
    const authorization = await requireFacilitator();

    if (authorization.error) {
      return authorization.error;
    }

    const body = await request.json();

    const {
      title,
      description,
      type,
      category,
      url,
    } = body;

    if (
      !title ||
      !description ||
      !type ||
      !category ||
      !url
    ) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const resource = {
      title: title.trim(),
      description: description.trim(),
      type: type.trim(),
      category: category.trim(),
      url: url.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("resources")
      .insertOne(resource);

    return Response.json(
      {
        message: "Resource created successfully",
        resource: {
          ...resource,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Resources POST error:", error);

    return Response.json(
      { message: "Failed to create resource" },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT - Update Resource
|--------------------------------------------------------------------------
| Facilitators only.
*/
export async function PUT(request) {
  try {
    const authorization = await requireFacilitator();

    if (authorization.error) {
      return authorization.error;
    }

    const body = await request.json();

    const {
      id,
      title,
      description,
      type,
      category,
      url,
    } = body;

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        { message: "Valid resource ID is required" },
        { status: 400 }
      );
    }

    if (
      !title ||
      !description ||
      !type ||
      !category ||
      !url
    ) {
      return Response.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result = await db
      .collection("resources")
      .updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            title: title.trim(),
            description: description.trim(),
            type: type.trim(),
            category: category.trim(),
            url: url.trim(),
            updatedAt: new Date(),
          },
        }
      );

    if (result.matchedCount === 0) {
      return Response.json(
        { message: "Resource not found" },
        { status: 404 }
      );
    }

    return Response.json({
      message: "Resource updated successfully",
    });
  } catch (error) {
    console.error("Resources PUT error:", error);

    return Response.json(
      { message: "Failed to update resource" },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE - Delete Resource
|--------------------------------------------------------------------------
| Facilitators only.
*/
export async function DELETE(request) {
  try {
    const authorization = await requireFacilitator();

    if (authorization.error) {
      return authorization.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        { message: "Valid resource ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(
      process.env.DB_NAME || "DCCPlatform"
    );

    const result = await db
      .collection("resources")
      .deleteOne({
        _id: new ObjectId(id),
      });

    if (result.deletedCount === 0) {
      return Response.json(
        { message: "Resource not found" },
        { status: 404 }
      );
    }

    return Response.json({
      message: "Resource deleted successfully",
    });
  } catch (error) {
    console.error("Resources DELETE error:", error);

    return Response.json(
      { message: "Failed to delete resource" },
      { status: 500 }
    );
  }
}