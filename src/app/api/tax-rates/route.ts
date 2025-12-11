import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, taxRates } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(taxRates);
    return NextResponse.json({ taxRates: data });
  } catch (err) {
    console.error("GET /api/tax-rates error", err);
    return NextResponse.json({ error: "Failed to fetch tax rates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(taxRates).values(body).returning();
    return NextResponse.json({ taxRate: inserted[0] });
  } catch (err) {
    console.error("POST /api/tax-rates error", err);
    return NextResponse.json({ error: "Failed to create tax rate" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(taxRates).set(rest).where(eq(taxRates.id, id)).returning();
    return NextResponse.json({ taxRate: updated[0] });
  } catch (err) {
    console.error("PATCH /api/tax-rates error", err);
    return NextResponse.json({ error: "Failed to update tax rate" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(taxRates).where(eq(taxRates.id, id)).returning();
    return NextResponse.json({ taxRate: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/tax-rates error", err);
    return NextResponse.json({ error: "Failed to delete tax rate" }, { status: 500 });
  }
}
