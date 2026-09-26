import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const response = NextResponse.redirect(new URL("/dashboard", origin));
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("friction_google_oauth_state")?.value;
  const requestedServices = cookieStore.get("friction_google_requested_services")?.value?.split(",").filter(Boolean) || [];
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const clearState = () => {
    response.cookies.set("friction_google_oauth_state", "", { path: "/api/google/callback", maxAge: 0 });
    response.cookies.set("friction_google_requested_services", "", { path: "/api/google/callback", maxAge: 0 });
  };

  if (error || !code || !state || !savedState || decodeURIComponent(savedState) !== state) {
    clearState();
    response.cookies.set("friction_google_error", error || "oauth_failed", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 120 });
    response.headers.set("location", new URL("/dashboard?google_error=oauth_failed", origin).toString());
    return response;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    clearState();
    response.cookies.set("friction_google_error", "missing_config", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 120 });
    response.headers.set("location", new URL("/dashboard?google_error=missing_config", origin).toString());
    return response;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${origin}/api/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) throw new Error("token_exchange_failed");
    const connection = JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      scope: tokens.scope,
      services: requestedServices,
    });
    response.cookies.set("friction_google_connection", connection, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    clearState();
    response.cookies.set("friction_google_error", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    clearState();
    response.cookies.set("friction_google_error", "token_exchange_failed", { httpOnly: false, sameSite: "lax", path: "/", maxAge: 120 });
    response.headers.set("location", new URL("/dashboard?google_error=token_exchange_failed", origin).toString());
    return response;
  }
}
