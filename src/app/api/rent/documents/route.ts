import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, rentDocuments } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rentUnitId = searchParams.get("rentUnitId");
    const query = rentUnitId
      ? db.select().from(rentDocuments).where(eq(rentDocuments.rentUnitId, Number(rentUnitId)))
      : db.select().from(rentDocuments);
    const data = await query;
    return NextResponse.json({ documents: data });
  } catch (err) {
    console.error("GET /api/rent/documents error", err);
    return NextResponse.json({ error: "Failed to fetch rent documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(rentDocuments).values(body).returning();
    return NextResponse.json({ document: inserted[0] });
  } catch (err) {
    console.error("POST /api/rent/documents error", err);
    return NextResponse.json({ error: "Failed to create rent document" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(rentDocuments).set(rest).where(eq(rentDocuments.id, id)).returning();
    return NextResponse.json({ document: updated[0] });
  } catch (err) {
    console.error("PATCH /api/rent/documents error", err);
    return NextResponse.json({ error: "Failed to update rent document" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(rentDocuments).where(eq(rentDocuments.id, id)).returning();
    return NextResponse.json({ document: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/rent/documents error", err);
    return NextResponse.json({ error: "Failed to delete rent document" }, { status: 500 });
  }
}
