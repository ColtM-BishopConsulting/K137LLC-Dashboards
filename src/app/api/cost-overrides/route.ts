import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, projectCostOverrides } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectCostOverrides)
        .where(eq(projectCostOverrides.projectId, Number(projectId)));
      return NextResponse.json({ overrides: data });
    }
    const data = await db.select().from(projectCostOverrides);
    return NextResponse.json({ overrides: data });
  } catch (err) {
    console.error("GET /api/cost-overrides error", err);
    return NextResponse.json({ error: "Failed to fetch cost overrides" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      projectId: Number(body?.projectId),
      categoryId: Number(body?.categoryId),
      amount: body?.amount !== undefined ? String(body.amount) : "0",
      note: body?.note ? String(body.note) : null,
    };
    if (!payload.projectId || !payload.categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectCostOverrides).values(payload).returning();
    return NextResponse.json({ override: inserted[0] });
  } catch (err) {
    console.error("POST /api/cost-overrides error", err);
    return NextResponse.json({ error: "Failed to create cost override" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, projectId, categoryId, ...rest } = body || {};
    const payload = {
      amount: rest?.amount !== undefined ? String(rest.amount) : undefined,
      note: rest?.note !== undefined ? String(rest.note) : undefined,
    };
    if (id) {
      const updated = await db
        .update(projectCostOverrides)
        .set(payload)
        .where(eq(projectCostOverrides.id, Number(id)))
        .returning();
      return NextResponse.json({ override: updated[0] });
    }
    if (!projectId || !categoryId) {
      return NextResponse.json({ error: "Missing id or project/category" }, { status: 400 });
    }
    const updated = await db
      .update(projectCostOverrides)
      .set(payload)
      .where(
        and(
          eq(projectCostOverrides.projectId, Number(projectId)),
          eq(projectCostOverrides.categoryId, Number(categoryId))
        )
      )
      .returning();
    return NextResponse.json({ override: updated[0] });
  } catch (err) {
    console.error("PATCH /api/cost-overrides error", err);
    return NextResponse.json({ error: "Failed to update cost override" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectCostOverrides).where(eq(projectCostOverrides.id, id)).returning();
    return NextResponse.json({ override: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/cost-overrides error", err);
    return NextResponse.json({ error: "Failed to delete cost override" }, { status: 500 });
  }
}
