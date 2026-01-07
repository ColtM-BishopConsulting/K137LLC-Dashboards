import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectClosingCosts } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectClosingCosts)
        .where(eq(projectClosingCosts.projectId, Number(projectId)));
      return NextResponse.json({ closingCosts: data });
    }
    const data = await db.select().from(projectClosingCosts);
    return NextResponse.json({ closingCosts: data });
  } catch (err) {
    console.error("GET /api/closing-costs error", err);
    return NextResponse.json({ error: "Failed to fetch closing costs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      amount: body?.amount !== undefined ? Number(body.amount) : 0,
      paid: Boolean(body?.paid),
    };
    if (!payload.projectId || !payload.side || !payload.label) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectClosingCosts).values(payload).returning();
    return NextResponse.json({ closingCost: inserted[0] });
  } catch (err) {
    console.error("POST /api/closing-costs error", err);
    return NextResponse.json({ error: "Failed to create closing cost" }, { status: 500 });
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
      amount: rest?.amount !== undefined ? Number(rest.amount) : undefined,
      paid: rest?.paid !== undefined ? Boolean(rest.paid) : undefined,
    };
    const updated = await db
      .update(projectClosingCosts)
      .set(payload)
      .where(eq(projectClosingCosts.id, Number(id)))
      .returning();
    return NextResponse.json({ closingCost: updated[0] });
  } catch (err) {
    console.error("PATCH /api/closing-costs error", err);
    return NextResponse.json({ error: "Failed to update closing cost" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectClosingCosts).where(eq(projectClosingCosts.id, id)).returning();
    return NextResponse.json({ closingCost: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/closing-costs error", err);
    return NextResponse.json({ error: "Failed to delete closing cost" }, { status: 500 });
  }
}
