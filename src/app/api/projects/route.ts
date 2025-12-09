import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projects } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(projects);
    return NextResponse.json({ projects: data });
  } catch (err) {
    console.error("GET /api/projects error", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(projects).values(body).returning();
    return NextResponse.json({ project: inserted[0] });
  } catch (err) {
    console.error("POST /api/projects error", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(projects).set(rest).where(eq(projects.id, id)).returning();
    return NextResponse.json({ project: updated[0] });
  } catch (err) {
    console.error("PATCH /api/projects error", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projects).where(eq(projects.id, id)).returning();
    return NextResponse.json({ project: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/projects error", err);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
