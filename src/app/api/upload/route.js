import { v2 as cloudinary } from "cloudinary";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function POST(request) {
  try {
    console.log("================================");
    console.log("PROFILE IMAGE UPLOAD STARTED");
    console.log("================================");

    // ==========================================
    // CHECK CLOUDINARY ENVIRONMENT VARIABLES
    // ==========================================
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    console.log(
      "Cloudinary cloud name:",
      cloudName ? "FOUND" : "MISSING"
    );

    console.log(
      "Cloudinary API key:",
      apiKey ? "FOUND" : "MISSING"
    );

    console.log(
      "Cloudinary API secret:",
      apiSecret ? "FOUND" : "MISSING"
    );

    if (!cloudName || !apiKey || !apiSecret) {
      console.error(
        "Cloudinary environment variables are missing."
      );

      return NextResponse.json(
        {
          message:
            "Cloudinary environment variables are missing. Check your .env.local file.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // CONFIGURE CLOUDINARY
    // ==========================================
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // ==========================================
    // CHECK LOGIN SESSION
    // ==========================================
    const cookieStore = await cookies();
    const token = cookieStore.get("dcc_session")?.value;

    console.log(
      "Session cookie:",
      token ? "FOUND" : "MISSING"
    );

    if (!token) {
      return NextResponse.json(
        {
          message:
            "You are not logged in. Please log in again.",
        },
        { status: 401 }
      );
    }

    const session = await verifySession(token);

    console.log(
      "Session:",
      session
        ? {
            role: session.role,
            studentId: session.studentId,
          }
        : "INVALID"
    );

    if (!session) {
      return NextResponse.json(
        {
          message:
            "Your login session is invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // ONLY STUDENTS CAN UPLOAD PROFILE PICTURES
    // ==========================================
    if (session.role !== "student") {
      return NextResponse.json(
        {
          message:
            "Only students can upload profile pictures.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // CHECK STUDENT PROFILE LINK
    // ==========================================
    if (!session.studentId) {
      return NextResponse.json(
        {
          message:
            "Your account is not linked to a student profile. Please contact the facilitator.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // READ UPLOADED FILE
    // ==========================================
    const formData = await request.formData();
    const file = formData.get("file");

    console.log(
      "File received:",
      file
        ? {
            name: file.name,
            type: file.type,
            size: file.size,
          }
        : "NO FILE"
    );

    if (!file) {
      return NextResponse.json(
        {
          message:
            "No image file received. Please select an image.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE FILE TYPE
    // ==========================================
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          message:
            "Only JPG, PNG, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATE FILE SIZE
    // ==========================================
    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      return NextResponse.json(
        {
          message:
            "Image must be smaller than 5MB.",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          message:
            "The selected image is empty.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // CONVERT FILE TO BUFFER
    // ==========================================
    console.log("Reading image file...");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(
      "Image converted to buffer successfully."
    );

    // ==========================================
    // UPLOAD TO CLOUDINARY
    // ==========================================
    console.log("Sending image to Cloudinary...");

    const result = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder:
                "dcc-student-platform/students",
              resource_type: "image",
              overwrite: false,
            },
            (error, uploadResult) => {
              if (error) {
                console.error(
                  "CLOUDINARY ERROR:"
                );
                console.error(error);

                reject(error);
                return;
              }

              resolve(uploadResult);
            }
          );

        uploadStream.end(buffer);
      }
    );

    // ==========================================
    // CHECK CLOUDINARY RESULT
    // ==========================================
    if (!result || !result.secure_url) {
      console.error(
        "Cloudinary did not return an image URL."
      );

      return NextResponse.json(
        {
          message:
            "Cloudinary upload completed but no image URL was returned.",
        },
        { status: 500 }
      );
    }

    console.log(
      "================================"
    );

    console.log(
      "CLOUDINARY UPLOAD SUCCESSFUL"
    );

    console.log(
      "Image URL:",
      result.secure_url
    );

    console.log(
      "Public ID:",
      result.public_id
    );

    console.log(
      "================================"
    );

    // ==========================================
    // RETURN IMAGE URL TO FRONTEND
    // ==========================================
    return NextResponse.json({
      message:
        "Profile picture uploaded successfully.",
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "PROFILE IMAGE UPLOAD FAILED"
    );

    console.error("Error:", error);

    console.error(
      "Error message:",
      error?.message
    );

    console.error(
      "Error name:",
      error?.name
    );

    console.error(
      "================================"
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          "An unexpected error occurred while uploading the profile picture.",
      },
      { status: 500 }
    );
  }
}