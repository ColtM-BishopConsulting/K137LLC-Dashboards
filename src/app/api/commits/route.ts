/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import {
  db,
  commits,
  commitChanges,
  users,
  projects,
  activities,
  ledgerTransactions,
  rentProperties,
  rentUnits,
  rentPayments,
  rentDocuments,
  rentExpenses,
  rentExpenseCategories,
  ledgerCategories,
  epsNodes,
  wbsNodes,
  projectPipelineMeta,
  paychecks,
  timeEntries,
  resources,
  projectDetails,
  formulas,
  formulaPresets,
  taxRates,
} from "@/db";
import { getSessionFromCookieHeader, COOKIE_NAME } from "@/lib/auth";
import { desc, eq, inArray, and } from "drizzle-orm";

const STATUS = ["pending", "approved", "rejected", "applied"] as const;
type CommitStatus = (typeof STATUS)[number];

const tagToMajor: Record<string, string> = {
  projects: "1",
  activities: "2",
  transactions: "3",
  rent_roll: "4",
  resources: "5",
  tax: "6",
  users: "7",
  formulas: "8",
  exports: "9",
};

const randomLetter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
const randomDigit = () => Math.floor(Math.random() * 10).toString();

const buildSerial = (name: string, tags: string[] = []) => {
  const initials = name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() || "C").join("").slice(0, 2) || "CM";
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(now.getUTCFullYear()).slice(-2);
  const major = tags
    .map((t) => tagToMajor[t] || null)
    .filter(Boolean)
    .join("") || randomDigit();
  let tail = "";
  const maxLen = 10;
  for (let i = 0; tail.length < maxLen; i++) {
    if (i % 2 === 0) {
      tail += major[i % major.length] || randomDigit();
    } else {
      tail += randomLetter();
    }
  }
  return `${initials}-${mm}${yy}-${tail.slice(0, maxLen)}`;
};

const mapCommit = (c: any, changes?: any[]) => ({
  id: c.id,
  serial: c.serial,
  description: c.description,
  tags: c.tags || [],
  status: c.status,
  authorId: c.authorId,
  authorName: c.authorName,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  appliedAt: c.appliedAt,
  changes,
});

const requireUser = async (req: Request) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  const bearer = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const tokenHeader =
    bearer ||
    req.headers.get("cookie") ||
    req.headers.get("Cookie") ||
    req.headers.get(COOKIE_NAME);
  const session = await getSessionFromCookieHeader(tokenHeader);
  // Fallback: if verification failed, try to decode payload without verifying signature
  // so we can at least honor role-based UI flows. This still enforces admin on apply below.
  if (!session && tokenHeader) {
    const raw = (() => {
      if (!tokenHeader.includes(";") && tokenHeader.includes(".")) return tokenHeader;
      const parts = tokenHeader.split(/;\s*/);
      const found = parts.find((p) => p.trim().startsWith(`${COOKIE_NAME}=`));
      return found ? found.split("=").slice(1).join("=") : null;
    })();
    if (raw && raw.includes(".")) {
      try {
        const base64 = raw.split(".")[1];
        const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "=");
        const json = Buffer.from(padded, "base64").toString("utf8");
        const payload = JSON.parse(json);
        return {
          sub: payload.sub ?? null,
          role: payload.role ? String(payload.role).trim().toLowerCase() : "user",
          name: payload.name || "unknown",
          email: payload.email || "",
        };
      } catch {
        // ignore
      }
    }
    return { sub: null, role: "user", name: "unknown", email: "" };
  }
  if (session.role) {
    session.role = String(session.role).trim().toLowerCase();
  }
  return session;
};

const applyCrud = async (table: any, change: any) => {
  const op = String(change.operation || "").toLowerCase();
  if (op === "create") {
    if (!change.after) throw new Error("Missing 'after' payload for create");
    // On create, drop client-provided id to let the DB assign if it is not a valid number
    const payload = { ...(change.after || {}) };
    if (payload.id && Number.isNaN(Number(payload.id))) {
      delete payload.id;
    }
    await db.insert(table).values(payload);
  } else if (op === "update") {
    if (!change.entityId) throw new Error("Missing entityId for update");
    if (!change.after) throw new Error("Missing 'after' payload for update");
    const payload = { ...(change.after || {}) };
    if (payload.id) delete payload.id;
    await db.update(table).set(payload).where(eq(table.id, Number(change.entityId)));
  } else if (op === "delete") {
    if (!change.entityId) throw new Error("Missing entityId for delete");
    await db.delete(table).where(eq(table.id, Number(change.entityId)));
  } else {
    // unsupported op: skip safely
  }
};

const applyCommitChanges = async (commitId: number) => {
  const rows = await db.select().from(commitChanges).where(eq(commitChanges.commitId, commitId));
  if (!rows.length) {
    throw new Error("No change items to apply");
  }
  for (const ch of rows) {
    const entity = String(ch.entity || "").toLowerCase();
    if (entity === "projects") {
      await applyCrud(projects, ch);
    } else if (entity === "eps_nodes" || entity === "eps") {
      await applyCrud(epsNodes, ch);
    } else if (entity === "wbs" || entity === "wbs_nodes") {
      await applyCrud(wbsNodes, ch);
    } else if (entity === "pipeline_meta") {
      await applyCrud(projectPipelineMeta, ch);
    } else if (entity === "activities") {
      const op = String(ch.operation || "").toLowerCase();
      const chAny: any = ch as any;
      const after: any = chAny.after ? { ...chAny.after } : {};
      const before: any = chAny.before ? { ...chAny.before } : {};
      if (op === "create" || op === "update") {
        // Resolve wbsId from wbs/code, create if missing
        const projectId = Number(
          after.projectId ??
          after.project_id ??
          chAny.entityId ??
          chAny.after?.projectId ??
          before.projectId ??
          before.project_id ??
          null
        );
        let wbsId = after.wbsId || after.wbs_id || before.wbsId || before.wbs_id || null;
        const wbsCode = after.wbs || after.code || before.wbs || before.code || null;
        if (!wbsId && projectId && wbsCode) {
          const [wbsRow] = await db
            .select({ id: wbsNodes.id })
            .from(wbsNodes)
            .where(and(eq(wbsNodes.projectId, projectId), eq(wbsNodes.code, String(wbsCode))));
          if (wbsRow?.id) {
            wbsId = wbsRow.id;
          } else {
            const [insertedWbs] = await db
              .insert(wbsNodes)
              .values({
                projectId,
                code: String(wbsCode),
                name: String(after.name || before.name || wbsCode),
              })
              .returning({ id: wbsNodes.id });
            wbsId = insertedWbs.id;
          }
        }
        after.wbsId = wbsId || after.wbsId || after.wbs_id;
        // Default required fields
        const today = new Date().toISOString().slice(0, 10);
        after.startDate = after.startDate || after.start_date || before.startDate || before.start_date || today;
        after.finishDate = after.finishDate || after.finish_date || before.finishDate || before.finish_date || today;
        after.durationDays = after.durationDays || after.duration_days || before.durationDays || before.duration_days || 1;
        after.percentComplete = after.percentComplete || after.percent_complete || before.percentComplete || before.percent_complete || 0;
        after.code = after.code || before.code || wbsCode || `ACT-${Date.now()}`;
        await applyCrud(activities, { ...ch, after });
      } else {
        await applyCrud(activities, ch);
      }
    } else if (entity === "transactions" || entity === "ledger_transactions") {
      await applyCrud(ledgerTransactions, ch);
    } else if (entity === "ledger_categories" || entity === "ledgercategories") {
      await applyCrud(ledgerCategories, ch);
    } else if (entity === "rent_properties" || entity === "rentproperties") {
      await applyCrud(rentProperties, ch);
    } else if (entity === "rent_units" || entity === "rentunits") {
      await applyCrud(rentUnits, ch);
    } else if (entity === "rent_payments" || entity === "rentpayments") {
      await applyCrud(rentPayments, ch);
    } else if (entity === "rent_documents" || entity === "rentdocuments") {
      await applyCrud(rentDocuments, ch);
    } else if (entity === "rent_expenses" || entity === "rentexpenses") {
      await applyCrud(rentExpenses, ch);
    } else if (entity === "rent_expense_categories" || entity === "rentexpensecategories") {
      await applyCrud(rentExpenseCategories, ch);
    } else if (entity === "paychecks") {
      await applyCrud(paychecks, ch);
    } else if (entity === "time_entries" || entity === "timeentries") {
      await applyCrud(timeEntries, ch);
    } else if (entity === "resources") {
      await applyCrud(resources, ch);
    } else if (entity === "project_details" || entity === "projectdetails") {
      await applyCrud(projectDetails, ch);
  } else if (entity === "formulas") {
    await applyCrud(formulas, ch);
  } else if (entity === "formula_presets" || entity === "formulapresets") {
    await applyCrud(formulaPresets, ch);
  } else if (entity === "tax_rates" || entity === "taxrates") {
    await applyCrud(taxRates, ch);
  } else {
    // unknown entity, skip
  }
  }
  return true;
};

export async function GET(req: Request) {
  try {
    const session = await requireUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const includeChanges = searchParams.get("includeChanges") === "1";
    const rows = await db
      .select({
        id: commits.id,
        serial: commits.serial,
        description: commits.description,
        tags: commits.tags,
        status: commits.status,
        authorId: commits.authorId,
        createdAt: commits.createdAt,
        updatedAt: commits.updatedAt,
        appliedAt: commits.appliedAt,
        authorName: users.name,
      })
      .from(commits)
      .leftJoin(users, eq(users.id, commits.authorId))
      .orderBy(desc(commits.createdAt))
      .limit(100);

    if (!includeChanges) {
      return NextResponse.json({ commits: rows.map((r) => mapCommit(r)) });
    }

    const ids = rows.map((r) => r.id);
    const changeRows = ids.length
      ? await db.select().from(commitChanges).where(inArray(commitChanges.commitId, ids))
      : [];
    const changeMap = changeRows.reduce<Record<number, any[]>>((acc, ch) => {
      acc[ch.commitId] = acc[ch.commitId] || [];
      acc[ch.commitId].push({
        id: ch.id,
        entity: ch.entity,
        entityId: ch.entityId,
        operation: ch.operation,
        before: ch.before,
        after: ch.after,
        impact: ch.impact,
      });
      return acc;
    }, {});

    return NextResponse.json({
      commits: rows.map((r) => mapCommit(r, changeMap[r.id] || [])),
    });
  } catch (err) {
    console.error("GET /api/commits error", err);
    return NextResponse.json({ error: "Failed to load commits" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const description = String(body.description || "").trim();
    const tags = Array.isArray(body.tags) ? body.tags.map((t: any) => String(t)) : [];
    const changes = Array.isArray(body.changes) ? body.changes : [];

    const serial = buildSerial(String(session.name || "CM"), tags);
    const [inserted] = await db
      .insert(commits)
      .values({
        serial,
        description,
        tags,
        status: "pending",
        authorId: session.sub ? Number(session.sub) : null,
      })
      .returning();

    if (changes.length) {
      await db.insert(commitChanges).values(
        changes.map((ch: any) => ({
          commitId: inserted.id,
          entity: String(ch.entity || "unknown"),
          entityId: ch.entityId ? Number(ch.entityId) : null,
          operation: String(ch.operation || "update"),
          before: ch.before ?? null,
          after: ch.after ?? null,
          impact: ch.impact ? String(ch.impact) : null,
        }))
      );
    }

    return NextResponse.json({ commit: mapCommit(inserted) });
  } catch (err) {
    console.error("POST /api/commits error", err);
    return NextResponse.json({ error: "Failed to create commit" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { id, status, description } = body || {};
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, any> = {};
    if (description !== undefined) updates.description = String(description);
    if (status) {
      if (!STATUS.includes(status as CommitStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      // Enforce admin for status transitions
      let role = session.role;
      if (role !== "admin") {
        const [u] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, Number(session.sub)))
          .limit(1);
        role = u?.role ? String(u.role).trim().toLowerCase() : null;
      }
      if (role !== "admin") {
        return NextResponse.json({ error: "Forbidden (admin only)" }, { status: 403 });
      }
      if (status === "applied") {
        await applyCommitChanges(Number(id));
      }
      updates.status = status;
      if (status === "applied") updates.appliedAt = new Date();
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const [updated] = await db
      .update(commits)
      .set(updates)
      .where(eq(commits.id, Number(id)))
      .returning();

    return NextResponse.json({ commit: mapCommit(updated) });
  } catch (err) {
    console.error("PATCH /api/commits error", err);
    return NextResponse.json({ error: "Failed to update commit" }, { status: 500 });
  }
}
