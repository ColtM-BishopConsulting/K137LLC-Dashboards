import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, tenants, tenantActivityLogs } from "@/db";

const ONE_BY_ONE_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

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
    const eventType = url.searchParams.get("event") || "reminder_viewed";

    const tenant = await resolveTenant(tenantId, email);
    if (tenant && (tenant.rentUnitId || rentUnitId)) {
      await db.insert(tenantActivityLogs).values({
        tenantId: tenant.id,
        rentUnitId: rentUnitId ? Number(rentUnitId) : Number(tenant.rentUnitId),
        statementId: statementId ? String(statementId) : null,
        eventType: String(eventType),
        metadata: {
          source: "pixel",
          email: email || undefined,
        },
      });
    }
  } catch (err) {
    console.error("GET /api/tenant/track/pixel error", err);
  }

  return new NextResponse(ONE_BY_ONE_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
