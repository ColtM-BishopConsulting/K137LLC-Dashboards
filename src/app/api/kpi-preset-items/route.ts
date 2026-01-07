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
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [body];
    if (!items.length) return NextResponse.json({ error: "Missing items" }, { status: 400 });
    const payload = items.map((item: any) => ({
      presetId: Number(item.presetId),
      name: String(item.name || "KPI").trim(),
      formula: String(item.formula || "").trim(),
      resultType: item.resultType || "currency",
      sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : 0,
      enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
      scaleMin: item.scaleMin !== undefined && item.scaleMin !== "" ? String(item.scaleMin) : null,
      scaleMax: item.scaleMax !== undefined && item.scaleMax !== "" ? String(item.scaleMax) : null,
      scaleInvert: item.scaleInvert !== undefined ? Boolean(item.scaleInvert) : false,
    }));
    const inserted = await db.insert(kpiPresetItems).values(payload).returning();
    return NextResponse.json({ items: inserted });
  } catch (err) {
    console.error("POST /api/kpi-preset-items error", err);
    return NextResponse.json({ error: "Failed to create kpi preset items" }, { status: 500 });
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
        formula: item.formula !== undefined ? String(item.formula).trim() : undefined,
        resultType: item.resultType !== undefined ? String(item.resultType) : undefined,
        sortOrder: item.sortOrder !== undefined ? Number(item.sortOrder) : undefined,
        enabled: item.enabled !== undefined ? Boolean(item.enabled) : undefined,
        scaleMin: item.scaleMin !== undefined ? (item.scaleMin === "" ? null : String(item.scaleMin)) : undefined,
        scaleMax: item.scaleMax !== undefined ? (item.scaleMax === "" ? null : String(item.scaleMax)) : undefined,
        scaleInvert: item.scaleInvert !== undefined ? Boolean(item.scaleInvert) : undefined,
      };
      const rows = await db
        .update(kpiPresetItems)
        .set(payload)
        .where(eq(kpiPresetItems.id, Number(item.id)))
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
