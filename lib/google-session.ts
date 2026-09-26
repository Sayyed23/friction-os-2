import { createHmac, timingSafeEqual } from "node:crypto";

type GoogleSession = { email: string; name: string; expiresAt: number };
const COOKIE_NAME = "friction_google_session";

function signature(payload: string) {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("Google OAuth is not configured.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createGoogleSession(email: string, name: string) {
  const session: GoogleSession = { email, name, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readGoogleSession(value?: string | null): GoogleSession | null {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return null;
  try {
    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleSession;
    if (typeof session.email !== "string" || typeof session.name !== "string" || session.expiresAt <= Date.now()) return null;
    return session;
  } catch { return null; }
}

export { COOKIE_NAME as GOOGLE_SESSION_COOKIE };
