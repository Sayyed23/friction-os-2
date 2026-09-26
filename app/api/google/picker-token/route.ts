import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("friction_google_connection")?.value;
  if (!raw) return NextResponse.json({ error: "Connect Google first." }, { status: 401 });
  try {
    const connection = JSON.parse(raw) as { accessToken: string; refreshToken?: string; expiresAt: number; services?: string[] };
    if (!connection.services?.includes("sheets")) return NextResponse.json({ error: "Grant Google Sheets access in Tools first." }, { status: 403 });
    if (connection.expiresAt > Date.now() + 60_000) return NextResponse.json({ accessToken: connection.accessToken }, { headers: { "Cache-Control": "no-store" } });
    if (!connection.refreshToken) return NextResponse.json({ error: "Reconnect Google to continue." }, { status: 401 });
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", refresh_token: connection.refreshToken, grant_type: "refresh_token" }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) return NextResponse.json({ error: "Reconnect Google to continue." }, { status: 401 });
    return NextResponse.json({ accessToken: tokens.access_token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not get a Google access token." }, { status: 500 });
  }
}
