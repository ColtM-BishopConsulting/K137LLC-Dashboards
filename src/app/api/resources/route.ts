import { NextResponse } from "next/server";
import { db, resources } from "@/db";

export async function GET() {
  const rows = await db.select().from(resources);
  return NextResponse.json(rows, { status: 200 });
}
