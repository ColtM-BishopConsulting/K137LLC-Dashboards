import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

const ALLOW_NON_ADMIN = ["/api/commits"];
const ALLOW_ALL = ["/api/auth/login", "/api/auth/logout", "/api/auth/me"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (method === "GET" || method === "OPTIONS") {
    return NextResponse.next();
  }

  if (ALLOW_ALL.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value || req.headers.get("cookie");
  const session = await getSessionFromCookieHeader(token);
  if (!session) {
    console.warn("middleware: no session", {
      path: pathname,
      hasCookie: Boolean(req.headers.get("cookie")),
      hasDirectToken: Boolean(req.cookies.get(COOKIE_NAME)?.value),
    });
  }
  const role = session?.role ? String(session.role).trim().toLowerCase() : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow all commit routes for authenticated users (approval handled in handler)
  if (ALLOW_NON_ADMIN.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Everything else requires admin
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin required for direct writes. Stage changes via commits." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
