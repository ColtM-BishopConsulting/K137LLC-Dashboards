import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectDetails } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(projectDetails);
    return NextResponse.json({ details: data });
  } catch (err) {
    console.error("GET /api/project-details error", err);
    return NextResponse.json({ error: "Failed to fetch project details" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inserted = await db.insert(projectDetails).values(body).returning();
    return NextResponse.json({ detail: inserted[0] });
  } catch (err) {
    console.error("POST /api/project-details error", err);
    return NextResponse.json({ error: "Failed to create project detail" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const updated = await db.update(projectDetails).set(rest).where(eq(projectDetails.id, id)).returning();
    return NextResponse.json({ detail: updated[0] });
  } catch (err) {
    console.error("PATCH /api/project-details error", err);
    return NextResponse.json({ error: "Failed to update project detail" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectDetails).where(eq(projectDetails.id, id)).returning();
    return NextResponse.json({ detail: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/project-details error", err);
    return NextResponse.json({ error: "Failed to delete project detail" }, { status: 500 });
  }
}
