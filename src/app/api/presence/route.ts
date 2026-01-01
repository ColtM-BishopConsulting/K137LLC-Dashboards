import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, dashboardPresence, users } from "@/db";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

const requireSession = async (req: Request) => {
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie");
  const token = cookieHeader || req.headers.get(COOKIE_NAME);
  const session = await getSessionFromCookieHeader(token);
  if (!session || !session.sub) return null;
  return session;
};

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        lastSeen: dashboardPresence.lastSeen,
      })
      .from(dashboardPresence)
      .innerJoin(users, eq(dashboardPresence.userId, users.id))
      .where(sql`${dashboardPresence.lastSeen} > now() - interval '2 minutes'`)
      .orderBy(desc(dashboardPresence.lastSeen));
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error("GET /api/presence error", err);
    return NextResponse.json({ error: "Failed to load presence" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId || "").trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }
    await db
      .insert(dashboardPresence)
      .values({
        userId: Number(session.sub),
        sessionId,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: [dashboardPresence.userId, dashboardPresence.sessionId],
        set: { lastSeen: new Date() },
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/presence error", err);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
