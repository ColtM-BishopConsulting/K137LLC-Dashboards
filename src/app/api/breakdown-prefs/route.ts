import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectBreakdownPrefs } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectBreakdownPrefs)
        .where(eq(projectBreakdownPrefs.projectId, Number(projectId)));
      return NextResponse.json({ prefs: data });
    }
    const data = await db.select().from(projectBreakdownPrefs);
    return NextResponse.json({ prefs: data });
  } catch (err) {
    console.error("GET /api/breakdown-prefs error", err);
    return NextResponse.json({ error: "Failed to fetch breakdown prefs" }, { status: 500 });
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
    const inserted = await db.insert(projectBreakdownPrefs).values(payload).returning();
    return NextResponse.json({ pref: inserted[0] });
  } catch (err) {
    console.error("POST /api/breakdown-prefs error", err);
    return NextResponse.json({ error: "Failed to create breakdown pref" }, { status: 500 });
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
      .update(projectBreakdownPrefs)
      .set(payload)
      .where(eq(projectBreakdownPrefs.id, Number(id)))
      .returning();
    return NextResponse.json({ pref: updated[0] });
  } catch (err) {
    console.error("PATCH /api/breakdown-prefs error", err);
    return NextResponse.json({ error: "Failed to update breakdown pref" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectBreakdownPrefs).where(eq(projectBreakdownPrefs.id, id)).returning();
    return NextResponse.json({ pref: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/breakdown-prefs error", err);
    return NextResponse.json({ error: "Failed to delete breakdown pref" }, { status: 500 });
  }
}
