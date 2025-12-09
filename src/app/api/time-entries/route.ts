import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, timeEntries } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(timeEntries);
    return NextResponse.json({ timeEntries: data });
  } catch (err) {
    console.error("GET /api/time-entries error", err);
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(timeEntries).values(body).returning();
    return NextResponse.json({ timeEntry: inserted[0] });
  } catch (err) {
    console.error("POST /api/time-entries error", err);
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(timeEntries).set(rest).where(eq(timeEntries.id, id)).returning();
    return NextResponse.json({ timeEntry: updated[0] });
  } catch (err) {
    console.error("PATCH /api/time-entries error", err);
    return NextResponse.json({ error: "Failed to update time entry" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(timeEntries).where(eq(timeEntries.id, id)).returning();
    return NextResponse.json({ timeEntry: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/time-entries error", err);
    return NextResponse.json({ error: "Failed to delete time entry" }, { status: 500 });
  }
}
