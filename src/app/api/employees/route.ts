import { NextResponse } from "next/server";
import { db, employees } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(employees);
    return NextResponse.json({ employees: data });
  } catch (err) {
    console.error("GET /api/employees error", err);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(employees).values(body).returning();
    return NextResponse.json({ employee: inserted[0] });
  } catch (err) {
    console.error("POST /api/employees error", err);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(employees).set(rest).where(employees.id.eq(id)).returning();
    return NextResponse.json({ employee: updated[0] });
  } catch (err) {
    console.error("PATCH /api/employees error", err);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(employees).where(employees.id.eq(id)).returning();
    return NextResponse.json({ employee: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/employees error", err);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
