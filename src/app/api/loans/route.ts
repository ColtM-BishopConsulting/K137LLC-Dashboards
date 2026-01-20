import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, projectLoans } from "@/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (projectId) {
      const data = await db
        .select()
        .from(projectLoans)
        .where(eq(projectLoans.projectId, Number(projectId)));
      return NextResponse.json({ loans: data });
    }
    const data = await db.select().from(projectLoans);
    return NextResponse.json({ loans: data });
  } catch (err) {
    console.error("GET /api/loans error", err);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload = {
      ...body,
      projectId: Number(body?.projectId),
      originationDate: body?.originationDate ? String(body.originationDate) : null,
      payment: body?.payment !== undefined ? String(body.payment) : "0",
      interest: body?.interest !== undefined ? String(body.interest) : "0",
      principal: body?.principal !== undefined ? String(body.principal) : "0",
      balance: body?.balance !== undefined && body.balance !== "" ? String(body.balance) : null,
      accountId: body?.accountId ? Number(body.accountId) : null,
    };
    if (!payload.projectId || !payload.date || !Number.isFinite(Number(payload.payment))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inserted = await db.insert(projectLoans).values(payload).returning();
    return NextResponse.json({ loan: inserted[0] });
  } catch (err) {
    console.error("POST /api/loans error", err);
    return NextResponse.json({ error: "Failed to create loan entry" }, { status: 500 });
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
      originationDate: rest?.originationDate !== undefined ? (rest.originationDate ? String(rest.originationDate) : null) : undefined,
      payment: rest?.payment !== undefined ? String(rest.payment) : undefined,
      interest: rest?.interest !== undefined ? String(rest.interest) : undefined,
      principal: rest?.principal !== undefined ? String(rest.principal) : undefined,
      balance: rest?.balance !== undefined && rest.balance !== "" ? String(rest.balance) : null,
      accountId: rest?.accountId !== undefined ? (rest.accountId ? Number(rest.accountId) : null) : undefined,
    };
    const updated = await db
      .update(projectLoans)
      .set(payload)
      .where(eq(projectLoans.id, Number(id)))
      .returning();
    return NextResponse.json({ loan: updated[0] });
  } catch (err) {
    console.error("PATCH /api/loans error", err);
    return NextResponse.json({ error: "Failed to update loan entry" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const deleted = await db.delete(projectLoans).where(eq(projectLoans.id, id)).returning();
    return NextResponse.json({ loan: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/loans error", err);
    return NextResponse.json({ error: "Failed to delete loan entry" }, { status: 500 });
  }
}
