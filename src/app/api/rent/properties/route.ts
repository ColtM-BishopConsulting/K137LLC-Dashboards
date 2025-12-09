import { NextResponse } from "next/server";
import { db, rentProperties } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(rentProperties);
    return NextResponse.json({ properties: data });
  } catch (err) {
    console.error("GET /api/rent/properties error", err);
    return NextResponse.json({ error: "Failed to fetch rent properties" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentProperties).values(body).returning();
    return NextResponse.json({ property: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/properties error", err);
    return NextResponse.json({ error: "Failed to create rent property" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db
      .update(rentProperties)
      .set(rest)
      .where(rentProperties.id.eq(id))
      .returning();
    return NextResponse.json({ property: updated[0] });
  } catch (err) {
    console.error("PATCH /api/rent/properties error", err);
    return NextResponse.json({ error: "Failed to update rent property" }, { status: 500 });
  }
}
