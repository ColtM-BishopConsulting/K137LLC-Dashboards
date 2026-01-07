import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectDebtService } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectDebtService)
        .where(eq(projectDebtService.projectId, Number(projectId)));
      return NextResponse.json({ debtService: data });
    }
    const data = await db.select().from(projectDebtService);
    return NextResponse.json({ debtService: data });
  } catch (err) {
    console.error("GET /api/debt-service error", err);
    return NextResponse.json({ error: "Failed to fetch debt service" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      balance: body?.balance !== undefined ? Number(body.balance) : 0,
      payment: body?.payment !== undefined ? Number(body.payment) : 0,
      interestRate: body?.interestRate !== undefined ? Number(body.interestRate) : 0,
      rateType: body?.rateType || "fixed",
    };
    if (!payload.projectId || !payload.bank) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectDebtService).values(payload).returning();
    return NextResponse.json({ debtService: inserted[0] });
  } catch (err) {
    console.error("POST /api/debt-service error", err);
    return NextResponse.json({ error: "Failed to create debt service" }, { status: 500 });
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
      balance: rest?.balance !== undefined ? Number(rest.balance) : undefined,
      payment: rest?.payment !== undefined ? Number(rest.payment) : undefined,
      interestRate: rest?.interestRate !== undefined ? Number(rest.interestRate) : undefined,
      rateType: rest?.rateType || undefined,
    };
    const updated = await db
      .update(projectDebtService)
      .set(payload)
      .where(eq(projectDebtService.id, Number(id)))
      .returning();
    return NextResponse.json({ debtService: updated[0] });
  } catch (err) {
    console.error("PATCH /api/debt-service error", err);
    return NextResponse.json({ error: "Failed to update debt service" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectDebtService).where(eq(projectDebtService.id, id)).returning();
    return NextResponse.json({ debtService: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/debt-service error", err);
    return NextResponse.json({ error: "Failed to delete debt service" }, { status: 500 });
  }
}
