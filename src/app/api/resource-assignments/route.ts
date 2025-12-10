import { NextResponse } from "next/server";
import { db, resourceAssignments } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db.select().from(resourceAssignments);
    return NextResponse.json({ assignments: data });
  } catch (err) {
    console.error("GET /api/resource-assignments error", err);
    return NextResponse.json({ error: "Failed to fetch resource assignments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const activityId = Number(body.activityId);
    const resources = Array.isArray(body.resources) ? body.resources : [];
    if (!activityId) return NextResponse.json({ error: "Missing activityId" }, { status: 400 });

    await db.transaction(async (tx) => {
      await tx.delete(resourceAssignments).where(eq(resourceAssignments.activityId, activityId));
      if (resources.length) {
        await tx.insert(resourceAssignments).values(
          resources.map((r: { resourceId: number | string; quantity?: number; plannedCost?: number; unitType?: string }) => ({
            activityId,
            resourceId: Number(r.resourceId),
            plannedUnits: Number(r.quantity ?? 0),
            plannedCost: Number(r.plannedCost ?? 0),
            unitType: r.unitType || "Hours",
          }))
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/resource-assignments error", err);
    return NextResponse.json({ error: "Failed to save resource assignments" }, { status: 500 });
  }
}
