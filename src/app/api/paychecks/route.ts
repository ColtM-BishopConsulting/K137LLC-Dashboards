import { NextResponse } from "next/server";
import { db, paychecks } from "@/db";

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
