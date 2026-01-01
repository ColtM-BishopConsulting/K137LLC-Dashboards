import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, rentExpenses } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rentUnitId = searchParams.get("rentUnitId");
    const query = rentUnitId
      ? db.select().from(rentExpenses).where(eq(rentExpenses.rentUnitId, Number(rentUnitId)))
      : db.select().from(rentExpenses);
    const data = await query;
    return NextResponse.json({ expenses: data });
  } catch (err) {
    console.error("GET /api/rent/expenses error", err);
    return NextResponse.json({ error: "Failed to fetch rent expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentExpenses).values(body).returning();
    return NextResponse.json({ expense: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/expenses error", err);
    return NextResponse.json({ error: "Failed to create rent expense" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(rentExpenses).set(rest).where(eq(rentExpenses.id, id)).returning();
    return NextResponse.json({ expense: updated[0] });
  } catch (err) {
    console.error("PATCH /api/rent/expenses error", err);
    return NextResponse.json({ error: "Failed to update rent expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(rentExpenses).where(eq(rentExpenses.id, id)).returning();
    return NextResponse.json({ expense: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/rent/expenses error", err);
    return NextResponse.json({ error: "Failed to delete rent expense" }, { status: 500 });
  }
}
