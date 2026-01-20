import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, kpiPresetItems } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const presetId = searchParams.get("presetId");
    if (presetId) {
      const data = await db
        .select()
        .from(kpiPresetItems)
        .where(eq(kpiPresetItems.presetId, Number(presetId)));
      return NextResponse.json({ items: data });
    }
    const data = await db.select().from(kpiPresetItems);
    return NextResponse.json({ items: data });
  } catch (err) {
    console.error("GET /api/kpi-preset-items error", err);
    return NextResponse.json({ error: "Failed to fetch kpi preset items" }, { status: 500 });
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
        name: String(data.name || "KPI").trim(),
        formula: String(data.formula || "").trim(),
        resultType: typeof data.resultType === "string" ? data.resultType : "currency",
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : 0,
        enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
        scaleMin: data.scaleMin !== undefined && data.scaleMin !== "" ? String(data.scaleMin) : null,
        scaleMax: data.scaleMax !== undefined && data.scaleMax !== "" ? String(data.scaleMax) : null,
        scaleInvert: data.scaleInvert !== undefined ? Boolean(data.scaleInvert) : false,
      };
    });
    const inserted = await db.insert(kpiPresetItems).values(payload).returning();
    return NextResponse.json({ items: inserted });
  } catch (err) {
    console.error("POST /api/kpi-preset-items error", err);
    return NextResponse.json({ error: "Failed to create kpi preset items" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as unknown;
    const items = Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: unknown[] }).items)
      : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const updated: Array<typeof kpiPresetItems.$inferSelect> = [];
    for (const item of items) {
      const data = (item ?? {}) as Record<string, unknown>;
      const rawId = data.id;
      if (rawId === undefined || rawId === null) continue;
      const id = Number(rawId);
      if (!Number.isFinite(id)) continue;
      const payload = {
        name: data.name !== undefined ? String(data.name).trim() : undefined,
        formula: data.formula !== undefined ? String(data.formula).trim() : undefined,
        resultType: data.resultType !== undefined ? String(data.resultType) : undefined,
        sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
        enabled: data.enabled !== undefined ? Boolean(data.enabled) : undefined,
        scaleMin: data.scaleMin !== undefined ? (data.scaleMin === "" ? null : String(data.scaleMin)) : undefined,
        scaleMax: data.scaleMax !== undefined ? (data.scaleMax === "" ? null : String(data.scaleMax)) : undefined,
        scaleInvert: data.scaleInvert !== undefined ? Boolean(data.scaleInvert) : undefined,
      };
      const rows = await db
        .update(kpiPresetItems)
        .set(payload)
        .where(eq(kpiPresetItems.id, id))
        .returning();
      if (rows[0]) updated.push(rows[0]);
    }
    return NextResponse.json({ items: updated });
  } catch (err) {
    console.error("PATCH /api/kpi-preset-items error", err);
    return NextResponse.json({ error: "Failed to update kpi preset items" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll("id").map((id) => Number(id)).filter(Boolean);
    const id = Number(searchParams.get("id"));
    const targets = ids.length ? ids : (id ? [id] : []);
    if (!targets.length) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(kpiPresetItems).where(inArray(kpiPresetItems.id, targets)).returning();
    return NextResponse.json({ items: deleted });
  } catch (err) {
    console.error("DELETE /api/kpi-preset-items error", err);
    return NextResponse.json({ error: "Failed to delete kpi preset items" }, { status: 500 });
  }
}
