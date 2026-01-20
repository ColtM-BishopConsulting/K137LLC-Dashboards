import { NextResponse } from "next/server";
import { db, tenants } from "@/db";
import { eq } from "drizzle-orm";
import { getTenantSessionFromRequest } from "@/lib/tenant-auth";

export async function GET(req: Request) {
  try {
    const session = await getTenantSessionFromRequest(req);
    if (!session || !session.sub) {
      return NextResponse.json({ tenant: null }, { status: 401 });
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, Number(session.sub)));
    if (!tenant) return NextResponse.json({ tenant: null }, { status: 401 });
    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        rentUnitId: tenant.rentUnitId,
        emailReminders: tenant.emailReminders,
      },
    });
  } catch (err) {
    console.error("GET /api/tenant/auth/me error", err);
    return NextResponse.json({ tenant: null }, { status: 500 });
  }
}
