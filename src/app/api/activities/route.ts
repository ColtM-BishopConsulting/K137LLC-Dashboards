import { NextResponse } from "next/server";
import {
  db,
  activities,
  projects,
  wbsNodes,
} from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(activities);
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // For now, just use the first project & its first WBS node
    const [project] = await db.select().from(projects).limit(1);
    if (!project) {
      return NextResponse.json(
        { error: "No project found" },
        { status: 400 }
      );
    }

    const [wbs] = await db
      .select()
      .from(wbsNodes)
      .where(eq(wbsNodes.projectId, project.id))
      .limit(1);

    if (!wbs) {
      return NextResponse.json(
        { error: "No WBS node found" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(activities)
      .values({
        projectId: project.id,
        wbsId: wbs.id,
        code: body.code ?? `ACT-${Date.now()}`,
        name: body.name ?? "New Activity",
        bucket: body.bucket ?? "General",
        property: body.property ?? "Portfolio-wide",
        priority: body.priority ?? "Medium",
        status: body.status ?? "Planned",
        startDate: body.startDate ?? "2025-01-01",
        finishDate: body.finishDate ?? "2025-01-07",
        durationDays: body.durationDays ?? 7,
        percentComplete: body.percentComplete ?? 0,
        responsible: body.responsible ?? "Unassigned",
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: any) {
    console.error("POST /activities error", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
