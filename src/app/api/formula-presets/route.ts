import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, formulaPresets } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(formulaPresets);
    return NextResponse.json({ presets: data });
  } catch (err) {
    console.error("GET /api/formula-presets error", err);
    return NextResponse.json({ error: "Failed to fetch presets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(formulaPresets).values(body).returning();
    return NextResponse.json({ preset: inserted[0] });
  } catch (err) {
    console.error("POST /api/formula-presets error", err);
    return NextResponse.json({ error: "Failed to create preset" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(formulaPresets).set(rest).where(eq(formulaPresets.id, id)).returning();
    return NextResponse.json({ preset: updated[0] });
  } catch (err) {
    console.error("PATCH /api/formula-presets error", err);
    return NextResponse.json({ error: "Failed to update preset" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(formulaPresets).where(eq(formulaPresets.id, id)).returning();
    return NextResponse.json({ preset: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/formula-presets error", err);
    return NextResponse.json({ error: "Failed to delete preset" }, { status: 500 });
  }
}
