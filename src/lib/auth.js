import { SignJWT, jwtVerify } from "jose";

const secret = process.env.AUTH_SECRET;

if (!secret) {
  throw new Error("AUTH_SECRET is not configured.");
}

const secretKey = new TextEncoder().encode(secret);

/**
 * Create a login session.
 *
 * The JWT expires after 30 minutes.
 *
 * The cookie itself is created as a session cookie
 * inside the login API.
 */
export async function createSession(user) {
  return await new SignJWT({
    userId: user.id,
    role: user.role,
    studentId: user.studentId || null,
    name: user.name || "",
    email: user.email || "",
    status: user.status || "active",
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey);
}

/**
 * Verify an existing login session.
 *
 * Returns the session payload when valid.
 * Returns null when the session is expired
 * or invalid.
 */
export async function verifySession(token) {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      secretKey
    );

    return payload;
  } catch (error) {
    console.error(
      "SESSION VERIFICATION ERROR:",
      error
    );

    return null;
  }
}