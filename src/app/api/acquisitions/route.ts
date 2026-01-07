import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectAcquisitions } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectAcquisitions)
        .where(eq(projectAcquisitions.projectId, Number(projectId)));
      return NextResponse.json({ acquisitions: data });
    }
    const data = await db.select().from(projectAcquisitions);
    return NextResponse.json({ acquisitions: data });
  } catch (err) {
    console.error("GET /api/acquisitions error", err);
    return NextResponse.json({ error: "Failed to fetch acquisitions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      purchasePrice: body?.purchasePrice !== undefined ? Number(body.purchasePrice) : 0,
      acquisitionDraw: body?.acquisitionDraw !== undefined ? Number(body.acquisitionDraw) : 0,
      earnestMoney: body?.earnestMoney !== undefined ? Number(body.earnestMoney) : 0,
    };
    if (!payload.projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }
    const inserted = await db.insert(projectAcquisitions).values(payload).returning();
    return NextResponse.json({ acquisition: inserted[0] });
  } catch (err) {
    console.error("POST /api/acquisitions error", err);
    return NextResponse.json({ error: "Failed to create acquisition" }, { status: 500 });
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
      purchasePrice: rest?.purchasePrice !== undefined ? Number(rest.purchasePrice) : undefined,
      acquisitionDraw: rest?.acquisitionDraw !== undefined ? Number(rest.acquisitionDraw) : undefined,
      earnestMoney: rest?.earnestMoney !== undefined ? Number(rest.earnestMoney) : undefined,
    };
    const updated = await db
      .update(projectAcquisitions)
      .set(payload)
      .where(eq(projectAcquisitions.id, Number(id)))
      .returning();
    return NextResponse.json({ acquisition: updated[0] });
  } catch (err) {
    console.error("PATCH /api/acquisitions error", err);
    return NextResponse.json({ error: "Failed to update acquisition" }, { status: 500 });
  }
}
