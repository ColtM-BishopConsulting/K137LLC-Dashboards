import { NextResponse } from "next/server";
import {
  db,
  projects,
  activities,
  resources,
  resourceAssignments,
} from "@/db";
import { wbsNodes, type WbsNode } from "@/db/schema";

export async function GET() {
  try {
    // DEV ONLY: wipe existing demo data so the seed is repeatable
    await db.delete(resourceAssignments);
    await db.delete(resources);
    await db.delete(activities);
    await db.delete(wbsNodes);
    await db.delete(projects);

    // 1) Project
    const [project] = await db
      .insert(projects)
      .values({
        code: "KFX-2025",
        name: "Koufax 137 - 2025 Portfolio",
        bank: "Citizens",
        startDate: "2025-01-01",
      })
      .returning();

    // 2) WBS node
    const [wbsNode] = (await db
      .insert(wbsNodes)
      .values({
        projectId: project.id,
        code: "FD.1",
        name: "Financial Dashboards",
        sortOrder: 10,
      })
      .returning()) as WbsNode[];

    // 3) Activities
    const [act1, act2] = await db
      .insert(activities)
      .values([
        {
          projectId: project.id,
          wbsId: wbsNode.id,
          code: "FD.1.1",
          name: "Rent roll dashboard (monthly)",
          bucket: "Dashboards",
          property: "Portfolio-wide",
          priority: "High",
          status: "InProgress",
          startDate: "2025-11-25",
          finishDate: "2025-12-11",
          durationDays: 16,
          percentComplete: 30,
          responsible: "Colten / Finance",
        },
        {
          projectId: project.id,
          wbsId: wbsNode.id,
          code: "FD.1.2",
          name: "Project cost management dashboard",
          bucket: "Dashboards",
          property: "Portfolio-wide",
          priority: "High",
          status: "Planned",
          startDate: "2025-11-28",
          finishDate: "2025-12-18",
          durationDays: 20,
          percentComplete: 0,
          responsible: "Colten / Finance",
        },
      ])
      .returning();

    // 4) Resource (you)
    const [colten] = await db
      .insert(resources)
      .values({
        name: "Colten McGee",
        role: "Project / Finance",
        costType: "Labor",
        unitType: "Hours",
        standardRate: "75.00",
      })
      .returning();

    // 5) Resource assignments
    await db.insert(resourceAssignments).values([
      {
        activityId: act1.id,
        resourceId: colten.id,
        plannedUnits: "40",
        plannedCost: "3000.00",
        unitType: "Hours",
      },
      {
        activityId: act2.id,
        resourceId: colten.id,
        plannedUnits: "60",
        plannedCost: "4500.00",
        unitType: "Hours",
      },
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
