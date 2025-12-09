import { NextResponse } from "next/server";
import { db, exportLogs } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(exportLogs);
    return NextResponse.json({ exports: data });
  } catch (err) {
    console.error("GET /api/exports error", err);
    return NextResponse.json({ error: "Failed to fetch export logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(exportLogs).values(body).returning();
    return NextResponse.json({ export: inserted[0] });
  } catch (err) {
    console.error("POST /api/exports error", err);
    return NextResponse.json({ error: "Failed to create export log" }, { status: 500 });
  }
}
