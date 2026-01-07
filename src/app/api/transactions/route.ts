import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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
    const normalized = {
      ...body,
      categoryId: body?.categoryId ? Number(body.categoryId) : null,
      subCategoryId: body?.subCategoryId ? Number(body.subCategoryId) : null,
      accountId: body?.accountId ? Number(body.accountId) : null,
    };
    const inserted = await db.insert(ledgerTransactions).values(normalized).returning();
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
    const normalized = {
      ...rest,
      categoryId: rest?.categoryId ? Number(rest.categoryId) : null,
      subCategoryId: rest?.subCategoryId ? Number(rest.subCategoryId) : null,
      accountId: rest?.accountId ? Number(rest.accountId) : null,
    };
    const updated = await db.update(ledgerTransactions).set(normalized).where(eq(ledgerTransactions.id, id)).returning();
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
    const deleted = await db.delete(ledgerTransactions).where(eq(ledgerTransactions.id, id)).returning();
    return NextResponse.json({ transaction: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/transactions error", err);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
