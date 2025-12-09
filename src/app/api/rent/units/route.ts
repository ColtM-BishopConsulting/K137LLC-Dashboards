import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, rentUnits } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(rentUnits);
    return NextResponse.json({ units: data });
  } catch (err) {
    console.error("GET /api/rent/units error", err);
    return NextResponse.json({ error: "Failed to fetch rent units" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentUnits).values(body).returning();
    return NextResponse.json({ unit: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/units error", err);
    return NextResponse.json({ error: "Failed to create rent unit" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(rentUnits).set(rest).where(eq(rentUnits.id, id)).returning();
    return NextResponse.json({ unit: updated[0] });
  } catch (err) {
    console.error("PATCH /api/rent/units error", err);
    return NextResponse.json({ error: "Failed to update rent unit" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(rentUnits).where(eq(rentUnits.id, id)).returning();
    return NextResponse.json({ unit: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/rent/units error", err);
    return NextResponse.json({ error: "Failed to delete rent unit" }, { status: 500 });
  }
}
