import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, ledgerAccounts } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(ledgerAccounts);
    return NextResponse.json({ accounts: data });
  } catch (err) {
    console.error("GET /api/accounts error", err);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as unknown;
    const items = Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: unknown[] }).items)
      : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const payload = items.map((item) => {
      const data = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(data.name || "").trim(),
        type: String(data.type || "bank").trim(),
        institution: data.institution ? String(data.institution).trim() : null,
        last4: data.last4 ? String(data.last4).trim() : null,
      };
    });
    const inserted = await db.insert(ledgerAccounts).values(payload).returning();
    return NextResponse.json({ accounts: inserted });
  } catch (err) {
    console.error("POST /api/accounts error", err);
    return NextResponse.json({ error: "Failed to create accounts" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as unknown;
    const items = Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: unknown[] }).items)
      : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const updated: Array<typeof ledgerAccounts.$inferSelect> = [];
    for (const item of items) {
      const data = (item ?? {}) as Record<string, unknown>;
      const rawId = data.id;
      if (rawId === undefined || rawId === null) continue;
      const id = Number(rawId);
      if (!Number.isFinite(id)) continue;
      const payload = {
        name: data.name !== undefined ? String(data.name).trim() : undefined,
        type: data.type !== undefined ? String(data.type).trim() : undefined,
        institution: data.institution !== undefined ? (data.institution ? String(data.institution).trim() : null) : undefined,
        last4: data.last4 !== undefined ? (data.last4 ? String(data.last4).trim() : null) : undefined,
      };
      const rows = await db
        .update(ledgerAccounts)
        .set(payload)
        .where(eq(ledgerAccounts.id, id))
        .returning();
      if (rows[0]) updated.push(rows[0]);
    }
    return NextResponse.json({ accounts: updated });
  } catch (err) {
    console.error("PATCH /api/accounts error", err);
    return NextResponse.json({ error: "Failed to update accounts" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll("id").map((id) => Number(id)).filter(Boolean);
    const id = Number(searchParams.get("id"));
    const targets = ids.length ? ids : (id ? [id] : []);
    if (!targets.length) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(ledgerAccounts).where(inArray(ledgerAccounts.id, targets)).returning();
    return NextResponse.json({ accounts: deleted });
  } catch (err) {
    console.error("DELETE /api/accounts error", err);
    return NextResponse.json({ error: "Failed to delete accounts" }, { status: 500 });
  }
}
