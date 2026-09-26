import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

const serviceScopes: Record<string, string[]> = {
  sheets: ["https://www.googleapis.com/auth/drive.file"],
  docs: ["https://www.googleapis.com/auth/documents.readonly"],
  drive: ["https://www.googleapis.com/auth/drive.file"],
  gmail: ["https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/gmail.send"],
  calendar: ["https://www.googleapis.com/auth/calendar.events"],
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/dashboard?google_error=missing_config", origin));
  const requested = (searchParams.get("services") || "sheets").split(",").filter((service) => service in serviceScopes);
  if (!requested.length) return NextResponse.redirect(new URL("/dashboard?google_error=no_services", origin));
  const scopes = ["openid", "email", ...requested.flatMap((service) => serviceScopes[service])];

  const state = randomBytes(24).toString("hex");
  const callback = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set("friction_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google/callback",
    maxAge: 600,
  });
  response.cookies.set("friction_google_requested_services", requested.join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/google/callback",
    maxAge: 600,
  });
  return response;
}
