import { NextResponse } from "next/server";
import { db, tenants } from "@/db";
import { eq, sql } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth";
import { createTenantSessionToken, TENANT_COOKIE_NAME } from "@/lib/tenant-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const [tenantExact] = await db.select().from(tenants).where(eq(tenants.email, email));
    let tenant = tenantExact;
    if (!tenant) {
      const [ciTenant] = await db
        .select()
        .from(tenants)
        .where(sql`lower(${tenants.email}) = lower(${email})`)
        .limit(1);
      tenant = ciTenant;
    }
    if (!tenant) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await verifyPassword(password, tenant.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createTenantSessionToken({ id: tenant.id, name: tenant.name, email: tenant.email });
    const res = NextResponse.json({
      tenant: { id: tenant.id, name: tenant.name, email: tenant.email, rentUnitId: tenant.rentUnitId, emailReminders: tenant.emailReminders },
    });
    res.cookies.set({
      name: TENANT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (err) {
    console.error("POST /api/tenant/auth/login error", err);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
