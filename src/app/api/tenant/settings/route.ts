import { NextResponse } from "next/server";
import { db, tenants } from "@/db";
import { eq } from "drizzle-orm";
import { getTenantSessionFromRequest } from "@/lib/tenant-auth";

export async function PATCH(req: Request) {
  try {
    const session = await getTenantSessionFromRequest(req);
    if (!session || !session.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    if (body?.emailReminders === undefined) {
      return NextResponse.json({ error: "Missing settings" }, { status: 400 });
    }
    const [updated] = await db
      .update(tenants)
      .set({ emailReminders: Boolean(body.emailReminders) })
      .where(eq(tenants.id, Number(session.sub)))
      .returning();
    return NextResponse.json({ tenant: updated });
  } catch (err) {
    console.error("PATCH /api/tenant/settings error", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
