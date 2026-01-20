import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, tenants, tenantActivityLogs } from "@/db";

const resolveTenant = async (tenantId?: string | null, email?: string | null) => {
  if (tenantId) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, Number(tenantId)));
    if (tenant) return tenant;
  }
  if (email) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(sql`lower(${tenants.email}) = lower(${String(email)})`)
      .limit(1);
    if (tenant) return tenant;
  }
  return null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId") || url.searchParams.get("tenant_id");
    const rentUnitId = url.searchParams.get("rentUnitId") || url.searchParams.get("rent_unit_id");
    const email = url.searchParams.get("email");
    const statementId = url.searchParams.get("statementId") || url.searchParams.get("statement_id");
    const redirectUrl = url.searchParams.get("url") || "/";

    const tenant = await resolveTenant(tenantId, email);
    if (tenant && (tenant.rentUnitId || rentUnitId)) {
      await db.insert(tenantActivityLogs).values({
        tenantId: tenant.id,
        rentUnitId: rentUnitId ? Number(rentUnitId) : Number(tenant.rentUnitId),
        statementId: statementId ? String(statementId) : null,
        eventType: "payment_click",
        metadata: {
          source: "link",
          url: redirectUrl,
          email: email || undefined,
        },
      });
    }

    return NextResponse.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("GET /api/tenant/track/click error", err);
    return NextResponse.redirect("/", 302);
  }
}
