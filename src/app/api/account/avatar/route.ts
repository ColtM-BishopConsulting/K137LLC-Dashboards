import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

const MAX_AVATAR_LENGTH = 2_000_000; // ~2MB in base64/data URL

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie");
    const token = cookieHeader || req.headers.get(COOKIE_NAME);
    const session = await getSessionFromCookieHeader(token);
    if (!session || !session.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    if (!avatarUrl) {
      return NextResponse.json({ error: "Missing avatarUrl" }, { status: 400 });
    }
    if (avatarUrl.length > MAX_AVATAR_LENGTH) {
      return NextResponse.json({ error: "Avatar too large" }, { status: 413 });
    }
    const updated = await db
      .update(users)
      .set({ avatarUrl })
      .where(eq(users.id, Number(session.sub)))
      .returning({ id: users.id, avatarUrl: users.avatarUrl });
    const [row] = updated;
    return NextResponse.json({ user: row });
  } catch (err) {
    console.error("POST /api/account/avatar error", err);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
