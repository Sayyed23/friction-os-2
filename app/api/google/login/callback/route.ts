import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createGoogleSession, GOOGLE_SESSION_COOKIE } from "@/lib/google-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("friction_google_login_state")?.value;
  const clearState = () => response.cookies.set("friction_google_login_state", "", { path: "/api/google/login/callback", maxAge: 0 });
  const response = NextResponse.redirect(new URL("/dashboard", origin));
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  if (url.searchParams.has("error") || !state || !stateCookie || state !== stateCookie || !code) {
    response.headers.set("location", new URL("/?google_error=oauth_failed", origin).toString());
    clearState();
    return response;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    response.headers.set("location", new URL("/?google_error=missing_config", origin).toString());
    clearState();
    return response;
  }
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: process.env.GOOGLE_LOGIN_REDIRECT_URI || `${origin}/api/google/login/callback`, grant_type: "authorization_code" }),
      signal: AbortSignal.timeout(15000),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.id_token !== "string") throw new Error("Sign-in could not be verified.");
    const claimsResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    const claims = await claimsResponse.json();
    if (!claimsResponse.ok || claims.aud !== clientId || claims.email_verified !== "true" || !claims.email) throw new Error("Google account verification failed.");
    const sessionToken = createGoogleSession(claims.email, claims.name || claims.email.split("@")[0]);
    response.cookies.set(GOOGLE_SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
    response.cookies.set("friction_google_login_error", "", { path: "/", maxAge: 0 });
    clearState();
    return response;
  } catch {
    response.headers.set("location", new URL("/?google_error=oauth_failed", origin).toString());
    response.cookies.set("friction_google_login_error", "Sign-in failed. Check the Google OAuth client and callback URL, then try again.", { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 120 });
    clearState();
    return response;
  }
}
