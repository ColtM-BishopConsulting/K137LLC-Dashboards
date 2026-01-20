import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, breakdownPresetItems } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const presetId = searchParams.get("presetId");
    if (presetId) {
      const data = await db
        .select()
        .from(breakdownPresetItems)
        .where(eq(breakdownPresetItems.presetId, Number(presetId)));
      return NextResponse.json({ items: data });
    }
    const data = await db.select().from(breakdownPresetItems);
    return NextResponse.json({ items: data });
  } catch (err) {
    console.error("GET /api/breakdown-preset-items error", err);
    return NextResponse.json({ error: "Failed to fetch breakdown preset items" }, { status: 500 });
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
        presetId: Number(data.presetId),
        categoryId: Number(data.categoryId),
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
        include: data.include !== undefined ? Boolean(data.include) : true,
      };
    });
    const inserted = await db.insert(breakdownPresetItems).values(payload).returning();
    return NextResponse.json({ items: inserted });
  } catch (err) {
    console.error("POST /api/breakdown-preset-items error", err);
    return NextResponse.json({ error: "Failed to create breakdown preset items" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as unknown;
    const items = Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: unknown[] }).items)
      : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const updated: Array<typeof breakdownPresetItems.$inferSelect> = [];
    for (const item of items) {
      const data = (item ?? {}) as Record<string, unknown>;
      const rawId = data.id;
      if (rawId === undefined || rawId === null) continue;
      const id = Number(rawId);
      if (!Number.isFinite(id)) continue;
      const payload = {
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        include: data.include !== undefined ? Boolean(data.include) : undefined,
      };
      const rows = await db
        .update(breakdownPresetItems)
        .set(payload)
        .where(eq(breakdownPresetItems.id, id))
        .returning();
      if (rows[0]) updated.push(rows[0]);
    }
    return NextResponse.json({ items: updated });
  } catch (err) {
    console.error("PATCH /api/breakdown-preset-items error", err);
    return NextResponse.json({ error: "Failed to update breakdown preset items" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll("id").map((id) => Number(id)).filter(Boolean);
    const id = Number(searchParams.get("id"));
    const targets = ids.length ? ids : (id ? [id] : []);
    if (!targets.length) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(breakdownPresetItems).where(inArray(breakdownPresetItems.id, targets)).returning();
    return NextResponse.json({ items: deleted });
  } catch (err) {
    console.error("DELETE /api/breakdown-preset-items error", err);
    return NextResponse.json({ error: "Failed to delete breakdown preset items" }, { status: 500 });
  }
}
