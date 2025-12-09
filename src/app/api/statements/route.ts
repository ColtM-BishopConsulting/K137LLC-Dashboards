import { NextResponse } from "next/server";
import { db, statementLines, statementUploads } from "@/db";

export async function GET() {
  const uploads = await db.select().from(statementUploads);
  const lines = await db.select().from(statementLines);
  const grouped = uploads.map((u) => ({
    ...u,
    lines: lines.filter((l) => l.uploadId === u.id),
  }));
  return NextResponse.json({ uploads: grouped });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { uploads, lines } = body as {
    uploads: { tempId: string; name: string; size: number; uploadedAt?: string }[];
    lines: { tempUploadId: string; date: string; description: string; amount: number }[];
  };
  if (!uploads?.length) return NextResponse.json({ error: "No uploads" }, { status: 400 });

  const insertedUploads = await db.insert(statementUploads).values(
    uploads.map((u) => ({
      name: u.name,
      size: u.size,
      uploadedAt: u.uploadedAt ? new Date(u.uploadedAt) : new Date(),
    }))
  ).returning({ id: statementUploads.id });

  const tempIdToDbId = new Map<string, number>();
  uploads.forEach((u, idx) => {
    tempIdToDbId.set(u.tempId, insertedUploads[idx].id);
  });

  if (lines?.length) {
    await db.insert(statementLines).values(
      lines.map((l) => ({
        uploadId: tempIdToDbId.get(l.tempUploadId)!,
        date: l.date,
        description: l.description,
        amount: String(l.amount),
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
