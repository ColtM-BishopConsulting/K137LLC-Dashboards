import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader || req.headers.get(COOKIE_NAME);
    const session = await getSessionFromCookieHeader(token);
    if (!session) {
      console.warn("auth/me: no session after parse", {
        hasCookie: Boolean(cookieHeader),
        tokenFound: Boolean(token),
      });
    }
    if (!session || !session.sub) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const [user] = await db.select().from(users).where(eq(users.id, Number(session.sub)));
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    const role = String(user.role || "").trim().toLowerCase();
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  } catch (err) {
    console.error("GET /api/auth/me error", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
