import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq, sql } from "drizzle-orm";
import { verifyPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    // Case-insensitive email lookup
    const [userExact] = await db.select().from(users).where(eq(users.email, email));
    let user = userExact;
    if (!user) {
      const [ciUser] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = lower(${email})`)
        .limit(1);
      user = ciUser;
    }
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const masterPwd = process.env.AUTH_MASTER_PASSWORD;
    const masterOk = masterPwd ? password === masterPwd : false;
    const valid = masterOk || await verifyPassword(password, user.passwordHash);
    if (!valid) {
      console.warn("auth/login: invalid password", { email });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const role = String(user.role || "").trim().toLowerCase();
    const token = await createSessionToken({ id: user.id, role, name: user.name, email: user.email });
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role },
    });
    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/login error", err);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
