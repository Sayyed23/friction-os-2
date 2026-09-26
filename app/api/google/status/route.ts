import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("friction_google_connection")?.value;
  let services: string[] = [];
  if (raw) {
    try {
      services = (JSON.parse(raw) as { services?: string[] }).services || [];
    } catch {
      // A malformed connection cookie is treated as disconnected.
    }
  }
  return NextResponse.json({ connected: services.length > 0, services });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("friction_google_connection")?.value;
  if (raw) {
    try {
      const connection = JSON.parse(raw) as { accessToken?: string; refreshToken?: string };
      const token = connection.refreshToken || connection.accessToken;
      if (token) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token }),
        });
      }
    } catch {
      // Clear the local connection even if Google revocation is unavailable.
    }
  }
  const response = NextResponse.json({ connected: false });
  response.cookies.set("friction_google_connection", "", { path: "/", maxAge: 0 });
  return response;
}
