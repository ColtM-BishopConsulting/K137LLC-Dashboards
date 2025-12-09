import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectPipelineMeta } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(projectPipelineMeta);
    return NextResponse.json({ pipeline: data });
  } catch (err) {
    console.error("GET /api/pipeline error", err);
    return NextResponse.json({ error: "Failed to fetch pipeline meta" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(projectPipelineMeta).values(body).returning();
    return NextResponse.json({ pipeline: inserted[0] });
  } catch (err) {
    console.error("POST /api/pipeline error", err);
    return NextResponse.json({ error: "Failed to create pipeline meta" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, projectId, ...rest } = body || {};
    if (!id && !projectId) return NextResponse.json({ error: "Missing id or projectId" }, { status: 400 });
    const updated = await db
      .update(projectPipelineMeta)
      .set(rest)
      .where(id ? eq(projectPipelineMeta.id, id) : eq(projectPipelineMeta.projectId, projectId))
      .returning();
    return NextResponse.json({ pipeline: updated[0] });
  } catch (err) {
    console.error("PATCH /api/pipeline error", err);
    return NextResponse.json({ error: "Failed to update pipeline meta" }, { status: 500 });
  }
}
