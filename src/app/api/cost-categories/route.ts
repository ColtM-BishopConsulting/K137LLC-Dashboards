import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, costCategories } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(costCategories);
    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error("GET /api/cost-categories error", err);
    return NextResponse.json({ error: "Failed to fetch cost categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
    const payload = {
      name,
      code: body?.code ? String(body.code).trim() : null,
    };
    const inserted = await db.insert(costCategories).values(payload).returning();
    return NextResponse.json({ category: inserted[0] });
  } catch (err) {
    console.error("POST /api/cost-categories error", err);
    return NextResponse.json({ error: "Failed to create cost category" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const payload = {
      name: rest?.name ? String(rest.name).trim() : undefined,
      code: rest?.code !== undefined ? String(rest.code).trim() : undefined,
    };
    const updated = await db
      .update(costCategories)
      .set(payload)
      .where(eq(costCategories.id, Number(id)))
      .returning();
    return NextResponse.json({ category: updated[0] });
  } catch (err) {
    console.error("PATCH /api/cost-categories error", err);
    return NextResponse.json({ error: "Failed to update cost category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(costCategories).where(eq(costCategories.id, id)).returning();
    return NextResponse.json({ category: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/cost-categories error", err);
    return NextResponse.json({ error: "Failed to delete cost category" }, { status: 500 });
  }
}
