import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, rentExpenseCategories } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(rentExpenseCategories);
    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error("GET /api/rent/expense-categories error", err);
    return NextResponse.json({ error: "Failed to fetch expense categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentExpenseCategories).values(body).returning();
    return NextResponse.json({ category: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/expense-categories error", err);
    return NextResponse.json({ error: "Failed to create expense category" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(rentExpenseCategories).set(rest).where(eq(rentExpenseCategories.id, id)).returning();
    return NextResponse.json({ category: updated[0] });
  } catch (err) {
    console.error("PATCH /api/rent/expense-categories error", err);
    return NextResponse.json({ error: "Failed to update expense category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(rentExpenseCategories).where(eq(rentExpenseCategories.id, id)).returning();
    return NextResponse.json({ category: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/rent/expense-categories error", err);
    return NextResponse.json({ error: "Failed to delete expense category" }, { status: 500 });
  }
}
