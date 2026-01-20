import { NextResponse } from "next/server";
import { db, tenants } from "@/db";
import { eq } from "drizzle-orm";
import { getTenantSessionFromRequest } from "@/lib/tenant-auth";
import { verifyPassword, hashPassword } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await getTenantSessionFromRequest(req);
    if (!session || !session.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, Number(session.sub)));
    if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const valid = await verifyPassword(currentPassword, tenant.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    const passwordHash = await hashPassword(newPassword);
    await db.update(tenants).set({ passwordHash }).where(eq(tenants.id, tenant.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/tenant/password error", err);
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
  }
}
