import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GOOGLE_SESSION_COOKIE, readGoogleSession } from "@/lib/google-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = readGoogleSession(cookieStore.get(GOOGLE_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, email: session.email, name: session.name });
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(GOOGLE_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
