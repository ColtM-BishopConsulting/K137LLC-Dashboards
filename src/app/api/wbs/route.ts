import { NextResponse } from "next/server";
import { db, wbsNodes } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(wbsNodes);
    return NextResponse.json({ nodes: data });
  } catch (err) {
    console.error("GET /api/wbs error", err);
    return NextResponse.json({ error: "Failed to fetch WBS nodes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(wbsNodes).values(body).returning();
    return NextResponse.json({ node: inserted[0] });
  } catch (err) {
    console.error("POST /api/wbs error", err);
    return NextResponse.json({ error: "Failed to create WBS node" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(wbsNodes).set(rest).where(wbsNodes.id.eq(id)).returning();
    return NextResponse.json({ node: updated[0] });
  } catch (err) {
    console.error("PATCH /api/wbs error", err);
    return NextResponse.json({ error: "Failed to update WBS node" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(wbsNodes).where(wbsNodes.id.eq(id)).returning();
    return NextResponse.json({ node: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/wbs error", err);
    return NextResponse.json({ error: "Failed to delete WBS node" }, { status: 500 });
  }
}
