import { SignJWT, jwtVerify } from "jose";

// =========================================================
// AUTHENTICATION SECRET
// =========================================================

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error(
    "AUTH_SECRET is not configured."
  );
}

const secretKey =
  new TextEncoder().encode(secret);

// =========================================================
// CREATE SESSION
// =========================================================

/**
 * Create a JWT login session.
 *
 * The JWT expires after 30 minutes.
 *
 * The browser cookie is created separately
 * inside the login API as a session cookie.
 */
export async function createSession(user) {
  if (!user?.id) {
    throw new Error(
      "Cannot create a session without a user ID."
    );
  }

  if (!user?.role) {
    throw new Error(
      "Cannot create a session without a user role."
    );
  }

  const payload = {
    userId: String(user.id),

    role: String(user.role),

    studentId:
      user.studentId
        ? String(user.studentId)
        : null,

    name:
      user.name
        ? String(user.name)
        : "",

    email:
      user.email
        ? String(user.email)
        : "",

    status:
      user.status
        ? String(user.status)
        : "active",
  };

  return await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey);
}

// =========================================================
// VERIFY SESSION
// =========================================================

/**
 * Verify an existing login session.
 *
 * Returns the JWT payload when valid.
 *
 * Returns null when:
 * - the token is missing
 * - the token is expired
 * - the token is invalid
 * - the token cannot be verified
 */
export async function verifySession(token) {
  if (
    !token ||
    typeof token !== "string"
  ) {
    return null;
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        secretKey,
        {
          algorithms: ["HS256"],
        }
      );

    // -------------------------------------------------------
    // Validate required session fields
    // -------------------------------------------------------

    if (
      !payload.userId ||
      !payload.role
    ) {
      console.error(
        "SESSION VERIFICATION ERROR: Required session fields are missing."
      );

      return null;
    }

    return payload;
  } catch (error) {
    // Expired/invalid sessions are expected
    // occasionally, so return null instead of
    // crashing the application.
    console.error(
      "SESSION VERIFICATION ERROR:",
      error
    );

    return null;
  }
}