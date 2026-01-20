import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectDraws } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectDraws)
        .where(eq(projectDraws.projectId, Number(projectId)));
      return NextResponse.json({ draws: data });
    }
    const data = await db.select().from(projectDraws);
    return NextResponse.json({ draws: data });
  } catch (err) {
    console.error("GET /api/draws error", err);
    return NextResponse.json({ error: "Failed to fetch draws" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      amount: body?.amount !== undefined ? String(body.amount) : "0",
      accountId: body?.accountId ? Number(body.accountId) : null,
    };
    if (!payload.projectId || !payload.date || !payload.description || !Number.isFinite(Number(payload.amount))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectDraws).values(payload).returning();
    return NextResponse.json({ draw: inserted[0] });
  } catch (err) {
    console.error("POST /api/draws error", err);
    return NextResponse.json({ error: "Failed to create draw" }, { status: 500 });
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
      amount: rest?.amount !== undefined ? String(rest.amount) : undefined,
      accountId: rest?.accountId !== undefined ? (rest.accountId ? Number(rest.accountId) : null) : undefined,
    };
    const updated = await db
      .update(projectDraws)
      .set(payload)
      .where(eq(projectDraws.id, Number(id)))
      .returning();
    return NextResponse.json({ draw: updated[0] });
  } catch (err) {
    console.error("PATCH /api/draws error", err);
    return NextResponse.json({ error: "Failed to update draw" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectDraws).where(eq(projectDraws.id, id)).returning();
    return NextResponse.json({ draw: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/draws error", err);
    return NextResponse.json({ error: "Failed to delete draw" }, { status: 500 });
  }
}
