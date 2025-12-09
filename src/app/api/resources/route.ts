import { NextResponse } from "next/server";
import { db, resources } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(resources);
    return NextResponse.json({ resources: data });
  } catch (err) {
    console.error("GET /api/resources error", err);
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(resources).values(body).returning();
    return NextResponse.json({ resource: inserted[0] });
  } catch (err) {
    console.error("POST /api/resources error", err);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(resources).set(rest).where(resources.id.eq(id)).returning();
    return NextResponse.json({ resource: updated[0] });
  } catch (err) {
    console.error("PATCH /api/resources error", err);
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(resources).where(resources.id.eq(id)).returning();
    return NextResponse.json({ resource: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/resources error", err);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
