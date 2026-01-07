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
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const payload = items.map((item: any) => ({
      name: String(item.name || "").trim(),
      type: String(item.type || "bank").trim(),
      institution: item.institution ? String(item.institution).trim() : null,
      last4: item.last4 ? String(item.last4).trim() : null,
    }));
    const inserted = await db.insert(ledgerAccounts).values(payload).returning();
    return NextResponse.json({ accounts: inserted });
  } catch (err) {
    console.error("POST /api/accounts error", err);
    return NextResponse.json({ error: "Failed to create accounts" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const updated: any[] = [];
    for (const item of items) {
      if (!item.id) continue;
      const payload = {
        name: item.name !== undefined ? String(item.name).trim() : undefined,
        type: item.type !== undefined ? String(item.type).trim() : undefined,
        institution: item.institution !== undefined ? (item.institution ? String(item.institution).trim() : null) : undefined,
        last4: item.last4 !== undefined ? (item.last4 ? String(item.last4).trim() : null) : undefined,
      };
      const rows = await db
        .update(ledgerAccounts)
        .set(payload)
        .where(eq(ledgerAccounts.id, Number(item.id)))
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
