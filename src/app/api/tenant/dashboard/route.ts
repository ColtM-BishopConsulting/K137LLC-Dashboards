import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tenants, rentUnits, rentProperties, rentPayments } from "@/db";
import { getTenantSessionFromRequest } from "@/lib/tenant-auth";

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

export async function GET(req: Request) {
  try {
    const session = await getTenantSessionFromRequest(req);
    if (!session || !session.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, Number(session.sub)));
    if (!tenant || !tenant.rentUnitId) {
      return NextResponse.json({ error: "Tenant not linked to a unit" }, { status: 404 });
    }
    const [unit] = await db
      .select({
        id: rentUnits.id,
        unit: rentUnits.unit,
        rent: rentUnits.rent,
        status: rentUnits.status,
        initialDueMonthDay: rentUnits.initialDueMonthDay,
        createdAt: rentUnits.createdAt,
        propertyId: rentUnits.propertyId,
      })
      .from(rentUnits)
      .where(eq(rentUnits.id, tenant.rentUnitId));
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 });

    const [property] = await db.select().from(rentProperties).where(eq(rentProperties.id, unit.propertyId));
    const payments = await db
      .select({ date: rentPayments.date, amount: rentPayments.amount })
      .from(rentPayments)
      .where(eq(rentPayments.rentUnitId, unit.id));

    const paymentRollup = buildPaymentRollup(
      Number(unit.rent || 0),
      unit.initialDueMonthDay || "01-01",
      unit.createdAt ? toDateString(toDateMs(String(unit.createdAt))) : toDateString(Date.now()),
      payments.map((p) => ({ date: String(p.date), amount: Number(p.amount) }))
    );

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        emailReminders: tenant.emailReminders,
      },
      unit: {
        id: unit.id,
        unit: unit.unit,
        rent: Number(unit.rent),
        status: unit.status,
      },
      property: {
        id: property?.id || null,
        name: property?.name || "Property",
      },
      rollup: paymentRollup,
    });
  } catch (err) {
    console.error("GET /api/tenant/dashboard error", err);
    return NextResponse.json({ error: "Failed to load tenant dashboard" }, { status: 500 });
  }
}
