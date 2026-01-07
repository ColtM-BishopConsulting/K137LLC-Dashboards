import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, breakdownPresets, breakdownPresetItems } from "@/db";

export async function GET() {
  try {
    const presets = await db.select().from(breakdownPresets);
    const ids = presets.map((p) => p.id);
    const items = ids.length
      ? await db.select().from(breakdownPresetItems).where(inArray(breakdownPresetItems.presetId, ids))
      : [];
    return NextResponse.json({ presets, items });
  } catch (err) {
    console.error("GET /api/breakdown-presets error", err);
    return NextResponse.json({ error: "Failed to fetch breakdown presets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    const payload = {
      name,
      description: body?.description ? String(body.description) : null,
      isDefault: Boolean(body?.isDefault),
    };
    const inserted = await db.insert(breakdownPresets).values(payload).returning();
    return NextResponse.json({ preset: inserted[0] });
  } catch (err) {
    console.error("POST /api/breakdown-presets error", err);
    return NextResponse.json({ error: "Failed to create breakdown preset" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const payload = {
      name: rest?.name ? String(rest.name).trim() : undefined,
      description: rest?.description !== undefined ? String(rest.description) : undefined,
      isDefault: rest?.isDefault !== undefined ? Boolean(rest.isDefault) : undefined,
    };
    const updated = await db
      .update(breakdownPresets)
      .set(payload)
      .where(eq(breakdownPresets.id, Number(id)))
      .returning();
    return NextResponse.json({ preset: updated[0] });
  } catch (err) {
    console.error("PATCH /api/breakdown-presets error", err);
    return NextResponse.json({ error: "Failed to update breakdown preset" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(breakdownPresets).where(eq(breakdownPresets.id, id)).returning();
    return NextResponse.json({ preset: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/breakdown-presets error", err);
    return NextResponse.json({ error: "Failed to delete breakdown preset" }, { status: 500 });
  }
}
