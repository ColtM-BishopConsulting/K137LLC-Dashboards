import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, tenants, rentUnits } from "@/db";
import { getSessionFromCookieHeader, COOKIE_NAME, hashPassword } from "@/lib/auth";

const requireAdmin = async (req: Request) => {
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie");
  const token = cookieHeader || req.headers.get(COOKIE_NAME);
  const session = await getSessionFromCookieHeader(token);
  const role = session?.role ? String(session.role).trim().toLowerCase() : null;
  if (!session) return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (role !== "admin") return { ok: false, res: NextResponse.json({ error: "Admin required" }, { status: 403 }) };
  return { ok: true, session };
};

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const rows = await db
      .select({
        id: tenants.id,
        rentUnitId: tenants.rentUnitId,
        name: tenants.name,
        email: tenants.email,
        emailReminders: tenants.emailReminders,
        createdAt: tenants.createdAt,
        unit: rentUnits.unit,
        propertyId: rentUnits.propertyId,
      })
      .from(tenants)
      .leftJoin(rentUnits, eq(rentUnits.id, tenants.rentUnitId))
      .orderBy(sql`lower(${tenants.name})`);
    return NextResponse.json({ tenants: rows });
  } catch (err) {
    console.error("GET /api/tenants error", err);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const rentUnitId = body?.rentUnitId ? Number(body.rentUnitId) : null;
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    const [inserted] = await db.insert(tenants).values({
      name,
      email,
      passwordHash,
      rentUnitId,
      emailReminders: Boolean(body?.emailReminders),
    }).returning();
    return NextResponse.json({ tenant: inserted });
  } catch (err) {
    console.error("POST /api/tenants error", err);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const payload: Record<string, unknown> = {};
    if (rest.name !== undefined) payload.name = String(rest.name || "").trim();
    if (rest.email !== undefined) payload.email = String(rest.email || "").trim().toLowerCase();
    if (rest.emailReminders !== undefined) payload.emailReminders = Boolean(rest.emailReminders);
    if (rest.rentUnitId !== undefined) payload.rentUnitId = rest.rentUnitId ? Number(rest.rentUnitId) : null;
    if (rest.password) payload.passwordHash = await hashPassword(String(rest.password));
    const [updated] = await db.update(tenants).set(payload).where(eq(tenants.id, Number(id))).returning();
    return NextResponse.json({ tenant: updated });
  } catch (err) {
    console.error("PATCH /api/tenants error", err);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const [deleted] = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    return NextResponse.json({ tenant: deleted });
  } catch (err) {
    console.error("DELETE /api/tenants error", err);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
