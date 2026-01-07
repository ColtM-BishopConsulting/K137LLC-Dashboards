import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectPropertyTaxes } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectPropertyTaxes)
        .where(eq(projectPropertyTaxes.projectId, Number(projectId)));
      return NextResponse.json({ taxes: data });
    }
    const data = await db.select().from(projectPropertyTaxes);
    return NextResponse.json({ taxes: data });
  } catch (err) {
    console.error("GET /api/property-taxes error", err);
    return NextResponse.json({ error: "Failed to fetch property taxes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      taxYear: Number(body?.taxYear),
      amount: Number(body?.amount),
      status: body?.status ? String(body.status) : "due",
      paidDate: body?.paidDate || null,
    };
    if (!payload.projectId || !payload.taxYear || !payload.dueDate || !Number.isFinite(payload.amount)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectPropertyTaxes).values(payload).returning();
    return NextResponse.json({ tax: inserted[0] });
  } catch (err) {
    console.error("POST /api/property-taxes error", err);
    return NextResponse.json({ error: "Failed to create property tax" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const payload = {
      ...rest,
      projectId: rest?.projectId ? Number(rest.projectId) : undefined,
      taxYear: rest?.taxYear !== undefined ? Number(rest.taxYear) : undefined,
      amount: rest?.amount !== undefined ? Number(rest.amount) : undefined,
      status: rest?.status ? String(rest.status) : undefined,
      paidDate: rest?.paidDate !== undefined ? rest.paidDate || null : undefined,
    };
    const updated = await db
      .update(projectPropertyTaxes)
      .set(payload)
      .where(eq(projectPropertyTaxes.id, Number(id)))
      .returning();
    return NextResponse.json({ tax: updated[0] });
  } catch (err) {
    console.error("PATCH /api/property-taxes error", err);
    return NextResponse.json({ error: "Failed to update property tax" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectPropertyTaxes).where(eq(projectPropertyTaxes.id, id)).returning();
    return NextResponse.json({ tax: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/property-taxes error", err);
    return NextResponse.json({ error: "Failed to delete property tax" }, { status: 500 });
  }
}
