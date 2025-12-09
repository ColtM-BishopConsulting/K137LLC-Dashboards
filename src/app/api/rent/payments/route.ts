import { NextResponse } from "next/server";
import { db, rentPayments } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(rentPayments);
    return NextResponse.json({ payments: data });
  } catch (err) {
    console.error("GET /api/rent/payments error", err);
    return NextResponse.json({ error: "Failed to fetch rent payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentPayments).values(body).returning();
    return NextResponse.json({ payment: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/payments error", err);
    return NextResponse.json({ error: "Failed to create rent payment" }, { status: 500 });
  }
}
