import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectKpiPrefs } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectKpiPrefs)
        .where(eq(projectKpiPrefs.projectId, Number(projectId)));
      return NextResponse.json({ prefs: data });
    }
    const data = await db.select().from(projectKpiPrefs);
    return NextResponse.json({ prefs: data });
  } catch (err) {
    console.error("GET /api/kpi-prefs error", err);
    return NextResponse.json({ error: "Failed to fetch kpi prefs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      projectId: Number(body?.projectId),
      presetId: Number(body?.presetId),
    };
    if (!payload.projectId || !payload.presetId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectKpiPrefs).values(payload).returning();
    return NextResponse.json({ pref: inserted[0] });
  } catch (err) {
    console.error("POST /api/kpi-prefs error", err);
    return NextResponse.json({ error: "Failed to create kpi pref" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const payload = {
      presetId: rest?.presetId ? Number(rest.presetId) : undefined,
    };
    const updated = await db
      .update(projectKpiPrefs)
      .set(payload)
      .where(eq(projectKpiPrefs.id, Number(id)))
      .returning();
    return NextResponse.json({ pref: updated[0] });
  } catch (err) {
    console.error("PATCH /api/kpi-prefs error", err);
    return NextResponse.json({ error: "Failed to update kpi pref" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectKpiPrefs).where(eq(projectKpiPrefs.id, id)).returning();
    return NextResponse.json({ pref: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/kpi-prefs error", err);
    return NextResponse.json({ error: "Failed to delete kpi pref" }, { status: 500 });
  }
}
