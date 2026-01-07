import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, projectKpiOverrides } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectKpiOverrides)
        .where(eq(projectKpiOverrides.projectId, Number(projectId)));
      return NextResponse.json({ overrides: data });
    }
    const data = await db.select().from(projectKpiOverrides);
    return NextResponse.json({ overrides: data });
  } catch (err) {
    console.error("GET /api/kpi-overrides error", err);
    return NextResponse.json({ error: "Failed to fetch kpi overrides" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      projectId: Number(body?.projectId),
      itemId: Number(body?.itemId),
      overrideValue: body?.overrideValue !== undefined ? String(body.overrideValue) : "0",
      note: body?.note ? String(body.note) : null,
    };
    if (!payload.projectId || !payload.itemId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectKpiOverrides).values(payload).returning();
    return NextResponse.json({ override: inserted[0] });
  } catch (err) {
    console.error("POST /api/kpi-overrides error", err);
    return NextResponse.json({ error: "Failed to create kpi override" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, projectId, itemId, ...rest } = body || {};
    const payload = {
      overrideValue: rest?.overrideValue !== undefined ? String(rest.overrideValue) : undefined,
      note: rest?.note !== undefined ? String(rest.note) : undefined,
    };
    if (id) {
      const updated = await db
        .update(projectKpiOverrides)
        .set(payload)
        .where(eq(projectKpiOverrides.id, Number(id)))
        .returning();
      return NextResponse.json({ override: updated[0] });
    }
    if (!projectId || !itemId) {
      return NextResponse.json({ error: "Missing id or project/item" }, { status: 400 });
    }
    const updated = await db
      .update(projectKpiOverrides)
      .set(payload)
      .where(
        and(
          eq(projectKpiOverrides.projectId, Number(projectId)),
          eq(projectKpiOverrides.itemId, Number(itemId))
        )
      )
      .returning();
    return NextResponse.json({ override: updated[0] });
  } catch (err) {
    console.error("PATCH /api/kpi-overrides error", err);
    return NextResponse.json({ error: "Failed to update kpi override" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectKpiOverrides).where(eq(projectKpiOverrides.id, id)).returning();
    return NextResponse.json({ override: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/kpi-overrides error", err);
    return NextResponse.json({ error: "Failed to delete kpi override" }, { status: 500 });
  }
}
