import { NextResponse } from "next/server";
import { db, wbsNodes } from "@/db";

export async function GET() {
  const rows = await db.select().from(wbsNodes);
  return NextResponse.json(rows, { status: 200 });
}
