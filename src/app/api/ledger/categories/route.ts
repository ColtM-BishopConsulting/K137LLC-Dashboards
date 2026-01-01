import { NextResponse } from "next/server";
import { eq, inArray, or } from "drizzle-orm";
import { db, ledgerCategories, ledgerTransactions } from "@/db";

export async function GET() {
  try {
    const data = await db.select().from(ledgerCategories);
    return NextResponse.json({ categories: data });
  } catch (err) {
    console.error("GET /api/ledger/categories error", err);
    return NextResponse.json({ error: "Failed to fetch ledger categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const normalized = {
      ...body,
      parentId: body?.parentId ? Number(body.parentId) : null,
    };
    const inserted = await db.insert(ledgerCategories).values(normalized).returning();
    return NextResponse.json({ category: inserted[0] });
  } catch (err) {
    console.error("POST /api/ledger/categories error", err);
    return NextResponse.json({ error: "Failed to create ledger category" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...rest } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const [existing] = await db
      .select({ name: ledgerCategories.name, parentId: ledgerCategories.parentId })
      .from(ledgerCategories)
      .where(eq(ledgerCategories.id, id))
      .limit(1);
    const normalized = {
      ...rest,
      parentId: rest?.parentId ? Number(rest.parentId) : null,
    };
    const updated = await db.update(ledgerCategories).set(normalized).where(eq(ledgerCategories.id, id)).returning();
    const renamed = updated[0];
    if (renamed?.name) {
      const isSubcategory = Boolean(renamed.parentId);
      if (isSubcategory) {
        await db
          .update(ledgerTransactions)
          .set({ subCategory: renamed.name })
          .where(
            or(
              eq(ledgerTransactions.subCategoryId, id),
              existing?.name ? eq(ledgerTransactions.subCategory, existing.name) : eq(ledgerTransactions.subCategoryId, id)
            )
          );
      } else {
        await db
          .update(ledgerTransactions)
          .set({ category: renamed.name })
          .where(
            or(
              eq(ledgerTransactions.categoryId, id),
              existing?.name ? eq(ledgerTransactions.category, existing.name) : eq(ledgerTransactions.categoryId, id)
            )
          );
      }
    }
    return NextResponse.json({ category: updated[0] });
  } catch (err) {
    console.error("PATCH /api/ledger/categories error", err);
    return NextResponse.json({ error: "Failed to update ledger category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const children = await db
      .select({ id: ledgerCategories.id })
      .from(ledgerCategories)
      .where(eq(ledgerCategories.parentId, id));
    const childIds = children.map((c) => c.id);
    await db
      .update(ledgerTransactions)
      .set({ categoryId: null })
      .where(eq(ledgerTransactions.categoryId, id));
    if (childIds.length) {
      await db
        .update(ledgerTransactions)
        .set({ subCategoryId: null })
        .where(inArray(ledgerTransactions.subCategoryId, childIds));
    }
    await db
      .update(ledgerTransactions)
      .set({ subCategoryId: null })
      .where(eq(ledgerTransactions.subCategoryId, id));
    const deleted = await db.delete(ledgerCategories).where(eq(ledgerCategories.id, id)).returning();
    return NextResponse.json({ category: deleted[0] });
  } catch (err) {
    console.error("DELETE /api/ledger/categories error", err);
    return NextResponse.json({ error: "Failed to delete ledger category" }, { status: 500 });
  }
}
