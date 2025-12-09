import { NextResponse } from "next/server";
import { db, ledgerTransactions } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(ledgerTransactions);
    return NextResponse.json({ transactions: data });
  } catch (err) {
    console.error("GET /api/transactions error", err);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(ledgerTransactions).values(body).returning();
    return NextResponse.json({ transaction: inserted[0] });
  } catch (err) {
    console.error("POST /api/transactions error", err);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(ledgerTransactions).set(rest).where(ledgerTransactions.id.eq(id)).returning();
    return NextResponse.json({ transaction: updated[0] });
  } catch (err) {
    console.error("PATCH /api/transactions error", err);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(ledgerTransactions).where(ledgerTransactions.id.eq(id)).returning();
    return NextResponse.json({ transaction: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/transactions error", err);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
