import { NextResponse } from "next/server";
import { db, activities } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(activities);
    return NextResponse.json({ activities: data });
  } catch (err) {
    console.error("GET /api/activities error", err);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(activities).values(body).returning();
    return NextResponse.json({ activity: inserted[0] });
  } catch (err) {
    console.error("POST /api/activities error", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(activities).set(rest).where(activities.id.eq(id)).returning();
    return NextResponse.json({ activity: updated[0] });
  } catch (err) {
    console.error("PATCH /api/activities error", err);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(activities).where(activities.id.eq(id)).returning();
    return NextResponse.json({ activity: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/activities error", err);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
