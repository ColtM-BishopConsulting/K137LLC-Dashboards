import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, epsNodes } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(epsNodes);
    return NextResponse.json({ nodes: data });
  } catch (err) {
    console.error("GET /api/eps error", err);
    return NextResponse.json({ error: "Failed to fetch EPS nodes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(epsNodes).values(body).returning();
    return NextResponse.json({ node: inserted[0] });
  } catch (err) {
    console.error("POST /api/eps error", err);
    return NextResponse.json({ error: "Failed to create EPS node" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(epsNodes).set(rest).where(eq(epsNodes.id, id)).returning();
    return NextResponse.json({ node: updated[0] });
  } catch (err) {
    console.error("PATCH /api/eps error", err);
    return NextResponse.json({ error: "Failed to update EPS node" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(epsNodes).where(eq(epsNodes.id, id)).returning();
    return NextResponse.json({ node: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/eps error", err);
    return NextResponse.json({ error: "Failed to delete EPS node" }, { status: 500 });
  }
}
