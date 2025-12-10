import { NextResponse } from "next/server";
import { db, paychecks } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db.select().from(paychecks);
    return NextResponse.json({ paychecks: data });
  } catch (err) {
    console.error("GET /api/paychecks error", err);
    return NextResponse.json({ error: "Failed to fetch paychecks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(paychecks).values(body).returning();
    return NextResponse.json({ paycheck: inserted[0] });
  } catch (err) {
    console.error("POST /api/paychecks error", err);
    return NextResponse.json({ error: "Failed to create paycheck" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(paychecks).set(rest).where(eq(paychecks.id, id)).returning();
    return NextResponse.json({ paycheck: updated[0] });
  } catch (err) {
    console.error("PATCH /api/paychecks error", err);
    return NextResponse.json({ error: "Failed to update paycheck" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(paychecks).where(eq(paychecks.id, id)).returning();
    return NextResponse.json({ paycheck: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/paychecks error", err);
    return NextResponse.json({ error: "Failed to delete paycheck" }, { status: 500 });
  }
}
