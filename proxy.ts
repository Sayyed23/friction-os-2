import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_SESSION_COOKIE, readGoogleSession } from "@/lib/google-session";

export function proxy(request: NextRequest) {
  const session = readGoogleSession(request.cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  if (request.nextUrl.pathname === "/" && session) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (request.nextUrl.pathname.startsWith("/dashboard") && !session) return NextResponse.redirect(new URL("/", request.url));
  if (request.nextUrl.pathname.startsWith("/api/") && !session) return NextResponse.json({ error: "Sign in with Google to continue." }, { status: 401 });
  return NextResponse.next();
}

export const config = { matcher: ["/", "/dashboard/:path*", "/api/investigate", "/api/google/status", "/api/google/sheets", "/api/google/picker-token", "/api/google/connect"] };
