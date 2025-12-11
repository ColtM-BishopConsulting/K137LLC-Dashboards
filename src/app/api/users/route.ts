import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { getSessionFromCookieHeader, hashPassword } from "@/lib/auth";

const requireAdmin = async (req: Request) => {
  const cookieHeader = req.headers.get("cookie");
  const session = await getSessionFromCookieHeader(cookieHeader);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
};

export async function GET(req: Request) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;
  try {
    const data = await db.select().from(users);
    return NextResponse.json({
      users: data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/users error", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { email, name, role = "viewer", password } = body || {};
    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const passwordHash = await hashPassword(String(password));
    const inserted = await db
      .insert(users)
      .values({
        email: String(email).toLowerCase(),
        name: String(name),
        role: String(role),
        passwordHash,
      })
      .returning();
    return NextResponse.json({
      user: {
        id: inserted[0].id,
        email: inserted[0].email,
        name: inserted[0].name,
        role: inserted[0].role,
      },
    });
  } catch (err) {
    console.error("POST /api/users error", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;
  try {
    const body = await req.json();
    const { id, email, name, role, password } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (email) updates.email = String(email).toLowerCase();
    if (name) updates.name = String(name);
    if (role) updates.role = String(role);
    if (password) updates.passwordHash = await hashPassword(String(password));
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }
    const updated = await db.update(users).set(updates).where(eq(users.id, Number(id))).returning();
    return NextResponse.json({
      user: updated[0]
        ? {
            id: updated[0].id,
            email: updated[0].email,
            name: updated[0].name,
            role: updated[0].role,
          }
        : null,
    });
  } catch (err) {
    console.error("PATCH /api/users error", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(users).where(eq(users.id, id)).returning();
    return NextResponse.json({
      user: deleted[0]
        ? { id: deleted[0].id, email: deleted[0].email, name: deleted[0].name, role: deleted[0].role }
        : null,
    });
  } catch (err) {
    console.error("DELETE /api/users error", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
