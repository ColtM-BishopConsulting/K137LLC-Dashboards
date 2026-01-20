import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tenants, rentUnits, rentPayments, tenantReminderLogs, rentProperties, tenantActivityLogs } from "@/db";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateMs = (dateStr: string) => {
  const clean = String(dateStr || "").slice(0, 10);
  const ms = Date.parse(`${clean}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : NaN;
};

const toDateString = (ms: number) => {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getMonthKey = (dateStr: string) => String(dateStr || "").slice(0, 7);

const parseMonthDay = (monthDay: string) => {
  const [m, d] = String(monthDay || "01-01").split("-");
  return { month: Number(m) || 1, day: Number(d) || 1 };
};

const getMonthDayDate = (monthKey: string, monthDay: string) => {
  const [y, m] = monthKey.split("-").map((v) => Number(v));
  const { day } = parseMonthDay(monthDay);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const nextMonthKey = (monthKey: string) => {
  const [y, m] = monthKey.split("-").map((v) => Number(v));
  const next = new Date(Date.UTC(y, m, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthKeySequence = (startKey: string, endKey: string) => {
  const out: string[] = [];
  let cur = startKey;
  const guard = 240;
  for (let i = 0; i < guard; i += 1) {
    out.push(cur);
    if (cur === endKey) break;
    cur = nextMonthKey(cur);
  }
  return out;
};

const nextDueMonthKeyFromCreation = (createdAt: string, monthDay: string) => {
  const createdMs = toDateMs(createdAt);
  if (!Number.isFinite(createdMs)) return getMonthKey(toDateString(Date.now()));
  const created = new Date(createdMs);
  const createdYear = created.getUTCFullYear();
  const createdMonth = created.getUTCMonth() + 1;
  const createdDay = created.getUTCDate();
  const { month: dueMonth, day: dueDay } = parseMonthDay(monthDay || "01-01");

  let targetMonth = createdMonth;
  let targetYear = createdYear;
  if (dueMonth < createdMonth || (dueMonth === createdMonth && dueDay < createdDay)) {
    targetYear = createdYear + 1;
    targetMonth = dueMonth;
  } else {
    targetMonth = dueMonth;
    targetYear = createdYear;
  }
  const candidateMs = Date.UTC(targetYear, targetMonth - 1, dueDay);
  const adjustedMs = candidateMs < createdMs ? Date.UTC(targetYear, targetMonth, dueDay) : candidateMs;
  const adjustedDate = new Date(adjustedMs);
  const y = adjustedDate.getUTCFullYear();
  const m = adjustedDate.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
};

const calcLateFeeForDays = (daysLate: number, rent: number) => {
  const initialLateFee = daysLate >= 3 ? 50 : 0;
  const perDayLateStart = 5;
  const perDayCount = Math.max(0, daysLate - (perDayLateStart - 1));
  const perDayLateFee = Math.min(10, perDayCount) * 5;
  return Math.min(initialLateFee + perDayLateFee, rent * 0.12);
};

const buildPaymentRollup = (rent: number, initialDueMonthDay: string, createdAt: string, payments: { date: string; amount: number }[]) => {
  const todayMs = toDateMs(toDateString(Date.now()));
  const todayKey = getMonthKey(toDateString(todayMs));
  const paymentsByMonth: Record<string, { amount: number; firstDate: string }> = {};
  payments.forEach((p) => {
    const key = getMonthKey(p.date);
    const existing = paymentsByMonth[key];
    const dateStr = toDateString(toDateMs(p.date));
    paymentsByMonth[key] = {
      amount: (existing?.amount || 0) + p.amount,
      firstDate: existing?.firstDate
        ? (toDateMs(dateStr) < toDateMs(existing.firstDate) ? dateStr : existing.firstDate)
        : dateStr,
    };
  });

  const startKey = nextDueMonthKeyFromCreation(createdAt || toDateString(Date.now()), initialDueMonthDay || "01-01");
  const months = monthKeySequence(startKey, todayKey);
  const paymentsForEntry = Object.values(paymentsByMonth).reduce((sum, info) => sum + info.amount, 0);

  let totalLateFeeOutstanding = 0;
  let totalDueOutstanding = 0;
  let remainingPaid = paymentsForEntry;
  let remainingBalance = 0;
  let firstUnpaidKey = months[0];
  let firstUnpaidDueDate = "";

  months.forEach((key) => {
    const dueDate = getMonthDayDate(key, initialDueMonthDay || "01-01");
    const paymentInfoForMonth = paymentsByMonth[key];
    const paidDateMs = paymentInfoForMonth?.firstDate ? toDateMs(paymentInfoForMonth.firstDate) : null;
    const settled = paymentInfoForMonth?.amount && paymentInfoForMonth.amount >= rent;
    const comparisonDateMs = settled && paidDateMs ? paidDateMs : todayMs;
    const daysLate = Math.max(0, Math.floor((comparisonDateMs - toDateMs(dueDate)) / DAY_MS));
    const cappedLateFee = calcLateFeeForDays(daysLate, rent);
    const monthDue = rent + cappedLateFee;

    if (remainingPaid >= monthDue) {
      remainingPaid -= monthDue;
    } else {
      const monthBalance = monthDue - remainingPaid;
      remainingBalance += monthBalance;
      totalDueOutstanding += monthBalance;
      totalLateFeeOutstanding += cappedLateFee;
      remainingPaid = 0;
      if (!firstUnpaidDueDate) {
        firstUnpaidDueDate = dueDate;
        firstUnpaidKey = key;
      }
    }
  });

  const effectiveDueDate = firstUnpaidDueDate || getMonthDayDate(nextMonthKey(todayKey), initialDueMonthDay || "01-01");
  return {
    paid: paymentsForEntry,
    balance: remainingBalance,
    dueDate: effectiveDueDate,
    lateFee: totalLateFeeOutstanding,
    totalDue: totalDueOutstanding,
    monthKey: firstUnpaidKey,
  };
};

const shouldSendReminder = async (tenantId: number, dueDate: string, reminderType: string, reminderDate: string) => {
  const existing = await db
    .select({ id: tenantReminderLogs.id })
    .from(tenantReminderLogs)
    .where(
      and(
        eq(tenantReminderLogs.tenantId, tenantId),
        eq(tenantReminderLogs.reminderType, reminderType),
        eq(tenantReminderLogs.dueDate, dueDate),
        eq(tenantReminderLogs.reminderDate, reminderDate)
      )
    )
    .limit(1);
  return !existing.length;
};

const authorizeRequest = (req: Request) => {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.TENANT_RENT_REMINDER_SECRET || "";
  if (!secret) return true;
  const header = req.headers.get("x-tenant-reminder-secret") || "";
  if (header && header === secret) return true;
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";
  return querySecret === secret;
};

const runReminders = async (req: Request) => {
  try {
    const webhookUrl = process.env.TENANT_RENT_REMINDER_WEBHOOK_URL || "";
    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing TENANT_RENT_REMINDER_WEBHOOK_URL" }, { status: 400 });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";
    const forcedType = url.searchParams.get("type");
    const todayKey = toDateString(Date.now());
    const tenantsList = await db
      .select()
      .from(tenants)
      .where(eq(tenants.emailReminders, true));

    const rentUnitIds = tenantsList.map((t) => t.rentUnitId).filter(Boolean) as number[];
    if (!rentUnitIds.length) return NextResponse.json({ sent: 0 });

    const units = await db
      .select()
      .from(rentUnits)
      .where(inArray(rentUnits.id, rentUnitIds));
    const propertyIds = units.map((u) => u.propertyId).filter(Boolean) as number[];
    const properties = propertyIds.length
      ? await db.select().from(rentProperties).where(inArray(rentProperties.id, propertyIds))
      : [];
    const propertyMap = properties.reduce<Record<number, string>>((acc, p) => {
      acc[p.id] = p.name || "Property";
      return acc;
    }, {});

    const payments = await db
      .select()
      .from(rentPayments)
      .where(inArray(rentPayments.rentUnitId, rentUnitIds));

    const paymentsByUnit = payments.reduce<Record<number, { date: string; amount: number }[]>>((acc, p) => {
      const unitId = Number(p.rentUnitId);
      acc[unitId] = acc[unitId] || [];
      acc[unitId].push({ date: String(p.date), amount: Number(p.amount) });
      return acc;
    }, {});

    let sent = 0;
    for (const tenant of tenantsList) {
      if (!tenant.rentUnitId) continue;
      const unit = units.find((u) => u.id === tenant.rentUnitId);
      if (!unit) continue;
      const rollup = buildPaymentRollup(
        Number(unit.rent || 0),
        unit.initialDueMonthDay || "01-01",
        unit.createdAt ? String(unit.createdAt) : todayKey,
        paymentsByUnit[unit.id] || []
      );
      const dueDate = rollup.dueDate;
      const daysUntil = Math.round((toDateMs(dueDate) - toDateMs(todayKey)) / DAY_MS);
      const reminderTypes: string[] = [];
      if (force) {
        reminderTypes.push(forcedType || "test");
      } else {
        if ([7, 3, 1].includes(daysUntil)) {
          reminderTypes.push(`due-${daysUntil}`);
        }

        const daysLate = Math.max(0, Math.floor((toDateMs(todayKey) - toDateMs(dueDate)) / DAY_MS));
        if (daysLate > 0) {
          const lateFeeToday = calcLateFeeForDays(daysLate, Number(unit.rent || 0));
          const lateFeeYesterday = calcLateFeeForDays(Math.max(0, daysLate - 1), Number(unit.rent || 0));
          if (lateFeeToday > lateFeeYesterday) {
            reminderTypes.push("late-fee");
          }
        }
      }

      for (const reminderType of reminderTypes) {
        if (!force) {
          const canSend = await shouldSendReminder(tenant.id, dueDate, reminderType, todayKey);
          if (!canSend) continue;
        }
        const reminderStatus = reminderType === "late-fee"
          ? "late_fee"
          : reminderType.startsWith("due-")
            ? "upcoming"
            : (daysUntil < 0 || reminderType === "overdue" ? "overdue" : "upcoming");
        const statementId = `rem-${tenant.id}-${unit.id}-${dueDate}-${reminderType}-${todayKey}`;
        const billingPeriod = getMonthKey(dueDate);
        const billingPeriodLabel = new Date(toDateMs(`${billingPeriod}-01`)).toLocaleString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
        const payload = {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
          },
          unit: {
            id: unit.id,
            unit: unit.unit,
            property: propertyMap[unit.propertyId] || "Property",
          },
          reminder: {
            statementId,
            type: reminderType,
            status: reminderStatus,
            billingPeriod,
            billingPeriodLabel,
            dueDate,
            daysUntil,
            rent: Number(unit.rent || 0),
            lateFee: rollup.lateFee,
            totalDue: rollup.totalDue,
          },
        };

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.warn("tenant reminder webhook failed", await res.text());
          continue;
        }
        if (!force) {
          await db.insert(tenantActivityLogs).values({
            tenantId: tenant.id,
            rentUnitId: unit.id,
            statementId,
            eventType: "reminder_sent",
            metadata: {
              reminderType,
              status: reminderStatus,
              dueDate,
              daysUntil,
              lateFee: rollup.lateFee,
              totalDue: rollup.totalDue,
            },
          });
        }
        if (!force) {
          await db.insert(tenantReminderLogs).values({
            tenantId: tenant.id,
            rentUnitId: unit.id,
            reminderType,
            dueDate,
            reminderDate: todayKey,
            lateFee: rollup.lateFee,
          });
        }
        sent += 1;
      }
    }

    return NextResponse.json({ sent });
  } catch (err) {
    console.error("POST /api/tenant/reminders/run error", err);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
};

export async function POST(req: Request) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminders(req);
}

export async function GET(req: Request) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runReminders(req);
}
