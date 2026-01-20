import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, tenantActivityLogs } from "@/db";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";

const requireAdmin = async (req: Request) => {
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie");
  const token = cookieHeader || req.headers.get(COOKIE_NAME);
  const session = await getSessionFromCookieHeader(token);
  const role = session?.role ? String(session.role).trim().toLowerCase() : null;
  if (!session) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (role !== "admin") return { ok: false, res: NextResponse.json({ error: "Admin required" }, { status: 403 }) };
  return { ok: true };
};

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const url = new URL(req.url);
    const rentUnitId = url.searchParams.get("rentUnitId");
    const tenantId = url.searchParams.get("tenantId");
    const clauses = [];
    if (rentUnitId) clauses.push(eq(tenantActivityLogs.rentUnitId, Number(rentUnitId)));
    if (tenantId) clauses.push(eq(tenantActivityLogs.tenantId, Number(tenantId)));
    const where = clauses.length ? and(...clauses) : undefined;
    const rows = await db
      .select()
      .from(tenantActivityLogs)
      .where(where)
      .orderBy(desc(tenantActivityLogs.createdAt))
      .limit(200);
    return NextResponse.json({ activities: rows });
  } catch (err) {
    console.error("GET /api/tenants/activity error", err);
    return NextResponse.json({ error: "Failed to fetch tenant activity" }, { status: 500 });
  }
}
