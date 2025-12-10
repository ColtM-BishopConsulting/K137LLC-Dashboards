import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, formulas } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const data = projectId
      ? await db.select().from(formulas).where(eq(formulas.projectId, Number(projectId)))
      : await db.select().from(formulas);
    return NextResponse.json({ formulas: data });
  } catch (err) {
    console.error("GET /api/formulas error", err);
    return NextResponse.json({ error: "Failed to fetch formulas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(formulas).values(body).returning();
    return NextResponse.json({ formula: inserted[0] });
  } catch (err) {
    console.error("POST /api/formulas error", err);
    return NextResponse.json({ error: "Failed to create formula" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(formulas).set(rest).where(eq(formulas.id, id)).returning();
    return NextResponse.json({ formula: updated[0] });
  } catch (err) {
    console.error("PATCH /api/formulas error", err);
    return NextResponse.json({ error: "Failed to update formula" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(formulas).where(eq(formulas.id, id)).returning();
    return NextResponse.json({ formula: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/formulas error", err);
    return NextResponse.json({ error: "Failed to delete formula" }, { status: 500 });
  }
}
