import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectUtilities } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectUtilities)
        .where(eq(projectUtilities.projectId, Number(projectId)));
      return NextResponse.json({ utilities: data });
    }
    const data = await db.select().from(projectUtilities);
    return NextResponse.json({ utilities: data });
  } catch (err) {
    console.error("GET /api/utilities error", err);
    return NextResponse.json({ error: "Failed to fetch utilities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      amount: Number(body?.amount),
    };
    if (!payload.projectId || !payload.date || !payload.service || !Number.isFinite(payload.amount)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectUtilities).values(payload).returning();
    return NextResponse.json({ utility: inserted[0] });
  } catch (err) {
    console.error("POST /api/utilities error", err);
    return NextResponse.json({ error: "Failed to create utility" }, { status: 500 });
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
    };
    const updated = await db
      .update(projectUtilities)
      .set(payload)
      .where(eq(projectUtilities.id, Number(id)))
      .returning();
    return NextResponse.json({ utility: updated[0] });
  } catch (err) {
    console.error("PATCH /api/utilities error", err);
    return NextResponse.json({ error: "Failed to update utility" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectUtilities).where(eq(projectUtilities.id, id)).returning();
    return NextResponse.json({ utility: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/utilities error", err);
    return NextResponse.json({ error: "Failed to delete utility" }, { status: 500 });
  }
}
