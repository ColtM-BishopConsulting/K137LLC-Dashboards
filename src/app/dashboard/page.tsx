/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client"


import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import React from "react";
import { useTheme } from "next-themes";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------
type EpsNodeType =
  | "enterprise"
  | "business_unit"
  | "portfolio"
  | "company"
  | "project";

interface EpsNode {
  id: number;
  parentId: number | null;
  type: EpsNodeType;
  name: string;
  projectId?: number | null;
  children?: EpsNode[];
}

interface DbWbsNode {
  id: number;
  projectId: number;
  code: string;
  name: string;
  parentId: number | null;
}

// ---------------------------------------------------------------------------
// RESOURCE TYPES
// ---------------------------------------------------------------------------
interface Resource {
  id: string;
  name: string;
  type: "Labor" | "Equipment" | "Material" | "Subcontractor";
  rate: number;
  rateUnit: "hour" | "day" | "unit" | "lump";
  availability?: number;
}

interface ActivityResource {
  resourceId: string;
  quantity: number;
  assignedDate?: string;
}

interface Activity {
  id: string;
  wbs: string;
  name: string;
  start: string;
  finish: string;
  duration: number;
  pct: number;
  responsible: string;
  status: "Not Started" | "In Progress" | "Completed";
  bucket?: string;
  property?: string;
  projectedLabor: number;
  projectedCost: number;
  budget: number;
  revenue: number;
  resources: ActivityResource[];
  predecessors?: string[];
  successor?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "Income" | "Outcome";
  categoryId?: string;
  category: string;
  subCategoryId?: string;
  subCategory?: string;
  accountId?: string;
  accountName?: string;
  amount: number;
  activityId?: string;
}

interface LedgerCategory {
  id: string;
  name: string;
  parentId?: string | null;
}

interface LedgerAccount {
  id: string;
  name: string;
  type: "bank" | "credit" | "loc" | "other";
  institution?: string | null;
  last4?: string | null;
}

interface ProjectDetail {
  id: string;
  variable: string;
  value: string;
}

type ProjectStatus = "under_contract" | "acquired";

interface ProjectPipelineMeta {
  status: ProjectStatus;
  seller: {
    name: string;
    phone: string;
    email: string;
  };
  selectedEmailOptionIds: string[];
}

interface EmailOption {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
}

interface Employee {
  id: string;
  name: string;
  rate: number; // hourly
}

interface TimeEntry {
  id: string;
  employeeId: string;
  projectId: number | null;
  date: string; // ISO date
  hours: number;
}

interface Paycheck {
  id: string;
  employeeId: string;
  weekStart: string; // ISO date for Monday
  amount: number;
  checkNumber: string;
}

interface TaxRate {
  id: string;
  county: string;
  state?: string;
  rate: number; // stored as percentage (e.g., 8.25 for 8.25%)
  note?: string;
}

interface UserSummary {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

interface ActiveUser {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  lastSeen: string;
}

interface CommitChange {
  id: number;
  entity: string;
  entityId?: number | null;
  operation: string;
  before?: any;
  after?: any;
  impact?: string | null;
}

interface CommitItem {
  id: number;
  serial: string;
  description?: string;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "applied";
  authorId?: number | null;
  authorName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  appliedAt?: string | null;
  changes?: CommitChange[];
}

interface DraftChange {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  impact: string;
  beforeText: string;
  afterText: string;
}

type RentRollStatus = "Occupied" | "Vacant" | "Notice";

interface RentRollProperty {
  id: string;
  name: string;
  linkedProjectId?: number | null;
}

interface RentRollEntry {
  id: string;
  propertyId: string;
  unit: string;
  tenant: string;
  status: RentRollStatus;
  rent: number;
  balance: number;
  leaseEnd: string;
  initialDueMonthDay: string; // MM-DD
  bedrooms: number;
  bathrooms: number;
  lastPaymentDate?: string | null;
  lastPaymentPaidOnDate?: boolean | null;
  lastPaymentPaidDate?: string | null;
  createdAt?: string;
}

interface Tenant {
  id: string;
  rentUnitId?: string | null;
  name: string;
  email: string;
  emailReminders?: boolean;
  createdAt?: string;
}

interface TenantActivity {
  id: string;
  tenantId: string;
  rentUnitId: string;
  statementId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
}

interface RentPayment {
  id: string;
  rentRollEntryId: string;
  amount: number;
  date: string;
  note?: string;
}

interface RentExpenseCategory {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt?: string;
}

interface RentRollDocument {
  id: string;
  entryId: string;
  label: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

interface RentRollExpense {
  id: string;
  entryId: string;
  date: string;
  category: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  description: string;
  amount: number;
}

interface ProjectUtility {
  id: string;
  projectId: number;
  date: string;
  service: string;
  provider: string;
  amount: number;
  accountId?: string;
  accountName?: string;
  note?: string | null;
}

interface ProjectDraw {
  id: string;
  projectId: number;
  date: string;
  description: string;
  amount: number;
  accountId?: string;
  accountName?: string;
  note?: string | null;
}

interface ProjectLoanEntry {
  id: string;
  projectId: number;
  date: string;
  originationDate?: string | null;
  payment: number;
  interest: number;
  principal: number;
  balance?: number | null;
  accountId?: string;
  accountName?: string;
  note?: string | null;
}

interface ProjectPropertyTax {
  id: string;
  projectId: number;
  taxYear: number;
  dueDate: string;
  amount: number;
  status: "due" | "paid" | "overdue";
  paidDate?: string | null;
  note?: string | null;
}

interface ProjectAcquisition {
  id: string;
  projectId: number;
  purchasePrice: number;
  acquisitionDraw: number;
  earnestMoney: number;
  closeDate?: string | null;
  note?: string | null;
}

interface ProjectClosingCost {
  id: string;
  projectId: number;
  side: "purchase" | "sale";
  code?: string | null;
  label: string;
  amount: number;
  paid: boolean;
  paidDate?: string | null;
  note?: string | null;
}

interface ProjectDebtService {
  id: string;
  projectId: number;
  bank: string;
  balance: number;
  payment: number;
  interestRate: number;
  rateType: "fixed" | "variable";
  rateAdjustDate?: string | null;
  maturityDate?: string | null;
  note?: string | null;
}

interface CostCategory {
  id: string;
  name: string;
  code?: string | null;
}

interface ProjectCostOverride {
  id: string;
  projectId: number;
  categoryId: string;
  amount: number;
  note?: string | null;
}

interface BreakdownPreset {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
}

interface BreakdownPresetItem {
  id: string;
  presetId: string;
  categoryId: string;
  sortOrder: number;
  include: boolean;
}

interface ProjectBreakdownPref {
  id: string;
  projectId: number;
  presetId: string;
}

interface KpiPreset {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
}

interface KpiPresetItem {
  id: string;
  presetId: string;
  name: string;
  formula: string;
  resultType: "currency" | "percentage" | "number";
  sortOrder: number;
  enabled: boolean;
  scaleMin?: number | null;
  scaleMax?: number | null;
  scaleInvert?: boolean;
}

interface ProjectKpiPref {
  id: string;
  projectId: number;
  presetId: string;
}

interface ProjectKpiOverride {
  id: string;
  projectId: number;
  itemId: string;
  overrideValue: number;
  note?: string | null;
}

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  dueDate: string;
  daysUntil: number;
  level: "info" | "warning" | "urgent";
  target: {
    mode: DashboardMode;
    projectId?: number;
    activityView?: "utilities" | "draws" | "loans" | "taxes";
    rentPropertyId?: string;
    rentUnitId?: string;
  };
}
// ---------------------------------------------------------------------------
// CUSTOM FORMULA TYPES
// ---------------------------------------------------------------------------
interface CustomFormula {
  id: string;
  name: string;
  formula: string;
  description?: string;
  resultType: "currency" | "percentage" | "number";
}

interface ContextMenuState {
  x: number;
  y: number;
  node: EpsNode | null;
  type: 'eps' | 'activity' | null;
  activity?: Activity | null;
}

interface EditingCell {
  activityId?: string;
  detailId?: string;
  field: string;
  value: string;
}

interface NewActivityForm {
  wbs: string;
  name: string;
  duration: number;
  start: string;
  responsible: string;
  status: "Not Started" | "In Progress" | "Completed";
  budget: number;
  revenue: number;
  resources: ActivityResource[];
}

interface LedgerFormState {
  date: string;
  description: string;
  type: "Income" | "Outcome";
  categoryId: string;
  subCategoryId: string;
  accountId: string;
  amount: number;
  activityId: string;
}

const EPS_ROW_HEIGHT_CLASS = "h-9";
const ACTIVITY_ROW_HEIGHT_CLASS = "h-9";

const PRETTY_TYPE: Record<EpsNodeType, string> = {
  enterprise: "Enterprise",
  business_unit: "Business Unit",
  portfolio: "Portfolio",
  company: "Company",
  project: "Project",
};

// ---------------------------------------------------------------------------
// ICONS
// ---------------------------------------------------------------------------
const IconEnterprise = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);

const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 7h5l2 3h13v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
  </svg>
);

const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 11.5 12 3l9 8.5" />
    <path d="M5 11v10h14V11" />
  </svg>
);

const IconProject = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h6M9 11h6M9 15h4" />
    <path d="M5 7V3M19 7V3" />
  </svg>
);

const IconGantt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="5" width="8" height="3" />
    <rect x="8" y="10" width="10" height="3" />
    <rect x="5" y="15" width="12" height="3" />
  </svg>
);

const IconAdd = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />
  </svg>
);

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconCreditCard = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    <path d="M2 10h20" />
    <path d="M6 15h4" />
  </svg>
);

const IconChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6" />
  </svg>
);

const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const IconCalculator = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <line x1="8" x2="8" y1="6" y2="8" />
    <line x1="16" x2="16" y1="6" y2="8" />
    <line x1="12" x2="12" y1="6" y2="8" />
    <line x1="12" x2="12" y1="12" y2="16" />
    <line x1="8" x2="8" y1="12" y2="16" />
    <line x1="16" x2="16" y1="12" y2="16" />
    <line x1="8" x2="16" y1="10" y2="10" />
    <line x1="8" x2="16" y1="18" y2="18" />
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.16 13.16 0 0 0 2 12s3 7 10 7a9.98 9.98 0 0 0 5-1.38" />
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10" />
    <path d="M18 20V4" />
    <path d="M6 20v-4" />
  </svg>
);

const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconTool = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconMarqueePlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeDasharray="3 2" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const IconFunction = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    <path d="M15 7h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </svg>
);

const IconPercent = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
    <path d="M17 11a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
    <path d="M19 5 5 19" />
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const ICONS: Record<EpsNodeType, React.ReactNode> = {
  enterprise: <IconEnterprise />,
  business_unit: <IconFolder />,
  portfolio: <IconFolder />,
  company: <IconHome />,
  project: <IconProject />,
};

const DEFAULT_BRRRR_FIELDS: Omit<ProjectDetail, 'id'>[] = [
  { variable: "Purchase Price", value: "0" },
  { variable: "ARV Estimate", value: "0" },
  { variable: "Rehab Cost", value: "0" },
  { variable: "Holding Cost", value: "0" },
  { variable: "Square Footage", value: "0" },
  { variable: "Bed/Bath", value: "" },
  { variable: "Property Taxes", value: "0" },
  { variable: "Insurance Cost", value: "0" },
];

const DEFAULT_CLOSING_COSTS = {
  purchase: [
    { code: "earnest_money", label: "Earnest Money Deposit" },
    { code: "escrow_fee", label: "Escrow Fee" },
    { code: "attorney_fee", label: "Attorney Fee" },
    { code: "prorated_taxes", label: "Prorated Taxes (Purchase)" },
    { code: "recording_fees", label: "Recording Fees" },
    { code: "survey", label: "Survey" },
    { code: "title_insurance", label: "Title Insurance" },
    { code: "appraisal", label: "Appraisal" },
    { code: "inspection", label: "Inspection" },
  ],
  sale: [
    { code: "real_estate_commission", label: "Real Estate Commission" },
    { code: "survey", label: "Survey" },
    { code: "concessions", label: "Concessions" },
    { code: "escrow_fee", label: "Escrow Fee" },
    { code: "attorney_fee", label: "Attorney Fee" },
    { code: "prorated_taxes", label: "Prorated Taxes (Sale)" },
    { code: "seller_repairs", label: "Seller Repairs" },
    { code: "staging", label: "Staging" },
  ],
} as const;

type DashboardMode =
  | "EPS"
  | "Activities"
  | "DebtService"
  | "Resources"
  | "Labor"
  | "RentRoll"
  | "Exports"
  | "Statements"
  | "Account"
  | "Users"
  | "Commits";

const UNDER_CONTRACT_DETAIL_FIELDS: Omit<ProjectDetail, 'id'>[] = [
  { variable: "Address", value: "" },
  { variable: "Under Contract For (days)", value: "0" },
  { variable: "Title Company Name", value: "" },
  { variable: "Earnest Money", value: "0" },
  { variable: "SQFT", value: "0" },
  { variable: "Purchase Price", value: "0" },
  { variable: "ARV Estimate", value: "0" },
  { variable: "ECIP (Estimate cost for renovation/repairs)", value: "0" },
];

const HIDE_WHEN_UNDER_CONTRACT = [
  "Title Company Name",
  "Address",
  "Under Contract For (days)",
  "Earnest Money",
  "SQFT",
  "ECIP (Estimate cost for renovation/repairs)",
  "Amount Under Contract",
];

// ---------------------------------------------------------------------------
// TREE HELPERS & CALCULATORS
// ---------------------------------------------------------------------------
function buildTree(nodes: EpsNode[]): EpsNode[] {
  const map = new Map<number, EpsNode>();
  const roots: EpsNode[] = [];

  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));

  map.forEach((node) => {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children!.push(node);
      } else {
        // orphan without known parent; surface at root so it remains visible
        roots.push(node);
      }
    }
  });

  return roots;
}

const findNode = (nodes: EpsNode[], id: number): EpsNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
};

const getNextId = (nodes: EpsNode[]): number => {
  const allIds: number[] = [];
  const collectIds = (n: EpsNode) => {
    allIds.push(n.id);
    n.children?.forEach(collectIds);
  };
  nodes.forEach(collectIds);
  const maxId = Math.max(0, ...allIds);
  return maxId + 1;
};

const getNextActivityId = (activities: Record<number, Activity[]>): string => {
  const allActivities = Object.values(activities).flat();
  const maxId = allActivities.reduce((max, a) => {
    const num = parseInt(a.id.replace('a', '').replace('A', '').replace('B', '').replace('C', ''));
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  return `A${(maxId + 10).toString().padStart(4, '0')}`;
};

const toNumber = (value: number | string) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(num) ? num : 0;
};

const calculateActivityActuals = (
  activityId: string,
  projectTransactions: Transaction[]
) => {
  const activityTransactions = projectTransactions.filter(
    (t) => t.activityId === activityId && t.type === "Outcome"
  );

  const actualLaborCost = activityTransactions
    .filter((t) => t.category === "Labor")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const actualMaterialCost = activityTransactions
    .filter((t) => t.category !== "Labor")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  return { actualLaborCost, actualMaterialCost };
};

const calculateProjectStats = (
  projectActivities: Activity[],
  projectTransactions: Transaction[]
) => {
  const totalActivities = projectActivities.length;

  const overallProgress = projectActivities.reduce((sum, a) => sum + a.pct, 0) /
    Math.max(totalActivities, 1);

  const projectedLabor = projectActivities.reduce(
    (sum, a) => sum + a.projectedLabor, 0
  );

  const projectedCost = projectActivities.reduce(
    (sum, a) => sum + a.projectedCost, 0
  );

  const outcomeTransactions = projectTransactions.filter(t => t.type === "Outcome");

  const actualLaborCost = outcomeTransactions
    .filter(t => t.category === "Labor")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const actualMaterialCost = outcomeTransactions
    .filter(t => t.category !== "Labor")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  return {
    totalActivities,
    overallProgress,
    projectedLabor,
    projectedCost,
    actualLaborCost,
    actualMaterialCost,
    totalActualCost: actualLaborCost + actualMaterialCost,
  };
};

const calculateFinancialKPIs = (
  projectActivities: Activity[],
  projectTransactions: Transaction[]
) => {
  const totalBudget = projectActivities.reduce((sum, a) => sum + a.budget, 0);

  const totalActivityRevenue = projectActivities.reduce((sum, a) => sum + a.revenue, 0);
  const totalIncomeTransactions = projectTransactions
    .filter(t => t.type === "Income")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);
  const totalRevenue = totalActivityRevenue + totalIncomeTransactions;

  const totalActualCost = projectTransactions
    .filter(t => t.type === "Outcome")
    .reduce((sum, t) => sum + toNumber(t.amount), 0);

  const profit = totalRevenue - totalActualCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const costVariance = totalBudget - totalActualCost;

  console.log(profit);

  return {
    totalBudget,
    totalRevenue,
    totalActualCost,
    profit,
    profitMargin,
    costVariance,
    projectedTotalCost: totalBudget
  };
};

const formatCurrency = (value: number) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (Number.isNaN(value)) return formatter.format(0);
  if (value < 0) return `(${formatter.format(Math.abs(value))})`;
  return formatter.format(value);
};

const formatCurrencyCents = (value: number) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (Number.isNaN(value)) return formatter.format(0);
  if (value < 0) return `(${formatter.format(Math.abs(value))})`;
  return formatter.format(value);
};

function getAddTarget(
  selected: EpsNode | null
): { type: EpsNodeType; parentId: number | null; label: string } {
  if (!selected) {
    return { type: "enterprise", parentId: null, label: "Add Enterprise" };
  }

  switch (selected.type) {
    case "enterprise":
      return { type: "business_unit", parentId: selected.id, label: "Add Business Unit" };
    case "business_unit":
      return { type: "portfolio", parentId: selected.id, label: "Add Portfolio" };
    case "portfolio":
      return { type: "company", parentId: selected.id, label: "Add Company" };
    case "company":
      return { type: "project", parentId: selected.id, label: "Add Project" };
    case "project":
      return { type: "project", parentId: selected.parentId, label: "Add Project" };
  }
}

// ---------------------------------------------------------------------------
// FORMULA ENGINE
// ---------------------------------------------------------------------------
const getTaxVariableMap = (taxRates: TaxRate[]) => {
  const map: Record<string, number> = {};
  taxRates.forEach((tr) => {
    const label = tr.state ? `${tr.county} (${tr.state}) Tax Rate` : `${tr.county} Tax Rate`;
    map[label] = tr.rate;
  });
  return map;
};

const extractVariables = (formula: string): string[] => {
  const vars = new Set<string>();
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(formula)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
};

const evaluateFormula = (
  formula: string,
  projectDetails: ProjectDetail[],
  customFormulas: CustomFormula[],
  additionalVariables: Record<string, number> = {},
  evaluatedFormulas: Set<string> = new Set()
): { value: number; error: string | null } => {
  try {
    const variableMap: Record<string, number> = {};

    projectDetails.forEach((detail) => {
      const numValue = parseFloat(detail.value);
      if (!isNaN(numValue)) {
        variableMap[detail.variable] = numValue;
      }
    });

    customFormulas.forEach((cf) => {
      if (evaluatedFormulas.has(cf.id)) {
        return;
      }

      if (formula.includes(`{${cf.name}}`)) {
        const newEvaluatedSet = new Set(evaluatedFormulas);
        newEvaluatedSet.add(cf.id);

        const result = evaluateFormula(
          cf.formula,
          projectDetails,
          customFormulas,
          additionalVariables,
          newEvaluatedSet
        );

        if (result.error === null) {
          variableMap[cf.name] = result.value;
        }
      }
    });

    Object.entries(additionalVariables).forEach(([key, value]) => {
      variableMap[key] = value;
    });

    let processedFormula = formula;
    const variablePattern = /\{([^}]+)\}/g;
    let match;

    while ((match = variablePattern.exec(formula)) !== null) {
      const varName = match[1];
      if (variableMap[varName] !== undefined) {
        processedFormula = processedFormula.replace(
          `{${varName}}`,
          variableMap[varName].toString()
        );
      } else {
        return { value: 0, error: `Variable "${varName}" not found` };
      }
    }

    const sanitized = processedFormula.replace(/[^0-9+\-*/().%\s]/g, '');
    const compact = processedFormula.replace(/\s/g, '');
    const sanitizedCompact = sanitized.replace(/\s/g, '');

    if (sanitizedCompact !== compact) {
      return { value: 0, error: "Invalid characters in formula" };
    }

    const calculate = new Function(`return (${sanitized})`);
    const result = calculate();

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return { value: 0, error: "Formula resulted in invalid number" };
    }

    return { value: result, error: null };
  } catch (err) {
    return { value: 0, error: `Evaluation error: ${(err as Error).message}` };
  }
};

const getAvailableVariables = (
  projectDetails: ProjectDetail[],
  customFormulas: CustomFormula[],
  taxRates: TaxRate[] = []
): { name: string; type: "detail" | "formula" | "tax"; value?: number }[] => {
  const variables: { name: string; type: "detail" | "formula" | "tax"; value?: number }[] = [];

  projectDetails.forEach((detail) => {
    const numValue = parseFloat(detail.value);
    variables.push({
      name: detail.variable,
      type: "detail",
      value: !isNaN(numValue) ? numValue : undefined,
    });
  });

  customFormulas.forEach((cf) => {
    variables.push({
      name: cf.name,
      type: "formula",
    });
  });

  taxRates.forEach((tr) => {
    const label = tr.state ? `${tr.county} (${tr.state}) Tax Rate` : `${tr.county} Tax Rate`;
    variables.push({
      name: label,
      type: "tax",
      value: tr.rate,
    });
  });

  return variables;
};

const calculateResourceCost = (
  activityResources: ActivityResource[],
  allResources: Resource[]
): number => {
  return activityResources.reduce((total, ar) => {
    const resource = allResources.find(r => r.id === ar.resourceId);
    if (!resource) return total;
    return total + (resource.rate * ar.quantity);
  }, 0);
};

// ---------------------------------------------------------------------------
// DATE HELPERS
// ---------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;
const getCentralDateParts = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
};
const getCentralTodayMs = () => {
  const { year, month, day } = getCentralDateParts();
  // Use midday UTC for the given local/Central date to avoid timezone rollovers
  return Date.UTC(year, month - 1, day, 12);
};
const toDateMs = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  // Use midday UTC to avoid shifting a day due to TZ differences
  return Date.UTC(year, (month || 1) - 1, day || 1, 12);
};
const toDateString = (ms: number) => {
  return new Date(ms).toISOString().slice(0, 10);
};
const getMonthKey = (date: string) => {
  const ms = toDateMs(date);
  if (!Number.isFinite(ms)) {
    return getMonthKey(toDateString(getCentralTodayMs()));
  }
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const nextMonthKey = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
};
const monthKeyCompare = (a: string, b: string) => {
  if (a === b) return 0;
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  if (ay === by) return am - bm;
  return ay - by;
};
const monthKeySequence = (startKey: string, endKey: string) => {
  const seq: string[] = [];
  let current = startKey;
  while (monthKeyCompare(current, endKey) <= 0) {
    seq.push(current);
    current = nextMonthKey(current);
  }
  return seq;
};
const parseMonthDay = (md: string) => {
  const [m, d] = md.split("-").map(Number);
  return { month: m || 1, day: d || 1 };
};
const getMonthDayDate = (yearMonth: string, md: string) => {
  const [y, m] = yearMonth.split("-").map(Number);
  const { day } = parseMonthDay(md);
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const csvEscape = (val: string | number) => {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "sheet";
const getWeekStart = (ms: number) => {
  const d = new Date(ms);
  const day = d.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // convert to Mon=0
  return toDateString(ms - diff * DAY_MS);
};

// ---------------------------------------------------------------------------
// CONTEXT MENU COMPONENT
// ---------------------------------------------------------------------------
interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onAdd: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onAddResources?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  onClose,
  onAdd,
  onRename,
  onDelete,
  onDuplicate,
  onCut,
  onCopy,
  onPaste,
  onAddResources
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const menuItems = state.type === 'eps'
    ? (
      state.node
        ? [
            { label: getAddTarget(state.node).label.replace("Add ", "Add "), icon: <IconAdd />, action: onAdd, divider: false },
            { label: "Rename", icon: <IconEdit />, action: onRename, divider: false },
            { label: "Duplicate", icon: <IconCopy />, action: onDuplicate, divider: true },
            { label: "Cut", icon: null, action: onCut, divider: false },
            { label: "Copy", icon: <IconCopy />, action: onCopy, divider: false },
            { label: "Paste", icon: null, action: onPaste, divider: true, disabled: true },
            { label: "Delete", icon: <IconDelete />, action: onDelete, divider: false, danger: true },
          ]
        : [
            { label: getAddTarget(null).label.replace("Add ", "Add "), icon: <IconAdd />, action: onAdd, divider: false },
          ]
    )
    : [
        { label: "Edit Activity", icon: <IconEdit />, action: onRename, divider: false },
        { label: "Manage Resources", icon: <IconUsers />, action: onAddResources, divider: false },
        { label: "Duplicate", icon: <IconCopy />, action: onDuplicate, divider: true },
        { label: "Delete", icon: <IconDelete />, action: onDelete, divider: false, danger: true },
      ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-lg border border-slate-300 bg-white py-1 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
    >
      {menuItems.map((item, idx) => (
        <React.Fragment key={idx}>
          {item.divider && idx > 0 && (
            <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
          )}
          <button
            onClick={() => {
              if (item.action) item.action();
              onClose();
            }}
            disabled={item.disabled}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              item.danger
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                : item.disabled
                ? "text-slate-400 cursor-not-allowed dark:text-slate-600"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span className="w-4">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// MODAL COMPONENTS
// ---------------------------------------------------------------------------
interface EditModalProps {
  mode: "add" | "rename" | null;
  title: string;
  label: string;
  value: string;
  open: boolean;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  mode,
  title,
  label,
  value,
  open,
  onChange,
  onCancel,
  onConfirm,
}) => {
  if (!open || !mode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-1">
          {title}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {mode === "add"
            ? "Create a new node in your Enterprise Project Structure."
            : "Update the display name for this EPS node."}
        </p>

        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
          {label}
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CUSTOM FORMULA DIALOG
// ---------------------------------------------------------------------------
interface CustomFormulaDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (formula: CustomFormula) => void;
  onSavePreset?: (formula: CustomFormula) => void;
  editingFormula: CustomFormula | null;
  projectDetails: ProjectDetail[];
  existingFormulas: CustomFormula[];
  taxRates: TaxRate[];
}

const CustomFormulaDialog: React.FC<CustomFormulaDialogProps> = ({
  open,
  onClose,
  onSave,
  onSavePreset,
  editingFormula,
  projectDetails,
  existingFormulas,
  taxRates,
}) => {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [description, setDescription] = useState("");
  const [resultType, setResultType] = useState<"currency" | "percentage" | "number">("currency");
  const [previewResult, setPreviewResult] = useState<{ value: number; error: string | null }>({ value: 0, error: null });
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const formulaInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingFormula) {
      setName(editingFormula.name);
      setFormula(editingFormula.formula);
      setDescription(editingFormula.description || "");
      setResultType(editingFormula.resultType);
      setSaveAsPreset(false);
    } else {
      setName("");
      setFormula("");
      setDescription("");
      setResultType("currency");
      setSaveAsPreset(false);
    }
  }, [editingFormula, open]);

  useEffect(() => {
    if (formula) {
      const result = evaluateFormula(
        formula,
        projectDetails,
        existingFormulas.filter(f => f.id !== editingFormula?.id),
        getTaxVariableMap(taxRates)
      );
      setPreviewResult(result);
    } else {
      setPreviewResult({ value: 0, error: null });
    }
  }, [formula, projectDetails, existingFormulas, editingFormula, taxRates]);

  const availableVariables = getAvailableVariables(
    projectDetails,
    existingFormulas.filter(f => f.id !== editingFormula?.id),
    taxRates
  );

  const insertVariable = (varName: string) => {
    const target = formulaInputRef.current;
    const token = `{${varName}}`;
    if (target) {
      const start = target.selectionStart ?? formula.length;
      const end = target.selectionEnd ?? formula.length;
      const newValue = formula.slice(0, start) + token + formula.slice(end);
      setFormula(newValue);
      requestAnimationFrame(() => {
        const pos = start + token.length;
        target.focus();
        target.setSelectionRange(pos, pos);
      });
    } else {
      setFormula(prev => prev + token);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !formula.trim()) return;

    const newFormula: CustomFormula = {
      id: editingFormula?.id || `CF${Date.now()}`,
      name: name.trim(),
      formula: formula.trim(),
      description: description.trim() || undefined,
      resultType,
    };

    onSave(newFormula);
    if (saveAsPreset && onSavePreset) {
      onSavePreset({ ...newFormula, id: "" });
    }
    onClose();
  };

  const formatPreviewValue = (value: number) => {
    switch (resultType) {
      case "currency":
        return formatCurrency(value);
      case "percentage":
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              {editingFormula ? "Edit Custom Formula" : "Create Custom Formula"}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <IconX />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create formulas using project variables and other custom formulas.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Formula Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Total Investment"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Result Type
              </label>
              <select
                value={resultType}
                onChange={(e) => setResultType(e.target.value as "currency" | "percentage" | "number")}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="currency">Currency ($)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this formula calculates"
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Formula <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={formulaInputRef}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g., {Purchase Price} + {Rehab Cost} + {Holding Cost}"
              rows={3}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 font-mono"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Use {"{Variable Name}"} to reference variables. Supports: + - * / ( )
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Available Variables (Click to Insert)
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded p-3 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-900">
              <div className="mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Project Details</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableVariables.filter(v => v.type === "detail").map((v) => (
                    <button
                      key={v.name}
                      onClick={() => insertVariable(v.name)}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                      title={v.value !== undefined ? `Current value: ${v.value}` : "No numeric value"}
                    >
                      {v.name}
                      {v.value !== undefined && <span className="ml-1 opacity-60">({v.value})</span>}
                    </button>
                  ))}
                </div>
              </div>
              {availableVariables.filter(v => v.type === "formula").length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Custom Formulas</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableVariables.filter(v => v.type === "formula").map((v) => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.name)}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                  </div>
              )}
              {availableVariables.filter(v => v.type === "tax").length > 0 && (
                <div className="mt-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tax Rates</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {availableVariables.filter(v => v.type === "tax").map((v) => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.name)}
                        className="px-2 py-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 rounded hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                        title={v.value !== undefined ? `${v.value}%` : undefined}
                      >
                        {v.name}
                        {v.value !== undefined && <span className="ml-1 opacity-60">({v.value}%)</span>}
                      </button>
                    ))}
                  </div>
                  </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="savePreset"
              type="checkbox"
              checked={saveAsPreset}
              onChange={(e) => setSaveAsPreset(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded"
            />
            <label htmlFor="savePreset" className="text-sm text-slate-600 dark:text-slate-300">
              Save as preset for use across projects
            </label>
          </div>

          <div className={`p-4 rounded-lg ${previewResult.error ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Preview Result:</span>
              {previewResult.error ? (
                <span className="text-sm text-red-600 dark:text-red-400">{previewResult.error}</span>
              ) : (
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatPreviewValue(previewResult.value)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !formula.trim() || !!previewResult.error}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingFormula ? "Update Formula" : "Create Formula"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RESOURCE ASSIGNMENT DIALOG
// ---------------------------------------------------------------------------
interface ResourceAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  activity: Activity | null;
  allResources: Resource[];
  onSave: (activityId: string, resources: ActivityResource[]) => void;
}

const ResourceAssignmentDialog: React.FC<ResourceAssignmentDialogProps> = ({
  open,
  onClose,
  activity,
  allResources,
  onSave,
}) => {
  const [assignedResources, setAssignedResources] = useState<ActivityResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (activity) {
      setAssignedResources([...activity.resources]);
    }
  }, [activity, open]);

  const handleAddResource = () => {
    if (!selectedResourceId || quantity <= 0) return;

    const existing = assignedResources.find(r => r.resourceId === selectedResourceId);
    if (existing) {
      setAssignedResources(prev =>
        prev.map(r => r.resourceId === selectedResourceId ? { ...r, quantity: r.quantity + quantity } : r)
      );
    } else {
      setAssignedResources(prev => [...prev, { resourceId: selectedResourceId, quantity }]);
    }
    setSelectedResourceId("");
    setQuantity(1);
  };

  const handleRemoveResource = (resourceId: string) => {
    setAssignedResources(prev => prev.filter(r => r.resourceId !== resourceId));
  };

  const handleUpdateQuantity = (resourceId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveResource(resourceId);
      return;
    }
    setAssignedResources(prev =>
      prev.map(r => r.resourceId === resourceId ? { ...r, quantity: newQuantity } : r)
    );
  };

  const handleSave = () => {
    if (activity) {
      onSave(activity.id, assignedResources);
    }
    onClose();
  };

  const getResourceById = (id: string) => allResources.find(r => r.id === id);

  const totalResourceCost = calculateResourceCost(assignedResources, allResources);

  if (!open || !activity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Manage Resources
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <IconX />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Activity: <span className="font-medium text-slate-700 dark:text-slate-300">{activity.name}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Add Resource
              </label>
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              >
                <option value="">Select a resource...</option>
                {allResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}) - {formatCurrency(r.rate)}/{r.rateUnit}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
            <button
              onClick={handleAddResource}
              disabled={!selectedResourceId || quantity <= 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-2 text-left">Resource</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-center">Quantity</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedResources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No resources assigned to this activity.
                    </td>
                  </tr>
                ) : (
                  assignedResources.map((ar) => {
                    const resource = getResourceById(ar.resourceId);
                    if (!resource) return null;
                    const totalCost = resource.rate * ar.quantity;
                    return (
                      <tr key={ar.resourceId} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                          {resource.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            resource.type === 'Labor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            resource.type === 'Equipment' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            resource.type === 'Material' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}>
                            {resource.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(resource.rate)}/{resource.rateUnit}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={ar.quantity}
                            onChange={(e) => handleUpdateQuantity(ar.resourceId, parseFloat(e.target.value) || 0)}
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-center text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(totalCost)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => handleRemoveResource(ar.resourceId)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            title="Remove resource"
                          >
                            <IconDelete />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {assignedResources.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-900">
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">
                      Total Resource Cost:
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 text-right">
                      {formatCurrency(totalResourceCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Resources
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// RESOURCE MANAGEMENT DIALOG (For creating/editing resources)
// ---------------------------------------------------------------------------
interface ResourceManagementDialogProps {
  open: boolean;
  onClose: () => void;
  resources: Resource[];
  onSave: (resources: Resource[]) => void;
}

const ResourceManagementDialog: React.FC<ResourceManagementDialogProps> = ({
  open,
  onClose,
  resources,
  onSave,
}) => {
  const [localResources, setLocalResources] = useState<Resource[]>([]);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Resource["type"]>("Labor");
  const [formRate, setFormRate] = useState(0);
  const [formRateUnit, setFormRateUnit] = useState<Resource["rateUnit"]>("hour");
  const [formAvailability, setFormAvailability] = useState<number | undefined>(8);

  useEffect(() => {
    setLocalResources([...resources]);
  }, [resources, open]);

  const resetForm = () => {
    setFormName("");
    setFormType("Labor");
    setFormRate(0);
    setFormRateUnit("hour");
    setFormAvailability(8);
    setEditingResource(null);
    setShowForm(false);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setFormName(resource.name);
    setFormType(resource.type);
    setFormRate(resource.rate);
    setFormRateUnit(resource.rateUnit);
    setFormAvailability(resource.availability);
    setShowForm(true);
  };

  const handleSaveResource = () => {
    if (!formName.trim() || formRate <= 0) return;

    const newResource: Resource = {
      id: editingResource?.id || `R${Date.now()}`,
      name: formName.trim(),
      type: formType,
      rate: formRate,
      rateUnit: formRateUnit,
      availability: formType === "Labor" ? formAvailability : undefined,
    };

    if (editingResource) {
      setLocalResources(prev => prev.map(r => r.id === editingResource.id ? newResource : r));
    } else {
      setLocalResources(prev => [...prev, newResource]);
    }

    resetForm();
  };

  const handleDeleteResource = (id: string) => {
    setLocalResources(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveAll = () => {
    onSave(localResources);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Manage Resources
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              <IconX />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create and manage resources available for assignment to activities.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showForm ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {editingResource ? "Edit Resource" : "Add New Resource"}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Resource name"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as Resource["type"])}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  >
                    <option value="Labor">Labor</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Material">Material</option>
                    <option value="Subcontractor">Subcontractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Rate Unit</label>
                  <select
                    value={formRateUnit}
                    onChange={(e) => setFormRateUnit(e.target.value as Resource["rateUnit"])}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="day">Per Day</option>
                    <option value="unit">Per Unit</option>
                    <option value="lump">Lump Sum</option>
                  </select>
                </div>
                {formType === "Labor" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Availability (hrs/day)</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={formAvailability || ""}
                      onChange={(e) => setFormAvailability(parseFloat(e.target.value) || undefined)}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={resetForm}
                  className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveResource}
                  disabled={!formName.trim() || formRate <= 0}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingResource ? "Update" : "Add"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <IconPlus /> Add New Resource
            </button>
          )}

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-center">Availability</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {localResources.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.type === 'Labor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        r.type === 'Equipment' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                        r.type === 'Material' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(r.rate)}/{r.rateUnit}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-slate-600 dark:text-slate-400">
                      {r.availability ? `${r.availability} hrs/day` : "-"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => handleEditResource(r)}
                        className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded mr-1"
                        title="Edit"
                      >
                        <IconEdit />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(r.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <IconDelete />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// NEW ACTIVITY DIALOG (Updated with Resources)
// ---------------------------------------------------------------------------
interface NewActivityDialogProps {
  open: boolean;
  projectId: number;
  existingActivities: Activity[];
  allResources: Resource[];
  onClose: () => void;
  onConfirm: (activity: Activity) => void;
  initialStart?: string | null;
  initialDuration?: number | null;
}

const NewActivityDialog: React.FC<NewActivityDialogProps> = ({
  open,
  projectId,
  existingActivities,
  allResources,
  onClose,
  onConfirm,
  initialStart,
  initialDuration,
}) => {
  const [form, setForm] = useState<NewActivityForm>({
    wbs: "",
    name: "",
    duration: 1,
    start: new Date().toISOString().split('T')[0],
    responsible: "",
    status: "Not Started",
    budget: 0,
    revenue: 0,
    resources: [],
  });

  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [resourceQuantity, setResourceQuantity] = useState<number>(1);

  useEffect(() => {
    if (open) {
      const startValue = initialStart || new Date().toISOString().split('T')[0];
      const durationValue = initialDuration && initialDuration > 0 ? Math.round(initialDuration) : 1;
      setForm({
        wbs: "",
        name: "",
        duration: durationValue,
        start: startValue,
        responsible: "",
        status: "Not Started",
        budget: 0,
        revenue: 0,
        resources: [],
      });
      setSelectedResourceId("");
      setResourceQuantity(1);
    }
  }, [open, initialDuration, initialStart]);

  const generateActivityId = () => {
    const projectActivities = existingActivities;
    const maxId = projectActivities
      .map(a => parseInt(a.id.replace(/^[A-Z]/, '')))
      .filter(id => !isNaN(id))
      .sort((a, b) => b - a)[0] || 999;

    return `A${(maxId + 10).toString().padStart(4, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof NewActivityForm) => {
    const value = parseFloat(e.target.value);
    setForm((prev) => ({ ...prev, [field]: isNaN(value) ? 0 : value }));
  };

  const handleAddResource = () => {
    if (!selectedResourceId || resourceQuantity <= 0) return;

    const existing = form.resources.find(r => r.resourceId === selectedResourceId);
    if (existing) {
      setForm(prev => ({
        ...prev,
        resources: prev.resources.map(r =>
          r.resourceId === selectedResourceId
            ? { ...r, quantity: r.quantity + resourceQuantity }
            : r
        )
      }));
    } else {
      setForm(prev => ({
        ...prev,
        resources: [...prev.resources, { resourceId: selectedResourceId, quantity: resourceQuantity }]
      }));
    }
    setSelectedResourceId("");
    setResourceQuantity(1);
  };

  const handleRemoveResource = (resourceId: string) => {
    setForm(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.resourceId !== resourceId)
    }));
  };

  const getResourceById = (id: string) => allResources.find(r => r.id === id);

  const totalResourceCost = calculateResourceCost(form.resources, allResources);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.duration <= 0) return;

    const startDate = new Date(form.start);
    const finishDate = new Date(startDate);
    finishDate.setDate(finishDate.getDate() + form.duration - 1);

    const newActivity: Activity = {
      ...form,
      id: generateActivityId(),
      duration: form.duration,
      projectedLabor: 0,
      projectedCost: totalResourceCost,
      pct: 0,
      finish: finishDate.toISOString().split('T')[0],
      resources: form.resources,
    };

    onConfirm(newActivity);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-1">
            Create New Activity
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Adding an activity to Project ID: {projectId}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Activity Name <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Excavation and Grading"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                WBS Code
              </label>
              <input
                name="wbs"
                type="text"
                value={form.wbs}
                onChange={handleChange}
                placeholder="1.1.2"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Start Date
              </label>
              <input
                name="start"
                type="date"
                value={form.start}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Duration (Days)
              </label>
              <input
                name="duration"
                type="number"
                min="1"
                value={form.duration}
                onChange={(e) => handleNumericChange(e, 'duration')}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Responsible
              </label>
              <input
                name="responsible"
                type="text"
                value={form.responsible}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Budgeted Cost ($)
              </label>
              <input
                name="budget"
                type="number"
                min="0"
                value={form.budget}
                onChange={(e) => handleNumericChange(e, 'budget')}
                placeholder="0"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Associated Revenue ($)
              </label>
              <input
                name="revenue"
                type="number"
                min="0"
                value={form.revenue}
                onChange={(e) => handleNumericChange(e, 'revenue')}
                placeholder="0"
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
              />
            </div>
          </div>

          {/* Resources Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <IconUsers /> Assign Resources
            </h3>

            <div className="flex gap-2 items-end mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Resource
                </label>
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">Select resource...</option>
                  {allResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {formatCurrency(r.rate)}/{r.rateUnit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={resourceQuantity}
                  onChange={(e) => setResourceQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                />
              </div>
              <button
                type="button"
                onClick={handleAddResource}
                disabled={!selectedResourceId || resourceQuantity <= 0}
                className="rounded bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {form.resources.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr className="text-xs font-medium uppercase text-slate-600 dark:text-slate-300">
                      <th className="px-3 py-1.5 text-left">Resource</th>
                      <th className="px-3 py-1.5 text-center">Qty</th>
                      <th className="px-3 py-1.5 text-right">Cost</th>
                      <th className="px-3 py-1.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.resources.map((ar) => {
                      const resource = getResourceById(ar.resourceId);
                      if (!resource) return null;
                      return (
                        <tr key={ar.resourceId} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="px-3 py-1.5 text-slate-800 dark:text-slate-200">{resource.name}</td>
                          <td className="px-3 py-1.5 text-center text-slate-600 dark:text-slate-400">{ar.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-slate-600 dark:text-slate-400">
                            {formatCurrency(resource.rate * ar.quantity)}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveResource(ar.resourceId)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <IconX />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900">
                    <tr className="border-t border-slate-300 dark:border-slate-600">
                      <td colSpan={2} className="px-3 py-1.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        Total:
                      </td>
                      <td className="px-3 py-1.5 text-right font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(totalResourceCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Activity ID will be auto-generated: <span className="font-mono font-bold">{generateActivityId()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.name}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PROJECT LEDGER COMPONENT
// ---------------------------------------------------------------------------
interface ProjectLedgerProps {
  projectId: number;
  activities: Activity[];
  transactions: Transaction[];
  categories: LedgerCategory[];
  accounts: LedgerAccount[];
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  draftActivityId?: string | null;
  setDraftActivityId?: (id: string | null) => void;
  onExpand?: () => void;
  displayMode?: "dock" | "inline";
  containerClassName?: string;
}

const ProjectLedger: React.FC<ProjectLedgerProps> = ({
  projectId,
  activities,
  transactions,
  categories,
  accounts,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  isOpen,
  setIsOpen,
  draftActivityId,
  setDraftActivityId,
  displayMode = "dock",
  containerClassName,
}) => {
  const categoryOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    categories
      .filter((cat) => !cat.parentId)
      .forEach((cat) => {
        options.set(cat.name, { id: String(cat.id), name: cat.name });
      });
    transactions.forEach((t) => {
      if (!t.category) return;
      if (!options.has(t.category)) {
        options.set(t.category, { id: `legacy:${t.category}`, name: t.category });
      }
    });
    if (options.size === 0) {
      ["Labor", "Materials", "Equipment", "Client Payment", "Other"].forEach((name) => {
        options.set(name, { id: `legacy:${name}`, name });
      });
    }
    return Array.from(options.values());
  }, [categories, transactions]);

  const accountOptions = useMemo(() => {
    const options = new Map<string, { id: string; name: string }>();
    accounts.forEach((acct) => {
      options.set(acct.name, { id: String(acct.id), name: acct.name });
    });
    transactions.forEach((t) => {
      if (!t.accountName) return;
      if (!options.has(t.accountName)) {
        options.set(t.accountName, { id: `legacy-acct:${t.accountName}`, name: t.accountName });
      }
    });
    return Array.from(options.values());
  }, [accounts, transactions]);

  const [form, setForm] = useState<LedgerFormState>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "Outcome",
    categoryId: categoryOptions[0]?.id || "",
    subCategoryId: "",
    accountId: accountOptions[0]?.id || "",
    amount: 0,
    activityId: "",
  });
  const getSubCategoryOptionsForCategory = useCallback((categoryId: string) => {
    if (!categoryId) return [];
    const selectedCategoryName =
      categoryOptions.find((opt) => opt.id === categoryId)?.name ||
      categoryId.replace(/^legacy:/, "");
    const options = new Map<string, { id: string; name: string }>();
    categories
      .filter((cat) => cat.parentId && String(cat.parentId) === categoryId)
      .forEach((cat) => {
        options.set(cat.name, { id: String(cat.id), name: cat.name });
      });
    transactions.forEach((t) => {
      if (t.category !== selectedCategoryName || !t.subCategory) return;
      if (!options.has(t.subCategory)) {
        options.set(t.subCategory, { id: `legacy-sub:${t.subCategory}`, name: t.subCategory });
      }
    });
    return Array.from(options.values());
  }, [categories, categoryOptions, transactions]);

  const subCategoryOptions = useMemo(
    () => getSubCategoryOptionsForCategory(form.categoryId),
    [form.categoryId, getSubCategoryOptionsForCategory]
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkSubCategoryId, setBulkSubCategoryId] = useState<string>("");
  const [bulkAccountId, setBulkAccountId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const isInline = displayMode === "inline";
  const effectiveOpen = isInline ? true : isOpen;

  const bulkSubCategoryOptions = useMemo(
    () => getSubCategoryOptionsForCategory(bulkCategoryId),
    [bulkCategoryId, getSubCategoryOptionsForCategory]
  );

  useEffect(() => {
    if (!effectiveOpen) {
      setIsExpanded(false);
    }
  }, [effectiveOpen]);

  useEffect(() => {
    if (draftActivityId) {
      setForm(prev => ({ ...prev, activityId: draftActivityId }));
    }
  }, [draftActivityId]);

  useEffect(() => {
    setForm((prev) => {
      if (categoryOptions.some((cat) => cat.id === prev.categoryId)) return prev;
      return { ...prev, categoryId: categoryOptions[0]?.id || "", subCategoryId: "" };
    });
  }, [categoryOptions]);

  useEffect(() => {
    if (!form.subCategoryId) return;
    if (subCategoryOptions.some((opt) => opt.id === form.subCategoryId)) return;
    setForm((prev) => ({ ...prev, subCategoryId: "" }));
  }, [form.subCategoryId, subCategoryOptions]);

  useEffect(() => {
    if (!bulkSubCategoryId) return;
    if (bulkSubCategoryOptions.some((opt) => opt.id === bulkSubCategoryId)) return;
    setBulkSubCategoryId("");
  }, [bulkSubCategoryId, bulkSubCategoryOptions]);

  useEffect(() => {
    if (selectedTransactionIds.size === 0) return;
    const validIds = new Set(transactions.map((t) => t.id));
    let changed = false;
    const next = new Set<string>();
    selectedTransactionIds.forEach((id) => {
      if (validIds.has(id)) {
        next.add(id);
      } else {
        changed = true;
      }
    });
    if (changed) setSelectedTransactionIds(next);
  }, [transactions, selectedTransactionIds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const parsed = parseFloat(value);
      setForm((prev) => ({ ...prev, amount: Number.isFinite(parsed) ? parsed : 0 }));
      return;
    }
    if (name === "categoryId") {
      setForm((prev) => ({ ...prev, categoryId: value, subCategoryId: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resolveCategoryPayloadForIds = (categoryId: string, subCategoryId: string) => {
    const selectedCategory = categoryOptions.find((opt) => opt.id === categoryId);
    const resolvedCategoryName = selectedCategory?.name || categoryId.replace(/^legacy:/, "");
    const resolvedCategoryId = selectedCategory && !selectedCategory.id.startsWith("legacy:") ? selectedCategory.id : undefined;

    const bulkOptions = getSubCategoryOptionsForCategory(categoryId);
    const selectedSubCategory = bulkOptions.find((opt) => opt.id === subCategoryId);
    const resolvedSubCategoryName = selectedSubCategory?.name || subCategoryId.replace(/^legacy-sub:/, "");
    const resolvedSubCategoryId = selectedSubCategory && !selectedSubCategory.id.startsWith("legacy-sub:") ? selectedSubCategory.id : undefined;

    return {
      categoryId: resolvedCategoryId,
      category: resolvedCategoryName,
      subCategoryId: resolvedSubCategoryId,
      subCategory: resolvedSubCategoryId ? resolvedSubCategoryName : (subCategoryId ? resolvedSubCategoryName : undefined),
    };
  };

  const resolveCategoryPayload = (categoryId: string, subCategoryId: string) => {
    const selectedCategory = categoryOptions.find((opt) => opt.id === categoryId);
    const resolvedCategoryName = selectedCategory?.name || categoryId.replace(/^legacy:/, "");
    const resolvedCategoryId = selectedCategory && !selectedCategory.id.startsWith("legacy:") ? selectedCategory.id : undefined;

    const selectedSubCategory = subCategoryOptions.find((opt) => opt.id === subCategoryId);
    const resolvedSubCategoryName = selectedSubCategory?.name || subCategoryId.replace(/^legacy-sub:/, "");
    const resolvedSubCategoryId = selectedSubCategory && !selectedSubCategory.id.startsWith("legacy-sub:") ? selectedSubCategory.id : undefined;

    return {
      categoryId: resolvedCategoryId,
      category: resolvedCategoryName,
      subCategoryId: resolvedSubCategoryId,
      subCategory: resolvedSubCategoryId ? resolvedSubCategoryName : (subCategoryId ? resolvedSubCategoryName : undefined),
    };
  };

  const resolveAccountPayload = (accountId: string) => {
    if (!accountId) return { accountId: undefined, accountName: undefined };
    const selectedAccount = accountOptions.find((opt) => opt.id === accountId);
    const resolvedName = selectedAccount?.name || accountId.replace(/^legacy-acct:/, "");
    const resolvedId = selectedAccount && !selectedAccount.id.startsWith("legacy-acct:") ? selectedAccount.id : undefined;
    return {
      accountId: resolvedId,
      accountName: resolvedName,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = toNumber(form.amount);
    if (!form.description || amountValue <= 0 || !form.date) return;
    const resolvedCategory = resolveCategoryPayload(form.categoryId, form.subCategoryId);
    const resolvedAccount = resolveAccountPayload(form.accountId);

    if (selectedTransactionId) {
      onUpdateTransaction({
        id: selectedTransactionId,
        ...form,
        amount: amountValue,
        ...resolvedCategory,
        ...resolvedAccount,
        activityId: form.activityId === 'project-level' ? undefined : form.activityId,
      });
    } else {
      onAddTransaction({
        ...form,
        amount: amountValue,
        ...resolvedCategory,
        ...resolvedAccount,
        activityId: form.activityId === 'project-level' ? undefined : form.activityId,
      });
    }

    setForm((prev) => ({
      ...prev,
      description: "",
      amount: 0,
      activityId: "",
      subCategoryId: "",
    }));
    setSelectedTransactionId(null);
    if (setDraftActivityId) setDraftActivityId(null);
  };

  const activityOptions = activities.map(a => ({ id: a.id, name: `${a.wbs} - ${a.name}` }));
  const resolveCategoryName = (transaction: Transaction) => {
    if (transaction.categoryId) {
      const match = categories.find((cat) => String(cat.id) === transaction.categoryId);
      if (match) return match.name;
    }
    return transaction.category;
  };
  const resolveSubCategoryName = (transaction: Transaction) => {
    if (transaction.subCategoryId) {
      const match = categories.find((cat) => String(cat.id) === transaction.subCategoryId);
      if (match) return match.name;
    }
    return transaction.subCategory;
  };
  const resolveAccountName = (transaction: Transaction) => {
    if (transaction.accountId) {
      const match = accounts.find((acct) => String(acct.id) === transaction.accountId);
      if (match) return match.name;
    }
    return transaction.accountName || "";
  };

  const allTransactionsSelected = transactions.length > 0 && selectedTransactionIds.size === transactions.length;
  const someTransactionsSelected = selectedTransactionIds.size > 0 && !allTransactionsSelected;
  const toggleSelectAllTransactions = () => {
    if (allTransactionsSelected) {
      setSelectedTransactionIds(new Set());
      return;
    }
    setSelectedTransactionIds(new Set(transactions.map((t) => t.id)));
  };
  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkUpdate = () => {
    if (selectedTransactionIds.size === 0) return;
    if (!bulkCategoryId && !bulkAccountId) return;
    const resolvedCategory = bulkCategoryId ? resolveCategoryPayloadForIds(bulkCategoryId, bulkSubCategoryId) : null;
    const resolvedAccount = bulkAccountId ? resolveAccountPayload(bulkAccountId) : null;
    selectedTransactionIds.forEach((id) => {
      const transaction = transactions.find((t) => t.id === id);
      if (!transaction) return;
      onUpdateTransaction({
        ...transaction,
        amount: toNumber(transaction.amount),
        ...(resolvedCategory || {}),
        ...(resolvedAccount || {}),
      });
    });
    setSelectedTransactionIds(new Set());
  };

  const expandedTop = "top-[120px]";
  const expandedBodyHeight = "calc(100vh - 120px - 44px)"; // ribbon offset minus header height
  const containerClasses = isInline
    ? "rounded-lg border border-slate-300 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col h-full"
    : isExpanded && isOpen
      ? `fixed inset-x-0 ${expandedTop} bottom-0 z-30`
      : "relative -mt-px";
  const targetMaxHeight = isExpanded ? expandedBodyHeight : "16rem";
  const targetHeight = isExpanded ? expandedBodyHeight : "16rem";
  const bodyStyle: React.CSSProperties | undefined = isInline ? undefined : {
    maxHeight: effectiveOpen ? targetMaxHeight : "0px",
    height: effectiveOpen ? targetHeight : "0px",
    opacity: effectiveOpen ? 1 : 0,
  };
  const bodyClasses = isInline
    ? "flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900"
    : "flex overflow-hidden bg-white dark:bg-slate-900 transition-[max-height,height,opacity] duration-400 ease-in-out";
  const defaultRootClasses = isInline
    ? containerClasses
    : `border-t border-slate-300 dark:border-slate-700 ${containerClasses}`;
  const rootClasses = containerClassName ? containerClassName : defaultRootClasses;

  return (
    <div data-project-id={projectId} className={rootClasses}>
      <div
        className={`flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 ${isInline ? "" : "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"}`}
        onClick={isInline ? undefined : () => setIsOpen(!isOpen)}
      >
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="4" rx="1" />
            <path d="M12 10v14" />
            <path d="M17 10h1c1 0 2 1 2 2v8c0 1-1 2-2 2H6c-1 0-2-1-2-2v-8c0-1 1-2 2-2h1" />
          </svg>
          Project Ledger ({transactions.length} Transactions)
        </h4>
        <div className="flex items-center gap-2">
          {!isInline && isOpen && (
            <button
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? "Shrink" : "Expand"}
            </button>
          )}
          {!isInline && (isOpen ? <IconChevronUp /> : <IconChevronDown />)}
        </div>
      </div>

      <div className={`overflow-hidden ${bodyClasses}`} style={bodyStyle} aria-hidden={!effectiveOpen}>
        <div className="flex-1 overflow-y-auto border-r border-slate-300 dark:border-slate-700">
          <table className="min-w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-xs font-medium uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allTransactionsSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someTransactionsSelected;
                      }
                    }}
                    onChange={toggleSelectAllTransactions}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                    aria-label="Select all transactions"
                  />
                </th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-left w-24">Activity</th>
                <th className="px-3 py-2 text-right w-24">Amount</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTransactionIds.has(t.id)}
                      onChange={() => toggleTransactionSelection(t.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      aria-label={`Select transaction ${t.id}`}
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {toDateString(toDateMs(t.date))}
                  </td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{t.description}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate">
                    <div className="flex flex-col">
                      <span>{resolveCategoryName(t)}</span>
                      {resolveSubCategoryName(t) && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {resolveSubCategoryName(t)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate">
                    {resolveAccountName(t) || "-"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {t.activityId || "-"}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${t.type === "Income" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                    {t.type === "Income" ? "+" : "-"} {formatCurrencyCents(toNumber(t.amount))}
                  </td>
                  <td className="px-3 py-2 text-right space-x-1">
                    <button
                      onClick={() => {
                        setSelectedTransactionId(t.id);
                        const categoryId =
                          t.categoryId ||
                          categoryOptions.find((opt) => opt.name === t.category)?.id ||
                          "";
                        const subCategoryOptionsForEdit = getSubCategoryOptionsForCategory(categoryId);
                        const subCategoryId =
                          t.subCategoryId ||
                          subCategoryOptionsForEdit.find((opt) => opt.name === t.subCategory)?.id ||
                          "";
                        const accountId =
                          t.accountId ||
                          accountOptions.find((opt) => opt.name === t.accountName)?.id ||
                          "";
                        setForm({
                          date: t.date,
                          description: t.description,
                          type: t.type,
                          categoryId,
                          subCategoryId,
                          accountId,
                          amount: t.amount,
                          activityId: t.activityId || "",
                        });
                      }}
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(t.id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">No transactions for this project.</p>
          )}
        </div>

        <div className="w-80 p-4 overflow-y-auto">
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Bulk Update</h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedTransactionIds.size} selected
              </span>
            </div>
            {selectedTransactionIds.size === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Select transactions to recategorize.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
                  <select
                    value={bulkCategoryId}
                    onChange={(e) => {
                      setBulkCategoryId(e.target.value);
                      setBulkSubCategoryId("");
                    }}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subcategory</label>
                  <select
                    value={bulkSubCategoryId}
                    onChange={(e) => setBulkSubCategoryId(e.target.value)}
                    disabled={!bulkCategoryId}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 disabled:opacity-60"
                  >
                    <option value="">No subcategory</option>
                    {bulkSubCategoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account</label>
                  <select
                    value={bulkAccountId}
                    onChange={(e) => setBulkAccountId(e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                  >
                    <option value="">Select account</option>
                    {accountOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkUpdate}
                    className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Apply to Selected
                  </button>
                  <button
                    onClick={() => setSelectedTransactionIds(new Set())}
                    className="px-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>
          <h4 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200">
            Add Transaction
          </h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              >
                <option value="Outcome">Outcome (Cost)</option>
                <option value="Income">Income (Revenue)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
              <input
                name="description"
                type="text"
                value={form.description}
                onChange={handleChange}
                placeholder="Invoice #1234"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Amount ($)</label>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              >
                {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Subcategory</label>
              <select
                name="subCategoryId"
                value={form.subCategoryId}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              >
                <option value="">-- None --</option>
                {subCategoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account</label>
              <select
                name="accountId"
                value={form.accountId}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              >
                <option value="">-- None --</option>
                {accountOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Link to Activity (Optional)</label>
              <select
                name="activityId"
                value={form.activityId}
                onChange={handleChange}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              >
                <option value="">-- Project-Level Cost/Income --</option>
                {activityOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!form.description || toNumber(form.amount) <= 0}
            >
              {selectedTransactionId ? "Update" : "Add"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GANTT CHART COMPONENT
// ---------------------------------------------------------------------------
interface GanttChartProps {
  activities: Activity[];
  onUpdateDates: (id: string, start: string, finish: string) => void;
  onOpenContextMenu: (activity: Activity, x: number, y: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  dragging: {
    id: string;
    mode: "move" | "resize-start" | "resize-end";
    startMs: number;
    finishMs: number;
    grabOffsetMs: number;
  } | null;
  setDragging: React.Dispatch<React.SetStateAction<GanttChartProps["dragging"]>>;
  creationMode: boolean;
  onCreateRange: (start: string, finish: string) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  activities,
  onUpdateDates,
  onOpenContextMenu,
  selectedId,
  onSelect,
  dragging,
  setDragging,
  creationMode,
  onCreateRange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const pointerLockActive = useRef(false);
  const [scrollThumb, setScrollThumb] = useState({ widthPct: 100, leftPct: 0 });
  const [chartWidth, setChartWidth] = useState(1000);
  const [creationDraft, setCreationDraft] = useState<{ startMs: number; endMs: number; y: number } | null>(null);
  const creationDraftRef = useRef<typeof creationDraft>(null);

  const timeline = useMemo(() => {
    const todayLocalMs = getCentralTodayMs();
    if (activities.length === 0) {
      return { start: todayLocalMs - 7 * DAY_MS, end: todayLocalMs + 21 * DAY_MS };
    }
    const minStart = Math.min(...activities.map(a => toDateMs(a.start)));
    const maxFinish = Math.max(...activities.map(a => toDateMs(a.finish)));
    const padding = DAY_MS; // minimal padding to keep header aligned with project months
    return {
      start: Math.min(minStart - padding, todayLocalMs - 7 * DAY_MS),
      end: Math.max(maxFinish + padding, todayLocalMs + 7 * DAY_MS),
    };
  }, [activities]);

  const totalSpan = Math.max(DAY_MS, timeline.end - timeline.start);

  const days = useMemo(() => {
    const arr: { ms: number; label: string; weekday: string }[] = [];
    for (let d = timeline.start; d <= timeline.end; d += DAY_MS) {
      const date = new Date(d);
      arr.push({
        ms: d,
        label: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
        weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      });
    }
    return arr;
  }, [timeline.start, timeline.end]);

  const months = useMemo(() => {
    const items: { startIndex: number; endIndex: number; label: string }[] = [];
    let cursor = new Date(timeline.start);
    cursor.setUTCHours(0, 0, 0, 0);
    cursor.setUTCDate(1);
    while (cursor.getTime() < timeline.end) {
      const startMs = cursor.getTime();
      const next = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
      const endMs = Math.min(next, timeline.end);
      const startIndex = Math.max(0, Math.floor((startMs - timeline.start) / DAY_MS));
      const endIndex = Math.min(days.length, Math.floor((endMs - timeline.start) / DAY_MS));
      items.push({
        startIndex,
        endIndex,
        label: new Date(startMs).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
      });
      cursor = new Date(next);
    }
    return items;
  }, [days.length, timeline.start, timeline.end]);

  const dateToX = useCallback((ms: number) => {
    return ((ms - timeline.start) / totalSpan) * 100;
  }, [timeline.start, totalSpan]);

  const clampToTimeline = useCallback((ms: number) => {
    return Math.min(Math.max(ms, timeline.start), timeline.end);
  }, [timeline.start, timeline.end]);

  useEffect(() => {
    creationDraftRef.current = creationDraft;
  }, [creationDraft]);

  useEffect(() => {
    if (!creationMode) {
      setCreationDraft(null);
    }
  }, [creationMode]);

  const handlePointerDown = (
    e: React.PointerEvent,
    activity: Activity,
    mode: "move" | "resize-start" | "resize-end"
  ) => {
    if (creationMode) return;
    if (e.button === 1) {
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      onSelect(activity.id);
      return;
    }
    onSelect(activity.id);
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const grabMs = timeline.start + ratio * totalSpan;
    setDragging({
      id: activity.id,
      mode,
      startMs: toDateMs(activity.start),
      finishMs: toDateMs(activity.finish),
      grabOffsetMs: grabMs - toDateMs(activity.start),
    });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const currentMs = clampToTimeline(timeline.start + ratio * totalSpan);

    let newStart = dragging.startMs;
    let newFinish = dragging.finishMs;

    if (dragging.mode === "move") {
      const delta = currentMs - (dragging.startMs + dragging.grabOffsetMs);
      newStart = dragging.startMs + delta;
      newFinish = dragging.finishMs + delta;
    } else if (dragging.mode === "resize-start") {
      newStart = Math.min(currentMs, dragging.finishMs - DAY_MS);
    } else if (dragging.mode === "resize-end") {
      newFinish = Math.max(currentMs, dragging.startMs + DAY_MS);
    }

    setDragging(d => d ? { ...d, startMs: newStart, finishMs: newFinish } : null);
  }, [clampToTimeline, dragging, setDragging, timeline.start, totalSpan]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    const newStart = toDateString(dragging.startMs);
    const newFinish = toDateString(dragging.finishMs);
    onUpdateDates(dragging.id, newStart, newFinish);
    setDragging(null);
  }, [dragging, onUpdateDates, setDragging]);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.clientWidth || 1000);
      }
    };
    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateWidth);
      if (containerRef.current) ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const startPan = (e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    const isMouse = e.pointerType === "mouse" || e.pointerType === "pen";
    const wantsPointerLock = isMouse && e.button === 1;
    const allowDefaultDrag = e.button === 0;
    if (creationMode && allowDefaultDrag && !wantsPointerLock) return;
    if (!wantsPointerLock && !allowDefaultDrag) return;
    e.preventDefault();
    isPanning.current = true;
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
    scrollRef.current.style.cursor = "grabbing";
    e.currentTarget.setPointerCapture(e.pointerId);
    if (wantsPointerLock && scrollRef.current.requestPointerLock) {
      try { scrollRef.current.requestPointerLock(); } catch {}
    }
  };

  const onPanMove = (e: React.PointerEvent) => {
    if (!isPanning.current || !scrollRef.current || pointerLockActive.current) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    scrollRef.current.scrollLeft = panState.current.scrollLeft - dx;
    scrollRef.current.scrollTop = panState.current.scrollTop - dy;
  };

  const handlePointerLockMove = useCallback((event: MouseEvent) => {
    if (!pointerLockActive.current || !isPanning.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft -= event.movementX;
    scrollRef.current.scrollTop -= event.movementY;
    panState.current.scrollLeft = scrollRef.current.scrollLeft;
    panState.current.scrollTop = scrollRef.current.scrollTop;
  }, []);

  const endPan = useCallback((e?: React.PointerEvent | PointerEvent | MouseEvent) => {
    if (!scrollRef.current) return;
    isPanning.current = false;
    pointerLockActive.current = false;
    scrollRef.current.style.cursor = "";
    if (document.pointerLockElement === scrollRef.current) {
      document.exitPointerLock?.();
    }
    if (e && "pointerId" in e && "currentTarget" in e && e.currentTarget) {
      try { (e.currentTarget as Element).releasePointerCapture((e as React.PointerEvent).pointerId); } catch {}
    }
  }, []);

  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === scrollRef.current;
      pointerLockActive.current = locked;
      if (!locked && isPanning.current) {
        endPan();
      }
    };
    const handleGlobalMouseUp = () => {
      if (isPanning.current) endPan();
    };
    const lockTarget = scrollRef.current;
    document.addEventListener("pointerlockchange", handleLockChange);
    document.addEventListener("pointerlockerror", handleLockChange);
    window.addEventListener("mousemove", handlePointerLockMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
      document.removeEventListener("pointerlockerror", handleLockChange);
      window.removeEventListener("mousemove", handlePointerLockMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      if (document.pointerLockElement === lockTarget) {
        document.exitPointerLock?.();
      }
    };
  }, [endPan, handlePointerLockMove]);

  const handleCreatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!creationMode || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-activity-bar]")) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    const startMs = clampToTimeline(timeline.start + ratio * totalSpan);
    const y = e.clientY - rect.top;
    const draft = { startMs, endMs: startMs, y };
    creationDraftRef.current = draft;
    setCreationDraft(draft);
    e.stopPropagation();
  };

  useEffect(() => {
    if (!creationDraft || !creationMode) return;
    const handleMove = (ev: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = (ev.clientX - rect.left) / rect.width;
      const endMs = clampToTimeline(timeline.start + ratio * totalSpan);
      const y = ev.clientY - rect.top;
      setCreationDraft(prev => {
        if (!prev) return null;
        const next = { ...prev, endMs, y };
        creationDraftRef.current = next;
        return next;
      });
    };

    const handleUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const draft = creationDraftRef.current;
      if (draft) {
        const startMs = Math.min(draft.startMs, draft.endMs);
        const finishMs = Math.max(draft.startMs, draft.endMs);
        const normalizedStart = toDateMs(toDateString(startMs));
        const normalizedFinish = Math.max(normalizedStart, toDateMs(toDateString(finishMs)));
        onCreateRange(toDateString(normalizedStart), toDateString(normalizedFinish));
      }
      setCreationDraft(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [clampToTimeline, creationDraft, creationMode, onCreateRange, timeline.start, totalSpan]);

  const updateScrollThumb = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      setScrollThumb({ widthPct: 100, leftPct: 0 });
      return;
    }
    const widthPct = (clientWidth / scrollWidth) * 100;
    const available = scrollWidth - clientWidth;
    const leftPct = (scrollLeft / available) * (100 - widthPct);
    setScrollThumb({ widthPct, leftPct });
  };

  useEffect(() => {
    updateScrollThumb();
  }, [chartWidth, activities.length]);

  const handleScroll = () => updateScrollThumb();

  const chartHeight = Math.max(activities.length * 36 + 80, 220);
  const dateToXPx = useCallback((ms: number) => ((ms - timeline.start) / totalSpan) * chartWidth, [timeline.start, totalSpan, chartWidth]);
  const projectStartMs = activities.length ? Math.min(...activities.map(a => toDateMs(a.start))) : timeline.start;
  const projectEndMs = activities.length ? Math.max(...activities.map(a => toDateMs(a.finish))) : timeline.end;
  const todayMs = getCentralTodayMs();
  const barYOffset = 24;

  const renderTicks = () => {
    const ticks = [];
    const daysSpan = Math.ceil(totalSpan / DAY_MS);
    const step = daysSpan > 120 ? 14 : daysSpan > 60 ? 7 : 1;
    for (let d = timeline.start; d <= timeline.end; d += step * DAY_MS) {
      ticks.push(
        <div key={d} className="absolute top-0 bottom-0 border-l border-slate-200/60 dark:border-slate-700/60" style={{ left: `${dateToX(d)}%` }} />
      );
    }
    return ticks;
  };

  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-500" />
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-500" />
          <span>Dragging</span>
        </div>
        {creationMode && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Draw on chart</span>
          </div>
        )}
      </div>
    <div
      ref={scrollRef}
      data-gantt-scroll
      className="relative overflow-auto rounded-md border border-slate-200 dark:border-slate-700 bg-slate-900/80 cursor-grab"
      style={{ maxHeight: "calc(100vh - 320px)", scrollbarWidth: "none", msOverflowStyle: "none" }}
      onPointerDown={startPan}
      onPointerMove={onPanMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onPointerLeave={endPan}
      onScroll={handleScroll}
    >
      <div className="relative h-16 border border-slate-400/50 dark:border-slate-700 rounded-t bg-slate-900/80 overflow-hidden select-none">
        <div
          className="absolute top-0 left-0 right-0 h-16 text-slate-100 grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        >
            {/* Month row */}
            {months.map((m, idx) => (
              <div
                key={`${m.label}-${idx}`}
                className="col-start-1 col-end-1 h-8 flex items-center justify-center font-semibold uppercase tracking-wide bg-slate-900/70 border-r border-slate-500/40"
                style={{ gridColumn: `${m.startIndex + 1} / ${m.endIndex + 1}` }}
              >
                {m.label}
              </div>
            ))}

            {/* Day row */}
            {days.map((d, idx) => {
              const isWeekend = new Date(d.ms).getUTCDay() % 6 === 0;
              return (
                <div
                  key={d.ms}
                  className={`h-8 flex flex-col items-center justify-center border-r border-slate-700/40 ${isWeekend ? "bg-slate-800/60" : "bg-slate-900/60"}`}
                  style={{ gridColumn: `${idx + 1} / ${idx + 2}`, gridRow: "2" }}
                >
                  <span className="leading-tight text-[10px]">{d.label}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">{d.weekday[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div
          ref={containerRef}
          className="relative flex-1 border-x border-b border-slate-200 dark:border-slate-700 rounded-b bg-slate-50 dark:bg-slate-900 overflow-hidden select-none"
          style={{ minHeight: chartHeight }}
          onPointerDown={handleCreatePointerDown}
        >
          <div className="absolute inset-0">{renderTicks()}</div>

          {/* Project span bar */}
          <div
            className="absolute h-2 bg-amber-400/90"
            style={{
              top: 6,
              left: `${dateToXPx(projectStartMs)}px`,
              width: `${Math.max(4, dateToXPx(projectEndMs) - dateToXPx(projectStartMs))}px`,
              borderRadius: "1px",
            }}
          />
          <svg
            className="absolute pointer-events-none"
            style={{ top: 8, left: 0, right: 0, height: chartHeight }}
            viewBox={`0 0 ${Math.max(chartWidth, 1)} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <marker id="spanArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#fbbf24" />
              </marker>
            </defs>
            <line
              x1={dateToXPx(projectStartMs)}
              y1={8}
              x2={dateToXPx(projectStartMs)}
              y2={barYOffset}
              stroke="#fbbf24"
              strokeWidth="1"
              markerEnd="url(#spanArrow)"
            />
            <line
              x1={dateToXPx(projectEndMs)}
              y1={8}
              x2={dateToXPx(projectEndMs)}
              y2={barYOffset}
              stroke="#fbbf24"
              strokeWidth="1"
              markerEnd="url(#spanArrow)"
            />
          </svg>

          {/* Today line */}
          {todayMs >= timeline.start && todayMs <= timeline.end && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500/50"
              style={{ left: `${dateToXPx(todayMs)}px` }}
            />
          )}

          {creationDraft && (
            <div
              className="absolute bg-emerald-500/30 border border-emerald-500/70 rounded-sm pointer-events-none shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
              style={{
                left: `${dateToXPx(Math.min(creationDraft.startMs, creationDraft.endMs))}px`,
                width: `${Math.max(2, Math.abs(dateToXPx(creationDraft.endMs) - dateToXPx(creationDraft.startMs)))}px`,
                top: Math.max(barYOffset - 6, Math.min(chartHeight - 24, creationDraft.y - 8)),
                height: 18,
              }}
            />
          )}

          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox={`0 0 ${Math.max(chartWidth, 1)} ${chartHeight}`}
            preserveAspectRatio="none"
            width="100%"
            height={chartHeight}
          >
            <defs>
              <marker id="arrowhead" markerWidth="5" markerHeight="4" refX="4.5" refY="2" orient="auto">
                <polygon points="0 0, 5 2, 0 4" fill="#22c55e" />
              </marker>
            </defs>
            {activities.flatMap((a) => {
              if (!a.predecessors || a.predecessors.length === 0) return [];
              const succStartMs = dragging?.id === a.id ? dragging.startMs : toDateMs(a.start);
              const succIndex = activities.findIndex(act => act.id === a.id);
              // Match the actual rendered bar height (tailwind h-4 => 16px) so connectors anchor at center
              const barHeightPx = 16;
              const succTop = barYOffset + succIndex * 36;
              const succY = succTop + barHeightPx / 2;
              return a.predecessors.map((pid) => {
                const pred = activities.find(act => act.id === pid);
                if (!pred) return null;
                const predEndMs = dragging?.id === pred.id ? dragging.finishMs : toDateMs(pred.finish);
                const predIndex = activities.findIndex(act => act.id === pred.id);
                const predTop = barYOffset + predIndex * 36;
                const predY = predTop + barHeightPx / 2;
                const x1 = dateToXPx(predEndMs);
                const x2 = dateToXPx(succStartMs);
                const elbowOut = 10; // small horizontal before drop
                const bendX = x1 + elbowOut;
                const gap = Math.max(24, Math.abs(succY - predY) / 2);
                const midY = predY <= succY ? predY + gap : predY - gap;
                const entryX = x2 - elbowOut;
                const points = [
                  `M ${x1} ${predY}`,
                  `L ${bendX} ${predY}`,
                  `L ${bendX} ${midY}`,
                  `L ${entryX} ${midY}`,
                  `L ${entryX} ${succY}`,
                  `L ${x2} ${succY}`
                ].join(" ");
                return (
                  <path
                    key={`${a.id}-${pid}`}
                    d={points}
                    stroke="#22c55e"
                    strokeWidth="0.9"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                );
              }).filter(Boolean);
            })}
          </svg>

          <div className="absolute inset-0">
            {activities.map((a, idx) => {
              const startMs = dragging?.id === a.id ? dragging.startMs : toDateMs(a.start);
              const finishMs = dragging?.id === a.id ? dragging.finishMs : toDateMs(a.finish);
              const leftPx = dateToXPx(startMs);
              const rightPx = dateToXPx(finishMs);
              const widthPx = Math.max(2, rightPx - leftPx);
              const isSelected = selectedId === a.id;
              const color = dragging?.id === a.id
                ? "bg-amber-500"
                : isSelected
                ? "bg-yellow-400"
                : "bg-blue-500";

              return (
                <div
                  key={a.id}
                  className="absolute left-0 right-0"
                  style={{ top: barYOffset + idx * 36 }}
                >
                  <div className="relative h-5">
                    <div
                      data-activity-bar
                      className={`absolute h-4 shadow-sm cursor-grab active:cursor-grabbing ${color}`}
                      style={{ left: `${leftPx}px`, width: `${widthPx}px`, minWidth: "8px", borderRadius: "2px" }}
                      onPointerDown={(e) => handlePointerDown(e, a, "move")}
                      onContextMenu={(e) => { e.preventDefault(); onOpenContextMenu(a, e.clientX, e.clientY); }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/10"
                        onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, a, "resize-start"); }}
                      />
                      <div
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/10"
                        onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, a, "resize-end"); }}
                      />
                    </div>
                    <div
                      className="absolute flex items-center pointer-events-none"
                      style={{ left: `${leftPx + widthPx}px`, top: 0, bottom: 0, transform: "translateX(6px)" }}
                    >
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">
                        {a.wbs} - {a.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 h-1.5 bg-slate-700/50 rounded-full">
        <div
          className="h-full bg-blue-400/80 rounded-full"
          style={{
            width: `${scrollThumb.widthPct}%`,
            transform: `translateX(${scrollThumb.leftPct}%)`,
          }}
        />
      </div>
      <style>{`
        [data-gantt-scroll]::-webkit-scrollbar { display: none; }
        [data-company-scroll]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BRRRR CALCULATOR COMPONENT
// ---------------------------------------------------------------------------
const BRRRRCalculator: React.FC<{ details: Record<string, string> }> = ({ details }) => {
  const purchasePrice = parseFloat(details["Purchase Price"] || "0");
  const rehabCost = parseFloat(details["Rehab Cost"] || "0");
  const arvEstimate = parseFloat(details["ARV Estimate"] || "0");
  const holdingCost = parseFloat(details["Holding Cost"] || "0");
  const squareFootage = parseFloat(details["Square Footage"] || "0");
  const exitPriceFactor = parseFloat(details["Exit Price Factor"] || "0");

  const totalInvestment = purchasePrice + rehabCost + holdingCost;

  const requiredFields = ["Purchase Price", "Rehab Cost", "ARV Estimate", "Holding Cost"];
  const isReady = requiredFields.every(field => details[field] && parseFloat(details[field]) > 0);

  const exitPriceCalc = squareFootage * exitPriceFactor;

  const refinancedLoanAmount = arvEstimate * 0.75;
  const cashOutAmount = refinancedLoanAmount - totalInvestment;

  const estimatedAnnualCashFlow = 500 * 12;
  const cashOnCashROI = totalInvestment > 0 ? (estimatedAnnualCashFlow / totalInvestment) * 100 : 0;

  if (!isReady) {
    return (
      <div className="p-3 bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-600 text-red-700 dark:text-red-400">
        <p className="text-xs font-semibold">Missing BRRRR Variables for Full Calculation:</p>
        <p className="text-xs">
          Please define or set to {'>'} 0:
          <span className="font-mono">{requiredFields.filter(f => !details[f] || parseFloat(details[f]) <= 0).join(', ')}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="rounded bg-white p-2 dark:bg-slate-700 border dark:border-slate-600">
        <span className="text-slate-500 dark:text-slate-400">Total Investment (Buy + Rehab + Hold)</span>
        <div className="text-lg font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(totalInvestment)}
        </div>
      </div>

      <div className="rounded bg-white p-2 dark:bg-slate-700 border dark:border-slate-600">
        <span className="text-slate-500 dark:text-slate-400">Refinance Loan Amount (75% ARV)</span>
        <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(refinancedLoanAmount)}
        </div>
      </div>

      <div className="rounded bg-white p-2 dark:bg-slate-700 border dark:border-slate-600 col-span-2">
        <span className="text-slate-500 dark:text-slate-400">Cash Out / (Cash Left In)</span>
        <div className={`text-xl font-bold ${cashOutAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {cashOutAmount > 0 ? formatCurrency(cashOutAmount) : `(${formatCurrency(Math.abs(cashOutAmount))})`}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {cashOutAmount > 0 ? "Repeat! Cash pulled out of the deal." : "More capital needed for the deal."}
        </p>
      </div>

      {exitPriceFactor > 0 && squareFootage > 0 && (
        <div className="rounded bg-white p-2 dark:bg-slate-700 border dark:border-slate-600">
          <span className="text-slate-500 dark:text-slate-400">Calculation: Est. Exit Price (${exitPriceFactor}/sqft)</span>
          <div className="text-lg font-semibold text-blue-500">
            {formatCurrency(exitPriceCalc)}
          </div>
        </div>
      )}

      <div className="rounded bg-white p-2 dark:bg-slate-700 border dark:border-slate-600">
        <span className="text-slate-500 dark:text-slate-400">Est. Cash-on-Cash ROI (Annual CF / Total Inv)</span>
        <div className="text-lg font-semibold text-amber-600">
          {cashOnCashROI.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CUSTOM FORMULAS DISPLAY COMPONENT
// ---------------------------------------------------------------------------
interface CustomFormulasDisplayProps {
  formulas: CustomFormula[];
  projectDetails: ProjectDetail[];
  onEdit: (formula: CustomFormula) => void;
  onDelete: (formulaId: string) => void;
  onCreate: () => void;
  taxRates: TaxRate[];
  onAddPreset?: () => void;
}

const CustomFormulasDisplay: React.FC<CustomFormulasDisplayProps> = ({
  formulas,
  projectDetails,
  onEdit,
  onDelete,
  onCreate,
  taxRates,
  onAddPreset,
}) => {
  const formatValue = (value: number, resultType: CustomFormula["resultType"]) => {
    switch (resultType) {
      case "currency":
        return formatCurrency(value);
      case "percentage":
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  return (
    <div className="space-y-2">
      {formulas.map((formula) => {
        const result = evaluateFormula(formula.formula, projectDetails, formulas, getTaxVariableMap(taxRates));
        return (
          <div
            key={formula.id}
            className="p-3 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 group"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formula.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    Custom
                  </span>
                </div>
                {formula.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formula.description}</p>
                )}
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">{formula.formula}</p>
              </div>
              <div className="text-right">
                {result.error ? (
                  <span className="text-sm text-red-500">{result.error}</span>
                ) : (
                  <span className={`text-lg font-bold ${
                    formula.resultType === 'currency' ? 'text-green-600 dark:text-green-400' :
                    formula.resultType === 'percentage' ? 'text-blue-600 dark:text-blue-400' :
                    'text-slate-800 dark:text-slate-200'
                  }`}>
                    {formatValue(result.value, formula.resultType)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(formula)}
                className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(formula.id)}
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={onCreate}
        className="w-full text-sm flex items-center justify-center gap-1 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors border border-dashed border-blue-300 dark:border-blue-700"
      >
        <IconPlus /> Create New Formula
      </button>
      {onAddPreset && (
        <button
          onClick={onAddPreset}
          className="w-full text-sm flex items-center justify-center gap-1 p-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors border border-dashed border-amber-300 dark:border-amber-700"
        >
          <IconCopy /> Add From Presets
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// PROJECT ANALYSIS PANEL (FOR EPS VIEW)
// ---------------------------------------------------------------------------
const ProjectAnalysisPanel: React.FC<{
  projectDetails: ProjectDetail[];
  projectActivities: Activity[];
  projectTransactions: Transaction[];
  customFormulas: CustomFormula[];
  onEditFormula: (formula: CustomFormula) => void;
  onDeleteFormula: (formulaId: string) => void;
  onCreateFormula: () => void;
  onAddPreset: () => void;
  taxRates: TaxRate[];
}> = ({
  projectDetails,
  projectActivities,
  projectTransactions,
  customFormulas,
  onEditFormula,
  onDeleteFormula,
  onCreateFormula,
  onAddPreset,
  taxRates,
}) => {
  const detailsMap: Record<string, string> = projectDetails.reduce((acc, detail) => {
    acc[detail.variable] = detail.value;
    return acc;
  }, {} as Record<string, string>);

  const totalRevenue = calculateFinancialKPIs(projectActivities, projectTransactions).totalRevenue;
  const totalActualCost = calculateFinancialKPIs(projectActivities, projectTransactions).totalActualCost;
  const profit = totalRevenue - totalActualCost;
  const roi = totalActualCost > 0 ? (profit / totalActualCost) * 100 : 0;

  return (
    <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
        <IconBarChart /> Project Analysis
      </h3>
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex justify-between items-center">
            BRRRR Calculation (Real Estate)
            <IconCalculator />
          </h4>
          <BRRRRCalculator details={detailsMap} />
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Profit Margin (Actual)
          </h4>
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              Formula: ((Revenue - Actual Cost) / Revenue) * 100
            </p>
            <div className={`text-xl font-bold ${profit > 0 ? "text-green-600" : "text-red-600"}`}>
              {roi.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <IconFunction /> Custom Formulas
          </h4>
          <CustomFormulasDisplay
            formulas={customFormulas}
            projectDetails={projectDetails}
            onEdit={onEditFormula}
            onDelete={onDeleteFormula}
            onCreate={onCreateFormula}
            onAddPreset={onAddPreset}
            taxRates={taxRates}
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PROJECT DETAILS PANEL (FOR ACTIVITIES VIEW)
// ---------------------------------------------------------------------------
interface ProjectDetailsPanelProps {
  projectId: number;
  details: ProjectDetail[];
  onUpdate: (updatedDetails: ProjectDetail[]) => void;
  onAutoPopulate: (fields: Omit<ProjectDetail, 'id'>[]) => void;
  isVisible: boolean;
  onToggle?: () => void;
  hiddenVariables?: string[];
}

const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({
  projectId,
  details,
  onUpdate,
  onAutoPopulate,
  isVisible,
  onToggle,
  hiddenVariables = [],
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibilityClasses = isVisible
    ? "translate-x-0 pointer-events-auto"
    : "translate-x-full pointer-events-none";

  const startEditing = (detailId: string, field: 'variable' | 'value', initialValue: string) => {
    setEditingCell({ detailId, field, value: initialValue, activityId: undefined });
  };

  const handleUpdate = (detailId: string, field: 'variable' | 'value', newValue: string) => {
    onUpdate(details.map(d => d.id === detailId ? { ...d, [field]: newValue } : d));
    setEditingCell(null);
  };

  const handleAdd = () => {
    const nextIdNum = details.length > 0 ? Math.max(...details.map(d => parseInt(d.id.substring(1)))) + 1 : 1;
    const newId = `D${nextIdNum}`;
    onUpdate([...details, { id: newId, variable: "New Variable", value: "New Value" }]);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  };

  const handleDelete = (detailId: string) => {
    onUpdate(details.filter(d => d.id !== detailId));
  };

  const handleAutoPopulate = () => {
    onAutoPopulate(DEFAULT_BRRRR_FIELDS);
  };

  return (
    <div
      data-project-id={projectId}
      className={`w-80 border-l border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 flex flex-col overflow-hidden fixed right-0 top-[122px] bottom-0 transform transition-transform duration-300 ease-in-out ${visibilityClasses}`}
      style={{ bottom: "-5px" }}
    >
      <div
        className="border border-slate-300 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-between w-[calc(100%+1px)] -ml-px"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Project Variables / Details
        </h3>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Hide
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Define key project variables here. These variables are used by the financial and custom analysis tools.
        </p>
        <div className="space-y-1">
          {details.filter(d => !hiddenVariables.includes(d.variable)).map((detail) => (
            <div
              key={detail.id}
              className="flex items-center group text-sm border-b border-slate-100 dark:border-slate-800 py-1"
            >
              <div
                onClick={() => startEditing(detail.id, 'variable', detail.variable)}
                className="w-1/2 text-slate-700 dark:text-slate-200 font-medium cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 px-1 rounded truncate"
                title={detail.variable}
              >
                {editingCell?.detailId === detail.id && editingCell.field === 'variable' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    onBlur={() => handleUpdate(detail.id, 'variable', editingCell.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(detail.id, 'variable', editingCell.value);
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded"
                  />
                ) : (
                  detail.variable
                )}
              </div>

              <div className="mx-2 text-slate-400 dark:text-slate-600">:</div>

              <div
                onClick={() => startEditing(detail.id, 'value', detail.value || "")}
                className="w-1/2 text-slate-900 dark:text-slate-50 cursor-text hover:bg-slate-50 dark:hover:bg-slate-700 px-1 rounded truncate text-right font-mono"
                title={detail.value}
              >
                {editingCell?.detailId === detail.id && editingCell.field === 'value' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editingCell.value}
                    onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                    onBlur={() => handleUpdate(detail.id, 'value', editingCell.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(detail.id, 'value', editingCell.value);
                      if (e.key === 'Escape') setEditingCell(null);
                    }}
                    className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded text-right"
                  />
                ) : (
                  detail.value || <span className="text-slate-400 dark:text-slate-600 italic">Click to set</span>
                )}
              </div>

              <button
                onClick={() => handleDelete(detail.id)}
                className="ml-auto p-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete Detail"
              >
                <IconDelete />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-slate-300 dark:border-slate-700 flex gap-2 flex-shrink-0">
        <button
          onClick={handleAdd}
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 justify-center flex items-center gap-1"
        >
          <IconAdd /> Add Detail
        </button>
        <button
          onClick={handleAutoPopulate}
          className="flex-1 rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 justify-center"
          title="Auto-populate fields needed for BRRRR calculation"
        >
          Auto-Populate BRRRR
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TOP BAR
// ---------------------------------------------------------------------------
const TopBar: React.FC<{
  title: string;
  projectName?: string;
  onModeChange?: (mode: DashboardMode) => void;
  currentMode: DashboardMode;
  isDetailsPanelVisible?: boolean;
  onToggleDetailsPanel?: () => void;
  currentUser?: { name: string; email: string; role: string; avatarUrl?: string } | null;
  activeUsers?: ActiveUser[];
  notifications?: NotificationItem[];
  onNotificationClick?: (note: NotificationItem) => void;
  onNotificationDismiss?: (id: string) => void;
  onNotificationRead?: (id: string) => void;
  onNotificationUnread?: (id: string) => void;
  onNotificationReadAll?: () => void;
  readNotificationIds?: Set<string>;
  toastItems?: NotificationItem[];
  closingToastIds?: Set<string>;
  onToastClick?: (note: NotificationItem) => void;
  onToastDismiss?: (id: string) => void;
  onLogout?: () => void;
  onOpenCommit?: () => void;
  commitDraftCount?: number;
}> = ({
  title,
  projectName,
  onModeChange,
  currentMode,
  isDetailsPanelVisible,
  onToggleDetailsPanel,
  currentUser,
  activeUsers = [],
  notifications = [],
  onNotificationClick,
  onNotificationDismiss,
  onNotificationRead,
  onNotificationUnread,
  onNotificationReadAll,
  readNotificationIds = new Set(),
  toastItems = [],
  closingToastIds = new Set(),
  onToastClick,
  onToastDismiss,
  onLogout,
  onOpenCommit,
  commitDraftCount = 0,
}) => {
  const { theme, setTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const userInitials = (name?: string) =>
    (name || "User")
      .trim()
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const presenceStack = activeUsers.slice(0, 6);
  const extraCount = activeUsers.length - presenceStack.length;
  const notifCount = notifications.filter((note) => !readNotificationIds.has(note.id)).length;

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  return (
    <>
    <header className="flex w-full items-center justify-between gap-4 border-b border-slate-300 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950 flex-shrink-0">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onModeChange && onModeChange("EPS")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "EPS"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            EPS View
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Activities")}
            disabled={!projectName}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Activities"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            } ${!projectName ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Activities
          </button>
          <button
            onClick={() => onModeChange && onModeChange("RentRoll")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "RentRoll"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Rent Roll
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Resources")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Resources"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Resources
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Labor")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Labor"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Labor
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Exports")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Exports"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Exports
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Statements")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Statements"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Bank Statements
          </button>
          <button
            onClick={() => onModeChange && onModeChange("DebtService")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "DebtService"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Debt Service
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Account")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Account"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Account
          </button>
          <button
            onClick={() => onModeChange && onModeChange("Commits")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Commits"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Commits
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => onModeChange && onModeChange("Users")}
              className={`rounded px-3 py-1 transition-colors ${
                currentMode === "Users"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Users
            </button>
          )}
        </nav>

        {projectName && (
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
        )}

        <div className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">{title}:</span>
          <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
            {projectName || "All Projects"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Notifications"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 z-30">
              <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Notifications
                </div>
                {onNotificationReadAll && (
                  <button
                    onClick={() => onNotificationReadAll()}
                    className="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Mark All Read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400 text-center">No upcoming reminders.</div>
                ) : (
                  notifications.map((note) => {
                    const isRead = readNotificationIds.has(note.id);
                    return (
                    <div
                      key={note.id}
                      className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => {
                            onNotificationClick && onNotificationClick(note);
                            setNotifOpen(false);
                          }}
                          className="text-left flex-1"
                        >
                          <div className={`text-sm font-semibold ${isRead ? "text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"}`}>{note.title}</div>
                          <div className={`text-xs ${isRead ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>{note.detail}</div>
                          <div className={`mt-1 text-[11px] ${isRead ? "text-slate-400 dark:text-slate-500" : note.level === "urgent" ? "text-red-600 dark:text-red-400" : note.level === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                            {note.daysUntil === 0 ? "Due today" : `Due in ${note.daysUntil} days`} - {note.dueDate}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {(onNotificationRead || onNotificationUnread) && (
                            <button
                              onClick={() => {
                                if (isRead) {
                                  onNotificationUnread && onNotificationUnread(note.id);
                                } else {
                                  onNotificationRead && onNotificationRead(note.id);
                                }
                              }}
                              className={`text-[11px] px-2 py-1 rounded border ${
                                isRead
                                  ? "border-blue-200 text-blue-600 hover:text-blue-700 dark:border-blue-900/60 dark:text-blue-300"
                                  : "border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                              }`}
                              title={isRead ? "Mark as unread" : "Mark as read"}
                            >
                              {isRead ? "Unread" : "Read"}
                            </button>
                          )}
                          <button
                            onClick={() => onNotificationDismiss && onNotificationDismiss(note.id)}
                            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            title="Dismiss"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        {presenceStack.length > 0 && (
          <div className="flex items-center">
            {presenceStack.map((user, idx) => (
              <div
                key={`${user.id}-${user.lastSeen}-${idx}`}
                className={`h-7 w-7 rounded-full border border-white dark:border-slate-900 shadow-sm bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[11px] font-semibold text-slate-600 dark:text-slate-200 ${idx === 0 ? "" : "-ml-1"}`}
                title={`${user.name} - ${user.email}`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{userInitials(user.name)}</span>
                )}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="-ml-1 h-7 w-7 rounded-full border border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-200 flex items-center justify-center shadow-sm">
                +{extraCount}
              </div>
            )}
          </div>
        )}
        {currentUser && (
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{currentUser.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{currentUser.role}</div>
          </div>
        )}
        {currentUser && onOpenCommit && (
          <button
            onClick={() => {
              onOpenCommit();
            }}
            className="px-3 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {`Commit${commitDraftCount ? ` - ${commitDraftCount} Change${commitDraftCount === 1 ? "" : "s"}` : ""}`}
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-3 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Logout
          </button>
        )}
        {currentMode === "Activities" && onToggleDetailsPanel && (
          <button
            onClick={onToggleDetailsPanel}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={isDetailsPanelVisible ? "Hide Project Details Panel" : "Show Project Details Panel"}
          >
            {isDetailsPanelVisible ? <IconEyeOff /> : <IconEye />}
          </button>
        )}

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Toggle Dark Mode"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {theme === 'dark' ? (
              <path d="M12 3v1m0 16v1m9-9h-1m-17 0H3m15.5-6.5l-.7.7m-12.1 12.1l-.7.7M18.8 18.8l-.7-.7m-12.1-12.1l-.7-.7M11 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
            ) : (
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            )}
          </svg>
        </button>
      </div>
    </header>
    {toastItems.length > 0 && (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toastItems.map((note) => (
          <div
            key={note.id}
            className={`relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 ${closingToastIds.has(note.id) ? "toast-exit" : "toast-enter"} ${
              note.level === "urgent"
                ? "border-red-200 bg-red-50/80 dark:border-red-800/60 dark:bg-red-950/50"
                : note.level === "warning"
                  ? "border-amber-200 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/50"
                  : "border-blue-200 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/50"
            }`}
          >
            <div className="flex items-start gap-2 p-3">
              <button
                onClick={() => onToastClick && onToastClick(note)}
                className="text-left flex-1"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{note.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{note.detail}</div>
                <div className={`mt-1 text-[11px] ${note.level === "urgent" ? "text-red-600 dark:text-red-400" : note.level === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {note.daysUntil === 0 ? "Due today" : `Due in ${note.daysUntil} days`} ? {note.dueDate}
                </div>
              </button>
              <button
                onClick={() => onToastDismiss && onToastDismiss(note.id)}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                title="Dismiss"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="toast-progress h-0.5 bg-white/80" />
          </div>
        ))}
      </div>
    )}
    </>
  );
};

// ---------------------------------------------------------------------------
// TAX RATE DIALOG
// ---------------------------------------------------------------------------
interface TaxRatesDialogProps {
  open: boolean;
  onClose: () => void;
  taxRates: TaxRate[];
  onSave: (taxRate: TaxRate) => void;
  onDelete: (id: string) => void;
}

const TaxRatesDialog: React.FC<TaxRatesDialogProps> = ({
  open,
  onClose,
  taxRates,
  onSave,
  onDelete,
}) => {
  const [editing, setEditing] = useState<TaxRate | null>(null);

  useEffect(() => {
    if (open) {
      setEditing(null);
    }
  }, [open]);

  if (!open) return null;

  const startNew = () => setEditing({ id: "", county: "", state: "", rate: 0, note: "" });

  const handleSubmit = () => {
    if (!editing || !editing.county.trim()) return;
    const payload: TaxRate = {
      ...editing,
      id: editing.id || `TR${Date.now()}`,
      county: editing.county.trim(),
      state: editing.state?.trim() || undefined,
      note: editing.note?.trim() || undefined,
      rate: Number(editing.rate) || 0,
    };
    onSave(payload);
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">County Tax Rates</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Record, update, and delete rates by county. Values are stored as percentages.</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={startNew}
              className="px-3 py-1.5 text-sm rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 flex items-center gap-1"
            >
              <IconAdd /> New Rate
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
              <IconX />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left pb-2">County</th>
                  <th className="text-left pb-2">State</th>
                  <th className="text-right pb-2">Rate (%)</th>
                  <th className="text-right pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxRates.map((tr) => (
                  <tr key={tr.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{tr.county}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{tr.state || "-"}</td>
                    <td className="py-2 text-right text-amber-700 dark:text-amber-300 font-semibold">{tr.rate.toFixed(2)}%</td>
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={() => setEditing(tr)}
                        className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(tr.id)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {taxRates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500 dark:text-slate-400">
                      No tax rates yet. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/60">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {editing ? (editing.id ? "Edit Tax Rate" : "New Tax Rate") : "Select a row to edit"}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">County</label>
                <input
                  value={editing?.county || ""}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, county: e.target.value } : { id: "", county: e.target.value, state: "", rate: 0 })}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  placeholder="e.g., Tarrant"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">State (optional)</label>
                <input
                  value={editing?.state || ""}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, state: e.target.value } : { id: "", county: "", state: e.target.value, rate: 0 })}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editing?.rate ?? 0}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, rate: parseFloat(e.target.value) } : { id: "", county: "", state: "", rate: parseFloat(e.target.value) })}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Notes</label>
                <textarea
                  value={editing?.note || ""}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, note: e.target.value } : { id: "", county: "", state: "", rate: 0, note: e.target.value })}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Optional context"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Clear
                </button>
                <button
                  disabled={!editing || !editing.county.trim()}
                  onClick={handleSubmit}
                  className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FORMULA PRESET DIALOGS
// ---------------------------------------------------------------------------
interface FormulaPresetDialogProps {
  open: boolean;
  onClose: () => void;
  presets: CustomFormula[];
  onDelete: (id: string) => void;
}

const FormulaPresetDialog: React.FC<FormulaPresetDialogProps> = ({
  open,
  onClose,
  presets,
  onDelete,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Formula Presets</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Saved formulas available across all projects. Create new presets from the formula dialog using â€œSave as presetâ€.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
            <IconX />
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
          {presets.map((preset) => (
            <div key={preset.id} className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-50">{preset.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">Preset</span>
                  </div>
                  {preset.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{preset.description}</p>
                  )}
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">{preset.formula}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {preset.resultType}
                  </div>
                  <button
                    onClick={() => onDelete(preset.id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {presets.length === 0 && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded">
              No presets yet. Save any custom formula as a preset to see it here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PresetPickerProps {
  open: boolean;
  onClose: () => void;
  presets: CustomFormula[];
  onApply: (presetId: string) => void;
}

const PresetPicker: React.FC<PresetPickerProps> = ({
  open,
  onClose,
  presets,
  onApply,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Add Formula Preset</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
            <IconX />
          </button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
          {presets.map((preset) => (
            <div key={preset.id} className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-50">{preset.name}</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{preset.formula}</p>
              </div>
              <button
                onClick={() => onApply(preset.id)}
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          ))}
          {presets.length === 0 && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded">
              No presets available. Save a formula as a preset first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EMAIL OPTIONS MANAGER
// ---------------------------------------------------------------------------
interface EmailOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  options: EmailOption[];
  onSave: (option: EmailOption) => void;
  onDelete: (id: string) => void;
}

const EmailOptionsDialog: React.FC<EmailOptionsDialogProps> = ({
  open,
  onClose,
  options,
  onSave,
  onDelete,
}) => {
  const [editing, setEditing] = useState<EmailOption | null>(null);

  useEffect(() => {
    if (!open) setEditing(null);
  }, [open]);

  const handleSave = () => {
    if (!editing || !editing.name.trim() || !editing.subject.trim() || !editing.body.trim()) return;
    const payload: EmailOption = {
      ...editing,
      id: editing.id || `EO${Date.now()}`,
      name: editing.name.trim(),
      description: editing.description?.trim() || undefined,
      subject: editing.subject.trim(),
      body: editing.body.trim(),
    };
    onSave(payload);
    setEditing(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Email Options</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage email templates you can send to sellers.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing({ id: "", name: "", description: "", subject: "", body: "" })}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              New Option
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
              <IconX />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-700 max-h-[80vh]">
          <div className="p-4 overflow-y-auto">
            {options.map((opt) => (
              <div key={opt.id} className="p-3 rounded border border-slate-200 dark:border-slate-700 mb-3 bg-white dark:bg-slate-800 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-50">{opt.name}</div>
                    {opt.description && <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Subject: {opt.subject}</p>
                    <pre className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded p-2 mt-1 whitespace-pre-wrap">{opt.body}</pre>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setEditing(opt)}
                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(opt.id)}
                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {options.length === 0 && (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded">
                No email options yet. Create one to get started.
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/70">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {editing ? (editing.id ? "Edit Email Option" : "New Email Option") : "Select an option to edit"}
            </h4>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Description</label>
                  <input
                    value={editing.description || ""}
                    onChange={(e) => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Subject</label>
                  <input
                    value={editing.subject}
                    onChange={(e) => setEditing(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Body</label>
                  <textarea
                    value={editing.body}
                    rows={6}
                    onChange={(e) => setEditing(prev => prev ? { ...prev, body: e.target.value } : null)}
                    className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Supports placeholders like {"{Seller Name}"} or {"{Property Name}"}.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editing.name.trim() || !editing.subject.trim() || !editing.body.trim()}
                    className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">Choose an option or create a new one.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ACQUISITION CONFIRMATION MODAL
// ---------------------------------------------------------------------------
interface AcquisitionConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const AcquisitionConfirmModal: React.FC<AcquisitionConfirmModalProps> = ({
  open,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Mark as Acquired?</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Seller details and outreach selections will be retained if you need to switch back.
          </p>
        </div>
        <div className="p-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow hover:from-blue-700 hover:to-blue-600"
          >
            Yes, Acquired
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CONTRACT VIEW (UNDER CONTRACT)
// ---------------------------------------------------------------------------
interface ContractViewProps {
  projectId: number;
  projectName: string;
  meta: ProjectPipelineMeta;
  emailOptions: EmailOption[];
  details: ProjectDetail[];
  onStatusChange: (status: ProjectStatus) => void;
  onSellerChange: (field: keyof ProjectPipelineMeta["seller"], value: string) => void;
  onToggleOption: (optionId: string) => void;
  onSend: () => void;
  onManageOptions: () => void;
  onUpdateDetail: (variable: string, value: string) => void;
}

  const ContractView: React.FC<ContractViewProps> = ({
  projectId,
  projectName,
  meta,
  emailOptions,
  details,
  onStatusChange,
  onSellerChange,
  onToggleOption,
  onSend,
  onManageOptions,
  onUpdateDetail,
}) => {
  const isValidEmail = meta.seller.email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(meta.seller.email.trim()) : false;
  const sendDisabled = !isValidEmail || meta.selectedEmailOptionIds.length === 0;
  const detailMap = useMemo(() => {
    const map: Record<string, string> = {};
    details.forEach(d => { map[d.variable] = d.value; });
    return map;
  }, [details]);

  const detailFields = [
    { label: "Address", key: "Address" },
    { label: "Not Acquired For (days)", key: "Under Contract For (days)" },
    { label: "Title Company Name", key: "Title Company Name" },
    { label: "Amount Under Contract", key: "Amount Under Contract" },
    { label: "Earnest Money", key: "Earnest Money" },
    { label: "SQFT", key: "SQFT" },
    { label: "Purchase Price", key: "Purchase Price" },
    { label: "ARV Estimate", key: "ARV Estimate" },
    { label: "ECIP (Estimate cost for renovation/repairs)", key: "ECIP (Estimate cost for renovation/repairs)" },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{projectName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Project is currently not acquired.</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-full text-sm font-semibold">
            Not Acquired
            <button
              onClick={() => onStatusChange("acquired")}
              className="ml-2 px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Mark Acquired
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Seller Contact</h3>
              <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Project #{projectId}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={meta.seller.name}
                  onChange={(e) => onSellerChange("name", e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Seller name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Phone</label>
                <input
                  value={meta.seller.phone}
                  onChange={(e) => onSellerChange("phone", e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
                <input
                  value={meta.seller.email}
                  onChange={(e) => onSellerChange("email", e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  type="email"
                  placeholder="seller@example.com"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Email Options</h3>
              <button
                onClick={onManageOptions}
                className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Manage Options
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {emailOptions.map((opt) => {
                const checked = meta.selectedEmailOptionIds.includes(opt.id);
                return (
                  <label key={opt.id} className="flex items-start gap-2 p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleOption(opt.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{opt.name}</div>
                      {opt.description && <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Subject: {opt.subject}</p>
                    </div>
                  </label>
                );
              })}
              {emailOptions.length === 0 && (
                <div className="text-sm text-slate-500 dark:text-slate-400">No options available. Create one.</div>
              )}
            </div>
            <button
              onClick={onSend}
              disabled={sendDisabled}
              className="mt-3 w-full px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Send Email (stub)
            </button>
            {sendDisabled && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Provide seller email and choose at least one option.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Key Deal Inputs</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Visible until acquisition; will appear in details panel after.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detailFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs text-slate-500 dark:text-slate-400">{f.label}</label>
                <input
                  value={detailMap[f.key] ?? ""}
                  onChange={(e) => onUpdateDetail(f.key, e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ACTION RIBBON
// ---------------------------------------------------------------------------
const ActionRibbon: React.FC<{
  onOpenTaxRates: () => void;
  onManagePresets: () => void;
  onCreateFormula: () => void;
  onAddPresetToProject?: () => void;
  onManageLedgerCategories?: () => void;
  onManageAccounts?: () => void;
  taxRateCount: number;
  presetCount: number;
  ledgerCategoryCount?: number;
  accountCount?: number;
  hasActiveProject: boolean;
}> = ({
  onOpenTaxRates,
  onManagePresets,
  onCreateFormula,
  onAddPresetToProject,
  onManageLedgerCategories,
  onManageAccounts,
  taxRateCount,
  presetCount,
  ledgerCategoryCount,
  accountCount,
  hasActiveProject,
}) => {
  return (
    <div className="w-full bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 shadow-sm flex items-center gap-3 overflow-x-auto">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <IconPercent />
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-slate-500 dark:text-slate-400">Tax Rates</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{taxRateCount} counties</span>
        </div>
        <button
          onClick={onOpenTaxRates}
          className="ml-2 px-2 py-1 text-xs rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60"
        >
          Manage
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <IconFunction />
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-slate-500 dark:text-slate-400">Formulas</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">New or edit</span>
        </div>
        <button
          onClick={onCreateFormula}
          disabled={!hasActiveProject}
          className={`ml-2 px-2 py-1 text-xs rounded-md ${hasActiveProject ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500"}`}
        >
          New
        </button>
        {onAddPresetToProject && (
          <button
            onClick={onAddPresetToProject}
            disabled={!hasActiveProject}
            className={`px-2 py-1 text-xs rounded-md border border-blue-200 dark:border-blue-700 ${hasActiveProject ? "text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/40" : "text-slate-400 cursor-not-allowed"}`}
          >
            Add Preset
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <IconCopy />
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-slate-500 dark:text-slate-400">Presets Library</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{presetCount} saved</span>
        </div>
        <button
          onClick={onManagePresets}
          className="ml-2 px-2 py-1 text-xs rounded-md bg-slate-900 text-white dark:bg-slate-600 hover:bg-slate-700 dark:hover:bg-slate-500"
        >
          Open
        </button>
      </div>

      {onManageLedgerCategories && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <IconTool />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-slate-500 dark:text-slate-400">Ledger Categories</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {ledgerCategoryCount ?? 0} saved
            </span>
          </div>
          <button
            onClick={onManageLedgerCategories}
            className="ml-2 px-2 py-1 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Manage
          </button>
        </div>
      )}

      {onManageAccounts && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <IconCreditCard />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-slate-500 dark:text-slate-400">Accounts</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {accountCount ?? 0} saved
            </span>
          </div>
          <button
            onClick={onManageAccounts}
            className="ml-2 px-2 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// LEDGER CATEGORY MANAGER
// ---------------------------------------------------------------------------
const LedgerCategoriesDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  categories: LedgerCategory[];
  onCreate: (name: string, parentId: string) => void;
  onUpdate: (id: string, name: string, parentId: string) => void;
  onDelete: (id: string) => void;
}> = ({ open, onClose, categories, onCreate, onUpdate, onDelete }) => {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setName("");
      setEditingId(null);
      setParentId("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editingId) {
      onUpdate(editingId, trimmed, parentId);
    } else {
      onCreate(trimmed, parentId);
    }
    setName("");
    setEditingId(null);
    setParentId("");
  };

  const parentOptions = categories.filter((c) => !c.parentId && c.id !== editingId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ledger Categories</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <IconX />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            />
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            >
              <option value="">Top-level</option>
              {parentOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editingId ? "Update" : "Add"}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded">
            {categories.length === 0 && (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No categories yet.</div>
            )}
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                <div className="flex flex-col">
                  <span className="text-sm text-slate-700 dark:text-slate-200">{cat.name}</span>
                  {cat.parentId && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {categories.find((p) => p.id === cat.parentId)?.name || "Parent"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(cat.id); setName(cat.name); setParentId(cat.parentId || ""); }}
                    className="rounded px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(cat.id)}
                    className="rounded px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:hover:bg-red-900/70"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// LEDGER ACCOUNTS MANAGER
// ---------------------------------------------------------------------------
const LedgerAccountsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  accounts: LedgerAccount[];
  onSave: (payload: { id?: string | null; name: string; type: LedgerAccount["type"]; institution?: string; last4?: string }) => void;
  onDelete: (id: string) => void;
}> = ({ open, onClose, accounts, onSave, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<LedgerAccount["type"]>("bank");
  const [institution, setInstitution] = useState("");
  const [last4, setLast4] = useState("");

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setName("");
      setType("bank");
      setInstitution("");
      setLast4("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: editingId,
      name: trimmed,
      type,
      institution: institution.trim(),
      last4: last4.trim(),
    });
    setEditingId(null);
    setName("");
    setType("bank");
    setInstitution("");
    setLast4("");
  };

  const handleEdit = (acct: LedgerAccount) => {
    setEditingId(acct.id);
    setName(acct.name);
    setType(acct.type || "bank");
    setInstitution(acct.institution || "");
    setLast4(acct.last4 || "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Accounts (Global)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage bank accounts, cards, and lines of credit.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <IconX />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Account name"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LedgerAccount["type"])}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="bank">Bank</option>
              <option value="credit">Credit Card</option>
              <option value="loc">Line of Credit</option>
              <option value="other">Other</option>
            </select>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Institution"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
            />
            <input
              type="text"
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
              placeholder="Last 4"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {editingId ? "Update Account" : "Add Account"}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setType("bank");
                  setInstitution("");
                  setLast4("");
                }}
                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto">
          {accounts.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">No accounts yet.</div>
          ) : (
            <div className="space-y-2">
              {accounts.map((acct) => (
                <div key={acct.id} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-slate-700 dark:text-slate-200">{acct.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {acct.type}{acct.institution ? ` · ${acct.institution}` : ""}{acct.last4 ? ` · ${acct.last4}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(acct)}
                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(acct.id)}
                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// EPS EXPLORER NODE
// ---------------------------------------------------------------------------
interface EpsNodeProps {
  node: EpsNode;
  depth: number;
  selectedNodeId: number | null;
  expanded: Set<number>;
  onNodeClick: (node: EpsNode) => void;
  onContextMenu: (x: number, y: number, node: EpsNode | null, activity: null, type: 'eps') => void;
  onToggleExpand: (nodeId: number) => void;
  pipelineMetaMap?: Record<number, ProjectPipelineMeta>;
}

const EpsNodeComponent: React.FC<EpsNodeProps> = ({
  node,
  depth,
  selectedNodeId,
  expanded,
  onNodeClick,
  onContextMenu,
  onToggleExpand,
  pipelineMetaMap,
}) => {
  const isSelected = node.id === selectedNodeId;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = hasChildren && expanded.has(node.id);
  const paddingLeft = `${depth * 15}px`;
  const projectKey = node.projectId ?? node.id;
  const meta = node.type === "project" ? pipelineMetaMap?.[projectKey] : undefined;
  const isNotAcquired = meta?.status === "under_contract";

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY, node, null, 'eps');
  }, [node, onContextMenu]);

  return (
    <div key={node.id}>
      <div
        data-eps-node
        className={`flex cursor-pointer items-center pr-2 transition-colors ${EPS_ROW_HEIGHT_CLASS} ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-900/40 border-l-4 border-blue-600 dark:border-blue-400"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/70 border-l-4 border-transparent"
        }`}
        style={{ paddingLeft }}
        onClick={() => onNodeClick(node)}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 flex items-center justify-center transition-transform duration-100 ${!hasChildren ? "opacity-0" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) onToggleExpand(node.id);
            }}
          >
            {hasChildren && (isExpanded ? <IconChevronDown /> : <IconChevronUp />)}
          </div>

          <span className={`mr-2 ${node.type === "project" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
            {ICONS[node.type]}
          </span>

          <span className={`text-sm truncate ${node.type === "project" ? "font-medium text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200"}`}>
            {node.name}
          </span>
          {isNotAcquired && (
            <span
              className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200 w-5 h-5 shadow-sm border border-amber-200/80 dark:border-amber-800/60"
              title="Not acquired"
            >
              <IconPercent />
            </span>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((c) => (
            <EpsNodeComponent
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              expanded={expanded}
              onNodeClick={onNodeClick}
              onContextMenu={onContextMenu}
              onToggleExpand={onToggleExpand}
              pipelineMetaMap={pipelineMetaMap}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// MAIN DASHBOARD
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("EPS");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [epsNodes, setEpsNodes] = useState<EpsNode[]>([]);
  const [wbsNodesDb, setWbsNodesDb] = useState<DbWbsNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<number, Activity[]>>({});
  const [transactions, setTransactions] = useState<Record<number, Transaction[]>>({});
  const [projectUtilities, setProjectUtilities] = useState<Record<number, ProjectUtility[]>>({});
  const [projectDraws, setProjectDraws] = useState<Record<number, ProjectDraw[]>>({});
  const [projectLoans, setProjectLoans] = useState<Record<number, ProjectLoanEntry[]>>({});
  const [projectPropertyTaxes, setProjectPropertyTaxes] = useState<Record<number, ProjectPropertyTax[]>>({});
  const [projectAcquisitions, setProjectAcquisitions] = useState<Record<number, ProjectAcquisition>>({});
  const [projectClosingCosts, setProjectClosingCosts] = useState<Record<number, ProjectClosingCost[]>>({});
  const [projectDebtService, setProjectDebtService] = useState<Record<number, ProjectDebtService[]>>({});
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [projectCostOverrides, setProjectCostOverrides] = useState<Record<number, ProjectCostOverride[]>>({});
  const [breakdownPresets, setBreakdownPresets] = useState<BreakdownPreset[]>([]);
  const [breakdownPresetItems, setBreakdownPresetItems] = useState<Record<string, BreakdownPresetItem[]>>({});
  const [projectBreakdownPrefs, setProjectBreakdownPrefs] = useState<Record<number, ProjectBreakdownPref>>({});
  const [kpiPresets, setKpiPresets] = useState<KpiPreset[]>([]);
  const [kpiPresetItems, setKpiPresetItems] = useState<Record<string, KpiPresetItem[]>>({});
  const [projectKpiPrefs, setProjectKpiPrefs] = useState<Record<number, ProjectKpiPref>>({});
  const [projectKpiOverrides, setProjectKpiOverrides] = useState<Record<number, ProjectKpiOverride[]>>({});
  const [projectDetails, setProjectDetails] = useState<Record<number, ProjectDetail[]>>({});
  const [customFormulas, setCustomFormulas] = useState<Record<number, CustomFormula[]>>({});
  const [formulaPresets, setFormulaPresets] = useState<CustomFormula[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string; email: string; role: string; avatarUrl?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState<{ id: number | null; email: string; name: string; role: string; password: string }>({
    id: null,
    email: "",
    name: "",
    role: "viewer",
    password: "",
  });
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserSummary | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const resetUserForm = useCallback(() => {
    setUserForm({ id: null, email: "", name: "", role: "viewer", password: "" });
  }, []);
  const [commitList, setCommitList] = useState<CommitItem[]>([]);
  const [commitSelectedId, setCommitSelectedId] = useState<number | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitDraftOpen, setCommitDraftOpen] = useState(false);
  const [commitDraftSaving, setCommitDraftSaving] = useState(false);
  const [commitDraftError, setCommitDraftError] = useState<string | null>(null);
  const [commitDraft, setCommitDraft] = useState<{
    description: string;
    changes: DraftChange[];
  }>({
    description: "",
    changes: [],
  });
  const commitDraftCount = commitDraft.changes.length;
  const openCommitModal = useCallback(() => {
    setMode("Commits");
    setCommitDraftOpen(true);
  }, [setMode]);
  const derivedCommitTags = useMemo(
    () => Array.from(new Set(commitDraft.changes.map((c) => (c.entity ? String(c.entity) : "misc")))),
    [commitDraft.changes]
  );
  const [pipelineMeta, setPipelineMeta] = useState<Record<number, ProjectPipelineMeta>>({});
  const [emailOptions, setEmailOptions] = useState<EmailOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rentRollProperties, setRentRollProperties] = useState<RentRollProperty[]>([]);
  const [rentRollEntries, setRentRollEntries] = useState<RentRollEntry[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantForm, setTenantForm] = useState({ name: "", email: "", password: "", rentUnitId: "", emailReminders: false });
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [tenantStatus, setTenantStatus] = useState<string | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [tenantSaving, setTenantSaving] = useState(false);
  const [tenantActivities, setTenantActivities] = useState<TenantActivity[]>([]);
  const [rentRollRecentActivities, setRentRollRecentActivities] = useState<TenantActivity[]>([]);
  const [rentRollActivityCollapsed, setRentRollActivityCollapsed] = useState(false);
  const [rentRollProperty, setRentRollProperty] = useState<string>("all");
  const [rentRollForm, setRentRollForm] = useState({
    propertyName: "",
    unit: "",
    tenant: "",
    tenantId: "",
    status: "Occupied" as RentRollStatus,
    rent: "",
    leaseEnd: "",
    initialDueMonthDay: "",
    bedrooms: "",
    bathrooms: "",
    lastPaymentDate: "",
    lastPaymentPaidStatus: "on_time" as "on_time" | "late" | "different_day",
    lastPaymentPaidDate: "",
  });
  const [rentRollModalOpen, setRentRollModalOpen] = useState(false);
  const [editingRentRollId, setEditingRentRollId] = useState<string | null>(null);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [rentPaymentModal, setRentPaymentModal] = useState<{ open: boolean; entryId: string | null; amount: string; date: string; note: string }>({
    open: false,
    entryId: null,
    amount: "",
    date: toDateString(getCentralTodayMs()),
    note: "",
  });
  const [rentRollDeleteModal, setRentRollDeleteModal] = useState<{ open: boolean; entry: RentRollEntry | null }>({ open: false, entry: null });
  const [rentRollDetailView, setRentRollDetailView] = useState<{ type: "unit" | "property"; id: string } | null>(null);
  const [rentRollDocuments, setRentRollDocuments] = useState<RentRollDocument[]>([]);
  const [rentRollExpenses, setRentRollExpenses] = useState<RentRollExpense[]>([]);
  const [rentExpenseCategories, setRentExpenseCategories] = useState<RentExpenseCategory[]>([]);
  const [rentRollDocLabel, setRentRollDocLabel] = useState("");
  const [rentRollExpenseForm, setRentRollExpenseForm] = useState({ date: toDateString(getCentralTodayMs()), categoryId: "", subCategoryId: "", description: "", amount: "" });
  const [utilityForm, setUtilityForm] = useState({ date: toDateString(getCentralTodayMs()), service: "", provider: "", amount: "", accountId: "", note: "" });
  const [editingUtilityId, setEditingUtilityId] = useState<string | null>(null);
  const [drawForm, setDrawForm] = useState({ date: toDateString(getCentralTodayMs()), description: "", amount: "", accountId: "", note: "" });
  const [editingDrawId, setEditingDrawId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({
    date: toDateString(getCentralTodayMs()),
    originationDate: "",
    payment: "",
    interest: "",
    principal: "",
    balance: "",
    accountId: "",
    note: "",
  });
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState<{ taxYear: string; dueDate: string; amount: string; status: ProjectPropertyTax["status"]; paidDate: string; note: string }>({
    taxYear: String(new Date().getUTCFullYear()),
    dueDate: toDateString(getCentralTodayMs()),
    amount: "",
    status: "due",
    paidDate: "",
    note: "",
  });
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [acquisitionForm, setAcquisitionForm] = useState({
    purchasePrice: "",
    acquisitionDraw: "",
    earnestMoney: "",
    closeDate: "",
    note: "",
  });
  const [editingAcquisitionId, setEditingAcquisitionId] = useState<string | null>(null);
  const [closingCostForm, setClosingCostForm] = useState({
    side: "purchase" as ProjectClosingCost["side"],
    label: "",
    amount: "",
    paid: false,
    paidDate: "",
    note: "",
  });
  const [editingClosingCostId, setEditingClosingCostId] = useState<string | null>(null);
  const [debtServiceFilterProjectId, setDebtServiceFilterProjectId] = useState("all");
  const [debtServiceForm, setDebtServiceForm] = useState({
    projectId: "",
    bank: "",
    balance: "",
    payment: "",
    interestRate: "",
    rateType: "fixed" as ProjectDebtService["rateType"],
    rateAdjustDate: "",
    maturityDate: "",
    note: "",
  });
  const [editingDebtServiceId, setEditingDebtServiceId] = useState<string | null>(null);
  const [costCategoryForm, setCostCategoryForm] = useState({ name: "", code: "" });
  const [editingCostCategoryId, setEditingCostCategoryId] = useState<string | null>(null);
  const [showCostCategoryManager, setShowCostCategoryManager] = useState(false);
  const [costOverrideDrafts, setCostOverrideDrafts] = useState<Record<string, { amount: string; note: string }>>({});
  const [breakdownPresetForm, setBreakdownPresetForm] = useState({ name: "", description: "", isDefault: false });
  const [editingBreakdownPresetId, setEditingBreakdownPresetId] = useState<string | null>(null);
  const [showBreakdownPresetManager, setShowBreakdownPresetManager] = useState(false);
  const [activeBreakdownPresetId, setActiveBreakdownPresetId] = useState<string | null>(null);
  const [breakdownItemDrafts, setBreakdownItemDrafts] = useState<Record<string, { include: boolean; sortOrder: string }>>({});
  const [kpiPresetForm, setKpiPresetForm] = useState({ name: "", description: "", isDefault: false });
  const [editingKpiPresetId, setEditingKpiPresetId] = useState<string | null>(null);
  const [showKpiPresetManager, setShowKpiPresetManager] = useState(false);
  const [activeKpiPresetId, setActiveKpiPresetId] = useState<string | null>(null);
  const [kpiItemForm, setKpiItemForm] = useState({
    presetId: "",
    name: "",
    formula: "",
    resultType: "currency" as KpiPresetItem["resultType"],
    sortOrder: "",
    enabled: true,
    scaleMin: "",
    scaleMax: "",
    scaleInvert: false,
  });
  const [editingKpiItemId, setEditingKpiItemId] = useState<string | null>(null);
  const [kpiOverrideDrafts, setKpiOverrideDrafts] = useState<Record<string, { value: string; note: string }>>({});
  const kpiFormulaRef = useRef<HTMLInputElement | null>(null);
  const kpiFormulaSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [toastItems, setToastItems] = useState<NotificationItem[]>([]);
  const [hiddenToastIds, setHiddenToastIds] = useState<Set<string>>(new Set());
  const [closingToastIds, setClosingToastIds] = useState<Set<string>>(new Set());
  const toastTimersRef = useRef<Record<string, number>>({});
  const toastEnqueueTimerRef = useRef<number | null>(null);
  const dismissToast = useCallback((id: string) => {
    setClosingToastIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setHiddenToastIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const timer = toastTimersRef.current[id];
    if (timer) {
      clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setClosingToastIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setToastItems((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }
  }, []);
  const handleNotificationDismiss = useCallback((id: string) => {
    setDismissedNotifications((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    dismissToast(id);
  }, [dismissToast]);
  const handleNotificationRead = useCallback((id: string) => {
    setReadNotifications((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    dismissToast(id);
  }, [dismissToast]);
  const handleNotificationUnread = useCallback((id: string) => {
    setReadNotifications((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setHiddenToastIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setClosingToastIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  const [expenseCategoryModalOpen, setExpenseCategoryModalOpen] = useState(false);
  const [expenseCategoryForm, setExpenseCategoryForm] = useState<{ id: string; name: string; parentId: string }>({ id: "", name: "", parentId: "" });
  const [deleteActivityModal, setDeleteActivityModal] = useState<{ open: boolean; activity: Activity | null; targetId: string }>({
    open: false,
    activity: null,
    targetId: "",
  });
  const [linkingPropertyId, setLinkingPropertyId] = useState<string | null>(null);
  const [linkTargetProjectId, setLinkTargetProjectId] = useState<string>("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"main" | "property" | "rentroll">("main");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [exportHistory, setExportHistory] = useState<{ id: string; type: string; format: string; filename: string; timestamp: string }[]>([]);
  const [statementUploads, setStatementUploads] = useState<{ id: string; name: string; size: number; uploadedAt: string }[]>([]);
  const [parsedStatements, setParsedStatements] = useState<{ uploadId: string; rows: { date: string; description: string; amount: number }[] }[]>([]);
    useEffect(() => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem("exportHistory");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setExportHistory(parsed);
        }
      } catch (err) {
        console.warn("Failed to load export history", err);
      }
    }, []);
  const loadStatements = useCallback(async () => {
    try {
      const res = await fetch("/api/statements");
      if (!res.ok) return;
      const data = await res.json();
      const uploads = data.uploads || [];
      setStatementUploads(uploads.map((u: any) => ({
        id: String(u.id),
        name: u.name,
        size: Number(u.size || 0),
        uploadedAt: u.uploadedAt,
      })));
      setParsedStatements(uploads.map((u: any) => ({
        uploadId: String(u.id),
        rows: (u.lines || []).map((l: any) => ({
          date: toDateString(toDateMs(l.date)),
          description: l.description,
          amount: Number(l.amount || 0),
        })),
      })));
    } catch (err) {
      console.error("Failed to load statements", err);
    }
  }, []);

  const loadRentData = useCallback(async () => {
    try {
      const [propsRes, unitsRes, payRes, docRes, expenseRes, expenseCatRes, tenantsRes] = await Promise.all([
        fetch("/api/rent/properties"),
        fetch("/api/rent/units"),
        fetch("/api/rent/payments"),
        fetch("/api/rent/documents"),
        fetch("/api/rent/expenses"),
        fetch("/api/rent/expense-categories"),
        fetch("/api/tenants"),
      ]);
      if (propsRes.ok) {
        const data = await propsRes.json();
        setRentRollProperties(
          (data.properties || []).map((p: any) => ({
            id: String(p.id),
            name: p.name || "Property",
            linkedProjectId: p.linkedProjectId ? Number(p.linkedProjectId) : null,
          }))
        );
      }
      if (unitsRes.ok) {
        const data = await unitsRes.json();
        setRentRollEntries(
          (data.units || []).map((u: any) => ({
            id: String(u.id),
            propertyId: String(u.propertyId),
            unit: u.unit,
            tenant: u.tenant || "Vacant",
            status: (u.status as RentRollStatus) || "Occupied",
              rent: Number(u.rent || 0),
              balance: 0,
              leaseEnd: u.leaseEnd || "TBD",
              initialDueMonthDay: u.initialDueMonthDay || "01-01",
              bedrooms: Number(u.bedrooms || 0),
              bathrooms: Number(u.bathrooms || 0),
              lastPaymentDate: u.lastPaymentDate ? toDateString(toDateMs(u.lastPaymentDate)) : null,
              lastPaymentPaidOnDate: typeof u.lastPaymentPaidOnDate === "boolean" ? u.lastPaymentPaidOnDate : null,
              lastPaymentPaidDate: u.lastPaymentPaidDate ? toDateString(toDateMs(u.lastPaymentPaidDate)) : null,
              createdAt: u.createdAt ? toDateString(toDateMs(u.createdAt)) : toDateString(getCentralTodayMs()),
            }))
          );
      }
        if (payRes.ok) {
          const data = await payRes.json();
          setRentPayments(
            (data.payments || []).map((p: any) => ({
              id: String(p.id),
              rentRollEntryId: String(p.rentUnitId),
              amount: Number(p.amount || 0),
              date: toDateString(toDateMs(p.date)),
              note: p.note || undefined,
            }))
          );
        }
        if (docRes.ok) {
          const data = await docRes.json();
          setRentRollDocuments(
            (data.documents || []).map((d: any) => ({
              id: String(d.id),
              entryId: String(d.rentUnitId),
              label: d.label || "Document",
              fileName: d.fileName || "file",
              fileType: d.fileType || "application/octet-stream",
              size: Number(d.size || 0),
              uploadedAt: d.uploadedAt ? toDateString(toDateMs(d.uploadedAt)) : toDateString(getCentralTodayMs()),
              dataUrl: d.dataUrl || "",
            }))
          );
        }
        if (expenseRes.ok) {
          const data = await expenseRes.json();
          setRentRollExpenses(
            (data.expenses || []).map((e: any) => ({
              id: String(e.id),
              entryId: String(e.rentUnitId),
              date: e.date ? toDateString(toDateMs(e.date)) : toDateString(getCentralTodayMs()),
              category: e.category || "",
              categoryId: e.categoryId ? String(e.categoryId) : null,
              subCategoryId: e.subCategoryId ? String(e.subCategoryId) : null,
              description: e.description || "",
              amount: Number(e.amount || 0),
            }))
          );
        }
        if (expenseCatRes.ok) {
          const data = await expenseCatRes.json();
          setRentExpenseCategories(
            (data.categories || []).map((c: any) => ({
              id: String(c.id),
              name: c.name || "Category",
              parentId: c.parentId ? String(c.parentId) : null,
              createdAt: c.createdAt ? toDateString(toDateMs(c.createdAt)) : undefined,
            }))
          );
        }
        if (tenantsRes.ok) {
          const data = await tenantsRes.json();
          setTenants(
            (data.tenants || []).map((t: any) => ({
              id: String(t.id),
              rentUnitId: t.rentUnitId ? String(t.rentUnitId) : null,
              name: t.name || "Tenant",
              email: t.email || "",
              emailReminders: Boolean(t.emailReminders),
              createdAt: t.createdAt ? toDateString(toDateMs(t.createdAt)) : undefined,
            }))
          );
        } else {
          setTenants([]);
        }
      } catch (err) {
        console.error("Failed to load rent data", err);
      }
    }, []);

  const mapActivityStatus = (status?: string): Activity["status"] => {
    const s = (status || "").toLowerCase();
    if (s.includes("progress")) return "In Progress";
    if (s.includes("complete")) return "Completed";
    return "Not Started";
  };

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return [];
      const data = await res.json();
      return data.projects || [];
    } catch (err) {
      console.error("Failed to load projects", err);
      return [];
    }
  }, []);

  const loadEpsNodes = useCallback(async () => {
    try {
      const res = await fetch("/api/eps");
      if (!res.ok) return [];
      const data = await res.json();
      const nodes: EpsNode[] = (data.nodes || []).map((n: any) => ({
        id: Number(n.id),
        parentId: n.parentId === null || n.parentId === undefined ? null : Number(n.parentId),
        type: n.type as EpsNodeType,
        name: n.name,
        projectId: n.projectId ? Number(n.projectId) : null,
        children: [],
      }));
      setEpsNodes(nodes);
      const firstRootId = nodes.find((n) => n.parentId === null)?.id ?? null;
      const firstProject = nodes.find((n) => n.type === "project");
      setSelectedNodeId(firstProject?.id ?? firstRootId);
      setActiveProjectId(firstProject?.projectId ?? null);
      setExpanded(
        nodes.length
          ? new Set(nodes.filter((n) => n.parentId !== null).map((n) => n.parentId!))
          : new Set<number>()
      );
      return nodes;
    } catch (err) {
      console.error("Failed to load EPS nodes", err);
      return [];
    }
  }, []);

  const loadWbs = useCallback(async () => {
    try {
      const res = await fetch("/api/wbs");
      if (!res.ok) return [];
      const data = await res.json();
      const nodes: DbWbsNode[] = (data.nodes || []).map((n: any) => ({
        id: Number(n.id),
        projectId: Number(n.projectId),
        code: n.code,
        name: n.name,
        parentId: n.parentId === null || n.parentId === undefined ? null : Number(n.parentId),
      }));
      setWbsNodesDb(nodes);
      return nodes;
    } catch (err) {
      console.error("Failed to load WBS nodes", err);
      return [];
    }
  }, []);

  const loadActivities = useCallback(async (wbsList?: DbWbsNode[]) => {
    const wbsMap = new Map<number, string>((wbsList || []).map((n) => [n.id, n.code]));
    try {
      const [resActivities, resAssignments] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/resource-assignments"),
      ]);
      if (!resActivities.ok) return {};
      const data = await resActivities.json();
      const assignments: any[] = resAssignments.ok ? ((await resAssignments.json()).assignments || []) : [];
      const assignmentsByActivity = assignments.reduce<Record<string, ActivityResource[]>>((acc, a) => {
        const key = String(a.activityId);
        acc[key] = acc[key] || [];
        acc[key].push({
          resourceId: String(a.resourceId),
          quantity: Number(a.plannedUnits ?? 0),
        });
        return acc;
      }, {});
      const grouped: Record<number, Activity[]> = {};
      (data.activities || []).forEach((a: any) => {
        const projectId = Number(a.projectId);
        if (!projectId) return;
        const wbsCode = wbsMap.get(Number(a.wbsId)) || a.code || "";
        const startDate = a.startDate ? toDateString(toDateMs(a.startDate)) : toDateString(getCentralTodayMs());
        const finishDate = a.finishDate ? toDateString(toDateMs(a.finishDate)) : startDate;
        const mapped: Activity = {
          id: String(a.id),
          wbs: wbsCode,
          name: a.name || "",
          start: startDate,
          finish: finishDate,
          duration: Number(a.durationDays || 0),
          pct: Number(a.percentComplete || 0),
          responsible: a.responsible || "",
          status: mapActivityStatus(a.status),
          projectedLabor: Number(a.projectedLabor || 0),
          projectedCost: Number(a.projectedCost || 0),
          budget: Number(a.budget || 0),
          revenue: Number(a.revenue || 0),
          resources: assignmentsByActivity[String(a.id)] || [],
          predecessors: a.predecessorIds ? a.predecessorIds.map((id: any) => String(id)) : [],
          successor: a.successorId ? String(a.successorId) : undefined,
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setActivities(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load activities", err);
      return {};
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, Transaction[]> = {};
      (data.transactions || []).forEach((t: any) => {
        const projectId = t.projectId ? Number(t.projectId) : null;
        if (!projectId) return;
        const mapped: Transaction = {
          id: String(t.id),
          date: toDateString(toDateMs(t.date)),
          description: t.description || "",
          type: t.type === "Income" ? "Income" : "Outcome",
          categoryId: t.categoryId ? String(t.categoryId) : (t.category_id ? String(t.category_id) : undefined),
          category: t.category || "",
          subCategoryId: t.subCategoryId ? String(t.subCategoryId) : (t.sub_category_id ? String(t.sub_category_id) : undefined),
          subCategory: t.subCategory || undefined,
          accountId: t.accountId ? String(t.accountId) : (t.account_id ? String(t.account_id) : undefined),
          accountName: t.accountName || t.account_name || undefined,
          amount: Number(t.amount || 0),
          activityId: t.activityId ? String(t.activityId) : undefined,
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setTransactions(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load transactions", err);
      return {};
    }
  }, []);

  const loadUtilities = useCallback(async () => {
    try {
      const res = await fetch("/api/utilities");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectUtility[]> = {};
      (data.utilities || []).forEach((u: any) => {
        const projectId = u.projectId ? Number(u.projectId) : (u.project_id ? Number(u.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectUtility = {
          id: String(u.id),
          projectId,
          date: u.date ? toDateString(toDateMs(u.date)) : toDateString(getCentralTodayMs()),
          service: u.service || "",
          provider: u.provider || "",
          amount: Number(u.amount || 0),
          accountId: u.accountId ? String(u.accountId) : (u.account_id ? String(u.account_id) : undefined),
          accountName: u.accountName || u.account_name || undefined,
          note: u.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectUtilities(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load utilities", err);
      return {};
    }
  }, []);

  const loadDraws = useCallback(async () => {
    try {
      const res = await fetch("/api/draws");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectDraw[]> = {};
      (data.draws || []).forEach((d: any) => {
        const projectId = d.projectId ? Number(d.projectId) : (d.project_id ? Number(d.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectDraw = {
          id: String(d.id),
          projectId,
          date: d.date ? toDateString(toDateMs(d.date)) : toDateString(getCentralTodayMs()),
          description: d.description || "",
          amount: Number(d.amount || 0),
          accountId: d.accountId ? String(d.accountId) : (d.account_id ? String(d.account_id) : undefined),
          accountName: d.accountName || d.account_name || undefined,
          note: d.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectDraws(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load draws", err);
      return {};
    }
  }, []);

  const loadLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectLoanEntry[]> = {};
      (data.loans || []).forEach((l: any) => {
        const projectId = l.projectId ? Number(l.projectId) : (l.project_id ? Number(l.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectLoanEntry = {
          id: String(l.id),
          projectId,
          date: l.date ? toDateString(toDateMs(l.date)) : toDateString(getCentralTodayMs()),
          originationDate: l.originationDate
            ? toDateString(toDateMs(l.originationDate))
            : (l.origination_date ? toDateString(toDateMs(l.origination_date)) : null),
          payment: Number(l.payment || 0),
          interest: Number(l.interest || 0),
          principal: Number(l.principal || 0),
          balance: l.balance !== null && l.balance !== undefined ? Number(l.balance) : null,
          accountId: l.accountId ? String(l.accountId) : (l.account_id ? String(l.account_id) : undefined),
          accountName: l.accountName || l.account_name || undefined,
          note: l.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectLoans(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load loans", err);
      return {};
    }
  }, []);

  const loadPropertyTaxes = useCallback(async () => {
    try {
      const res = await fetch("/api/property-taxes");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectPropertyTax[]> = {};
      (data.taxes || []).forEach((t: any) => {
        const projectId = t.projectId ? Number(t.projectId) : (t.project_id ? Number(t.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectPropertyTax = {
          id: String(t.id),
          projectId,
          taxYear: Number(t.taxYear ?? t.tax_year ?? new Date().getUTCFullYear()),
          dueDate: t.dueDate ? toDateString(toDateMs(t.dueDate)) : (t.due_date ? toDateString(toDateMs(t.due_date)) : toDateString(getCentralTodayMs())),
          amount: Number(t.amount || 0),
          status: (String(t.status || "due").toLowerCase() as ProjectPropertyTax["status"]) || "due",
          paidDate: t.paidDate ? toDateString(toDateMs(t.paidDate)) : (t.paid_date ? toDateString(toDateMs(t.paid_date)) : null),
          note: t.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectPropertyTaxes(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load property taxes", err);
      return {};
    }
  }, []);

  const loadTenantActivity = useCallback(async (entryId: string | null) => {
    if (!entryId) {
      setTenantActivities([]);
      return;
    }
    try {
      const res = await fetch(`/api/tenants/activity?rentUnitId=${Number(entryId)}`);
      if (!res.ok) throw new Error("Failed to load tenant activity");
      const data = await res.json();
      setTenantActivities(
        (data.activities || []).map((a: any) => ({
          id: String(a.id),
          tenantId: String(a.tenantId),
          rentUnitId: String(a.rentUnitId),
          statementId: a.statementId || null,
          eventType: a.eventType || "event",
          metadata: a.metadata || null,
          createdAt: a.createdAt ? toDateString(toDateMs(a.createdAt)) : null,
        }))
      );
    } catch (err) {
      console.error("Failed to load tenant activity", err);
      setTenantActivities([]);
    }
  }, []);

  const loadAllTenantActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants/activity");
      if (!res.ok) throw new Error("Failed to load tenant activity");
      const data = await res.json();
      setRentRollRecentActivities(
        (data.activities || []).map((a: any) => ({
          id: String(a.id),
          tenantId: String(a.tenantId),
          rentUnitId: String(a.rentUnitId),
          statementId: a.statementId || null,
          eventType: a.eventType || "event",
          metadata: a.metadata || null,
          createdAt: a.createdAt ? toDateString(toDateMs(a.createdAt)) : null,
        }))
      );
    } catch (err) {
      console.error("Failed to load tenant activity", err);
      setRentRollRecentActivities([]);
    }
  }, []);

  const loadAcquisitions = useCallback(async () => {
    try {
      const res = await fetch("/api/acquisitions");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectAcquisition> = {};
      (data.acquisitions || []).forEach((a: any) => {
        const projectId = a.projectId ? Number(a.projectId) : (a.project_id ? Number(a.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectAcquisition = {
          id: String(a.id),
          projectId,
          purchasePrice: Number(a.purchasePrice ?? a.purchase_price ?? 0),
          acquisitionDraw: Number(a.acquisitionDraw ?? a.acquisition_draw ?? 0),
          earnestMoney: Number(a.earnestMoney ?? a.earnest_money ?? 0),
          closeDate: a.closeDate
            ? toDateString(toDateMs(a.closeDate))
            : (a.close_date ? toDateString(toDateMs(a.close_date)) : null),
          note: a.note || "",
        };
        grouped[projectId] = mapped;
      });
      setProjectAcquisitions(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load acquisitions", err);
      return {};
    }
  }, []);

  const loadClosingCosts = useCallback(async () => {
    try {
      const res = await fetch("/api/closing-costs");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectClosingCost[]> = {};
      (data.closingCosts || []).forEach((c: any) => {
        const projectId = c.projectId ? Number(c.projectId) : (c.project_id ? Number(c.project_id) : null);
        if (!projectId) return;
        const side = String(c.side || "purchase").toLowerCase() === "sale" ? "sale" : "purchase";
        const mapped: ProjectClosingCost = {
          id: String(c.id),
          projectId,
          side,
          code: c.code || null,
          label: c.label || "",
          amount: Number(c.amount || 0),
          paid: Boolean(c.paid),
          paidDate: c.paidDate
            ? toDateString(toDateMs(c.paidDate))
            : (c.paid_date ? toDateString(toDateMs(c.paid_date)) : null),
          note: c.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectClosingCosts(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load closing costs", err);
      return {};
    }
  }, []);

  const loadDebtService = useCallback(async () => {
    try {
      const res = await fetch("/api/debt-service");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectDebtService[]> = {};
      (data.debtService || []).forEach((d: any) => {
        const projectId = d.projectId ? Number(d.projectId) : (d.project_id ? Number(d.project_id) : null);
        if (!projectId) return;
        const rateType = String(d.rateType ?? d.rate_type ?? "fixed").toLowerCase() === "variable" ? "variable" : "fixed";
        const mapped: ProjectDebtService = {
          id: String(d.id),
          projectId,
          bank: d.bank || "",
          balance: Number(d.balance || 0),
          payment: Number(d.payment || 0),
          interestRate: Number(d.interestRate ?? d.interest_rate ?? 0),
          rateType,
          rateAdjustDate: d.rateAdjustDate
            ? toDateString(toDateMs(d.rateAdjustDate))
            : (d.rate_adjust_date ? toDateString(toDateMs(d.rate_adjust_date)) : null),
          maturityDate: d.maturityDate
            ? toDateString(toDateMs(d.maturityDate))
            : (d.maturity_date ? toDateString(toDateMs(d.maturity_date)) : null),
          note: d.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectDebtService(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load debt service", err);
      return {};
    }
  }, []);

  const loadCostCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/cost-categories");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: CostCategory[] = (data.categories || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || "Category",
        code: c.code || null,
      }));
      setCostCategories(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load cost categories", err);
      return [];
    }
  }, []);

  const loadCostOverrides = useCallback(async () => {
    try {
      const res = await fetch("/api/cost-overrides");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectCostOverride[]> = {};
      (data.overrides || []).forEach((o: any) => {
        const projectId = o.projectId ? Number(o.projectId) : (o.project_id ? Number(o.project_id) : null);
        if (!projectId) return;
        const mapped: ProjectCostOverride = {
          id: String(o.id),
          projectId,
          categoryId: String(o.categoryId ?? o.category_id),
          amount: Number(o.amount || 0),
          note: o.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectCostOverrides(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load cost overrides", err);
      return {};
    }
  }, []);

  const loadBreakdownPresets = useCallback(async () => {
    try {
      const res = await fetch("/api/breakdown-presets");
      if (!res.ok) return { presets: [], items: {} };
      const data = await res.json();
      const presets: BreakdownPreset[] = (data.presets || []).map((p: any) => ({
        id: String(p.id),
        name: p.name || "Preset",
        description: p.description || "",
        isDefault: Boolean(p.isDefault ?? p.is_default),
      }));
      const itemsMap: Record<string, BreakdownPresetItem[]> = {};
      (data.items || []).forEach((i: any) => {
        const presetId = String(i.presetId ?? i.preset_id);
        const item: BreakdownPresetItem = {
          id: String(i.id),
          presetId,
          categoryId: String(i.categoryId ?? i.category_id),
          sortOrder: Number(i.sortOrder ?? i.sort_order ?? 0),
          include: Boolean(i.include),
        };
        itemsMap[presetId] = [...(itemsMap[presetId] || []), item];
      });
      Object.values(itemsMap).forEach((arr) => arr.sort((a, b) => a.sortOrder - b.sortOrder));
      setBreakdownPresets(presets);
      setBreakdownPresetItems(itemsMap);
      return { presets, items: itemsMap };
    } catch (err) {
      console.error("Failed to load breakdown presets", err);
      return { presets: [], items: {} };
    }
  }, []);

  const loadBreakdownPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/breakdown-prefs");
      if (!res.ok) return {};
      const data = await res.json();
      const map: Record<number, ProjectBreakdownPref> = {};
      (data.prefs || []).forEach((p: any) => {
        const projectId = Number(p.projectId ?? p.project_id);
        if (!projectId) return;
        map[projectId] = {
          id: String(p.id),
          projectId,
          presetId: String(p.presetId ?? p.preset_id),
        };
      });
      setProjectBreakdownPrefs(map);
      return map;
    } catch (err) {
      console.error("Failed to load breakdown prefs", err);
      return {};
    }
  }, []);

  const loadKpiPresets = useCallback(async () => {
    try {
      const res = await fetch("/api/kpi-presets");
      if (!res.ok) return { presets: [], items: {} };
      const data = await res.json();
      const presets: KpiPreset[] = (data.presets || []).map((p: any) => ({
        id: String(p.id),
        name: p.name || "Preset",
        description: p.description || "",
        isDefault: Boolean(p.isDefault ?? p.is_default),
      }));
      const itemsMap: Record<string, KpiPresetItem[]> = {};
      (data.items || []).forEach((i: any) => {
        const presetId = String(i.presetId ?? i.preset_id);
        const rawScaleMin = i.scaleMin ?? i.scale_min;
        const rawScaleMax = i.scaleMax ?? i.scale_max;
        const parsedScaleMin = rawScaleMin === null || rawScaleMin === undefined || rawScaleMin === "" ? null : Number(rawScaleMin);
        const parsedScaleMax = rawScaleMax === null || rawScaleMax === undefined || rawScaleMax === "" ? null : Number(rawScaleMax);
        const item: KpiPresetItem = {
          id: String(i.id),
          presetId,
          name: i.name || "KPI",
          formula: i.formula || "",
          resultType: (i.resultType ?? i.result_type ?? "currency") as KpiPresetItem["resultType"],
          sortOrder: Number(i.sortOrder ?? i.sort_order ?? 0),
          enabled: Boolean(i.enabled),
          scaleMin: Number.isFinite(parsedScaleMin as number) ? parsedScaleMin : null,
          scaleMax: Number.isFinite(parsedScaleMax as number) ? parsedScaleMax : null,
          scaleInvert: Boolean(i.scaleInvert ?? i.scale_invert),
        };
        itemsMap[presetId] = [...(itemsMap[presetId] || []), item];
      });
      Object.values(itemsMap).forEach((arr) => arr.sort((a, b) => a.sortOrder - b.sortOrder));
      setKpiPresets(presets);
      setKpiPresetItems(itemsMap);
      return { presets, items: itemsMap };
    } catch (err) {
      console.error("Failed to load kpi presets", err);
      return { presets: [], items: {} };
    }
  }, []);

  const loadKpiPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/kpi-prefs");
      if (!res.ok) return {};
      const data = await res.json();
      const map: Record<number, ProjectKpiPref> = {};
      (data.prefs || []).forEach((p: any) => {
        const projectId = Number(p.projectId ?? p.project_id);
        if (!projectId) return;
        map[projectId] = {
          id: String(p.id),
          projectId,
          presetId: String(p.presetId ?? p.preset_id),
        };
      });
      setProjectKpiPrefs(map);
      return map;
    } catch (err) {
      console.error("Failed to load kpi prefs", err);
      return {};
    }
  }, []);

  const loadKpiOverrides = useCallback(async () => {
    try {
      const res = await fetch("/api/kpi-overrides");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectKpiOverride[]> = {};
      (data.overrides || []).forEach((o: any) => {
        const projectId = Number(o.projectId ?? o.project_id);
        if (!projectId) return;
        const mapped: ProjectKpiOverride = {
          id: String(o.id),
          projectId,
          itemId: String(o.itemId ?? o.item_id),
          overrideValue: Number(o.overrideValue ?? o.override_value ?? 0),
          note: o.note || "",
        };
        grouped[projectId] = [...(grouped[projectId] || []), mapped];
      });
      setProjectKpiOverrides(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load kpi overrides", err);
      return {};
    }
  }, []);

  const loadLedgerCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/ledger/categories");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: LedgerCategory[] = (data.categories || []).map((c: any) => ({
        id: String(c.id),
        name: c.name || "Category",
        parentId: c.parentId ? String(c.parentId) : (c.parent_id ? String(c.parent_id) : null),
      }));
      setLedgerCategories(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load ledger categories", err);
      return [];
    }
  }, []);

  const loadLedgerAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: LedgerAccount[] = (data.accounts || []).map((a: any) => ({
        id: String(a.id),
        name: a.name || "Account",
        type: (String(a.type || "bank").toLowerCase() as LedgerAccount["type"]) || "bank",
        institution: a.institution || "",
        last4: a.last4 || "",
      }));
      setLedgerAccounts(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load accounts", err);
      return [];
    }
  }, []);

  const loadResourcesFromDb = useCallback(async () => {
    try {
      const res = await fetch("/api/resources");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: Resource[] = (data.resources || []).map((r: any) => ({
        id: String(r.id),
        name: r.name,
        type: (r.costType as Resource["type"]) || "Labor",
        rate: Number(r.standardRate || r.rate || 0),
        rateUnit: (r.unitType as Resource["rateUnit"]) || "hour",
        availability: r.availability ? Number(r.availability) : undefined,
      }));
      setResources(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load resources", err);
      return [];
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: Employee[] = (data.employees || []).map((e: any) => ({
        id: String(e.id),
        name: e.name,
        rate: Number(e.rate || 0),
      }));
      setEmployees(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load employees", err);
      return [];
    }
  }, []);

  const loadTimeEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/time-entries");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: TimeEntry[] = (data.timeEntries || []).map((t: any) => ({
        id: String(t.id),
        employeeId: String(t.employeeId),
        projectId: t.projectId ? Number(t.projectId) : null,
        date: String(t.date),
        hours: Number(t.hours || 0),
      }));
      setTimeEntries(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load time entries", err);
      return [];
    }
  }, []);

  const loadPaychecks = useCallback(async () => {
    try {
      const res = await fetch("/api/paychecks");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: Paycheck[] = (data.paychecks || []).map((p: any) => ({
        id: String(p.id),
        employeeId: String(p.employeeId),
        weekStart: toDateString(toDateMs(p.weekStart)),
        amount: Number(p.amount || 0),
        checkNumber: p.checkNumber || "",
      }));
      setPaychecks(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load paychecks", err);
      return [];
    }
  }, []);

  const getPresenceSessionId = useCallback(() => {
    if (typeof window === "undefined") return "";
    const key = "dashboard_presence_session_id";
    let existing = window.sessionStorage.getItem(key);
    if (!existing) {
      const fallback = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      existing = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : fallback;
      window.sessionStorage.setItem(key, existing);
    }
    return existing;
  }, []);

  const loadPresence = useCallback(async () => {
    if (!currentUser) return [];
    try {
      const res = await fetch("/api/presence", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: ActiveUser[] = (data.users || []).map((u: any) => ({
        id: Number(u.id),
        name: u.name || "User",
        email: u.email || "",
        role: String(u.role || "").trim().toLowerCase(),
        avatarUrl: u.avatarUrl || "",
        lastSeen: u.lastSeen ? String(u.lastSeen) : new Date().toISOString(),
      }));
      setActiveUsers(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load presence", err);
      return [];
    }
  }, [currentUser]);

  const heartbeatPresence = useCallback(async (sessionId: string) => {
    if (!currentUser || !sessionId) return;
    try {
      await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error("Failed to update presence", err);
    }
  }, [currentUser]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const normalizedUser = data.user
          ? { ...data.user, role: String(data.user.role || "").trim().toLowerCase() }
          : null;
        setCurrentUser(normalizedUser);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setAuthChecked(true);
    setMode("EPS");
  }, [setMode]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!file) return;
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setAvatarError("Image is too large. Use a file under 1.5MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    }).catch(() => "");
    if (!dataUrl) {
      setAvatarError("Unable to read image.");
      return;
    }
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to upload avatar");
      if (data?.user?.avatarUrl) {
        setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: data.user.avatarUrl } : prev));
      }
    } catch (err: any) {
      setAvatarError(err?.message || "Failed to upload avatar.");
    } finally {
      setAvatarUploading(false);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginForm.email.trim(), password: loginForm.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Invalid credentials");
      }
      const normalizedUser = data.user
        ? { ...data.user, role: String(data.user.role || "").trim().toLowerCase() }
        : null;
      setCurrentUser(normalizedUser);
      setAuthChecked(true);
      setMode("EPS");
    } catch (err: any) {
      setAuthError(err?.message || "Login failed");
      setCurrentUser(null);
      setAuthChecked(true);
    }
  }, [loginForm, setMode]);

  const loadUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin") return [];
    setUserError(null);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUserError(data?.error || "Failed to load users");
        return [];
      }
      const mapped: UserSummary[] = (data.users || []).map((u: any) => ({
        id: Number(u.id),
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      }));
      setUsersList(mapped);
      return mapped;
    } catch {
      setUserError("Failed to load users");
      return [];
    }
  }, [currentUser]);

  const handleSaveUser = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin") {
      setUserError("Admin access required");
      return;
    }
    setUserSaving(true);
    setUserError(null);
    try {
      const payload: Record<string, unknown> = {
        id: userForm.id ?? undefined,
        email: userForm.email.trim(),
        name: userForm.name.trim(),
        role: userForm.role,
      };
      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }
      const method = userForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save user");
      }
      await loadUsers();
      setUserModalOpen(false);
      resetUserForm();
    } catch (err: any) {
      setUserError(err?.message || "Failed to save user");
    } finally {
      setUserSaving(false);
    }
  }, [currentUser, userForm, loadUsers, resetUserForm]);

  const handleDeleteUser = useCallback(async () => {
    if (!currentUser || currentUser.role !== "admin" || !userDeleteTarget) {
      setUserError("Admin access required");
      return;
    }
    try {
      const res = await fetch(`/api/users?id=${userDeleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete user");
      }
      await loadUsers();
    } catch (err: any) {
      setUserError(err?.message || "Failed to delete user");
    } finally {
      setUserDeleteTarget(null);
    }
  }, [currentUser, userDeleteTarget, loadUsers]);

  const loadCommits = useCallback(async (withChanges = false) => {
    if (!currentUser) return [];
    setCommitError(null);
    setCommitLoading(true);
    try {
      const res = await fetch(`/api/commits${withChanges ? "?includeChanges=1" : ""}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load commits");
      }
      const list: CommitItem[] = (data.commits || []).map((c: any) => ({
        id: Number(c.id),
        serial: c.serial,
        description: c.description,
        tags: Array.isArray(c.tags) ? c.tags : [],
        status: c.status,
        authorId: c.authorId ?? null,
        authorName: c.authorName ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        appliedAt: c.appliedAt,
        changes: c.changes,
      }));
      setCommitList(list);
      if (withChanges && list.length && commitSelectedId) {
        const match = list.find((c) => c.id === commitSelectedId);
        if (!match && list.length) setCommitSelectedId(list[0].id);
      }
      return list;
    } catch (err: any) {
      setCommitError(err?.message || "Failed to load commits");
      return [];
    } finally {
      setCommitLoading(false);
    }
  }, [currentUser, commitSelectedId]);

  const updateCommitStatus = useCallback(async (id: number, status: CommitItem["status"]) => {
    try {
      const res = await fetch("/api/commits", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update commit");
      setCommitList((prev) => prev.map((c) => (c.id === id ? { ...c, status, appliedAt: status === "applied" ? new Date().toISOString() : c.appliedAt } : c)));
    } catch (err: any) {
      setCommitError(err?.message || "Failed to update commit");
    }
  }, []);

  const stageChange = useCallback((change: { entity: string; entityId?: string | number | null; operation: string; impact?: string; before?: any; after?: any }) => {
    setCommitDraftOpen(true);
    setMode("Commits");
    setCommitDraft((prev) => ({
      ...prev,
      changes: [
        ...prev.changes,
        {
          id: `chg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          entity: change.entity,
          entityId: change.entityId ? String(change.entityId) : "",
          operation: change.operation,
          impact: change.impact || "",
          beforeText: change.before ? JSON.stringify(change.before, null, 2) : "",
          afterText: change.after ? JSON.stringify(change.after, null, 2) : "",
        },
      ],
    }));
  }, [setMode]);

  const removeDraftChange = useCallback((id: string) => {
    setCommitDraft((prev) => ({
      ...prev,
      changes: prev.changes.filter((c) => c.id !== id),
    }));
  }, []);

  const handleSaveCommitDraft = useCallback(async () => {
    if (!currentUser) {
      setCommitDraftError("Login required");
      return;
    }
    setCommitDraftError(null);
    setCommitDraftSaving(true);
    try {
      const derivedTags = Array.from(
        new Set(commitDraft.changes.map((c) => (c.entity ? String(c.entity) : "misc")))
      );
      const changesPayload = commitDraft.changes.map((c) => {
        let beforeParsed: any = null;
        let afterParsed: any = null;
        if (c.beforeText.trim()) {
          try { beforeParsed = JSON.parse(c.beforeText); } catch { throw new Error("Invalid JSON in Before"); }
        }
        if (c.afterText.trim()) {
          try { afterParsed = JSON.parse(c.afterText); } catch { throw new Error("Invalid JSON in After"); }
        }
        return {
          entity: c.entity || "unknown",
          entityId: c.entityId ? Number(c.entityId) : null,
          operation: c.operation || "update",
          before: beforeParsed,
          after: afterParsed,
          impact: c.impact || "",
        };
      });

      const res = await fetch("/api/commits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: commitDraft.description,
          tags: derivedTags,
          changes: changesPayload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create commit");
      await loadCommits();
      setCommitDraftOpen(false);
      setCommitDraft({
        description: "",
        changes: [],
      });
      setMode("Commits");
    } catch (err: any) {
      setCommitDraftError(err?.message || "Failed to create commit");
    } finally {
      setCommitDraftSaving(false);
    }
  }, [commitDraft, currentUser, loadCommits]);

  const loadTaxRatesDb = useCallback(async () => {
    try {
      const res = await fetch("/api/tax-rates");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: TaxRate[] = (data.taxRates || []).map((tr: any) => ({
        id: String(tr.id),
        county: tr.county,
        state: tr.state || undefined,
        rate: Number(tr.rate || 0),
        note: tr.note || "",
      }));
      setTaxRates(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load tax rates", err);
      return [];
    }
  }, []);

  const loadProjectDetailsDb = useCallback(async () => {
    try {
      const res = await fetch("/api/project-details");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, ProjectDetail[]> = {};
      (data.details || []).forEach((d: any) => {
        const pid = Number(d.projectId);
        if (!pid) return;
        const detail: ProjectDetail = {
          id: String(d.id),
          variable: d.variable,
          value: d.value || "",
        };
        grouped[pid] = [...(grouped[pid] || []), detail];
      });
      setProjectDetails(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load project details", err);
      return {};
    }
  }, []);

  const loadFormulaPresetsDb = useCallback(async () => {
    try {
      const res = await fetch("/api/formula-presets");
      if (!res.ok) return [];
      const data = await res.json();
      const mapped: CustomFormula[] = (data.presets || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        formula: p.formula,
        description: p.description || "",
        resultType: (p.resultType as CustomFormula["resultType"]) || "currency",
      }));
      setFormulaPresets(mapped);
      return mapped;
    } catch (err) {
      console.error("Failed to load formula presets", err);
      return [];
    }
  }, []);

  const loadCustomFormulasDb = useCallback(async () => {
    try {
      const res = await fetch("/api/formulas");
      if (!res.ok) return {};
      const data = await res.json();
      const grouped: Record<number, CustomFormula[]> = {};
      (data.formulas || []).forEach((f: any) => {
        const pid = Number(f.projectId);
        if (!pid) return;
        const cf: CustomFormula = {
          id: String(f.id),
          name: f.name,
          formula: f.formula,
          description: f.description || "",
          resultType: (f.resultType as CustomFormula["resultType"]) || "currency",
        };
        grouped[pid] = [...(grouped[pid] || []), cf];
      });
      setCustomFormulas(grouped);
      return grouped;
    } catch (err) {
      console.error("Failed to load custom formulas", err);
      return {};
    }
  }, []);

  const loadPipelineMeta = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) return {};
      const data = await res.json();
      const map: Record<number, ProjectPipelineMeta> = {};
      (data.pipeline || []).forEach((p: any) => {
        const projectId = Number(p.projectId);
        if (!projectId) return;
        map[projectId] = {
          status: (p.status as ProjectStatus) || "under_contract",
          seller: {
            name: p.sellerName || "",
            phone: p.sellerPhone || "",
            email: p.sellerEmail || "",
          },
          selectedEmailOptionIds: p.selectedEmailOptionIds ? String(p.selectedEmailOptionIds).split(",").filter(Boolean) : [],
        };
      });
      setPipelineMeta(map);
      return map;
    } catch (err) {
      console.error("Failed to load pipeline meta", err);
      return {};
    }
  }, []);

  const loadDbData = useCallback(async () => {
    await checkAuth();
    const [projectsLoaded, wbsLoaded] = await Promise.all([loadProjects(), loadWbs()]);
    const epsLoaded = await loadEpsNodes();

    // auto-create EPS nodes for projects that don't have one yet
    const epsProjects = new Set(
      (epsLoaded || [])
        .filter((n): n is EpsNode => !!n && n.type === "project")
        .map((n) => Number(n.projectId ?? n.id))
    );
    type BasicProject = { id: number | string; name?: string; code?: string };
    const missingProjects = (projectsLoaded || []).filter((p: unknown): p is BasicProject => {
      if (!p || typeof p !== "object" || !("id" in p)) return false;
      return !epsProjects.has(Number((p as BasicProject).id));
    });
    for (const p of missingProjects) {
      try {
        const res = await fetch("/api/eps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name || p.code || `Project ${p.id}`,
            parentId: null,
            type: "project",
            projectId: Number(p.id),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const node = data.node;
          if (node) {
            setEpsNodes(prev => [...prev, {
              id: Number(node.id),
              parentId: node.parentId === null || node.parentId === undefined ? null : Number(node.parentId),
              type: node.type,
              name: node.name,
            }]);
          }
        }
      } catch (err) {
        console.error("Failed to backfill EPS node for project", p.id, err);
      }
    }

    await Promise.all([
      loadActivities(wbsLoaded),
      loadLedgerCategories(),
      loadLedgerAccounts(),
      loadProjectDetailsDb(),
      loadCustomFormulasDb(),
      loadFormulaPresetsDb(),
      loadTaxRatesDb(),
      loadPipelineMeta(),
    ]);
    return { projectsLoaded, wbsLoaded };
  }, [checkAuth, loadActivities, loadCustomFormulasDb, loadEpsNodes, loadFormulaPresetsDb, loadLedgerAccounts, loadLedgerCategories, loadPipelineMeta, loadProjectDetailsDb, loadProjects, loadTaxRatesDb, loadWbs]);

  const loadSupplementalData = useCallback(async () => {
    await Promise.all([
      loadTransactions(),
      loadUtilities(),
      loadDraws(),
      loadLoans(),
      loadPropertyTaxes(),
      loadAcquisitions(),
      loadClosingCosts(),
      loadDebtService(),
      loadCostCategories(),
      loadCostOverrides(),
      loadBreakdownPresets(),
      loadBreakdownPrefs(),
      loadKpiPresets(),
      loadKpiPrefs(),
      loadKpiOverrides(),
      loadResourcesFromDb(),
      loadEmployees(),
      loadTimeEntries(),
      loadPaychecks(),
    ]);
  }, [loadAcquisitions, loadBreakdownPrefs, loadBreakdownPresets, loadClosingCosts, loadCostCategories, loadCostOverrides, loadDebtService, loadDraws, loadEmployees, loadKpiOverrides, loadKpiPrefs, loadKpiPresets, loadLoans, loadPaychecks, loadPropertyTaxes, loadResourcesFromDb, loadTimeEntries, loadTransactions, loadUtilities]);
  const [isDetailsPanelVisible, setIsDetailsPanelVisible] = useState(true);
  const [epsViewTab, setEpsViewTab] = useState<"overview" | "gantt">("overview");
  const [activityView, setActivityView] = useState<"overview" | "details" | "gantt" | "ledger" | "utilities" | "draws" | "loans" | "taxes">("details");
  const [isProjectExplorerVisible, setIsProjectExplorerVisible] = useState(true);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerCategories, setLedgerCategories] = useState<LedgerCategory[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [quickLedgerActivityId, setQuickLedgerActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [draggingActivity, setDraggingActivity] = useState<{
    id: string;
    mode: "move" | "resize-start" | "resize-end";
    startMs: number;
    finishMs: number;
    grabOffsetMs: number;
  } | null>(null);
  const [ganttCreateMode, setGanttCreateMode] = useState(false);
  const [newActivityDraft, setNewActivityDraft] = useState<{ start: string; finish: string } | null>(null);
  const [draggingCompanySpan, setDraggingCompanySpan] = useState<{ projectId: number; anchorMs: number; grabOffsetMs: number } | null>(null);
  const [companyDragPreview, setCompanyDragPreview] = useState<{ projectId: number; deltaMs: number } | null>(null);
  const [companyScrollThumb, setCompanyScrollThumb] = useState({ widthPct: 100, leftPct: 0 });
  const companyDeltaRef = useRef(0);
  const companyGanttRef = useRef<HTMLDivElement>(null);
  const companyPanActive = useRef(false);
  const companyPanState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const [ganttMenu, setGanttMenu] = useState<{ x: number; y: number; activity: Activity | null }>({ x: 0, y: 0, activity: null });
  const [dependencyModal, setDependencyModal] = useState<{ open: boolean; mode: "pred" | "succ"; activity: Activity | null; targetId: string }>({
    open: false,
    mode: "pred",
    activity: null,
    targetId: ""
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    node: null,
    type: null,
    activity: null,
  });
  const [renameTarget, setRenameTarget] = useState<EpsNode | null>(null);

  // Modal states
  const [modalMode, setModalMode] = useState<"add" | "rename" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [pendingAddConfig, setPendingAddConfig] = useState<{ type: EpsNodeType; parentId: number | null; } | null>(null);
  const [taxRateDialogOpen, setTaxRateDialogOpen] = useState(false);
  const [formulaPresetDialogOpen, setFormulaPresetDialogOpen] = useState(false);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [ledgerCategoryDialogOpen, setLedgerCategoryDialogOpen] = useState(false);
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);
  const [emailOptionsDialogOpen, setEmailOptionsDialogOpen] = useState(false);
  const [acquireConfirmOpen, setAcquireConfirmOpen] = useState(false);
  const [pendingAcquireProjectId, setPendingAcquireProjectId] = useState<number | null>(null);
  const [laborWeekStart, setLaborWeekStart] = useState(() => getWeekStart(getCentralTodayMs()));
  const [paycheckNumbers, setPaycheckNumbers] = useState<Record<string, string>>({});
  const [paycheckEditModal, setPaycheckEditModal] = useState<{ open: boolean; paycheck: Paycheck | null; amount: string; checkNumber: string }>({
    open: false,
    paycheck: null,
    amount: "",
    checkNumber: "",
  });
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeNameInput, setEmployeeNameInput] = useState("");
  const [employeeRateInput, setEmployeeRateInput] = useState("");

  const rentRollPropertyMap = useMemo(() => {
    return rentRollProperties.reduce<Record<string, RentRollProperty>>((acc, p) => {
      acc[String(p.id)] = { ...p, id: String(p.id) };
      return acc;
    }, {});
  }, [rentRollProperties]);

  const filteredRentRoll = useMemo(() => {
    if (rentRollProperty === "all") return rentRollEntries;
    const target = String(rentRollProperty);
    return rentRollEntries.filter((entry) => String(entry.propertyId) === target);
  }, [rentRollEntries, rentRollProperty]);

  const nextDueMonthKeyFromCreation = useCallback((createdAt: string, monthDay: string) => {
    const createdMs = toDateMs(createdAt || toDateString(getCentralTodayMs()));
    const created = new Date(createdMs);
    const createdYear = created.getUTCFullYear();
    const createdMonth = created.getUTCMonth() + 1;
    const createdDay = created.getUTCDate();
    const { month: dueMonth, day: dueDay } = parseMonthDay(monthDay || "01-01");

    // Build the first due date on/after creation
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
    // If the chosen month/day is still before creation (e.g., creation later in same month), bump one month
    const adjustedMs = candidateMs < createdMs ? Date.UTC(targetYear, targetMonth, dueDay) : candidateMs;
    const adjustedDate = new Date(adjustedMs);
    const y = adjustedDate.getUTCFullYear();
    const m = adjustedDate.getUTCMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  }, []);
  const paymentRollup = useMemo(() => {
    const todayMs = getCentralTodayMs();
    const todayKey = getMonthKey(toDateString(todayMs));
    const paymentsByEntryMonth: Record<string, Record<string, { amount: number; firstDate: string }>> = {};
    rentPayments.forEach((p) => {
      const key = getMonthKey(p.date);
      paymentsByEntryMonth[p.rentRollEntryId] = paymentsByEntryMonth[p.rentRollEntryId] || {};
      const existing = paymentsByEntryMonth[p.rentRollEntryId][key];
      const dateStr = toDateString(toDateMs(p.date));
      paymentsByEntryMonth[p.rentRollEntryId][key] = {
        amount: (existing?.amount || 0) + p.amount,
        firstDate: existing?.firstDate
          ? (toDateMs(dateStr) < toDateMs(existing.firstDate) ? dateStr : existing.firstDate)
          : dateStr,
      };
    });

    const map: Record<string, { paid: number; balance: number; monthKey: string; monthLabel: string; dueDate: string; lateFee: number; totalDue: number }> = {};
    rentRollEntries.forEach((entry) => {
      const startKey = nextDueMonthKeyFromCreation(entry.createdAt || toDateString(getCentralTodayMs()), entry.initialDueMonthDay || "01-01");

      const months = monthKeySequence(startKey, todayKey);
      const paymentsForEntry = Object.entries(paymentsByEntryMonth[entry.id] || {}).reduce((sum, [, info]) => sum + info.amount, 0);

      let totalLateFeeOutstanding = 0;
      let totalDueOutstanding = 0;
      let remainingPaid = paymentsForEntry;
      let remainingBalance = 0;
      let firstUnpaidKey = months[0];
      let firstUnpaidDueDate = "";

      months.forEach((key) => {
        const dueDate = getMonthDayDate(key, entry.initialDueMonthDay || "01-01");
        const paymentInfoForMonth = paymentsByEntryMonth[entry.id]?.[key];
        const paidDateMs = paymentInfoForMonth?.firstDate ? toDateMs(paymentInfoForMonth.firstDate) : null;
        const settled = paymentInfoForMonth?.amount && paymentInfoForMonth.amount >= entry.rent;
        const comparisonDateMs = settled && paidDateMs ? paidDateMs : todayMs;
        const daysLate = Math.max(0, Math.floor((comparisonDateMs - toDateMs(dueDate)) / DAY_MS));
        const initialLateFee = daysLate >= 3 ? 50 : 0; // late after end of 3rd day
        const perDayLateStart = 5; // begins on 5th day
        const perDayCount = Math.max(0, daysLate - (perDayLateStart - 1));
        const perDayLateFee = Math.min(10, perDayCount) * 5; // up to 10 days
        const cappedLateFee = Math.min(initialLateFee + perDayLateFee, entry.rent * 0.12);

        const monthDue = entry.rent + cappedLateFee;

        if (remainingPaid >= monthDue) {
          // fully covered; no outstanding late fee for this month
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

      const effectiveDueDate = firstUnpaidDueDate || getMonthDayDate(nextMonthKey(todayKey), entry.initialDueMonthDay || "01-01");
      const monthLabel = new Date(toDateMs(effectiveDueDate)).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
      map[entry.id] = {
        paid: paymentsForEntry,
        balance: remainingBalance,
        monthKey: firstUnpaidKey,
        monthLabel,
        dueDate: effectiveDueDate,
        lateFee: totalLateFeeOutstanding,
        totalDue: totalDueOutstanding,
      };
    });
    return map;
  }, [rentRollEntries, rentPayments, nextDueMonthKeyFromCreation]);

  const downloadCsv = useCallback((filename: string, rows: (string | number)[][]) => {
    const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}, []);

  const downloadXlsx = useCallback(async (filename: string, sheets: { name: string; rows: (string | number)[][] }[]) => {
    const XLSX = await import("xlsx");
    const getColumnWidths = (rows: (string | number)[][]) => {
      const widths: { wch: number }[] = [];
      const cols = rows[0]?.length || 0;
      for (let c = 0; c < cols; c += 1) {
        let max = 8;
        rows.forEach((row) => {
          const value = row[c] ?? "";
          const len = String(value).length;
          if (len > max) max = len;
        });
        widths.push({ wch: Math.min(Math.max(max + 2, 10), 40) });
      }
      return widths;
    };
    const applyHeaderStyle = (ws: any, colCount: number) => {
      for (let c = 0; c < colCount; c += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c });
        const cell = ws[cellRef];
        if (!cell) continue;
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1F2937" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
      ws["!rows"] = [{ hpt: 20 }];
    };
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, rows }) => {
      const safeName = slugify(name || "Sheet").slice(0, 31) || "Sheet";
      const ws = XLSX.utils.aoa_to_sheet(rows);
      if (rows.length && rows[0]?.length) {
        const ref = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: rows.length - 1, c: rows[0].length - 1 },
        });
        ws["!autofilter"] = { ref };
        ws["!cols"] = getColumnWidths(rows);
        applyHeaderStyle(ws, rows[0].length);
      }
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const logExport = useCallback((type: string, format: string, filename: string) => {
    const entry = { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, format, filename, timestamp: new Date().toISOString() };
    setExportHistory((prev) => {
      const next = [entry, ...prev];
      if (typeof window !== "undefined") {
        try { window.localStorage.setItem("exportHistory", JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, []);

  const buildUtilitiesRows = (entries: ProjectUtility[], includeProject: boolean) => {
    const header = includeProject
      ? ["Date", "Service", "Provider", "Amount", "Account", "Note", "Project"]
      : ["Date", "Service", "Provider", "Amount", "Account", "Note"];
    const rows: (string | number)[][] = [header];
    entries.forEach((u) => {
      const projectName = includeProject ? epsProjectNameById(u.projectId) || `Project ${u.projectId}` : "";
      rows.push([
        u.date,
        u.service,
        u.provider || "",
        u.amount,
        u.accountName || ledgerAccounts.find((acct) => acct.id === u.accountId)?.name || "",
        u.note || "",
        ...(includeProject ? [projectName] : []),
      ]);
    });
    return rows;
  };

  const buildLoanRows = (entries: ProjectLoanEntry[], includeProject: boolean) => {
    const header = includeProject
      ? ["Date", "Origination Date", "Payment", "Interest", "Principal", "Balance", "Account", "Note", "Project"]
      : ["Date", "Origination Date", "Payment", "Interest", "Principal", "Balance", "Account", "Note"];
    const rows: (string | number)[][] = [header];
    entries.forEach((l) => {
      const projectName = includeProject ? epsProjectNameById(l.projectId) || `Project ${l.projectId}` : "";
      rows.push([
        l.date,
        l.originationDate || "",
        l.payment,
        l.interest,
        l.principal,
        l.balance ?? "",
        l.accountName || ledgerAccounts.find((acct) => acct.id === l.accountId)?.name || "",
        l.note || "",
        ...(includeProject ? [projectName] : []),
      ]);
    });
    return rows;
  };

  const exportMainLedger = (fmt?: "csv" | "xlsx") => {
    const format = fmt ?? exportFormat;
    const rows: (string | number)[][] = [
      ["Date", "Type", "Amount", "Description", "Source", "Property/Project", "Category", "Subcategory", "Account", "Activity"],
    ];
    // Rent payments
    rentPayments.forEach((p) => {
      const entry = rentRollEntries.find((e) => e.id === p.rentRollEntryId);
      const propertyName = entry ? rentRollPropertyMap[entry.propertyId]?.name || "Unlinked Property" : "Unlinked Property";
      const desc = entry ? `Rent payment - ${entry.unit}` : "Rent payment";
      rows.push([p.date, "Income", p.amount, desc, "Rent Payment", propertyName, "Rent", p.note || "", "", ""]);
    });
    // Project transactions
    Object.entries(transactions).forEach(([projIdStr, txns]) => {
      const projId = Number(projIdStr);
      const projName = epsProjectNameById(projId) || `Project ${projId}`;
      txns.forEach((t) => {
        rows.push([
          t.date,
          t.type,
          t.amount,
          t.description,
          "Project",
          projName,
          resolveLedgerCategoryName(t),
          resolveLedgerSubCategoryName(t),
          resolveLedgerAccountName(t),
          t.activityId || "",
        ]);
      });
    });
    rows.sort((a, b) => toDateMs(String(b[0])) - toDateMs(String(a[0])));
    if (format === "csv") {
      downloadCsv("main-ledger.csv", rows);
      logExport("Main Ledger", "CSV", "main-ledger.csv");
    } else {
      const utilitiesRows = buildUtilitiesRows(Object.values(projectUtilities).flat(), true);
      const loansRows = buildLoanRows(Object.values(projectLoans).flat(), true);
      downloadXlsx("main-ledger.xlsx", [
        { name: "Main Ledger", rows },
        { name: "Utilities", rows: utilitiesRows },
        { name: "Loans", rows: loansRows },
      ]);
      logExport("Main Ledger", "XLSX", "main-ledger.xlsx");
    }
  };

  const exportPropertyLedger = (fmt?: "csv" | "xlsx") => {
    const format = fmt ?? exportFormat;
    const projectIds = Object.keys(transactions).map(Number).filter(Boolean);

    if (format === "csv") {
      projectIds.forEach((pid) => {
        const rows: (string | number)[][] = [["Date", "Type", "Amount", "Description", "Source", "Category", "Subcategory", "Account", "Activity"]];
        const projTxns = (transactions[pid] || []).slice().sort((a, b) => toDateMs(b.date) - toDateMs(a.date));
        projTxns.forEach((t) => {
          rows.push([t.date, t.type, t.amount, t.description, "Project", resolveLedgerCategoryName(t), resolveLedgerSubCategoryName(t), resolveLedgerAccountName(t), t.activityId || ""]);
        });
        const projName = epsProjectNameById(pid) || `Project-${pid}`;
        const filename = `project-ledger-${slugify(projName)}.csv`;
        downloadCsv(filename, rows);
        logExport(`Project Ledger (${projName})`, "CSV", filename);
      });
    } else {
      const sheets = projectIds.flatMap((pid) => {
        const rows: (string | number)[][] = [["Date", "Type", "Amount", "Description", "Source", "Category", "Subcategory", "Account", "Activity"]];
        const projTxns = (transactions[pid] || []).slice().sort((a, b) => toDateMs(b.date) - toDateMs(a.date));
        projTxns.forEach((t) => rows.push([t.date, t.type, t.amount, t.description, "Project", resolveLedgerCategoryName(t), resolveLedgerSubCategoryName(t), resolveLedgerAccountName(t), t.activityId || ""]));
        const projName = epsProjectNameById(pid) || `Project-${pid}`;
        const utilitiesRows = buildUtilitiesRows(projectUtilities[pid] || [], false);
        const loansRows = buildLoanRows(projectLoans[pid] || [], false);
        return [
          { name: projName.slice(0, 28) || `Project-${pid}`, rows },
          { name: `Utilities ${projName}`.slice(0, 31), rows: utilitiesRows },
          { name: `Loans ${projName}`.slice(0, 31), rows: loansRows },
        ];
      });
      downloadXlsx("project-ledgers.xlsx", sheets);
      logExport("Project Ledgers", "XLSX", "project-ledgers.xlsx");
    }
  };

  const exportRentRollLedger = (fmt?: "csv" | "xlsx") => {
    const format = fmt ?? exportFormat;

    if (format === "csv") {
      rentRollProperties.forEach((prop) => {
        const rows: (string | number)[][] = [["Date", "Tenant/Unit", "Amount", "Note", "Account"]];
        rentRollEntries
          .filter((e) => e.propertyId === prop.id)
          .forEach((entry) => {
            rentPayments
              .filter((p) => p.rentRollEntryId === entry.id)
              .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
              .forEach((p) => {
                rows.push([p.date, `${entry.unit} - ${entry.tenant || "Vacant"}`, p.amount, p.note || "", ""]);
              });
          });
        const filename = `rent-roll-${slugify(prop.name)}.csv`;
        downloadCsv(filename, rows);
        logExport(`Rent Roll (${prop.name})`, "CSV", filename);
      });
    } else {
      const sheets = rentRollProperties.map((prop) => {
        const rows: (string | number)[][] = [["Date", "Tenant/Unit", "Amount", "Note", "Account"]];
        rentRollEntries
          .filter((e) => e.propertyId === prop.id)
          .forEach((entry) => {
            rentPayments
              .filter((p) => p.rentRollEntryId === entry.id)
              .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
              .forEach((p) => {
                rows.push([p.date, `${entry.unit} - ${entry.tenant || "Vacant"}`, p.amount, p.note || "", ""]);
              });
          });
        return { name: prop.name.slice(0, 28), rows };
      });
      downloadXlsx("rent-roll-ledger.xlsx", sheets);
      logExport("Rent Roll Ledgers", "XLSX", "rent-roll-ledger.xlsx");
    }
  };

  const rerunExport = (h: { type: string; format: string }) => {
    const fmt = h.format.toLowerCase() === "xlsx" ? "xlsx" : "csv";
    if (h.type.toLowerCase().includes("main ledger")) {
      exportMainLedger(fmt as "csv" | "xlsx");
      return;
    }
    if (h.type.toLowerCase().includes("project ledger")) {
      exportPropertyLedger(fmt as "csv" | "xlsx");
      return;
    }
    if (h.type.toLowerCase().includes("rent roll")) {
      exportRentRollLedger(fmt as "csv" | "xlsx");
      return;
    }
  };
  const rentRollSummary = useMemo(() => {
    const totalUnits = filteredRentRoll.length;
    const occupiedUnits = filteredRentRoll.filter((r) => r.status === "Occupied").length;
    const potential = filteredRentRoll.reduce((sum, r) => sum + r.rent, 0);
    const collected = filteredRentRoll.reduce((sum, r) => {
      const roll = paymentRollup[r.id];
      if (!roll) return sum;
      const paidApplied = Math.min(roll.paid, roll.totalDue);
      return sum + paidApplied;
    }, 0);
    const delinquent = filteredRentRoll.reduce((sum, r) => {
      const roll = paymentRollup[r.id];
      const totalDue = roll ? roll.totalDue : r.rent;
      const paidApplied = roll ? Math.min(roll.paid, roll.totalDue) : 0;
      return sum + Math.max(0, totalDue - paidApplied);
    }, 0);
    const occupancyRate = totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    return { totalUnits, occupancyRate, potential, collected, delinquent, occupiedUnits };
  }, [filteredRentRoll, paymentRollup]);
  const rentRollDetailEntry = useMemo(() => {
    if (rentRollDetailView?.type !== "unit") return null;
    return rentRollEntries.find((entry) => entry.id === rentRollDetailView.id) || null;
  }, [rentRollDetailView, rentRollEntries]);

  useEffect(() => {
    if (mode !== "RentRoll") return;
    if (rentRollDetailView?.type === "unit") {
      loadTenantActivity(rentRollDetailView.id);
    } else {
      setTenantActivities([]);
    }
  }, [loadTenantActivity, mode, rentRollDetailView]);

  useEffect(() => {
    if (mode !== "RentRoll") return;
    if (rentRollDetailView) return;
    loadAllTenantActivity();
  }, [loadAllTenantActivity, mode, rentRollDetailView]);
  const rentRollDetailProperty = useMemo(() => {
    if (rentRollDetailView?.type !== "property") return null;
    return rentRollProperties.find((prop) => prop.id === rentRollDetailView.id) || null;
  }, [rentRollDetailView, rentRollProperties]);
  const rentExpenseCategoryMap = useMemo(() => {
    return rentExpenseCategories.reduce<Record<string, RentExpenseCategory>>((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {});
  }, [rentExpenseCategories]);
  const ledgerCategoryMap = useMemo(() => {
    return ledgerCategories.reduce<Record<string, LedgerCategory>>((acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    }, {});
  }, [ledgerCategories]);
  const ledgerAccountMap = useMemo(() => {
    return ledgerAccounts.reduce<Record<string, LedgerAccount>>((acc, acct) => {
      acc[acct.id] = acct;
      return acc;
    }, {});
  }, [ledgerAccounts]);
  const resolveLedgerCategoryName = useCallback((t: Transaction) => {
    if (t.categoryId && ledgerCategoryMap[t.categoryId]) return ledgerCategoryMap[t.categoryId].name;
    return t.category;
  }, [ledgerCategoryMap]);
  const resolveLedgerSubCategoryName = useCallback((t: Transaction) => {
    if (t.subCategoryId && ledgerCategoryMap[t.subCategoryId]) return ledgerCategoryMap[t.subCategoryId].name;
    return t.subCategory || "";
  }, [ledgerCategoryMap]);
  const resolveLedgerAccountName = useCallback((t: Transaction) => {
    if (t.accountId && ledgerAccountMap[t.accountId]) return ledgerAccountMap[t.accountId].name;
    return t.accountName || "";
  }, [ledgerAccountMap]);
  const rentRollDetailDocs = useMemo(() => {
    if (!rentRollDetailEntry) return [];
    return rentRollDocuments.filter((doc) => doc.entryId === rentRollDetailEntry.id);
  }, [rentRollDocuments, rentRollDetailEntry]);
  const rentRollDetailExpenses = useMemo(() => {
    if (!rentRollDetailEntry) return [];
    return rentRollExpenses.filter((expense) => expense.entryId === rentRollDetailEntry.id);
  }, [rentRollExpenses, rentRollDetailEntry]);
  const rentRollDetailPayments = useMemo(() => {
    if (!rentRollDetailEntry) return [];
    return rentPayments
      .filter((payment) => payment.rentRollEntryId === rentRollDetailEntry.id)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rentPayments, rentRollDetailEntry]);
  const rentRollExpenseTotal = useMemo(() => {
    return rentRollDetailExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [rentRollDetailExpenses]);

  const getRemainingBalance = useCallback((entryId: string) => {
    const entry = rentRollEntries.find((e) => e.id === entryId);
    if (!entry) return 0;
    const roll = paymentRollup[entryId];
    return roll ? roll.balance : entry.rent;
  }, [paymentRollup, rentRollEntries]);

  // Activity editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [newActivityDialog, setNewActivityDialog] = useState(false);

  // Formula dialog state
  const [formulaDialogOpen, setFormulaDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<CustomFormula | null>(null);

  // Resource dialog states
  const [resourceAssignmentDialog, setResourceAssignmentDialog] = useState(false);
  const [activityForResources, setActivityForResources] = useState<Activity | null>(null);
  const [resourceManagementDialog, setResourceManagementDialog] = useState(false);

  useEffect(() => {
    if (activityView !== "gantt" || mode !== "Activities") {
      setGanttCreateMode(false);
      setNewActivityDraft(null);
    }
  }, [activityView, mode]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dashboard_notifications_dismissed");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setDismissedNotifications(new Set(parsed.map((id) => String(id))));
      }
    } catch (err) {
      console.warn("Failed to load dismissed notifications", err);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("dashboard_notifications_read");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setReadNotifications(new Set(parsed.map((id) => String(id))));
      }
    } catch (err) {
      console.warn("Failed to load read notifications", err);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("dashboard_notifications_dismissed", JSON.stringify(Array.from(dismissedNotifications)));
    } catch (err) {
      console.warn("Failed to persist dismissed notifications", err);
    }
  }, [dismissedNotifications]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("dashboard_notifications_read", JSON.stringify(Array.from(readNotifications)));
    } catch (err) {
      console.warn("Failed to persist read notifications", err);
    }
  }, [readNotifications]);
  useEffect(() => {
    if (mode === "Statements") {
      loadStatements();
    }
    if (mode === "RentRoll") {
      loadRentData();
    }
    if (mode === "Users") {
      loadUsers();
    }
    if (mode === "Commits") {
      loadCommits();
    }
  }, [mode, loadStatements, loadRentData, loadUsers, loadCommits]);

  const initialLoadRef = useRef(false);
  const supplementalLoadRef = useRef(false);
  const supplementalLoadingRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadDbData().then(() => {
      if (supplementalLoadRef.current) return;
      supplementalLoadRef.current = true;
      if (typeof window === "undefined") return;
      const schedule = (cb: () => void) => {
        if ("requestIdleCallback" in window) {
          (window as any).requestIdleCallback(cb, { timeout: 1200 });
        } else {
          globalThis.setTimeout(cb, 200);
        }
      };
      schedule(() => {
        if (supplementalLoadingRef.current) return;
        supplementalLoadingRef.current = true;
        loadSupplementalData().finally(() => {
          supplementalLoadingRef.current = false;
        });
      });
    });
  }, [loadDbData, loadSupplementalData]);

  useEffect(() => {
    if (activityView !== "overview") return;
    if (supplementalLoadRef.current || supplementalLoadingRef.current) return;
    supplementalLoadRef.current = true;
    supplementalLoadingRef.current = true;
    loadSupplementalData().finally(() => {
      supplementalLoadingRef.current = false;
    });
  }, [activityView, loadSupplementalData]);

  useEffect(() => {
    if (!currentUser) return;
    const sessionId = getPresenceSessionId();
    if (!sessionId) return;
    heartbeatPresence(sessionId);
    loadPresence();
    const interval = setInterval(() => {
      heartbeatPresence(sessionId);
      loadPresence();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, getPresenceSessionId, heartbeatPresence, loadPresence]);

  // --- EPS Node Operations ---
  const handleNodeClick = useCallback((node: EpsNode) => {
    setSelectedNodeId(node.id);
    if (node.type === "project") {
      setActiveProjectId(node.projectId ?? null);
    }
  }, []);

  const handleToggleExpand = useCallback((nodeId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((x: number, y: number, node: EpsNode | null, activity: Activity | null, type: 'eps' | 'activity') => {
    setContextMenu({ x, y, node, type, activity });
  }, []);

  const handleStartAdd = () => {
    const target = getAddTarget(contextMenu.node || null);
    setPendingAddConfig({ type: target.type, parentId: target.parentId });
    setModalMode("add");
    setModalValue("");
  };

  const handleConfirmAdd = async () => {
    if (!modalMode || modalMode !== "add" || !pendingAddConfig) {
      setModalMode(null);
      return;
    }

    const trimmed = modalValue.trim();
    if (!trimmed) {
      setModalMode(null);
      return;
    }

    // Non-admin staging path
    if (!currentUser || currentUser.role !== "admin") {
      if (pendingAddConfig.type === "project") {
        const tempId = Date.now();
        stageChange({
          entity: "projects",
          entityId: tempId,
          operation: "create",
          after: { name: trimmed, code: `PRJ-${Date.now().toString().slice(-5)}`, startDate: toDateString(getCentralTodayMs()) },
          impact: "Staged project create",
        });
        stageChange({
          entity: "eps_nodes",
          entityId: tempId,
          operation: "create",
          after: { name: trimmed, parentId: pendingAddConfig.parentId, type: "project", projectId: tempId },
          impact: "Staged EPS node create",
        });
        const newNode: EpsNode = {
          id: tempId,
          parentId: pendingAddConfig.parentId,
          type: "project",
          name: trimmed,
          projectId: tempId,
        };
        setEpsNodes((prev) => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
        setActiveProjectId(tempId);
        if (pendingAddConfig.parentId != null) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(pendingAddConfig.parentId!);
            return next;
          });
        }
      } else {
        const tempId = Date.now();
        stageChange({
          entity: "eps_nodes",
          entityId: tempId,
          operation: "create",
          after: { name: trimmed, parentId: pendingAddConfig.parentId, type: pendingAddConfig.type },
          impact: "Staged EPS node create",
        });
        const newNode: EpsNode = {
          id: tempId,
          parentId: pendingAddConfig.parentId,
          type: pendingAddConfig.type,
          name: trimmed,
          projectId: null,
        };
        setEpsNodes((prev) => [...prev, newNode]);
        if (pendingAddConfig.parentId != null) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(pendingAddConfig.parentId!);
            return next;
          });
        }
        setSelectedNodeId(newNode.id);
      }
      setPendingAddConfig(null);
      setModalMode(null);
      return;
    }

    // Admin path (live)
    if (pendingAddConfig.type !== "project") {
      try {
        const res = await fetch("/api/eps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            parentId: pendingAddConfig.parentId,
            type: pendingAddConfig.type,
          }),
        });
        if (!res.ok) throw new Error("Failed to create node");
        const data = await res.json();
        const node = data.node || {};
        const newNode: EpsNode = {
          id: Number(node.id || getNextId(epsNodes)),
          parentId: pendingAddConfig.parentId,
          type: pendingAddConfig.type,
          name: node.name || trimmed,
          projectId: node.projectId ? Number(node.projectId) : null,
        };
        setEpsNodes((prev) => [...prev, newNode]);
        if (pendingAddConfig.parentId != null) {
          setExpanded((prev) => {
            const next = new Set(prev);
            next.add(pendingAddConfig.parentId!);
            return next;
          });
        }
        setSelectedNodeId(newNode.id);
      } catch (err) {
        console.error("Failed to create EPS node", err);
        alert("Failed to create EPS node. Please try again.");
      }
      setPendingAddConfig(null);
      setModalMode(null);
      return;
    }

    try {
      const today = toDateString(getCentralTodayMs());
      const code = `PRJ-${Date.now().toString().slice(-5)}`;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, code, startDate: today }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const data = await res.json();
      const project = data.project || {};

      const epsRes = await fetch("/api/eps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name || trimmed,
          parentId: pendingAddConfig.parentId,
          type: "project",
          projectId: Number(project.id),
        }),
      });
      if (!epsRes.ok) throw new Error("Failed to create EPS node for project");
      const epsData = await epsRes.json();
      const epsNode = epsData.node || {};

      const newNode: EpsNode = {
        id: Number(epsNode.id || project.id),
        parentId: pendingAddConfig.parentId,
        type: "project",
        name: project.name || trimmed,
        projectId: Number(project.id),
      };

      setEpsNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setActiveProjectId(project.id ? Number(project.id) : null);
      if (pendingAddConfig.parentId != null) {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.add(pendingAddConfig.parentId!);
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to add project", err);
      alert("Failed to add project. Please try again.");
    }

    setPendingAddConfig(null);
    setModalMode(null);
  };

  const handleStartRename = () => {
    if (!contextMenu.node) return;
    setRenameTarget(contextMenu.node);
    setModalMode("rename");
    setModalValue(contextMenu.node.name);
  };

  const handleConfirmRename = () => {
    if (!modalMode || modalMode !== "rename" || !renameTarget) {
      setModalMode(null);
      setRenameTarget(null);
      return;
    }

    const trimmed = modalValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setModalMode(null);
      setRenameTarget(null);
      return;
    }

    if (!currentUser || currentUser.role !== "admin") {
      if (renameTarget.type === "project") {
        stageChange({
          entity: "projects",
          entityId: renameTarget.projectId ?? renameTarget.id,
          operation: "update",
          before: { name: renameTarget.name },
          after: { name: trimmed },
          impact: "Staged project rename",
        });
      }
      stageChange({
        entity: "eps_nodes",
        entityId: renameTarget.id,
        operation: "update",
        before: { name: renameTarget.name },
        after: { name: trimmed },
        impact: "Staged EPS rename",
      });
    } else {
      if (renameTarget.type === "project") {
        fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: renameTarget.id, name: trimmed }),
        }).catch(err => console.error("Failed to rename project", err));
      }
      fetch("/api/eps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: renameTarget.id, name: trimmed }),
      }).catch(err => console.error("Failed to rename eps node", err));
    }

    setEpsNodes((prev) =>
      prev.map((n) =>
        n.id === renameTarget.id ? { ...n, name: trimmed } : n
      )
    );
    setModalMode(null);
    setRenameTarget(null);
  };

  const handleCancelEdit = () => {
    setModalMode(null);
    setRenameTarget(null);
    setPendingAddConfig(null);
  };

  const handleDeleteNode = () => {
    if (!contextMenu.node) return;
    const confirmed = window.confirm(
      `Delete "${contextMenu.node.name}" and all of its children?`
    );
    if (!confirmed) return;

    const idsToDelete = new Set<number>();
    const collect = (id: number) => {
      idsToDelete.add(id);
      epsNodes.forEach((n) => {
        if (n.parentId === id) collect(n.id);
      });
    };
    collect(contextMenu.node.id);

    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "eps_nodes",
        entityId: contextMenu.node.id,
        operation: "delete",
        before: contextMenu.node,
        impact: "Staged EPS delete",
      });
      if (contextMenu.node.type === "project") {
        const projectDbId = contextMenu.node.projectId ?? contextMenu.node.id;
        stageChange({
          entity: "projects",
          entityId: projectDbId,
          operation: "delete",
          before: { id: projectDbId },
          impact: "Staged project delete",
        });
      }
    } else {
      fetch(`/api/eps?id=${contextMenu.node.id}`, { method: "DELETE" }).catch(err => console.error("Failed to delete eps node", err));
      if (contextMenu.node.type === "project") {
        const projectDbId = contextMenu.node.projectId ?? contextMenu.node.id;
        fetch(`/api/projects?id=${projectDbId}`, { method: "DELETE" })
          .catch(err => console.error("Failed to delete project", err));
      }
    }

    const remaining = epsNodes.filter((n) => !idsToDelete.has(n.id));
    setEpsNodes(remaining);
    setSelectedNodeId(null);
    setExpanded((prev) => {
      const alive = new Set(remaining.map((n) => n.id));
      const next = new Set<number>();
      prev.forEach((id) => {
        if (alive.has(id)) next.add(id);
      });
      return next;
    });

    setActivities((prev) => {
      const next = { ...prev };
      idsToDelete.forEach(id => delete next[id]);
      return next;
    });
    setTransactions((prev) => {
      const next = { ...prev };
      idsToDelete.forEach(id => delete next[id]);
      return next;
    });
    setProjectDetails((prev) => {
      const next = { ...prev };
      idsToDelete.forEach(id => delete next[id]);
      return next;
    });
    setCustomFormulas((prev) => {
      const next = { ...prev };
      idsToDelete.forEach(id => delete next[id]);
      return next;
    });
  };

  const handleDuplicateNode = () => {
    if (!contextMenu.node) return;

    const nodeToDupe = contextMenu.node;
    if (!nodeToDupe.parentId) {
      alert("Cannot duplicate the Enterprise node.");
      return;
    }

    if (nodeToDupe.type !== 'project') {
      alert("Duplicating non-project nodes is not supported.");
      setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
      return;
    }

    const newName = `${nodeToDupe.name} (Copy)`;
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, code: `PRJ-${Date.now().toString().slice(-5)}`, startDate: toDateString(getCentralTodayMs()) }),
    })
      .then(res => res.json())
      .then((data) => {
        const project = data.project || {};
        const newNode: EpsNode = {
          id: Number(project.id),
          parentId: null,
          type: "project",
          name: project.name || newName,
        };
        setEpsNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
        setActiveProjectId(newNode.id);
      })
      .catch(err => console.error("Failed to duplicate project", err))
      .finally(() => setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null }));
  };

  // --- Activity & Transaction Operations ---
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return epsNodes.find((n) => n.type === "project" && (n.projectId === activeProjectId || n.id === activeProjectId)) || null;
  }, [activeProjectId, epsNodes]);
  const activeProjectDbId = useMemo(() => activeProject?.projectId ?? null, [activeProject]);

  const resolveProjectId = useCallback(() => {
    if (activeProjectDbId) return activeProjectDbId;
    const node = selectedNodeId ? findNode(epsNodes, selectedNodeId) : null;
    if (node && node.type === "project" && node.projectId) {
      return node.projectId;
    }
    alert("This project is missing a linked projectId. Please re-create or relink the project.");
    return null;
  }, [activeProjectDbId, epsNodes, selectedNodeId]);

  const handleStartNewActivity = () => {
    if (!resolveProjectId()) return;
    setGanttCreateMode(false);
    setNewActivityDraft(null);
    setNewActivityDialog(true);
  };

  const handleAddActivity = useCallback(async (activity: Activity) => {
    const projectId = resolveProjectId();
    if (!projectId) return;

    // Staging path for non-admin
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "activities",
        entityId: null,
        operation: "create",
        after: { ...activity, projectId },
        impact: "Staged activity create",
      });
      setActivities((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), { ...activity, id: `staged-${Date.now()}` }],
      }));
      return;
    }

    try {
      const existingWbs = wbsNodesDb.find(
        (n) => n.projectId === projectId && n.code === activity.wbs
      );
      let wbsId = existingWbs?.id;
      if (!wbsId) {
        const resWbs = await fetch("/api/wbs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            code: activity.wbs || "1.0",
            name: activity.name,
            parentId: null,
            sortOrder: 0,
          }),
        });
        if (!resWbs.ok) {
          const msg = await resWbs.text();
          throw new Error(`Failed to create WBS: ${msg || resWbs.statusText}`);
        }
        const data = await resWbs.json();
        wbsId = Number(data.node?.id);
        const createdNode: DbWbsNode = {
          id: wbsId,
          projectId,
          code: activity.wbs || "1.0",
          name: activity.name,
          parentId: null,
        };
        setWbsNodesDb((prev) => [...prev, createdNode]);
      }

      if (!wbsId) throw new Error("Unable to resolve WBS for activity");

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          wbsId: wbsId,
          code: activity.wbs || activity.id,
          name: activity.name,
          bucket: activity.bucket,
          property: activity.property,
          priority: "Medium",
          status: activity.status,
          startDate: activity.start,
          finishDate: activity.finish,
          durationDays: Number(activity.duration || 0),
          percentComplete: Number(activity.pct || 0),
          responsible: activity.responsible,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to create activity");
      }
      const data = await res.json();
      const saved = data.activity || {};
      const mapped: Activity = {
        ...activity,
        id: String(saved.id || activity.id),
        wbs: activity.wbs || "",
      };
      setActivities(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), mapped]
      }));
    } catch (err) {
      console.error("Failed to add activity", err);
    }
  }, [resolveProjectId, wbsNodesDb, currentUser, stageChange]);

  const handleUpdateActivity = (
    activityId: string,
    field: keyof Activity,
    value: string
  ) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;

    const newValue = field === 'duration' || field === 'pct' || field === 'projectedLabor' || field === 'projectedCost' || field === 'budget' || field === 'revenue'
      ? parseFloat(value)
      : value;

    // Staging for non-admins
    if (!currentUser || currentUser.role !== "admin") {
      const existing = activities[projectKey]?.find(a => a.id === activityId);
      if (!existing) return;
      const next = { ...existing, [field]: newValue };
      stageChange({
        entity: "activities",
        entityId: activityId,
        operation: "update",
        before: existing,
        after: next,
        impact: `Staged activity ${field} change`,
      });
      setActivities(prev => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).map(a =>
          a.id === activityId ? next : a
        )
      }));
      return;
    }

    const payload: Record<string, unknown> = { id: Number(activityId) };
    if (field === "name") payload.name = value;
    if (field === "status") payload.status = value;
    if (field === "responsible") payload.responsible = value;
      if (field === "duration") payload.durationDays = newValue;
      if (field === "pct") payload.percentComplete = newValue;
      if (field === "budget") payload.budget = newValue;
      if (field === "revenue") payload.revenue = newValue;
      if (field === "projectedLabor") payload.projectedLabor = newValue;
      if (field === "projectedCost") payload.projectedCost = newValue;
    if (field === "wbs") {
      const target = wbsNodesDb.find(n => n.code === value);
      if (!target) {
        alert("WBS code not found. Please create it in the WBS tree first.");
        return;
      }
      payload.wbsId = Number(target.id);
      payload.code = value;
    }
    if (field === "start" || field === "finish") {
      const act = activities[projectKey]?.find(a => a.id === activityId);
      payload.startDate = field === "start" ? value : act?.start;
      payload.finishDate = field === "finish" ? value : act?.finish;
    }
    fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(err => console.error("Failed to update activity", err));

    setActivities(prev => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).map(a =>
        a.id === activityId ? { ...a, [field]: newValue } : a
      )
    }));
  };

  const handleDeleteActivity = () => {
    if (!activeProjectId || !contextMenu.activity) return;
    setDeleteActivityModal({ open: true, activity: contextMenu.activity, targetId: "" });
    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  const handleConfirmDeleteActivity = async () => {
    if (!deleteActivityModal.activity || !activeProjectDbId) {
      setDeleteActivityModal({ open: false, activity: null, targetId: "" });
      return;
    }
    const activityId = deleteActivityModal.activity.id;
    const targetId = deleteActivityModal.targetId || null;
    const projectKey = activeProjectDbId;
    const projectTxns = transactions[projectKey] || [];
    const toReassign = projectTxns.filter(t => t.activityId === activityId);

    // Staging for non-admins
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "activities",
        entityId: activityId,
        operation: "delete",
        before: deleteActivityModal.activity,
        impact: "Staged activity delete",
      });
      setTransactions(prev => ({
        ...prev,
        [projectKey]: projectTxns.map(t => t.activityId === activityId ? { ...t, activityId: targetId || undefined } : t),
      }));
      setActivities(prev => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter(a => a.id !== activityId)
      }));
      setDeleteActivityModal({ open: false, activity: null, targetId: "" });
      return;
    }

    // Reassign transactions if needed
    await Promise.all(toReassign.map(async (t) => {
      try {
        await fetch("/api/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(t.id), activityId: targetId ? Number(targetId) : null }),
        });
      } catch (err) {
        console.error("Failed to reassign transaction", err);
      }
    }));

    // Delete activity
    try {
      await fetch(`/api/activities?id=${Number(activityId)}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete activity", err);
    }

    setTransactions(prev => ({
      ...prev,
      [projectKey]: projectTxns.map(t => t.activityId === activityId ? { ...t, activityId: targetId || undefined } : t),
    }));
    setActivities(prev => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).filter(a => a.id !== activityId)
    }));
    setDeleteActivityModal({ open: false, activity: null, targetId: "" });
  };

  const handleDuplicateActivity = () => {
    if (!activeProjectId || !contextMenu.activity) return;

    const newActivity: Activity = {
      ...contextMenu.activity,
      id: getNextActivityId(activities),
      name: `${contextMenu.activity.name} (Copy)`,
      start: new Date().toISOString().split('T')[0],
      finish: new Date().toISOString().split('T')[0],
      pct: 0,
      status: 'Not Started',
      resources: [...contextMenu.activity.resources],
      predecessors: [],
    };
    handleAddActivity(newActivity);
    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  const deleteActivityById = (activityId: string) => {
    if (!activeProjectId) return;
    fetch(`/api/activities?id=${Number(activityId)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete activity", err));
    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter(a => a.id !== activityId)
    }));
  };

  const epsProjects = useMemo(() => epsNodes.filter(n => n.type === "project"), [epsNodes]);
  const epsProjectMap = useMemo(() => {
    const map: Record<number, string> = {};
    epsProjects.forEach((p) => {
      if (p.projectId) map[p.projectId] = p.name; // map DB id
      map[p.id] = p.name; // also map EPS node id
    });
    return map;
  }, [epsProjects]);

  const epsProjectNameById = useCallback((id: number | null | undefined) => (id && epsProjectMap[id]) || "", [epsProjectMap]);
  const getProjectDbIdFromNode = useCallback((nodeId: number | null | undefined) => {
    if (!nodeId) return null;
    const node = findNode(epsNodes, nodeId);
    if (node && node.type === "project" && node.projectId) return node.projectId;
    return null;
  }, [epsNodes]);

  const handleAddTransaction = useCallback(async (transaction: Omit<Transaction, "id">, projectIdOverride?: number) => {
    const projectKey = projectIdOverride ?? activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const normalizedCategoryId = transaction.categoryId && !Number.isNaN(Number(transaction.categoryId))
      ? Number(transaction.categoryId)
      : null;
    const normalizedSubCategoryId = transaction.subCategoryId && !Number.isNaN(Number(transaction.subCategoryId))
      ? Number(transaction.subCategoryId)
      : null;
    const normalizedAccountId = transaction.accountId && !Number.isNaN(Number(transaction.accountId))
      ? Number(transaction.accountId)
      : null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "ledger_transactions",
        entityId: null,
        operation: "create",
        after: {
          ...transaction,
          categoryId: normalizedCategoryId,
          subCategoryId: normalizedSubCategoryId,
          accountId: normalizedAccountId,
          projectId: projectKey,
        },
        impact: "Staged ledger transaction",
      });
      setTransactions(prev => ({
        ...prev,
        [projectKey]: [...(prev[projectKey] || []), { ...transaction, id: `staged-${Date.now()}` }],
      }));
      return;
    }
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transaction,
          projectId: projectKey,
          activityId: transaction.activityId ? Number(transaction.activityId) : null,
          categoryId: normalizedCategoryId,
          subCategoryId: normalizedSubCategoryId,
          accountId: normalizedAccountId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create transaction");
      const data = await res.json();
      const saved = data.transaction || {};
      const newTransaction: Transaction = {
        ...transaction,
        id: String(saved.id || `T${Date.now()}`),
      };
      setTransactions(prev => ({
        ...prev,
        [projectKey]: [...(prev[projectKey] || []), newTransaction]
      }));
    } catch (err) {
      console.error("Failed to add transaction", err);
    }
  }, [activeProjectDbId, resolveProjectId, currentUser, stageChange]);

  const handleUpdateTransaction = (transaction: Transaction, projectIdOverride?: number) => {
    const projectKey = projectIdOverride ?? activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const normalizedCategoryId = transaction.categoryId && !Number.isNaN(Number(transaction.categoryId))
      ? Number(transaction.categoryId)
      : null;
    const normalizedSubCategoryId = transaction.subCategoryId && !Number.isNaN(Number(transaction.subCategoryId))
      ? Number(transaction.subCategoryId)
      : null;
    const normalizedAccountId = transaction.accountId && !Number.isNaN(Number(transaction.accountId))
      ? Number(transaction.accountId)
      : null;
    if (!currentUser || currentUser.role !== "admin") {
      const existing = (transactions[projectKey] || []).find(t => t.id === transaction.id);
      stageChange({
        entity: "ledger_transactions",
        entityId: transaction.id,
        operation: "update",
        before: existing || null,
        after: {
          ...transaction,
          categoryId: normalizedCategoryId,
          subCategoryId: normalizedSubCategoryId,
          accountId: normalizedAccountId,
        },
        impact: "Staged ledger transaction update",
      });
      setTransactions(prev => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).map(t => t.id === transaction.id ? transaction : t),
      }));
      return;
    }
    fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: Number(transaction.id),
        projectId: projectKey,
        activityId: transaction.activityId ? Number(transaction.activityId) : null,
        type: transaction.type,
        categoryId: normalizedCategoryId,
        subCategoryId: normalizedSubCategoryId,
        accountId: normalizedAccountId,
        accountName: transaction.accountName,
        category: transaction.category,
        subCategory: transaction.subCategory,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
      }),
    }).catch(err => console.error("Failed to update transaction", err));
    setTransactions(prev => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).map(t => t.id === transaction.id ? transaction : t),
    }));
  };

  const handleDeleteTransaction = (transactionId: string, projectIdOverride?: number) => {
    const projectKey = projectIdOverride ?? activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    if (!currentUser || currentUser.role !== "admin") {
      const existing = (transactions[projectKey] || []).find(t => t.id === transactionId);
      stageChange({
        entity: "ledger_transactions",
        entityId: transactionId,
        operation: "delete",
        before: existing || null,
        impact: "Staged ledger transaction delete",
      });
      setTransactions(prev => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter(t => t.id !== transactionId),
      }));
      return;
    }
    fetch(`/api/transactions?id=${Number(transactionId)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete transaction", err));
    setTransactions(prev => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).filter(t => t.id !== transactionId),
    }));
  };

  const resetUtilityForm = () => {
    setUtilityForm({ date: toDateString(getCentralTodayMs()), service: "", provider: "", amount: "", accountId: "", note: "" });
    setEditingUtilityId(null);
  };

  const handleSaveUtility = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const amount = parseFloat(utilityForm.amount);
    const service = utilityForm.service.trim();
    if (!utilityForm.date || !service || !Number.isFinite(amount)) return;
    const payload = {
      projectId: projectKey,
      date: utilityForm.date,
      service,
      provider: utilityForm.provider.trim(),
      amount,
      accountId: utilityForm.accountId || undefined,
      accountName: utilityForm.accountId
        ? (ledgerAccounts.find((a) => a.id === utilityForm.accountId)?.name || "")
        : "",
      note: utilityForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingUtilityId || `UTIL-${Date.now().toString(36)}`;
      const existing = (projectUtilities[projectKey] || []).find((u) => u.id === editingUtilityId) || null;
      stageChange({
        entity: "project_utilities",
        entityId: editingUtilityId || null,
        operation: editingUtilityId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingUtilityId ? "Staged utility update" : "Staged utility create",
      });
      setProjectUtilities((prev) => {
        const list = prev[projectKey] || [];
        const next = editingUtilityId
          ? list.map((u) => (u.id === editingUtilityId ? { ...u, ...payload, id: tempId } : u))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectKey]: next };
      });
      resetUtilityForm();
      return;
    }
    try {
      const method = editingUtilityId ? "PATCH" : "POST";
      const res = await fetch("/api/utilities", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingUtilityId
            ? { id: Number(editingUtilityId), ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
            : { ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save utility");
      const data = await res.json();
      const saved = data.utility || {};
      setProjectUtilities((prev) => {
        const list = prev[projectKey] || [];
        const mapped: ProjectUtility = {
          id: String(saved.id || editingUtilityId || `UTIL-${Date.now().toString(36)}`),
          projectId: Number(saved.projectId || payload.projectId),
          date: saved.date ? toDateString(toDateMs(saved.date)) : payload.date,
          service: saved.service || payload.service,
          provider: saved.provider || payload.provider,
          amount: Number(saved.amount ?? payload.amount),
          accountId: saved.accountId ? String(saved.accountId) : (payload.accountId ? String(payload.accountId) : undefined),
          accountName: saved.accountName || payload.accountName || "",
          note: saved.note || payload.note || "",
        };
        const next = editingUtilityId
          ? list.map((u) => (u.id === editingUtilityId ? mapped : u))
          : [...list, mapped];
        return { ...prev, [projectKey]: next };
      });
      resetUtilityForm();
    } catch (err) {
      console.error("Failed to save utility", err);
    }
  };

  const handleEditUtility = (utility: ProjectUtility) => {
    const resolvedAccountId =
      utility.accountId ||
      ledgerAccounts.find((acct) => acct.name === utility.accountName)?.id ||
      "";
    setUtilityForm({
      date: utility.date,
      service: utility.service,
      provider: utility.provider,
      amount: utility.amount.toString(),
      accountId: resolvedAccountId,
      note: utility.note || "",
    });
    setEditingUtilityId(utility.id);
  };

  const handleDeleteUtility = (utilityId: string) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectUtilities[projectKey] || []).find((u) => u.id === utilityId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_utilities",
        entityId: utilityId,
        operation: "delete",
        before: existing,
        impact: "Staged utility delete",
      });
      setProjectUtilities((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter((u) => u.id !== utilityId),
      }));
      return;
    }
    fetch(`/api/utilities?id=${Number(utilityId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete utility", err))
      .finally(() => {
        setProjectUtilities((prev) => ({
          ...prev,
          [projectKey]: (prev[projectKey] || []).filter((u) => u.id !== utilityId),
        }));
      });
  };

  const resetDrawForm = () => {
    setDrawForm({ date: toDateString(getCentralTodayMs()), description: "", amount: "", accountId: "", note: "" });
    setEditingDrawId(null);
  };

  const handleSaveDraw = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const amount = parseFloat(drawForm.amount);
    const description = drawForm.description.trim();
    if (!drawForm.date || !description || !Number.isFinite(amount)) return;
    const payload = {
      projectId: projectKey,
      date: drawForm.date,
      description,
      amount,
      accountId: drawForm.accountId || undefined,
      accountName: drawForm.accountId
        ? (ledgerAccounts.find((a) => a.id === drawForm.accountId)?.name || "")
        : "",
      note: drawForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingDrawId || `DRAW-${Date.now().toString(36)}`;
      const existing = (projectDraws[projectKey] || []).find((d) => d.id === editingDrawId) || null;
      stageChange({
        entity: "project_draws",
        entityId: editingDrawId || null,
        operation: editingDrawId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingDrawId ? "Staged draw update" : "Staged draw create",
      });
      setProjectDraws((prev) => {
        const list = prev[projectKey] || [];
        const next = editingDrawId
          ? list.map((d) => (d.id === editingDrawId ? { ...d, ...payload, accountName: payload.accountName || d.accountName, id: tempId } : d))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectKey]: next };
      });
      resetDrawForm();
      return;
    }
    try {
      const method = editingDrawId ? "PATCH" : "POST";
      const res = await fetch("/api/draws", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingDrawId
            ? { id: Number(editingDrawId), ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
            : { ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save draw");
      const data = await res.json();
      const saved = data.draw || {};
      setProjectDraws((prev) => {
        const list = prev[projectKey] || [];
      const mapped: ProjectDraw = {
        id: String(saved.id || editingDrawId || `DRAW-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || payload.projectId),
        date: saved.date ? toDateString(toDateMs(saved.date)) : payload.date,
        description: saved.description || payload.description,
        amount: Number(saved.amount ?? payload.amount),
        accountId: saved.accountId ? String(saved.accountId) : (payload.accountId ? String(payload.accountId) : undefined),
        accountName: saved.accountName || payload.accountName || "",
        note: saved.note || payload.note || "",
      };
        const next = editingDrawId
          ? list.map((d) => (d.id === editingDrawId ? mapped : d))
          : [...list, mapped];
        return { ...prev, [projectKey]: next };
      });
      resetDrawForm();
    } catch (err) {
      console.error("Failed to save draw", err);
    }
  };

  const handleEditDraw = (draw: ProjectDraw) => {
    const resolvedAccountId =
      draw.accountId ||
      ledgerAccounts.find((acct) => acct.name === draw.accountName)?.id ||
      "";
    setDrawForm({
      date: draw.date,
      description: draw.description,
      amount: draw.amount.toString(),
      accountId: resolvedAccountId,
      note: draw.note || "",
    });
    setEditingDrawId(draw.id);
  };

  const handleDeleteDraw = (drawId: string) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectDraws[projectKey] || []).find((d) => d.id === drawId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_draws",
        entityId: drawId,
        operation: "delete",
        before: existing,
        impact: "Staged draw delete",
      });
      setProjectDraws((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter((d) => d.id !== drawId),
      }));
      return;
    }
    fetch(`/api/draws?id=${Number(drawId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete draw", err))
      .finally(() => {
        setProjectDraws((prev) => ({
          ...prev,
          [projectKey]: (prev[projectKey] || []).filter((d) => d.id !== drawId),
        }));
      });
  };

  const resetLoanForm = () => {
    setLoanForm({
      date: toDateString(getCentralTodayMs()),
      originationDate: "",
      payment: "",
      interest: "",
      principal: "",
      balance: "",
      accountId: "",
      note: "",
    });
    setEditingLoanId(null);
  };

  const handleSaveLoan = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const payment = parseFloat(loanForm.payment);
    if (!loanForm.date || !Number.isFinite(payment)) return;
    const currentBalance = loanForm.balance !== "" ? Number(loanForm.balance) : null;
    const isFirstPayment = loanFormBreakdown.isFirstPayment;
    const computedPrincipal = loanFormBreakdown.principal;
    const computedInterest = loanFormBreakdown.interest;
    if (!isFirstPayment && (!Number.isFinite(currentBalance ?? NaN) || computedPrincipal === null || computedInterest === null)) {
      return;
    }
    const payload = {
      projectId: projectKey,
      date: loanForm.date,
      originationDate: loanForm.originationDate || null,
      payment,
      interest: isFirstPayment
        ? (loanForm.interest !== "" ? Number(loanForm.interest) : 0)
        : (computedInterest ?? 0),
      principal: isFirstPayment
        ? (loanForm.principal !== "" ? Number(loanForm.principal) : 0)
        : (computedPrincipal ?? 0),
      balance: currentBalance,
      accountId: loanForm.accountId || undefined,
      accountName: loanForm.accountId
        ? (ledgerAccounts.find((a) => a.id === loanForm.accountId)?.name || "")
        : "",
      note: loanForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingLoanId || `LOAN-${Date.now().toString(36)}`;
      const existing = (projectLoans[projectKey] || []).find((l) => l.id === editingLoanId) || null;
      stageChange({
        entity: "project_loans",
        entityId: editingLoanId || null,
        operation: editingLoanId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingLoanId ? "Staged loan update" : "Staged loan create",
      });
      setProjectLoans((prev) => {
        const list = prev[projectKey] || [];
        const next = editingLoanId
          ? list.map((l) => (l.id === editingLoanId ? { ...l, ...payload, id: tempId } : l))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectKey]: next };
      });
      resetLoanForm();
      return;
    }
    try {
      const method = editingLoanId ? "PATCH" : "POST";
      const res = await fetch("/api/loans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingLoanId
            ? { id: Number(editingLoanId), ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
            : { ...payload, accountId: payload.accountId ? Number(payload.accountId) : null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save loan entry");
      const data = await res.json();
      const saved = data.loan || {};
      setProjectLoans((prev) => {
        const list = prev[projectKey] || [];
        const mapped: ProjectLoanEntry = {
          id: String(saved.id || editingLoanId || `LOAN-${Date.now().toString(36)}`),
          projectId: Number(saved.projectId || payload.projectId),
          date: saved.date ? toDateString(toDateMs(saved.date)) : payload.date,
          originationDate: saved.originationDate
            ? toDateString(toDateMs(saved.originationDate))
            : payload.originationDate,
          payment: Number(saved.payment ?? payload.payment),
          interest: Number(saved.interest ?? payload.interest),
          principal: Number(saved.principal ?? payload.principal),
          balance: saved.balance !== null && saved.balance !== undefined ? Number(saved.balance) : payload.balance,
          accountId: saved.accountId ? String(saved.accountId) : (payload.accountId ? String(payload.accountId) : undefined),
          accountName: saved.accountName || payload.accountName || "",
          note: saved.note || payload.note || "",
        };
        const next = editingLoanId
          ? list.map((l) => (l.id === editingLoanId ? mapped : l))
          : [...list, mapped];
        return { ...prev, [projectKey]: next };
      });
      resetLoanForm();
    } catch (err) {
      console.error("Failed to save loan entry", err);
    }
  };

  const handleEditLoan = (entry: ProjectLoanEntry) => {
    const resolvedAccountId =
      entry.accountId ||
      ledgerAccounts.find((acct) => acct.name === entry.accountName)?.id ||
      "";
    setLoanForm({
      date: entry.date,
      originationDate: entry.originationDate || "",
      payment: entry.payment.toString(),
      interest: entry.interest?.toString() ?? "",
      principal: entry.principal?.toString() ?? "",
      balance: entry.balance !== null && entry.balance !== undefined ? String(entry.balance) : "",
      accountId: resolvedAccountId,
      note: entry.note || "",
    });
    setEditingLoanId(entry.id);
  };

  const handleDeleteLoan = (loanId: string) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectLoans[projectKey] || []).find((l) => l.id === loanId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_loans",
        entityId: loanId,
        operation: "delete",
        before: existing,
        impact: "Staged loan delete",
      });
      setProjectLoans((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter((l) => l.id !== loanId),
      }));
      return;
    }
    fetch(`/api/loans?id=${Number(loanId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete loan entry", err))
      .finally(() => {
        setProjectLoans((prev) => ({
          ...prev,
          [projectKey]: (prev[projectKey] || []).filter((l) => l.id !== loanId),
        }));
      });
  };

  const resetTaxForm = () => {
    setTaxForm({ taxYear: String(new Date().getUTCFullYear()), dueDate: toDateString(getCentralTodayMs()), amount: "", status: "due", paidDate: "", note: "" });
    setEditingTaxId(null);
  };

  const handleSaveTax = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const amount = parseFloat(taxForm.amount);
    const taxYear = Number(taxForm.taxYear);
    if (!taxForm.dueDate || !Number.isFinite(amount) || !Number.isFinite(taxYear)) return;
    const payload = {
      projectId: projectKey,
      taxYear,
      dueDate: taxForm.dueDate,
      amount,
      status: taxForm.status,
      paidDate: taxForm.status === "paid" && taxForm.paidDate ? taxForm.paidDate : null,
      note: taxForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingTaxId || `TAX-${Date.now().toString(36)}`;
      const existing = (projectPropertyTaxes[projectKey] || []).find((t) => t.id === editingTaxId) || null;
      stageChange({
        entity: "project_property_taxes",
        entityId: editingTaxId || null,
        operation: editingTaxId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingTaxId ? "Staged property tax update" : "Staged property tax create",
      });
      setProjectPropertyTaxes((prev) => {
        const list = prev[projectKey] || [];
        const next = editingTaxId
          ? list.map((t) => (t.id === editingTaxId ? { ...t, ...payload, id: tempId } : t))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectKey]: next };
      });
      resetTaxForm();
      return;
    }
    try {
      const method = editingTaxId ? "PATCH" : "POST";
      const res = await fetch("/api/property-taxes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTaxId ? { id: Number(editingTaxId), ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save property tax");
      const data = await res.json();
      const saved = data.tax || {};
      setProjectPropertyTaxes((prev) => {
        const list = prev[projectKey] || [];
        const mapped: ProjectPropertyTax = {
          id: String(saved.id || editingTaxId || `TAX-${Date.now().toString(36)}`),
          projectId: Number(saved.projectId || payload.projectId),
          taxYear: Number(saved.taxYear ?? payload.taxYear),
          dueDate: saved.dueDate ? toDateString(toDateMs(saved.dueDate)) : payload.dueDate,
          amount: Number(saved.amount ?? payload.amount),
          status: (String(saved.status || payload.status).toLowerCase() as ProjectPropertyTax["status"]) || payload.status,
          paidDate: saved.paidDate ? toDateString(toDateMs(saved.paidDate)) : payload.paidDate,
          note: saved.note || payload.note || "",
        };
        const next = editingTaxId
          ? list.map((t) => (t.id === editingTaxId ? mapped : t))
          : [...list, mapped];
        return { ...prev, [projectKey]: next };
      });
      resetTaxForm();
    } catch (err) {
      console.error("Failed to save property tax", err);
    }
  };

  const handleEditTax = (entry: ProjectPropertyTax) => {
    setTaxForm({
      taxYear: String(entry.taxYear),
      dueDate: entry.dueDate,
      amount: entry.amount.toString(),
      status: entry.status,
      paidDate: entry.paidDate || "",
      note: entry.note || "",
    });
    setEditingTaxId(entry.id);
  };

  const handleDeleteTax = (taxId: string) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectPropertyTaxes[projectKey] || []).find((t) => t.id === taxId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_property_taxes",
        entityId: taxId,
        operation: "delete",
        before: existing,
        impact: "Staged property tax delete",
      });
      setProjectPropertyTaxes((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter((t) => t.id !== taxId),
      }));
      return;
    }
    fetch(`/api/property-taxes?id=${Number(taxId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete property tax", err))
      .finally(() => {
        setProjectPropertyTaxes((prev) => ({
          ...prev,
          [projectKey]: (prev[projectKey] || []).filter((t) => t.id !== taxId),
        }));
      });
  };

  const resetAcquisitionForm = () => {
    setAcquisitionForm({ purchasePrice: "", acquisitionDraw: "", earnestMoney: "", closeDate: "", note: "" });
    setEditingAcquisitionId(null);
  };

  const handleSaveAcquisition = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const payload = {
      projectId: projectKey,
      purchasePrice: acquisitionForm.purchasePrice !== "" ? Number(acquisitionForm.purchasePrice) : 0,
      acquisitionDraw: acquisitionForm.acquisitionDraw !== "" ? Number(acquisitionForm.acquisitionDraw) : 0,
      earnestMoney: acquisitionForm.earnestMoney !== "" ? Number(acquisitionForm.earnestMoney) : 0,
      closeDate: acquisitionForm.closeDate || null,
      note: acquisitionForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingAcquisitionId || `ACQ-${Date.now().toString(36)}`;
      const existing = projectAcquisitions[projectKey] || null;
      stageChange({
        entity: "project_acquisitions",
        entityId: editingAcquisitionId || null,
        operation: editingAcquisitionId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingAcquisitionId ? "Staged acquisition update" : "Staged acquisition create",
      });
      setProjectAcquisitions((prev) => ({
        ...prev,
        [projectKey]: { id: tempId, ...payload },
      }));
      setEditingAcquisitionId(tempId);
      return;
    }
    try {
      const method = editingAcquisitionId ? "PATCH" : "POST";
      const res = await fetch("/api/acquisitions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAcquisitionId ? { id: Number(editingAcquisitionId), ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save acquisition");
      const data = await res.json();
      const saved = data.acquisition || {};
      const mapped: ProjectAcquisition = {
        id: String(saved.id || editingAcquisitionId || `ACQ-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || payload.projectId),
        purchasePrice: Number(saved.purchasePrice ?? payload.purchasePrice ?? 0),
        acquisitionDraw: Number(saved.acquisitionDraw ?? payload.acquisitionDraw ?? 0),
        earnestMoney: Number(saved.earnestMoney ?? payload.earnestMoney ?? 0),
        closeDate: saved.closeDate ? toDateString(toDateMs(saved.closeDate)) : payload.closeDate,
        note: saved.note || payload.note || "",
      };
      setProjectAcquisitions((prev) => ({
        ...prev,
        [projectKey]: mapped,
      }));
      setEditingAcquisitionId(mapped.id);
    } catch (err) {
      console.error("Failed to save acquisition", err);
    }
  };

  const resetClosingCostForm = () => {
    setClosingCostForm({ side: "purchase", label: "", amount: "", paid: false, paidDate: "", note: "" });
    setEditingClosingCostId(null);
  };

  const handleSaveClosingCost = async () => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const label = closingCostForm.label.trim();
    if (!label) return;
    const amount = closingCostForm.amount !== "" ? Number(closingCostForm.amount) : 0;
    const payload = {
      projectId: projectKey,
      side: closingCostForm.side,
      label,
      amount,
      paid: Boolean(closingCostForm.paid),
      paidDate: closingCostForm.paid ? (closingCostForm.paidDate || toDateString(getCentralTodayMs())) : null,
      note: closingCostForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingClosingCostId || `CC-${Date.now().toString(36)}`;
      const existing = (projectClosingCosts[projectKey] || []).find((c) => c.id === editingClosingCostId) || null;
      stageChange({
        entity: "project_closing_costs",
        entityId: editingClosingCostId || null,
        operation: editingClosingCostId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingClosingCostId ? "Staged closing cost update" : "Staged closing cost create",
      });
      setProjectClosingCosts((prev) => {
        const list = prev[projectKey] || [];
        const next = editingClosingCostId
          ? list.map((c) => (c.id === editingClosingCostId ? { ...c, ...payload, id: tempId } : c))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectKey]: next };
      });
      resetClosingCostForm();
      return;
    }
    try {
      const method = editingClosingCostId ? "PATCH" : "POST";
      const res = await fetch("/api/closing-costs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingClosingCostId ? { id: Number(editingClosingCostId), ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save closing cost");
      const data = await res.json();
      const saved = data.closingCost || {};
      const mapped: ProjectClosingCost = {
        id: String(saved.id || editingClosingCostId || `CC-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || payload.projectId),
        side: (String(saved.side || payload.side).toLowerCase() === "sale" ? "sale" : "purchase"),
        code: saved.code || null,
        label: saved.label || payload.label,
        amount: Number(saved.amount ?? payload.amount),
        paid: Boolean(saved.paid ?? payload.paid),
        paidDate: saved.paidDate ? toDateString(toDateMs(saved.paidDate)) : payload.paidDate,
        note: saved.note || payload.note || "",
      };
      setProjectClosingCosts((prev) => {
        const list = prev[projectKey] || [];
        const next = editingClosingCostId
          ? list.map((c) => (c.id === editingClosingCostId ? mapped : c))
          : [...list, mapped];
        return { ...prev, [projectKey]: next };
      });
      resetClosingCostForm();
    } catch (err) {
      console.error("Failed to save closing cost", err);
    }
  };

  const handleEditClosingCost = (cost: ProjectClosingCost) => {
    setClosingCostForm({
      side: cost.side,
      label: cost.label,
      amount: cost.amount.toString(),
      paid: cost.paid,
      paidDate: cost.paidDate || "",
      note: cost.note || "",
    });
    setEditingClosingCostId(cost.id);
  };

  const handleDeleteClosingCost = (costId: string) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectClosingCosts[projectKey] || []).find((c) => c.id === costId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_closing_costs",
        entityId: costId,
        operation: "delete",
        before: existing,
        impact: "Staged closing cost delete",
      });
      setProjectClosingCosts((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).filter((c) => c.id !== costId),
      }));
      return;
    }
    fetch(`/api/closing-costs?id=${Number(costId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete closing cost", err))
      .finally(() => {
        setProjectClosingCosts((prev) => ({
          ...prev,
          [projectKey]: (prev[projectKey] || []).filter((c) => c.id !== costId),
        }));
      });
  };

  const handleToggleClosingCostPaid = (cost: ProjectClosingCost) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const nextPaid = !cost.paid;
    const payload = {
      paid: nextPaid,
      paidDate: nextPaid ? toDateString(getCentralTodayMs()) : null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_closing_costs",
        entityId: cost.id,
        operation: "update",
        before: cost,
        after: { ...cost, ...payload },
        impact: "Staged closing cost paid status",
      });
      setProjectClosingCosts((prev) => ({
        ...prev,
        [projectKey]: (prev[projectKey] || []).map((c) => (c.id === cost.id ? { ...c, ...payload } : c)),
      }));
      return;
    }
    fetch("/api/closing-costs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(cost.id), ...payload }),
    }).catch((err) => console.error("Failed to update closing cost", err));
    setProjectClosingCosts((prev) => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).map((c) => (c.id === cost.id ? { ...c, ...payload } : c)),
    }));
  };

  const handleSeedClosingCosts = async (side: ProjectClosingCost["side"]) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const existing = (projectClosingCosts[projectKey] || []).filter((c) => c.side === side);
    const existingCodes = new Set(existing.map((c) => c.code || c.label.toLowerCase()));
    const defaults = DEFAULT_CLOSING_COSTS[side].filter((d) => !existingCodes.has(d.code));
    if (!defaults.length) return;
    if (!currentUser || currentUser.role !== "admin") {
      const newItems = defaults.map((d, idx) => {
        const tempId = `CC-${Date.now().toString(36)}-${idx}`;
        return { id: tempId, projectId: projectKey, side, code: d.code, label: d.label, amount: 0, paid: false };
      });
      newItems.forEach((payload) => {
        stageChange({
          entity: "project_closing_costs",
          entityId: null,
          operation: "create",
          after: payload,
          impact: "Staged closing cost create",
        });
      });
      setProjectClosingCosts((prev) => ({
        ...prev,
        [projectKey]: [...(prev[projectKey] || []), ...newItems],
      }));
      return;
    }
    try {
      const created: ProjectClosingCost[] = [];
      for (const d of defaults) {
        const res = await fetch("/api/closing-costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: projectKey, side, code: d.code, label: d.label, amount: 0, paid: false }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const saved = data.closingCost || {};
        created.push({
          id: String(saved.id || `CC-${Date.now().toString(36)}`),
          projectId: Number(saved.projectId || projectKey),
          side,
          code: saved.code || d.code,
          label: saved.label || d.label,
          amount: Number(saved.amount ?? 0),
          paid: Boolean(saved.paid ?? false),
          paidDate: saved.paidDate ? toDateString(toDateMs(saved.paidDate)) : null,
          note: saved.note || "",
        });
      }
      if (created.length) {
        setProjectClosingCosts((prev) => {
          const list = prev[projectKey] || [];
          return { ...prev, [projectKey]: [...list, ...created] };
        });
      }
    } catch (err) {
      console.error("Failed to seed closing costs", err);
    }
  };

  const resetDebtServiceForm = () => {
    setDebtServiceForm({
      projectId: "",
      bank: "",
      balance: "",
      payment: "",
      interestRate: "",
      rateType: "fixed",
      rateAdjustDate: "",
      maturityDate: "",
      note: "",
    });
    setEditingDebtServiceId(null);
  };

  const handleSaveDebtService = async () => {
    const projectId = debtServiceForm.projectId ? Number(debtServiceForm.projectId) : null;
    if (!projectId || !debtServiceForm.bank.trim()) return;
    const payload = {
      projectId,
      bank: debtServiceForm.bank.trim(),
      balance: debtServiceForm.balance !== "" ? Number(debtServiceForm.balance) : 0,
      payment: debtServiceForm.payment !== "" ? Number(debtServiceForm.payment) : 0,
      interestRate: debtServiceForm.interestRate !== "" ? Number(debtServiceForm.interestRate) : 0,
      rateType: debtServiceForm.rateType,
      rateAdjustDate: debtServiceForm.rateAdjustDate || null,
      maturityDate: debtServiceForm.maturityDate || null,
      note: debtServiceForm.note.trim() || null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingDebtServiceId || `DEBT-${Date.now().toString(36)}`;
      const existing = (projectDebtService[projectId] || []).find((d) => d.id === editingDebtServiceId) || null;
      stageChange({
        entity: "project_debt_service",
        entityId: editingDebtServiceId || null,
        operation: editingDebtServiceId ? "update" : "create",
        before: existing,
        after: { id: tempId, ...payload },
        impact: editingDebtServiceId ? "Staged debt service update" : "Staged debt service create",
      });
      setProjectDebtService((prev) => {
        const list = prev[projectId] || [];
        const next = editingDebtServiceId
          ? list.map((d) => (d.id === editingDebtServiceId ? { ...d, ...payload, id: tempId } : d))
          : [...list, { id: tempId, ...payload }];
        return { ...prev, [projectId]: next };
      });
      resetDebtServiceForm();
      return;
    }
    try {
      const method = editingDebtServiceId ? "PATCH" : "POST";
      const res = await fetch("/api/debt-service", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDebtServiceId ? { id: Number(editingDebtServiceId), ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save debt service");
      const data = await res.json();
      const saved = data.debtService || {};
      const mapped: ProjectDebtService = {
        id: String(saved.id || editingDebtServiceId || `DEBT-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || payload.projectId),
        bank: saved.bank || payload.bank,
        balance: Number(saved.balance ?? payload.balance),
        payment: Number(saved.payment ?? payload.payment),
        interestRate: Number(saved.interestRate ?? payload.interestRate),
        rateType: (String(saved.rateType || payload.rateType).toLowerCase() === "variable" ? "variable" : "fixed"),
        rateAdjustDate: saved.rateAdjustDate ? toDateString(toDateMs(saved.rateAdjustDate)) : payload.rateAdjustDate,
        maturityDate: saved.maturityDate ? toDateString(toDateMs(saved.maturityDate)) : payload.maturityDate,
        note: saved.note || payload.note || "",
      };
      setProjectDebtService((prev) => {
        const list = prev[projectId] || [];
        const next = editingDebtServiceId
          ? list.map((d) => (d.id === editingDebtServiceId ? mapped : d))
          : [...list, mapped];
        return { ...prev, [projectId]: next };
      });
      resetDebtServiceForm();
    } catch (err) {
      console.error("Failed to save debt service", err);
    }
  };

  const handleEditDebtService = (entry: ProjectDebtService) => {
    setDebtServiceForm({
      projectId: String(entry.projectId),
      bank: entry.bank,
      balance: entry.balance.toString(),
      payment: entry.payment.toString(),
      interestRate: entry.interestRate.toString(),
      rateType: entry.rateType,
      rateAdjustDate: entry.rateAdjustDate || "",
      maturityDate: entry.maturityDate || "",
      note: entry.note || "",
    });
    setEditingDebtServiceId(entry.id);
  };

  const handleDeleteDebtService = (entry: ProjectDebtService) => {
    const projectId = entry.projectId;
    const existing = (projectDebtService[projectId] || []).find((d) => d.id === entry.id) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_debt_service",
        entityId: entry.id,
        operation: "delete",
        before: existing,
        impact: "Staged debt service delete",
      });
      setProjectDebtService((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter((d) => d.id !== entry.id),
      }));
      return;
    }
    fetch(`/api/debt-service?id=${Number(entry.id)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete debt service", err))
      .finally(() => {
        setProjectDebtService((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || []).filter((d) => d.id !== entry.id),
        }));
      });
  };

  const handleOpenDebtDraws = (projectId: number) => {
    const node = epsNodes.find((n) => n.type === "project" && n.projectId === projectId);
    if (node) {
      setSelectedNodeId(node.id);
    }
    setMode("Activities");
    setActiveProjectId(projectId);
    setActivityView("draws");
  };

  const resetCostCategoryForm = () => {
    setCostCategoryForm({ name: "", code: "" });
    setEditingCostCategoryId(null);
  };

  const handleSaveCostCategory = async () => {
    const name = costCategoryForm.name.trim();
    if (!name) return;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = editingCostCategoryId || `COSTCAT-${Date.now().toString(36)}`;
      const existing = costCategories.find((c) => c.id === editingCostCategoryId) || null;
      stageChange({
        entity: "cost_categories",
        entityId: editingCostCategoryId || null,
        operation: editingCostCategoryId ? "update" : "create",
        before: existing,
        after: { id: tempId, name, code: costCategoryForm.code.trim() || null },
        impact: editingCostCategoryId ? "Staged cost category update" : "Staged cost category create",
      });
      setCostCategories((prev) => {
        const next = editingCostCategoryId
          ? prev.map((c) => (c.id === editingCostCategoryId ? { ...c, name, code: costCategoryForm.code.trim() || null } : c))
          : [...prev, { id: tempId, name, code: costCategoryForm.code.trim() || null }];
        return next;
      });
      resetCostCategoryForm();
      return;
    }
    try {
      const method = editingCostCategoryId ? "PATCH" : "POST";
      const res = await fetch("/api/cost-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingCostCategoryId
            ? { id: Number(editingCostCategoryId), name, code: costCategoryForm.code.trim() || null }
            : { name, code: costCategoryForm.code.trim() || null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save cost category");
      const data = await res.json();
      const saved = data.category || {};
      const mapped: CostCategory = {
        id: String(saved.id || editingCostCategoryId || `COSTCAT-${Date.now().toString(36)}`),
        name: saved.name || name,
        code: saved.code || costCategoryForm.code.trim() || null,
      };
      setCostCategories((prev) => {
        const next = editingCostCategoryId
          ? prev.map((c) => (c.id === editingCostCategoryId ? mapped : c))
          : [...prev, mapped];
        return next;
      });
      resetCostCategoryForm();
    } catch (err) {
      console.error("Failed to save cost category", err);
    }
  };

  const handleEditCostCategory = (cat: CostCategory) => {
    setCostCategoryForm({ name: cat.name, code: cat.code || "" });
    setEditingCostCategoryId(cat.id);
  };

  const handleDeleteCostCategory = (catId: string) => {
    const existing = costCategories.find((c) => c.id === catId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "cost_categories",
        entityId: catId,
        operation: "delete",
        before: existing,
        impact: "Staged cost category delete",
      });
      setCostCategories((prev) => prev.filter((c) => c.id !== catId));
      return;
    }
    fetch(`/api/cost-categories?id=${Number(catId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete cost category", err))
      .finally(() => {
        setCostCategories((prev) => prev.filter((c) => c.id !== catId));
      });
  };

  const handleSaveCostOverride = async (categoryId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId) return;
    const draft = costOverrideDrafts[categoryId] || { amount: "", note: "" };
    const amount = draft.amount !== "" ? Number(draft.amount) : 0;
    const note = draft.note.trim();
    const existing = (projectCostOverrides[projectId] || []).find((o) => o.categoryId === categoryId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = existing?.id || `OVR-${Date.now().toString(36)}`;
      stageChange({
        entity: "project_cost_overrides",
        entityId: existing?.id || null,
        operation: existing ? "update" : "create",
        before: existing,
        after: { id: tempId, projectId, categoryId: Number(categoryId), amount, note: note || null },
        impact: existing ? "Staged cost override update" : "Staged cost override create",
      });
      setProjectCostOverrides((prev) => {
        const list = prev[projectId] || [];
        const next = existing
          ? list.map((o) => (o.categoryId === categoryId ? { ...o, amount, note, id: tempId } : o))
          : [...list, { id: tempId, projectId, categoryId, amount, note }];
        return { ...prev, [projectId]: next };
      });
      return;
    }
    try {
      const method = existing ? "PATCH" : "POST";
      const res = await fetch("/api/cost-overrides", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existing
            ? { id: Number(existing.id), amount, note: note || null }
            : { projectId, categoryId: Number(categoryId), amount, note: note || null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save cost override");
      const data = await res.json();
      const saved = data.override || {};
      const mapped: ProjectCostOverride = {
        id: String(saved.id || existing?.id || `OVR-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || projectId),
        categoryId: String(saved.categoryId || categoryId),
        amount: Number(saved.amount ?? amount),
        note: saved.note || note || "",
      };
      setProjectCostOverrides((prev) => {
        const list = prev[projectId] || [];
        const next = existing
          ? list.map((o) => (o.categoryId === categoryId ? mapped : o))
          : [...list, mapped];
        return { ...prev, [projectId]: next };
      });
    } catch (err) {
      console.error("Failed to save cost override", err);
    }
  };

  const handleClearCostOverride = (categoryId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId) return;
    const existing = (projectCostOverrides[projectId] || []).find((o) => o.categoryId === categoryId) || null;
    if (!existing) return;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_cost_overrides",
        entityId: existing.id,
        operation: "delete",
        before: existing,
        impact: "Staged cost override delete",
      });
      setProjectCostOverrides((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter((o) => o.categoryId !== categoryId),
      }));
      setCostOverrideDrafts((prev) => ({
        ...prev,
        [categoryId]: { amount: "", note: "" },
      }));
      return;
    }
    fetch(`/api/cost-overrides?id=${Number(existing.id)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete cost override", err))
      .finally(() => {
        setProjectCostOverrides((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || []).filter((o) => o.categoryId !== categoryId),
        }));
        setCostOverrideDrafts((prev) => ({
          ...prev,
          [categoryId]: { amount: "", note: "" },
        }));
      });
  };

  const resetBreakdownPresetForm = () => {
    setBreakdownPresetForm({ name: "", description: "", isDefault: false });
    setEditingBreakdownPresetId(null);
  };

  const handleSaveBreakdownPreset = async () => {
    const name = breakdownPresetForm.name.trim();
    if (!name) return;
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const method = editingBreakdownPresetId ? "PATCH" : "POST";
      const res = await fetch("/api/breakdown-presets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingBreakdownPresetId
            ? { id: Number(editingBreakdownPresetId), name, description: breakdownPresetForm.description, isDefault: breakdownPresetForm.isDefault }
            : { name, description: breakdownPresetForm.description, isDefault: breakdownPresetForm.isDefault }
        ),
      });
      if (!res.ok) throw new Error("Failed to save breakdown preset");
      const data = await res.json();
      const saved = data.preset || {};
      const presetId = String(saved.id || editingBreakdownPresetId);
      if (!editingBreakdownPresetId && presetId) {
        const itemsPayload = costCategories.map((cat, idx) => ({
          presetId: Number(presetId),
          categoryId: Number(cat.id),
          sortOrder: idx,
          include: true,
        }));
        if (itemsPayload.length) {
          await fetch("/api/breakdown-preset-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: itemsPayload }),
          });
        }
      }
      await loadBreakdownPresets();
      resetBreakdownPresetForm();
    } catch (err) {
      console.error("Failed to save breakdown preset", err);
    }
  };

  const handleEditBreakdownPreset = (preset: BreakdownPreset) => {
    setBreakdownPresetForm({
      name: preset.name,
      description: preset.description || "",
      isDefault: preset.isDefault,
    });
    setEditingBreakdownPresetId(preset.id);
  };

  const handleDeleteBreakdownPreset = async (presetId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      await fetch(`/api/breakdown-presets?id=${Number(presetId)}`, { method: "DELETE" });
      await loadBreakdownPresets();
    } catch (err) {
      console.error("Failed to delete breakdown preset", err);
    }
  };

  const handleSaveBreakdownItems = async (presetId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    const items = breakdownPresetItems[presetId] || [];
    const payload = items.map((item) => ({
      id: Number(item.id),
      sortOrder: Number(breakdownItemDrafts[item.id]?.sortOrder ?? item.sortOrder ?? 0),
      include: breakdownItemDrafts[item.id]?.include ?? item.include,
    }));
    try {
      await fetch("/api/breakdown-preset-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      await loadBreakdownPresets();
    } catch (err) {
      console.error("Failed to update breakdown preset items", err);
    }
  };

  const handleSyncBreakdownItems = async (presetId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    const existing = breakdownPresetItems[presetId] || [];
    const existingCatIds = new Set(existing.map((i) => i.categoryId));
    const missing = costCategories.filter((cat) => !existingCatIds.has(cat.id));
    if (!missing.length) return;
    const payload = missing.map((cat, idx) => ({
      presetId: Number(presetId),
      categoryId: Number(cat.id),
      sortOrder: existing.length + idx,
      include: true,
    }));
    try {
      await fetch("/api/breakdown-preset-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      await loadBreakdownPresets();
    } catch (err) {
      console.error("Failed to sync breakdown items", err);
    }
  };

  const handleSaveBreakdownPref = async (presetId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId || !presetId) return;
    const existing = projectBreakdownPrefs[projectId] || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_breakdown_prefs",
        entityId: existing?.id || null,
        operation: existing ? "update" : "create",
        before: existing,
        after: { id: existing?.id || `BDP-${Date.now().toString(36)}`, projectId, presetId: Number(presetId) },
        impact: "Staged breakdown preset selection",
      });
      setProjectBreakdownPrefs((prev) => ({
        ...prev,
        [projectId]: { id: existing?.id || `BDP-${Date.now().toString(36)}`, projectId, presetId },
      }));
      setActiveBreakdownPresetId(presetId);
      return;
    }
    try {
      const method = existing ? "PATCH" : "POST";
      const res = await fetch("/api/breakdown-prefs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing ? { id: Number(existing.id), presetId: Number(presetId) } : { projectId, presetId: Number(presetId) }),
      });
      if (!res.ok) throw new Error("Failed to save breakdown pref");
      const data = await res.json();
      const saved = data.pref || {};
      setProjectBreakdownPrefs((prev) => ({
        ...prev,
        [projectId]: { id: String(saved.id || existing?.id), projectId, presetId: String(saved.presetId || presetId) },
      }));
      setActiveBreakdownPresetId(presetId);
    } catch (err) {
      console.error("Failed to save breakdown pref", err);
    }
  };

  const resetKpiPresetForm = () => {
    setKpiPresetForm({ name: "", description: "", isDefault: false });
    setEditingKpiPresetId(null);
  };

  const handleSaveKpiPreset = async () => {
    const name = kpiPresetForm.name.trim();
    if (!name) return;
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const method = editingKpiPresetId ? "PATCH" : "POST";
      const res = await fetch("/api/kpi-presets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingKpiPresetId
            ? { id: Number(editingKpiPresetId), name, description: kpiPresetForm.description, isDefault: kpiPresetForm.isDefault }
            : { name, description: kpiPresetForm.description, isDefault: kpiPresetForm.isDefault }
        ),
      });
      if (!res.ok) throw new Error("Failed to save kpi preset");
      await loadKpiPresets();
      resetKpiPresetForm();
    } catch (err) {
      console.error("Failed to save kpi preset", err);
    }
  };

  const handleEditKpiPreset = (preset: KpiPreset) => {
    setKpiPresetForm({
      name: preset.name,
      description: preset.description || "",
      isDefault: preset.isDefault,
    });
    setEditingKpiPresetId(preset.id);
  };

  const handleDeleteKpiPreset = async (presetId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      await fetch(`/api/kpi-presets?id=${Number(presetId)}`, { method: "DELETE" });
      await loadKpiPresets();
    } catch (err) {
      console.error("Failed to delete kpi preset", err);
    }
  };

  const resetKpiItemForm = () => {
    setKpiItemForm({
      presetId: "",
      name: "",
      formula: "",
      resultType: "currency",
      sortOrder: "",
      enabled: true,
      scaleMin: "",
      scaleMax: "",
      scaleInvert: false,
    });
    setEditingKpiItemId(null);
  };

  const handleSaveKpiItem = async () => {
    const presetId = kpiItemForm.presetId || activeKpiPresetId;
    if (!presetId || !kpiItemForm.name.trim() || !kpiItemForm.formula.trim()) return;
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      const method = editingKpiItemId ? "PATCH" : "POST";
      const res = await fetch("/api/kpi-preset-items", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingKpiItemId
            ? {
                items: [
                  {
                    id: Number(editingKpiItemId),
                    name: kpiItemForm.name,
                    formula: kpiItemForm.formula,
                    resultType: kpiItemForm.resultType,
                    sortOrder: kpiItemForm.sortOrder ? Number(kpiItemForm.sortOrder) : 0,
                    enabled: kpiItemForm.enabled,
                    scaleMin: kpiItemForm.scaleMin,
                    scaleMax: kpiItemForm.scaleMax,
                    scaleInvert: kpiItemForm.scaleInvert,
                  },
                ],
              }
            : {
                items: [
                  {
                    presetId: Number(presetId),
                    name: kpiItemForm.name,
                    formula: kpiItemForm.formula,
                    resultType: kpiItemForm.resultType,
                    sortOrder: kpiItemForm.sortOrder ? Number(kpiItemForm.sortOrder) : 0,
                    enabled: kpiItemForm.enabled,
                    scaleMin: kpiItemForm.scaleMin,
                    scaleMax: kpiItemForm.scaleMax,
                    scaleInvert: kpiItemForm.scaleInvert,
                  },
                ],
              }
        ),
      });
      if (!res.ok) throw new Error("Failed to save kpi item");
      await loadKpiPresets();
      resetKpiItemForm();
    } catch (err) {
      console.error("Failed to save kpi item", err);
    }
  };

  const handleEditKpiItem = (item: KpiPresetItem) => {
    setKpiItemForm({
      presetId: item.presetId,
      name: item.name,
      formula: item.formula,
      resultType: item.resultType,
      sortOrder: String(item.sortOrder),
      enabled: item.enabled,
      scaleMin: item.scaleMin !== null && item.scaleMin !== undefined ? String(item.scaleMin) : "",
      scaleMax: item.scaleMax !== null && item.scaleMax !== undefined ? String(item.scaleMax) : "",
      scaleInvert: Boolean(item.scaleInvert),
    });
    setEditingKpiItemId(item.id);
  };

  const handleDeleteKpiItem = async (itemId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    try {
      await fetch(`/api/kpi-preset-items?id=${Number(itemId)}`, { method: "DELETE" });
      await loadKpiPresets();
    } catch (err) {
      console.error("Failed to delete kpi item", err);
    }
  };

  const handleSaveKpiPref = async (presetId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId || !presetId) return;
    const existing = projectKpiPrefs[projectId] || null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_kpi_prefs",
        entityId: existing?.id || null,
        operation: existing ? "update" : "create",
        before: existing,
        after: { id: existing?.id || `KPI-${Date.now().toString(36)}`, projectId, presetId: Number(presetId) },
        impact: "Staged KPI preset selection",
      });
      setProjectKpiPrefs((prev) => ({
        ...prev,
        [projectId]: { id: existing?.id || `KPI-${Date.now().toString(36)}`, projectId, presetId },
      }));
      setActiveKpiPresetId(presetId);
      return;
    }
    try {
      const method = existing ? "PATCH" : "POST";
      const res = await fetch("/api/kpi-prefs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing ? { id: Number(existing.id), presetId: Number(presetId) } : { projectId, presetId: Number(presetId) }),
      });
      if (!res.ok) throw new Error("Failed to save kpi pref");
      const data = await res.json();
      const saved = data.pref || {};
      setProjectKpiPrefs((prev) => ({
        ...prev,
        [projectId]: { id: String(saved.id || existing?.id), projectId, presetId: String(saved.presetId || presetId) },
      }));
      setActiveKpiPresetId(presetId);
    } catch (err) {
      console.error("Failed to save kpi pref", err);
    }
  };

  const handleSaveKpiOverride = async (itemId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId) return;
    const draft = kpiOverrideDrafts[itemId] || { value: "", note: "" };
    const overrideValue = draft.value !== "" ? Number(draft.value) : 0;
    const note = draft.note.trim();
    const existing = (projectKpiOverrides[projectId] || []).find((o) => o.itemId === itemId) || null;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = existing?.id || `KPIO-${Date.now().toString(36)}`;
      stageChange({
        entity: "project_kpi_overrides",
        entityId: existing?.id || null,
        operation: existing ? "update" : "create",
        before: existing,
        after: { id: tempId, projectId, itemId: Number(itemId), overrideValue, note: note || null },
        impact: existing ? "Staged KPI override update" : "Staged KPI override create",
      });
      setProjectKpiOverrides((prev) => {
        const list = prev[projectId] || [];
        const next = existing
          ? list.map((o) => (o.itemId === itemId ? { ...o, overrideValue, note, id: tempId } : o))
          : [...list, { id: tempId, projectId, itemId, overrideValue, note }];
        return { ...prev, [projectId]: next };
      });
      return;
    }
    try {
      const method = existing ? "PATCH" : "POST";
      const res = await fetch("/api/kpi-overrides", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existing
            ? { id: Number(existing.id), overrideValue, note: note || null }
            : { projectId, itemId: Number(itemId), overrideValue, note: note || null }
        ),
      });
      if (!res.ok) throw new Error("Failed to save KPI override");
      const data = await res.json();
      const saved = data.override || {};
      const mapped: ProjectKpiOverride = {
        id: String(saved.id || existing?.id || `KPIO-${Date.now().toString(36)}`),
        projectId: Number(saved.projectId || projectId),
        itemId: String(saved.itemId || itemId),
        overrideValue: Number(saved.overrideValue ?? overrideValue),
        note: saved.note || note || "",
      };
      setProjectKpiOverrides((prev) => {
        const list = prev[projectId] || [];
        const next = existing
          ? list.map((o) => (o.itemId === itemId ? mapped : o))
          : [...list, mapped];
        return { ...prev, [projectId]: next };
      });
    } catch (err) {
      console.error("Failed to save KPI override", err);
    }
  };

  const handleClearKpiOverride = (itemId: string) => {
    const projectId = activeProjectDbId ?? resolveProjectId();
    if (!projectId) return;
    const existing = (projectKpiOverrides[projectId] || []).find((o) => o.itemId === itemId) || null;
    if (!existing) return;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "project_kpi_overrides",
        entityId: existing.id,
        operation: "delete",
        before: existing,
        impact: "Staged KPI override delete",
      });
      setProjectKpiOverrides((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter((o) => o.itemId !== itemId),
      }));
      setKpiOverrideDrafts((prev) => ({
        ...prev,
        [itemId]: { value: "", note: "" },
      }));
      return;
    }
    fetch(`/api/kpi-overrides?id=${Number(existing.id)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete KPI override", err))
      .finally(() => {
        setProjectKpiOverrides((prev) => ({
          ...prev,
          [projectId]: (prev[projectId] || []).filter((o) => o.itemId !== itemId),
        }));
        setKpiOverrideDrafts((prev) => ({
          ...prev,
          [itemId]: { value: "", note: "" },
        }));
      });
  };

  const handleInsertKpiVariable = (name: string) => {
    const token = `{${name}}`;
    const current = kpiItemForm.formula || "";
    const selection = kpiFormulaSelectionRef.current;
    const start = selection?.start ?? current.length;
    const end = selection?.end ?? start;
    const next = current.slice(0, start) + token + current.slice(end);
    setKpiItemForm((prev) => ({ ...prev, formula: next }));
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        if (kpiFormulaRef.current) {
          kpiFormulaRef.current.focus();
          const caret = start + token.length;
          kpiFormulaRef.current.setSelectionRange(caret, caret);
          kpiFormulaSelectionRef.current = { start: caret, end: caret };
        }
      });
    }
  };

  const handleNotificationClick = useCallback((note: NotificationItem) => {
    if (!note) return;
    if (note.target.mode) {
      setMode(note.target.mode);
    }
    if (note.target.projectId) {
      setActiveProjectId(note.target.projectId);
    }
    if (note.target.activityView) {
      setActivityView(note.target.activityView);
    }
    if (note.target.rentPropertyId) {
      setRentRollProperty(note.target.rentPropertyId);
    }
    if (note.target.rentUnitId) {
      setRentRollDetailView({ type: "unit", id: note.target.rentUnitId });
    }
    handleNotificationRead(note.id);
  }, [handleNotificationRead]);
  const handleToastClick = useCallback((note: NotificationItem) => {
    handleNotificationClick(note);
  }, [handleNotificationClick]);

  const handleCreateLedgerCategory = async (name: string, parentId: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (ledgerCategories.some((cat) => cat.name.toLowerCase() === trimmed.toLowerCase() && (cat.parentId || "") === (parentId || ""))) return;
    const normalizedParentId = parentId && !Number.isNaN(Number(parentId)) ? Number(parentId) : null;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = `LED-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      stageChange({
        entity: "ledger_categories",
        entityId: tempId,
        operation: "create",
        after: { id: tempId, name: trimmed, parentId: normalizedParentId },
        impact: "Staged ledger category create",
      });
      setLedgerCategories((prev) => [...prev, { id: tempId, name: trimmed, parentId: normalizedParentId ? String(normalizedParentId) : null }]);
      return;
    }
    try {
      const res = await fetch("/api/ledger/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, parentId: normalizedParentId }),
      });
      if (!res.ok) throw new Error("Failed to create ledger category");
      const data = await res.json();
      const saved = data.category || {};
      setLedgerCategories((prev) => [
        ...prev,
        { id: String(saved.id || `LED-${Date.now().toString(36)}`), name: saved.name || trimmed, parentId: saved.parentId ? String(saved.parentId) : (normalizedParentId ? String(normalizedParentId) : null) },
      ]);
    } catch (err) {
      console.error("Failed to create ledger category", err);
    }
  };

  const handleUpdateLedgerCategory = async (id: string, name: string, parentId: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = ledgerCategories.find((cat) => cat.id === id);
    if (!existing || (existing.name === trimmed && (existing.parentId || "") === (parentId || ""))) return;
    const normalizedParentId = parentId && !Number.isNaN(Number(parentId)) ? Number(parentId) : null;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "ledger_categories",
        entityId: id,
        operation: "update",
        before: existing,
        after: { id, name: trimmed, parentId: normalizedParentId },
        impact: "Staged ledger category update",
      });
      setLedgerCategories((prev) => prev.map((cat) => cat.id === id ? { ...cat, name: trimmed, parentId: normalizedParentId ? String(normalizedParentId) : null } : cat));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) => {
            const isSubcategory = Boolean(existing.parentId || parentId);
            if (isSubcategory) {
              if (t.subCategoryId === id || (!t.subCategoryId && t.subCategory === existing.name)) {
                return { ...t, subCategory: trimmed, subCategoryId: t.subCategoryId || id };
              }
              return t;
            }
            if (t.categoryId === id || (!t.categoryId && t.category === existing.name)) {
              return { ...t, category: trimmed, categoryId: t.categoryId || id };
            }
            return t;
          });
        });
        return next;
      });
      return;
    }
    try {
      const res = await fetch("/api/ledger/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id), name: trimmed, parentId: normalizedParentId }),
      });
      if (!res.ok) throw new Error("Failed to update ledger category");
      const data = await res.json();
      const saved = data.category || {};
      const updatedName = saved.name || trimmed;
      const updatedParentId = saved.parentId ? String(saved.parentId) : (normalizedParentId ? String(normalizedParentId) : null);
      setLedgerCategories((prev) => prev.map((cat) => cat.id === id ? { ...cat, name: updatedName, parentId: updatedParentId } : cat));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) => {
            const isSubcategory = Boolean(existing.parentId || updatedParentId);
            if (isSubcategory) {
              if (t.subCategoryId === id || (!t.subCategoryId && t.subCategory === existing.name)) {
                return { ...t, subCategory: updatedName, subCategoryId: t.subCategoryId || id };
              }
              return t;
            }
            if (t.categoryId === id || (!t.categoryId && t.category === existing.name)) {
              return { ...t, category: updatedName, categoryId: t.categoryId || id };
            }
            return t;
          });
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to update ledger category", err);
    }
  };

  const handleDeleteLedgerCategory = async (id: string) => {
    const existing = ledgerCategories.find((cat) => cat.id === id);
    if (!existing) return;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "ledger_categories",
        entityId: id,
        operation: "delete",
        before: existing,
        impact: "Staged ledger category delete",
      });
      setLedgerCategories((prev) => prev.filter((cat) => cat.id !== id && cat.parentId !== id));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) => {
            if (t.categoryId === id) {
              return { ...t, categoryId: undefined, subCategoryId: undefined };
            }
            if (t.subCategoryId === id) {
              return { ...t, subCategoryId: undefined };
            }
            return t;
          });
        });
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`/api/ledger/categories?id=${Number(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete ledger category");
      setLedgerCategories((prev) => prev.filter((cat) => cat.id !== id && cat.parentId !== id));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) => {
            if (t.categoryId === id) {
              return { ...t, categoryId: undefined, subCategoryId: undefined };
            }
            if (t.subCategoryId === id) {
              return { ...t, subCategoryId: undefined };
            }
            return t;
          });
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to delete ledger category", err);
    }
  };

  const handleSaveLedgerAccount = async (payload: {
    id?: string | null;
    name: string;
    type: LedgerAccount["type"];
    institution?: string;
    last4?: string;
  }) => {
    const name = payload.name.trim();
    if (!name) return;
    const type = payload.type || "bank";
    const institution = payload.institution?.trim() || "";
    const last4 = payload.last4?.trim() || "";
    const existing = payload.id ? ledgerAccounts.find((acct) => acct.id === payload.id) : null;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = payload.id || `ACCT-${Date.now().toString(36)}`;
      stageChange({
        entity: "ledger_accounts",
        entityId: payload.id || null,
        operation: payload.id ? "update" : "create",
        before: existing || null,
        after: { id: tempId, name, type, institution, last4 },
        impact: payload.id ? "Staged ledger account update" : "Staged ledger account create",
      });
      setLedgerAccounts((prev) => {
        if (payload.id) {
          return prev.map((acct) => acct.id === payload.id ? { ...acct, name, type, institution, last4 } : acct);
        }
        return [...prev, { id: tempId, name, type, institution, last4 }];
      });
      if (payload.id) {
        setTransactions((prev) => {
          const next: Record<number, Transaction[]> = {};
          Object.entries(prev).forEach(([projectId, list]) => {
            next[Number(projectId)] = list.map((t) =>
              t.accountId === payload.id ? { ...t, accountName: name } : t
            );
          });
          return next;
        });
      }
      return;
    }
    try {
      const method = payload.id ? "PATCH" : "POST";
      const res = await fetch("/api/accounts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload.id
            ? { items: [{ id: Number(payload.id), name, type, institution, last4 }] }
            : { items: [{ name, type, institution, last4 }] }
        ),
      });
      if (!res.ok) throw new Error("Failed to save account");
      const data = await res.json();
      const saved = (data.accounts || [])[0] || {};
      const savedId = String(saved.id || payload.id || `ACCT-${Date.now().toString(36)}`);
      setLedgerAccounts((prev) => {
        if (payload.id) {
          return prev.map((acct) =>
            acct.id === payload.id
              ? {
                  ...acct,
                  id: savedId,
                  name: saved.name || name,
                  type: (String(saved.type || type).toLowerCase() as LedgerAccount["type"]) || type,
                  institution: saved.institution || institution,
                  last4: saved.last4 || last4,
                }
              : acct
          );
        }
        return [
          ...prev,
          {
            id: savedId,
            name: saved.name || name,
            type: (String(saved.type || type).toLowerCase() as LedgerAccount["type"]) || type,
            institution: saved.institution || institution,
            last4: saved.last4 || last4,
          },
        ];
      });
      if (payload.id) {
        setTransactions((prev) => {
          const next: Record<number, Transaction[]> = {};
          Object.entries(prev).forEach(([projectId, list]) => {
            next[Number(projectId)] = list.map((t) =>
              t.accountId === payload.id ? { ...t, accountName: saved.name || name } : t
            );
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to save account", err);
    }
  };

  const handleDeleteLedgerAccount = async (id: string) => {
    const existing = ledgerAccounts.find((acct) => acct.id === id);
    if (!existing) return;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "ledger_accounts",
        entityId: id,
        operation: "delete",
        before: existing,
        impact: "Staged ledger account delete",
      });
      setLedgerAccounts((prev) => prev.filter((acct) => acct.id !== id));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) =>
            t.accountId === id ? { ...t, accountId: undefined, accountName: t.accountName || existing.name } : t
          );
        });
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`/api/accounts?id=${Number(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      setLedgerAccounts((prev) => prev.filter((acct) => acct.id !== id));
      setTransactions((prev) => {
        const next: Record<number, Transaction[]> = {};
        Object.entries(prev).forEach(([projectId, list]) => {
          next[Number(projectId)] = list.map((t) =>
            t.accountId === id ? { ...t, accountId: undefined, accountName: t.accountName || existing.name } : t
          );
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to delete account", err);
    }
  };

  // --- Resource Operations ---
  const handleOpenResourceAssignment = () => {
    if (!contextMenu.activity) return;
    setActivityForResources(contextMenu.activity);
    setResourceAssignmentDialog(true);
    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  const handleSaveActivityResources = (activityId: string, newResources: ActivityResource[]) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;

    // Optimistic update
    setActivities(prev => ({
      ...prev,
      [projectKey]: (prev[projectKey] || []).map(a =>
        a.id === activityId ? { ...a, resources: newResources } : a
      )
    }));

    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "resources",
        entityId: activityId,
        operation: "update",
        before: null,
        after: { activityId: Number(activityId), resources: newResources },
        impact: "Staged resource assignment",
      });
      return;
    }

    fetch("/api/resource-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityId: Number(activityId),
        resources: newResources.map((r) => ({
          resourceId: Number(r.resourceId),
          quantity: r.quantity,
        })),
      }),
    }).catch(err => console.error("Failed to save resource assignments", err));
  };

  const handleSaveAllResources = (updatedResources: Resource[]) => {
    const currentIds = new Set(resources.map(r => r.id));
    const updatedIds = new Set(updatedResources.map(r => r.id));
    // deletions
    resources.forEach((r) => {
      if (!updatedIds.has(r.id) && r.id && !isNaN(Number(r.id))) {
        if (!currentUser || currentUser.role !== "admin") {
          stageChange({
            entity: "resources",
            entityId: r.id,
            operation: "delete",
            before: r,
            impact: "Staged resource delete",
          });
        } else {
          fetch(`/api/resources?id=${Number(r.id)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete resource", err));
        }
      }
    });
    // upserts
    updatedResources.forEach((r) => {
      const payload = {
        name: r.name,
        role: r.type,
        costType: r.type,
        unitType: r.rateUnit,
        standardRate: r.rate,
      };
      if (!currentUser || currentUser.role !== "admin") {
        stageChange({
          entity: "resources",
          entityId: r.id && !isNaN(Number(r.id)) ? r.id : null,
          operation: r.id && !isNaN(Number(r.id)) && currentIds.has(r.id) ? "update" : "create",
          before: r.id && currentIds.has(r.id) ? resources.find(x => x.id === r.id) || null : null,
          after: { ...payload },
          impact: "Staged resource upsert",
        });
      } else {
        if (r.id && !isNaN(Number(r.id)) && currentIds.has(r.id)) {
          fetch("/api/resources", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(r.id), ...payload }),
          }).catch(err => console.error("Failed to update resource", err));
        } else {
          fetch("/api/resources", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then(res => res.json())
            .then((data) => {
              const resrc = data.resource;
              if (resrc && resrc.id) {
                setResources(prev => prev.map(pr => pr === r ? { ...r, id: String(resrc.id) } : pr));
              }
            })
            .catch(err => console.error("Failed to create resource", err));
        }
      }
    });
    setResources(updatedResources);
  };

  const handleUpdateActivityDates = (activityId: string, newStart: string, newFinish: string) => {
    if (!activeProjectId) return;
    const startMs = toDateMs(newStart);
    const finishMs = toDateMs(newFinish);
    const durationDays = Math.max(1, Math.round((finishMs - startMs) / DAY_MS) + 1);

    fetch("/api/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(activityId), startDate: newStart, finishDate: newFinish, durationDays }),
    }).catch(err => console.error("Failed to update activity dates", err));

    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(a =>
        a.id === activityId ? { ...a, start: newStart, finish: newFinish, duration: durationDays } : a
      )
    }));
  };

  const handleSetPredecessor = (activityId: string, predecessorId: string) => {
    if (!activeProjectId) return;
    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(a => {
        if (a.id !== activityId) return a;
        return { ...a, predecessors: [predecessorId] };
      })
    }));
  };

  const handleSetSuccessor = (activityId: string, successorId: string) => {
    if (!activeProjectId) return;
    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(a => {
        if (a.id === activityId) return { ...a, successor: successorId };
        if (a.id === successorId) {
          // ensure reciprocal predecessor update
          return { ...a, predecessors: [activityId] };
        }
        return a;
      })
    }));
  };

  // --- Project Details Operations ---
  const handleUpdateProjectDetails = (updatedDetails: ProjectDetail[]) => {
    const projectDbId = activeProjectDbId ?? resolveProjectId();
    if (!projectDbId) return;
    const prevDetails = projectDetails[projectDbId] || [];
    const updatedIds = new Set(updatedDetails.map(d => d.id));

    // Non-admin users stage changes instead of writing directly
    if (!currentUser || currentUser.role !== "admin") {
      // deletions
      prevDetails.forEach((d) => {
        if (!updatedIds.has(d.id) && d.id && !isNaN(Number(d.id))) {
          stageChange({
            entity: "project_details",
            entityId: Number(d.id),
            operation: "delete",
            impact: "Remove project detail",
            before: { projectId: projectDbId, variable: d.variable, value: d.value },
          });
        }
      });

      // upserts
      updatedDetails.forEach((d) => {
        const payload = { projectId: projectDbId, variable: d.variable, value: d.value };
        const existing = d.id ? prevDetails.find(pd => pd.id === d.id) : null;

        if (d.id && !isNaN(Number(d.id))) {
          // update
          if (!existing || existing.value !== d.value || existing.variable !== d.variable) {
            stageChange({
              entity: "project_details",
              entityId: Number(d.id),
              operation: "update",
              impact: "Update project detail",
              before: existing ? { projectId: projectDbId, variable: existing.variable, value: existing.value } : undefined,
              after: payload,
            });
          }
        } else {
          // create
          stageChange({
            entity: "project_details",
            operation: "create",
            impact: "Add project detail",
            after: payload,
          });
        }
      });

      setProjectDetails(prev => ({
        ...prev,
        [projectDbId]: updatedDetails,
      }));
      return;
    }

    // deletions
    prevDetails.forEach((d) => {
      if (!updatedIds.has(d.id) && d.id && !isNaN(Number(d.id))) {
        fetch(`/api/project-details?id=${Number(d.id)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete project detail", err));
      }
    });

    // upserts
    updatedDetails.forEach((d) => {
      const payload = { projectId: projectDbId, variable: d.variable, value: d.value };
      if (d.id && !isNaN(Number(d.id))) {
        fetch("/api/project-details", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(d.id), ...payload }),
        }).catch(err => console.error("Failed to update project detail", err));
      } else {
        fetch("/api/project-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(res => res.json())
          .then((data) => {
            const detail = data.detail;
            if (detail?.id) {
              setProjectDetails(prev => ({
                ...prev,
                [projectDbId]: updatedDetails.map(ud => ud === d ? { ...ud, id: String(detail.id) } : ud),
              }));
            }
          })
          .catch(err => console.error("Failed to create project detail", err));
      }
    });

    setProjectDetails(prev => ({
      ...prev,
      [projectDbId]: updatedDetails,
    }));
  };

  const handleAutoPopulateProjectDetails = (fields: Omit<ProjectDetail, 'id'>[]) => {
    const projectKey = activeProjectDbId ?? resolveProjectId();
    if (!projectKey) return;
    const currentDetails = projectDetails[projectKey] || [];
    const existingVariables = new Set(currentDetails.map(d => d.variable));

    const nextIdNum = currentDetails.length > 0 ? Math.max(...currentDetails.map(d => parseInt(d.id.substring(1)))) + 1 : 1;
    let currentIdNum = nextIdNum;

    const newDetails: ProjectDetail[] = fields
      .filter(f => !existingVariables.has(f.variable))
      .map(f => {
        const detail: ProjectDetail = {
          ...f,
          id: `D${currentIdNum++}`,
        };
        return detail;
      });

    setProjectDetails(prev => ({
      ...prev,
      [projectKey]: [...currentDetails, ...newDetails],
    }));
  };

  const upsertProjectDetail = useCallback((projectId: number, variable: string, value: string) => {
    setProjectDetails(prev => {
      const current = prev[projectId] || [];
      const idx = current.findIndex(d => d.variable === variable);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], value };
        return { ...prev, [projectId]: next };
      }
      const nextIdNum = current.length > 0 ? Math.max(...current.map(d => parseInt(d.id.substring(1)))) + 1 : 1;
      const newDetail: ProjectDetail = { id: `D${nextIdNum}`, variable, value };
      return { ...prev, [projectId]: [...current, newDetail] };
    });
  }, []);

  // --- Custom Formula Operations ---
  const handleCreateFormula = () => {
    if (selectedNode && selectedNode.type === "project") {
      const projectDbId = getProjectDbIdFromNode(selectedNode.id) ?? selectedNode.projectId ?? null;
      if (projectDbId) setActiveProjectId(projectDbId);
    }
    setEditingFormula(null);
    setFormulaDialogOpen(true);
  };

  const handleEditFormula = (formula: CustomFormula) => {
    const projectId = resolveActiveProjectId();
    if (projectId) setActiveProjectId(projectId);
    setEditingFormula(formula);
    setFormulaDialogOpen(true);
  };

  const handleDeleteFormula = async (formulaId: string) => {
    const projectDbId = activeProjectDbId ?? resolveProjectId();
    if (!projectDbId) return;

    const confirmed = window.confirm("Are you sure you want to delete this formula?");
    if (!confirmed) return;

    setCustomFormulas(prev => ({
      ...prev,
      [projectDbId]: (prev[projectDbId] || []).filter(f => f.id !== formulaId)
    }));

    try {
      await fetch(`/api/formulas?id=${encodeURIComponent(formulaId)}&projectId=${projectDbId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Failed to delete formula", err);
    }
  };

  const handleSaveFormula = async (formula: CustomFormula) => {
    const projectDbId = activeProjectDbId ?? resolveProjectId();
    if (!projectDbId) return;

    const hasDbId = formula.id && !Number.isNaN(Number(formula.id));
    const existing = (customFormulas[projectDbId] || []).find(f => f.id === formula.id);
    const payload = {
      projectId: projectDbId,
      name: formula.name,
      formula: formula.formula,
      description: formula.description,
      resultType: formula.resultType,
    };

    let saved = formula;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "formulas",
        entityId: hasDbId ? Number(formula.id) : undefined,
        operation: hasDbId ? "update" : "create",
        impact: hasDbId ? "Update custom formula" : "Create custom formula",
        before: hasDbId ? existing || null : undefined,
        after: payload,
      });
      // keep local state optimistic
      setCustomFormulas(prev => {
        const existingList = prev[projectDbId] || [];
        const idx = existingList.findIndex(f => f.id === saved.id);
        const nextSaved = hasDbId ? saved : { ...saved, id: saved.id || `tmp-${Date.now()}` };
        if (idx >= 0) {
          const next = [...existingList];
          next[idx] = nextSaved;
          return { ...prev, [projectDbId]: next };
        }
        return { ...prev, [projectDbId]: [...existingList, nextSaved] };
      });
      return;
    }

    try {
      const res = await fetch("/api/formulas", {
        method: hasDbId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasDbId ? { id: Number(formula.id), ...payload } : payload),
      });
      if (res.ok) {
        const data = await res.json();
        const apiFormula = data.formula || data?.detail || null;
        if (apiFormula) {
          saved = {
            ...formula,
            id: String(apiFormula.id ?? formula.id),
            name: apiFormula.name ?? formula.name,
            formula: apiFormula.formula ?? formula.formula,
            description: apiFormula.description ?? formula.description,
            resultType: (apiFormula.resultType as CustomFormula["resultType"]) ?? formula.resultType,
          };
        }
      }
    } catch (err) {
      console.error("Failed to save formula", err);
    }

    setCustomFormulas(prev => {
      const existing = prev[projectDbId] || [];
      const existingIndex = existing.findIndex(f => f.id === saved.id);

      if (existingIndex >= 0) {
        const updated = [...existing];
        updated[existingIndex] = saved;
        return { ...prev, [projectDbId]: updated };
      } else {
        return { ...prev, [projectDbId]: [...existing, saved] };
      }
    });
  };

  const handleSaveFormulaPreset = async (formula: CustomFormula) => {
    const hasDbId = formula.id && !Number.isNaN(Number(formula.id));
    const existing = formulaPresets.find(p => p.id === formula.id);
    const payload = {
      name: formula.name,
      formula: formula.formula,
      description: formula.description,
      resultType: formula.resultType,
    };
    let saved = formula;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "formula_presets",
        entityId: hasDbId ? Number(formula.id) : undefined,
        operation: hasDbId ? "update" : "create",
        impact: hasDbId ? "Update preset formula" : "Create preset formula",
        before: hasDbId ? existing || null : undefined,
        after: payload,
      });
      setFormulaPresets((prev) => {
        const existingIdx = prev.findIndex(p => p.id === saved.id);
        const nextSaved = hasDbId ? saved : { ...saved, id: saved.id || `tmp-${Date.now()}` };
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = nextSaved;
          return next;
        }
        return [...prev, nextSaved];
      });
      return;
    }
    try {
      const res = await fetch("/api/formula-presets", {
        method: hasDbId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasDbId ? { id: Number(formula.id), ...payload } : payload),
      });
      if (res.ok) {
        const data = await res.json();
        const apiPreset = data.preset || null;
        if (apiPreset) {
          saved = {
            ...formula,
            id: String(apiPreset.id ?? formula.id),
            name: apiPreset.name ?? formula.name,
            formula: apiPreset.formula ?? formula.formula,
            description: apiPreset.description ?? formula.description,
            resultType: (apiPreset.resultType as CustomFormula["resultType"]) ?? formula.resultType,
          };
        }
      }
    } catch (err) {
      console.error("Failed to save formula preset", err);
    }

    setFormulaPresets((prev) => {
      const existingIdx = prev.findIndex(p => p.id === saved.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  const handleDeletePreset = (presetId: string) => {
    const preset = formulaPresets.find(p => p.id === presetId);
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "formula_presets",
        entityId: presetId ? Number(presetId) : undefined,
        operation: "delete",
        impact: "Delete preset formula",
        before: preset || undefined,
      });
      setFormulaPresets(prev => prev.filter(p => p.id !== presetId));
      return;
    }
    if (presetId && !Number.isNaN(Number(presetId))) {
      fetch(`/api/formula-presets?id=${Number(presetId)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete formula preset", err));
    }
    setFormulaPresets(prev => prev.filter(p => p.id !== presetId));
  };

  const handleSaveTaxRate = async (taxRate: TaxRate) => {
    const hasDbId = taxRate.id && !Number.isNaN(Number(taxRate.id));
    const existing = taxRates.find(tr => tr.id === taxRate.id);
    const payload = {
      county: taxRate.county,
      state: taxRate.state,
      rate: taxRate.rate,
      note: taxRate.note,
    };
    let saved = taxRate;
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "tax_rates",
        entityId: hasDbId ? Number(taxRate.id) : undefined,
        operation: hasDbId ? "update" : "create",
        impact: hasDbId ? "Update tax rate" : "Create tax rate",
        before: hasDbId ? existing || null : undefined,
        after: payload,
      });
      setTaxRates((prev) => {
        const idx = prev.findIndex(tr => tr.id === saved.id);
        const nextSaved = hasDbId ? saved : { ...saved, id: saved.id || `tmp-${Date.now()}` };
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = nextSaved;
          return next;
        }
        return [...prev, nextSaved];
      });
      return;
    }
    try {
      const res = await fetch("/api/tax-rates", {
        method: hasDbId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasDbId ? { id: Number(taxRate.id), ...payload } : payload),
      });
      if (res.ok) {
        const data = await res.json();
        const apiTr = data.taxRate || null;
        if (apiTr) {
          saved = {
            id: String(apiTr.id ?? taxRate.id),
            county: apiTr.county ?? taxRate.county,
            state: apiTr.state ?? taxRate.state,
            rate: Number(apiTr.rate ?? taxRate.rate),
            note: apiTr.note ?? taxRate.note,
          };
        }
      }
    } catch (err) {
      console.error("Failed to save tax rate", err);
    }

    setTaxRates((prev) => {
      const idx = prev.findIndex(tr => tr.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  const handleDeleteTaxRate = async (id: string) => {
    const existing = taxRates.find(tr => tr.id === id);
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "tax_rates",
        entityId: id ? Number(id) : undefined,
        operation: "delete",
        impact: "Delete tax rate",
        before: existing || undefined,
      });
      setTaxRates(prev => prev.filter(tr => tr.id !== id));
      return;
    }
    setTaxRates(prev => prev.filter(tr => tr.id !== id));
    if (id && !Number.isNaN(Number(id))) {
      try {
        await fetch(`/api/tax-rates?id=${Number(id)}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete tax rate", err);
      }
    }
  };

  const resolveActiveProjectId = () => {
    if (activeProjectId) return activeProjectId;
    if (selectedNode && selectedNode.type === "project") return selectedNode.id;
    return null;
  };

  const handleApplyPresetToProject = async (presetId: string) => {
    const nodeId = resolveActiveProjectId();
    const projectDbId = activeProjectDbId ?? (nodeId ? getProjectDbIdFromNode(nodeId) ?? null : null);
    if (!projectDbId) return;
    const preset = formulaPresets.find(p => p.id === presetId);
    if (!preset) return;

    const payload = {
      projectId: projectDbId,
      name: preset.name,
      formula: preset.formula,
      description: preset.description,
      resultType: preset.resultType,
    };

    let saved: CustomFormula = { ...preset, id: "" };
    try {
      const res = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const apiFormula = data.formula || null;
        if (apiFormula) {
          saved = {
            id: String(apiFormula.id),
            name: apiFormula.name ?? preset.name,
            formula: apiFormula.formula ?? preset.formula,
            description: apiFormula.description ?? preset.description,
            resultType: (apiFormula.resultType as CustomFormula["resultType"]) ?? preset.resultType,
          };
        }
      }
    } catch (err) {
      console.error("Failed to apply preset to project", err);
    }

    setCustomFormulas(prev => ({
      ...prev,
      [projectDbId]: [...(prev[projectDbId] || []), saved],
    }));
    setPresetPickerOpen(false);

    // Auto-generate missing detail variables for this preset and surface them in the details panel
    const placeholderVars = extractVariables(preset.formula);
    const taxVarNames = new Set(Object.keys(taxVariableMap));

    setProjectDetails(prev => {
      const existingDetails = prev[projectDbId] || [];
      const existingDetailNames = new Set(existingDetails.map(d => d.variable));
      const existingFormulaNames = new Set((customFormulas[projectDbId] || []).map(f => f.name));

      const missingDetailVars = placeholderVars.filter(
        (v) => !existingDetailNames.has(v) && !existingFormulaNames.has(v) && !taxVarNames.has(v)
      );

      if (!missingDetailVars.length) return prev;

      const nextIdNum = existingDetails.length > 0 ? Math.max(...existingDetails.map(d => parseInt(d.id.substring(1)))) + 1 : 1;
      let counter = nextIdNum;
      const newDetails: ProjectDetail[] = missingDetailVars.map((name) => ({
        id: `D${counter++}`,
        variable: name,
        value: "0",
      }));

      return {
        ...prev,
        [projectDbId]: [...existingDetails, ...newDetails],
      };
    });
  };

  const openPresetPicker = () => {
    if (selectedNode && selectedNode.type === "project") {
      const projectDbId = getProjectDbIdFromNode(selectedNode.id) ?? selectedNode.projectId ?? null;
      if (projectDbId) setActiveProjectId(projectDbId);
    }
    setPresetPickerOpen(true);
  };

  const persistPipelineMeta = (projectId: number, meta: ProjectPipelineMeta) => {
    const payload = {
      projectId,
      status: meta.status,
      sellerName: meta.seller?.name || "",
      sellerPhone: meta.seller?.phone || "",
      sellerEmail: meta.seller?.email || "",
      selectedEmailOptionIds: (meta.selectedEmailOptionIds || []).join(","),
    };
    fetch("/api/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(res => {
      if (!res.ok) {
        return fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      return res;
    }).catch(err => console.error("Failed to persist pipeline meta", err));
  };

  const handleProjectStatusChange = (epsOrProjectId: number, status: ProjectStatus) => {
    const projectDbId = getProjectDbIdFromNode(epsOrProjectId) ?? epsOrProjectId;
    if (!projectDbId) {
      alert("This project node is missing a linked project. Please recreate or relink the project.");
      return;
    }
    const existing = pipelineMeta[projectDbId] || { seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] as string[], status: "under_contract" as ProjectStatus };
    if (existing.status === "under_contract" && status === "acquired") {
      setPendingAcquireProjectId(projectDbId);
      setAcquireConfirmOpen(true);
      return;
    }
    const nextMeta = { ...existing, status };

    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "pipeline_meta",
        entityId: projectDbId,
        operation: "update",
        before: existing,
        after: nextMeta,
        impact: "Staged pipeline status change",
      });
      setPipelineMeta(prev => ({
        ...prev,
        [projectDbId]: nextMeta,
      }));
      if (status === "acquired") {
        setActiveProjectId(projectDbId);
        setMode("Activities");
      }
      return;
    }

    setPipelineMeta(prev => ({
      ...prev,
      [projectDbId]: nextMeta,
    }));
    persistPipelineMeta(projectDbId, nextMeta);
    if (status === "acquired") {
      setActiveProjectId(projectDbId);
      setMode("Activities");
    }
  };

  const confirmAcquire = () => {
    if (pendingAcquireProjectId == null) {
      setAcquireConfirmOpen(false);
      return;
    }
    setPipelineMeta(prev => {
      const existing = prev[pendingAcquireProjectId] || { seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] as string[], status: "under_contract" as ProjectStatus };
      const next = { ...existing, status: "acquired" as ProjectStatus };
      if (!currentUser || currentUser.role !== "admin") {
        stageChange({
          entity: "pipeline_meta",
          entityId: pendingAcquireProjectId,
          operation: "update",
          before: existing,
          after: next,
          impact: "Staged acquisition",
        });
      } else {
        persistPipelineMeta(pendingAcquireProjectId, next);
      }
      return { ...prev, [pendingAcquireProjectId]: next };
    });
    setActiveProjectId(pendingAcquireProjectId);
    setMode("Activities");
    setAcquireConfirmOpen(false);
    setPendingAcquireProjectId(null);
  };

  const ensureRentProperty = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = rentRollProperties.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = `PROP-${Date.now()}`;
      stageChange({
        entity: "rent_properties",
        entityId: tempId,
        operation: "create",
        after: { name: trimmed },
        impact: "Staged rent property create",
      });
      setRentRollProperties((prev) => [...prev, { id: tempId, name: trimmed, linkedProjectId: null }]);
      return tempId;
    }
    try {
      const res = await fetch("/api/rent/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create property");
      const data = await res.json();
      const prop = data.property || {};
      const newProperty: RentRollProperty = { id: String(prop.id || `PROP-${Date.now()}`), name: prop.name || trimmed, linkedProjectId: prop.linkedProjectId ? Number(prop.linkedProjectId) : null };
      setRentRollProperties((prev) => [...prev, newProperty]);
      return newProperty.id;
    } catch (err) {
      console.error("Failed to create property", err);
      return null;
    }
  }, [rentRollProperties, currentUser, stageChange]);

  const handleSaveRentRollUnit = async () => {
    const propertyId = await ensureRentProperty(rentRollForm.propertyName);
    if (!propertyId || !rentRollForm.unit.trim()) return;
  const rent = parseFloat(rentRollForm.rent) || 0;
  const bedrooms = parseInt(rentRollForm.bedrooms || "0", 10) || 0;
  const bathrooms = parseInt(rentRollForm.bathrooms || "0", 10) || 0;
  const initialDueMonthDay = rentRollForm.initialDueMonthDay || "01-01";
  const lastPaymentDate = rentRollForm.lastPaymentDate || null;
  const selectedTenant = rentRollForm.tenantId ? tenants.find((t) => t.id === rentRollForm.tenantId) : null;
  const tenantName = selectedTenant?.name || rentRollForm.tenant.trim() || "Vacant";
  const lastPaymentPaidOnDate = lastPaymentDate ? rentRollForm.lastPaymentPaidStatus === "on_time" : null;
  const lastPaymentPaidDate = lastPaymentDate
    ? rentRollForm.lastPaymentPaidStatus === "on_time"
      ? lastPaymentDate
      : rentRollForm.lastPaymentPaidStatus === "different_day"
        ? (rentRollForm.lastPaymentPaidDate || null)
        : null
    : null;
  if (!currentUser || currentUser.role !== "admin") {
    if (editingRentRollId) {
      const existing = rentRollEntries.find((e) => e.id === editingRentRollId);
        const updated: RentRollEntry = existing ? {
          ...existing,
          propertyId,
          unit: rentRollForm.unit.trim(),
          tenant: tenantName,
          status: rentRollForm.status,
          rent,
          leaseEnd: rentRollForm.leaseEnd || "TBD",
          initialDueMonthDay,
          bedrooms,
          bathrooms,
          lastPaymentDate,
          lastPaymentPaidOnDate,
          lastPaymentPaidDate,
        } : {
          id: editingRentRollId,
          propertyId,
          unit: rentRollForm.unit.trim(),
          tenant: tenantName,
          status: rentRollForm.status,
          rent,
          balance: 0,
          leaseEnd: rentRollForm.leaseEnd || "TBD",
          initialDueMonthDay,
          bedrooms,
          bathrooms,
          lastPaymentDate,
          lastPaymentPaidOnDate,
          lastPaymentPaidDate,
          createdAt: toDateString(getCentralTodayMs()),
        };
      stageChange({
        entity: "rent_units",
        entityId: editingRentRollId,
        operation: "update",
        before: existing || null,
        after: updated,
        impact: "Staged rent unit update",
      });
      setRentRollEntries((prev) =>
        prev.map((entry) => (entry.id === editingRentRollId ? updated : entry))
      );
      setRentRollProperty(String(propertyId));
    } else {
      const tempId = `UNIT-${Date.now()}`;
      const newEntry: RentRollEntry = {
        id: tempId,
        propertyId,
        unit: rentRollForm.unit.trim(),
        tenant: tenantName,
        status: rentRollForm.status,
        rent,
        balance: 0,
        leaseEnd: rentRollForm.leaseEnd || "TBD",
        initialDueMonthDay,
        bedrooms,
        bathrooms,
        lastPaymentDate,
        lastPaymentPaidOnDate,
        lastPaymentPaidDate,
        createdAt: toDateString(getCentralTodayMs()),
      };
      stageChange({
        entity: "rent_units",
        entityId: tempId,
        operation: "create",
        after: newEntry,
        impact: "Staged rent unit create",
      });
      setRentRollEntries((prev) => [...prev, newEntry]);
      setRentRollProperty(String(propertyId));
    }
    return;
  }
    if (editingRentRollId) {
      try {
        const res = await fetch("/api/rent/units", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: Number(editingRentRollId),
              propertyId: Number(propertyId),
              unit: rentRollForm.unit.trim(),
              tenant: tenantName,
              status: rentRollForm.status,
              rent,
              leaseEnd: rentRollForm.leaseEnd || "TBD",
              initialDueMonthDay,
              bedrooms,
              bathrooms,
              lastPaymentDate,
              lastPaymentPaidOnDate,
              lastPaymentPaidDate,
            }),
          });
        if (!res.ok) throw new Error("Failed to update unit");
        const data = await res.json();
        const unit = data.unit || {};
        const linkedTenant = tenants.find((t) => t.rentUnitId === editingRentRollId);
        const unlink = linkedTenant && linkedTenant.id !== rentRollForm.tenantId;
        const link = rentRollForm.tenantId && rentRollForm.tenantId !== linkedTenant?.id;
        if (unlink) {
          fetch("/api/tenants", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(linkedTenant.id), rentUnitId: null }),
          }).catch((err) => console.error("Failed to unlink tenant", err));
        }
        if (link) {
          fetch("/api/tenants", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(rentRollForm.tenantId), rentUnitId: Number(editingRentRollId) }),
          }).catch((err) => console.error("Failed to link tenant", err));
        }
        setRentRollEntries((prev) =>
          prev.map((entry) =>
            entry.id === editingRentRollId
              ? {
                  ...entry,
                  propertyId,
                  unit: unit.unit || rentRollForm.unit.trim(),
                  tenant: unit.tenant || tenantName,
                    status: (unit.status as RentRollStatus) || rentRollForm.status,
                    rent: Number(unit.rent ?? rent),
                    leaseEnd: unit.leaseEnd || rentRollForm.leaseEnd || "TBD",
                    initialDueMonthDay: unit.initialDueMonthDay || initialDueMonthDay,
                    bedrooms: Number(unit.bedrooms ?? bedrooms),
                    bathrooms: Number(unit.bathrooms ?? bathrooms),
                    lastPaymentDate: unit.lastPaymentDate ? toDateString(toDateMs(unit.lastPaymentDate)) : lastPaymentDate,
                    lastPaymentPaidOnDate: typeof unit.lastPaymentPaidOnDate === "boolean" ? unit.lastPaymentPaidOnDate : lastPaymentPaidOnDate,
                    lastPaymentPaidDate: unit.lastPaymentPaidDate ? toDateString(toDateMs(unit.lastPaymentPaidDate)) : lastPaymentPaidDate,
                  }
                : entry
            )
          );
        await loadRentData();
        setRentRollProperty(String(propertyId));
      } catch (err) {
        console.error("Failed to update unit", err);
      }
    } else {
      try {
        const res = await fetch("/api/rent/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId: Number(propertyId),
              unit: rentRollForm.unit.trim(),
              tenant: tenantName,
              status: rentRollForm.status,
              rent,
              leaseEnd: rentRollForm.leaseEnd || "TBD",
              initialDueMonthDay,
              bedrooms,
              bathrooms,
              lastPaymentDate,
              lastPaymentPaidOnDate,
              lastPaymentPaidDate,
            }),
          });
        if (!res.ok) throw new Error("Failed to create unit");
        const data = await res.json();
        const unit = data.unit || {};
        if (rentRollForm.tenantId) {
          fetch("/api/tenants", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: Number(rentRollForm.tenantId), rentUnitId: Number(unit.id) }),
          }).catch((err) => console.error("Failed to link tenant", err));
        }
        const now = toDateString(getCentralTodayMs());
        const newEntry: RentRollEntry = {
          id: String(unit.id || `RR${Date.now().toString(36)}`),
          propertyId,
          unit: unit.unit || rentRollForm.unit.trim(),
          tenant: unit.tenant || tenantName,
            status: (unit.status as RentRollStatus) || rentRollForm.status,
            rent: Number(unit.rent ?? rent),
            balance: 0,
            leaseEnd: unit.leaseEnd || rentRollForm.leaseEnd || "TBD",
            initialDueMonthDay: unit.initialDueMonthDay || initialDueMonthDay,
            bedrooms: Number(unit.bedrooms ?? bedrooms),
            bathrooms: Number(unit.bathrooms ?? bathrooms),
            lastPaymentDate: unit.lastPaymentDate ? toDateString(toDateMs(unit.lastPaymentDate)) : lastPaymentDate,
            lastPaymentPaidOnDate: typeof unit.lastPaymentPaidOnDate === "boolean" ? unit.lastPaymentPaidOnDate : lastPaymentPaidOnDate,
            lastPaymentPaidDate: unit.lastPaymentPaidDate ? toDateString(toDateMs(unit.lastPaymentPaidDate)) : lastPaymentPaidDate,
            createdAt: unit.createdAt ? toDateString(toDateMs(unit.createdAt)) : now,
          };
        setRentRollEntries((prev) => [...prev, newEntry]);
        await loadRentData();
        setRentRollProperty(String(propertyId));
      } catch (err) {
        console.error("Failed to save unit", err);
      }
    }
    setRentRollModalOpen(false);
    setEditingRentRollId(null);
    setRentRollForm({
      propertyName: "",
      unit: "",
      tenant: "",
      tenantId: "",
      status: "Occupied" as RentRollStatus,
      rent: "",
      leaseEnd: "",
      initialDueMonthDay: "",
      bedrooms: "",
      bathrooms: "",
      lastPaymentDate: "",
      lastPaymentPaidStatus: "on_time",
      lastPaymentPaidDate: "",
    });
  };

  const resetTenantForm = () => {
    setTenantForm({ name: "", email: "", password: "", rentUnitId: "", emailReminders: false });
    setEditingTenantId(null);
  };

  const handleSaveTenantAccount = async () => {
    if (!currentUser || currentUser.role !== "admin") return;
    setTenantError(null);
    setTenantStatus(null);
    const name = tenantForm.name.trim();
    const email = tenantForm.email.trim().toLowerCase();
    const password = tenantForm.password;
    if (!name || !email || (!editingTenantId && !password)) {
      setTenantError(editingTenantId ? "Name and email are required." : "Name, email, and password are required.");
      return;
    }
    setTenantSaving(true);
    try {
      const rentUnitId = tenantForm.rentUnitId ? Number(tenantForm.rentUnitId) : null;
      if (editingTenantId) {
        const payload: Record<string, unknown> = {
          id: Number(editingTenantId),
          name,
          email,
          rentUnitId,
          emailReminders: tenantForm.emailReminders,
        };
        if (password) payload.password = password;
        const res = await fetch("/api/tenants", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update tenant.");
        }
        setTenants((prev) =>
          prev.map((t) =>
            t.id === editingTenantId
              ? { ...t, name, email, rentUnitId: rentUnitId ? String(rentUnitId) : null, emailReminders: tenantForm.emailReminders }
              : t
          )
        );
        setTenantStatus("Tenant account updated.");
      } else {
        const res = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            rentUnitId,
            emailReminders: tenantForm.emailReminders,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create tenant.");
        }
        const data = await res.json();
        const created = data.tenant || {};
        setTenants((prev) => [
          ...prev,
          {
            id: String(created.id || `TEN-${Date.now()}`),
            rentUnitId: created.rentUnitId ? String(created.rentUnitId) : (tenantForm.rentUnitId || null),
            name: created.name || name,
            email: created.email || email,
            emailReminders: Boolean(created.emailReminders ?? tenantForm.emailReminders),
            createdAt: created.createdAt ? toDateString(toDateMs(created.createdAt)) : toDateString(getCentralTodayMs()),
          },
        ]);
        setTenantStatus("Tenant account created.");
      }
      if (tenantForm.rentUnitId) {
        const unitId = tenantForm.rentUnitId;
        fetch("/api/rent/units", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: Number(unitId), tenant: name }),
        }).catch((err) => console.error("Failed to update rent unit tenant name", err));
        setRentRollEntries((prev) =>
          prev.map((entry) => (entry.id === unitId ? { ...entry, tenant: name } : entry))
        );
      }
      resetTenantForm();
    } catch (err) {
      console.error("Failed to save tenant account", err);
      setTenantError("Failed to save tenant account.");
    } finally {
      setTenantSaving(false);
    }
  };

  const handleEditTenantAccount = (tenant: Tenant) => {
    setTenantError(null);
    setTenantStatus(null);
    setEditingTenantId(tenant.id);
    setTenantForm({
      name: tenant.name,
      email: tenant.email,
      password: "",
      rentUnitId: tenant.rentUnitId || "",
      emailReminders: tenant.emailReminders,
    });
  };

  const handleDeleteTenantAccount = async (tenantId: string) => {
    if (!currentUser || currentUser.role !== "admin") return;
    const confirmed = window.confirm("Delete this tenant account? This cannot be undone.");
    if (!confirmed) return;
    setTenantError(null);
    setTenantStatus(null);
    try {
      const res = await fetch(`/api/tenants?id=${encodeURIComponent(tenantId)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete tenant.");
      }
      setTenants((prev) => prev.filter((t) => t.id !== tenantId));
      if (editingTenantId === tenantId) resetTenantForm();
      setTenantStatus("Tenant account deleted.");
    } catch (err) {
      console.error("Failed to delete tenant account", err);
      setTenantError("Failed to delete tenant account.");
    }
  };

  const handleResetTenantPassword = async (tenant: Tenant) => {
    if (!currentUser || currentUser.role !== "admin") return;
    const nextPassword = window.prompt(`Set a new temporary password for ${tenant.name}:`);
    if (!nextPassword) return;
    setTenantError(null);
    setTenantStatus(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(tenant.id), password: nextPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reset password.");
      }
      setTenantStatus("Tenant password updated.");
    } catch (err) {
      console.error("Failed to reset tenant password", err);
      setTenantError("Failed to reset tenant password.");
    }
  };

  const handleEditRentRoll = (entry: RentRollEntry) => {
    const propertyName = rentRollPropertyMap[entry.propertyId]?.name || "";
    const lastPaymentPaidStatus = entry.lastPaymentPaidOnDate
      ? "on_time"
      : entry.lastPaymentPaidDate
        ? "different_day"
        : "late";
    const linkedTenant = tenants.find((t) => t.rentUnitId === entry.id);
    setRentRollForm({
      propertyName,
      unit: entry.unit,
      tenant: entry.tenant === "Vacant" ? "" : entry.tenant,
      tenantId: linkedTenant?.id || "",
      status: entry.status,
      rent: entry.rent.toString(),
      leaseEnd: entry.leaseEnd === "TBD" ? "" : entry.leaseEnd,
      initialDueMonthDay: entry.initialDueMonthDay || "",
      bedrooms: entry.bedrooms.toString(),
      bathrooms: entry.bathrooms.toString(),
      lastPaymentDate: entry.lastPaymentDate || "",
      lastPaymentPaidStatus,
      lastPaymentPaidDate: entry.lastPaymentPaidDate || "",
    });
    setEditingRentRollId(entry.id);
    setRentRollModalOpen(true);
  };

  const handleDeleteRentRoll = (entryId: string) => {
    if (!currentUser || currentUser.role !== "admin") {
      const existing = rentRollEntries.find((e) => e.id === entryId);
      stageChange({
        entity: "rent_units",
        entityId: entryId,
        operation: "delete",
        before: existing || null,
        impact: "Staged rent unit delete",
      });
      setRentRollEntries((prev) => prev.filter((e) => e.id !== entryId));
      setRentPayments((prev) => prev.filter((p) => p.rentRollEntryId !== entryId));
      setRentRollDocuments((prev) => prev.filter((d) => d.entryId !== entryId));
      setRentRollExpenses((prev) => prev.filter((e) => e.entryId !== entryId));
      return;
    }
    fetch(`/api/rent/units?id=${Number(entryId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete unit", err))
      .finally(() => {
        setRentRollEntries((prev) => prev.filter((e) => e.id !== entryId));
        setRentPayments((prev) => prev.filter((p) => p.rentRollEntryId !== entryId));
        setRentRollDocuments((prev) => prev.filter((d) => d.entryId !== entryId));
        setRentRollExpenses((prev) => prev.filter((e) => e.entryId !== entryId));
      });
  };

  const handleRentRollDocUpload = (entryId: string, file: File, label: string) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const payload = {
        rentUnitId: Number(entryId),
        label: label.trim() || "Document",
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      };
      if (!currentUser || currentUser.role !== "admin") {
        const tempId = `RRDOC-${Date.now().toString(36)}`;
        stageChange({
          entity: "rent_documents",
          entityId: tempId,
          operation: "create",
          after: { id: tempId, ...payload },
          impact: "Staged rent document upload",
        });
        setRentRollDocuments((prev) => [
          ...prev,
          {
            id: tempId,
            entryId,
            label: payload.label,
            fileName: payload.fileName,
            fileType: payload.fileType,
            size: payload.size,
            uploadedAt: toDateString(getCentralTodayMs()),
            dataUrl: payload.dataUrl,
          },
        ]);
        setRentRollDocLabel("");
        return;
      }
      try {
        const res = await fetch("/api/rent/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to upload document");
        const data = await res.json();
        const doc = data.document || {};
        setRentRollDocuments((prev) => [
          ...prev,
          {
            id: String(doc.id || `RRDOC-${Date.now().toString(36)}`),
            entryId: String(doc.rentUnitId || entryId),
            label: doc.label || payload.label,
            fileName: doc.fileName || payload.fileName,
            fileType: doc.fileType || payload.fileType,
            size: Number(doc.size ?? payload.size),
            uploadedAt: doc.uploadedAt ? toDateString(toDateMs(doc.uploadedAt)) : toDateString(getCentralTodayMs()),
            dataUrl: doc.dataUrl || payload.dataUrl,
          },
        ]);
        setRentRollDocLabel("");
      } catch (err) {
        console.error("Failed to upload document", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveRentRollDoc = (docId: string) => {
    const existing = rentRollDocuments.find((doc) => doc.id === docId);
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "rent_documents",
        entityId: docId,
        operation: "delete",
        before: existing || null,
        impact: "Staged rent document delete",
      });
      setRentRollDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      return;
    }
    fetch(`/api/rent/documents?id=${Number(docId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete document", err))
      .finally(() => {
        setRentRollDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      });
  };

  const handleAddRentRollExpense = async (entryId: string) => {
    const amount = parseFloat(rentRollExpenseForm.amount);
    if (!rentRollExpenseForm.date || !rentRollExpenseForm.description.trim() || !Number.isFinite(amount)) return;
    const selectedCategory = rentExpenseCategories.find((c) => c.id === rentRollExpenseForm.categoryId);
    const selectedSubCategory = rentExpenseCategories.find((c) => c.id === rentRollExpenseForm.subCategoryId);
    const payload = {
      rentUnitId: Number(entryId),
      date: rentRollExpenseForm.date,
      category: selectedCategory?.name || "General",
      categoryId: rentRollExpenseForm.categoryId ? Number(rentRollExpenseForm.categoryId) : null,
      subCategoryId: rentRollExpenseForm.subCategoryId ? Number(rentRollExpenseForm.subCategoryId) : null,
      description: rentRollExpenseForm.description.trim(),
      amount,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = `RREXP-${Date.now().toString(36)}`;
      stageChange({
        entity: "rent_expenses",
        entityId: tempId,
        operation: "create",
        after: { id: tempId, ...payload },
        impact: "Staged rent expense create",
      });
      setRentRollExpenses((prev) => [
        ...prev,
        {
          id: tempId,
          entryId,
          date: payload.date,
          category: payload.category,
          categoryId: payload.categoryId ? String(payload.categoryId) : null,
          subCategoryId: payload.subCategoryId ? String(payload.subCategoryId) : null,
          description: payload.description,
          amount: payload.amount,
        },
      ]);
      setRentRollExpenseForm({ date: toDateString(getCentralTodayMs()), categoryId: "", subCategoryId: "", description: "", amount: "" });
      return;
    }
    try {
      const res = await fetch("/api/rent/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create expense");
      const data = await res.json();
      const expense = data.expense || {};
      setRentRollExpenses((prev) => [
        ...prev,
        {
          id: String(expense.id || `RREXP-${Date.now().toString(36)}`),
          entryId: String(expense.rentUnitId || entryId),
          date: expense.date ? toDateString(toDateMs(expense.date)) : payload.date,
          category: expense.category || payload.category,
          categoryId: expense.categoryId ? String(expense.categoryId) : (payload.categoryId ? String(payload.categoryId) : null),
          subCategoryId: expense.subCategoryId ? String(expense.subCategoryId) : (payload.subCategoryId ? String(payload.subCategoryId) : null),
          description: expense.description || payload.description,
          amount: Number(expense.amount ?? payload.amount),
        },
      ]);
      setRentRollExpenseForm({ date: toDateString(getCentralTodayMs()), categoryId: "", subCategoryId: "", description: "", amount: "" });
    } catch (err) {
      console.error("Failed to create expense", err);
    }
  };

  const handleRemoveRentRollExpense = (expenseId: string) => {
    const existing = rentRollExpenses.find((item) => item.id === expenseId);
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "rent_expenses",
        entityId: expenseId,
        operation: "delete",
        before: existing || null,
        impact: "Staged rent expense delete",
      });
      setRentRollExpenses((prev) => prev.filter((item) => item.id !== expenseId));
      return;
    }
    fetch(`/api/rent/expenses?id=${Number(expenseId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete expense", err))
      .finally(() => {
        setRentRollExpenses((prev) => prev.filter((item) => item.id !== expenseId));
      });
  };

  const handleSaveExpenseCategory = async () => {
    const name = expenseCategoryForm.name.trim();
    if (!name) return;
    const payload = {
      name,
      parentId: expenseCategoryForm.parentId ? Number(expenseCategoryForm.parentId) : null,
    };
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = expenseCategoryForm.id || `RREXC-${Date.now().toString(36)}`;
      stageChange({
        entity: "rent_expense_categories",
        entityId: tempId,
        operation: expenseCategoryForm.id ? "update" : "create",
        before: expenseCategoryForm.id ? rentExpenseCategories.find((c) => c.id === expenseCategoryForm.id) || null : null,
        after: { id: tempId, ...payload },
        impact: "Staged expense category change",
      });
      setRentExpenseCategories((prev) => {
        if (expenseCategoryForm.id) {
          return prev.map((c) => (c.id === expenseCategoryForm.id ? { ...c, ...payload, parentId: payload.parentId ? String(payload.parentId) : null } : c));
        }
        return [...prev, { id: tempId, name: payload.name, parentId: payload.parentId ? String(payload.parentId) : null }];
      });
      setExpenseCategoryForm({ id: "", name: "", parentId: "" });
      return;
    }
    try {
      const method = expenseCategoryForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/rent/expense-categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseCategoryForm.id ? { id: Number(expenseCategoryForm.id), ...payload } : payload),
      });
      if (!res.ok) throw new Error("Failed to save category");
      const data = await res.json();
      const saved = data.category || {};
      setRentExpenseCategories((prev) => {
        if (expenseCategoryForm.id) {
          return prev.map((c) => (c.id === expenseCategoryForm.id ? { id: String(saved.id || c.id), name: saved.name || payload.name, parentId: saved.parentId ? String(saved.parentId) : null } : c));
        }
        return [...prev, { id: String(saved.id || `RREXC-${Date.now().toString(36)}`), name: saved.name || payload.name, parentId: saved.parentId ? String(saved.parentId) : null }];
      });
      setExpenseCategoryForm({ id: "", name: "", parentId: "" });
    } catch (err) {
      console.error("Failed to save expense category", err);
    }
  };

  const handleEditExpenseCategory = (cat: RentExpenseCategory) => {
    setExpenseCategoryForm({ id: cat.id, name: cat.name, parentId: cat.parentId || "" });
  };

  const handleDeleteExpenseCategory = (catId: string) => {
    const existing = rentExpenseCategories.find((c) => c.id === catId);
    if (!currentUser || currentUser.role !== "admin") {
      stageChange({
        entity: "rent_expense_categories",
        entityId: catId,
        operation: "delete",
        before: existing || null,
        impact: "Staged expense category delete",
      });
      setRentExpenseCategories((prev) => prev.filter((c) => c.id !== catId));
      setRentRollExpenses((prev) =>
        prev.map((e) =>
          e.categoryId === catId || e.subCategoryId === catId
            ? { ...e, categoryId: null, subCategoryId: null }
            : e
        )
      );
      return;
    }
    fetch(`/api/rent/expense-categories?id=${Number(catId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete expense category", err))
      .finally(() => {
        setRentExpenseCategories((prev) => prev.filter((c) => c.id !== catId));
        setRentRollExpenses((prev) =>
          prev.map((e) =>
            e.categoryId === catId || e.subCategoryId === catId
              ? { ...e, categoryId: null, subCategoryId: null }
              : e
          )
        );
      });
  };

  const handleOpenPaymentModal = (entry: RentRollEntry) => {
    const defaultDate = toDateString(getCentralTodayMs());
    const remaining = getRemainingBalance(entry.id);
    setRentPaymentModal({
      open: true,
      entryId: entry.id,
      amount: remaining > 0 ? remaining.toString() : "0",
      date: defaultDate,
      note: "",
    });
  };

  const handleSavePayment = async () => {
    if (!rentPaymentModal.entryId) return;
    const entry = rentRollEntries.find((e) => e.id === rentPaymentModal.entryId);
    if (!entry) return;
    const remaining = getRemainingBalance(entry.id);
    const amount = Math.min(remaining, parseFloat(rentPaymentModal.amount) || 0);
    if (amount <= 0) return;
    if (!currentUser || currentUser.role !== "admin") {
      const paymentId = `PAY-${Date.now()}`;
      stageChange({
        entity: "rent_payments",
        entityId: paymentId,
        operation: "create",
        after: {
          rentUnitId: entry.id,
          amount,
          date: rentPaymentModal.date || toDateString(getCentralTodayMs()),
          note: rentPaymentModal.note.trim() || undefined,
        },
        impact: "Staged rent payment",
      });
      setRentPayments((prev) => [
        ...prev,
        {
          id: paymentId,
          rentRollEntryId: entry.id,
          amount,
          date: rentPaymentModal.date || toDateString(getCentralTodayMs()),
          note: rentPaymentModal.note.trim() || undefined,
        },
      ]);
      setRentPaymentModal({ open: false, entryId: null, amount: "", date: toDateString(getCentralTodayMs()), note: "" });
      return;
    }
    try {
      const res = await fetch("/api/rent/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentUnitId: Number(entry.id),
          amount,
          date: rentPaymentModal.date || toDateString(getCentralTodayMs()),
          note: rentPaymentModal.note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to record payment");
      const data = await res.json();
      const payment = data.payment || {};
      const newPayment: RentPayment = {
        id: String(payment.id || `PAY${Date.now().toString(36)}`),
        rentRollEntryId: String(payment.rentUnitId || entry.id),
        amount: Number(payment.amount ?? amount),
        date: payment.date ? toDateString(toDateMs(payment.date)) : (rentPaymentModal.date || toDateString(getCentralTodayMs())),
        note: payment.note || rentPaymentModal.note.trim() || undefined,
      };
      setRentPayments((prev) => [...prev, newPayment]);
    } catch (err) {
      console.error("Failed to save payment", err);
    }
    setRentPaymentModal({ open: false, entryId: null, amount: "", date: toDateString(getCentralTodayMs()), note: "" });
  };

  const handleSavePropertyLink = () => {
    if (!linkingPropertyId || !linkTargetProjectId) return;
    const projectIdNum = Number(linkTargetProjectId);
    if (!projectIdNum) return;
    fetch("/api/rent/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(linkingPropertyId), linkedProjectId: projectIdNum }),
    })
      .catch((err) => console.error("Failed to link property", err))
      .finally(() => {
        setRentRollProperties((prev) =>
          prev.map((p) => p.id === linkingPropertyId ? { ...p, linkedProjectId: projectIdNum } : p)
        );
        setLinkingPropertyId(null);
        setLinkTargetProjectId("");
      });
  };

  const handleUnlinkProperty = (propertyId: string) => {
    fetch("/api/rent/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(propertyId), linkedProjectId: null }),
    })
      .catch((err) => console.error("Failed to unlink property", err))
      .finally(() => {
        setRentRollProperties((prev) => prev.map((p) => p.id === propertyId ? { ...p, linkedProjectId: null } : p));
      });
  };

  const handleSaveEmployee = () => {
    const trimmedName = employeeNameInput.trim();
    const rateNum = parseFloat(employeeRateInput) || 0;
    if (!trimmedName) return;
    if (editingEmployee) {
      fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(editingEmployee.id), name: trimmedName, rate: rateNum }),
      })
        .then(res => res.json())
        .then((data) => {
          const emp = data.employee || {};
          setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? { ...e, name: emp.name || trimmedName, rate: Number(emp.rate ?? rateNum) } : e));
        })
        .catch(err => console.error("Failed to update employee", err))
        .finally(() => {
          setEmployeeFormOpen(false);
          setEditingEmployee(null);
          setEmployeeNameInput("");
          setEmployeeRateInput("");
        });
    } else {
      fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, rate: rateNum }),
      })
        .then(res => res.json())
        .then((data) => {
          const emp = data.employee || {};
          const newEmp: Employee = { id: String(emp.id || `EMP${Date.now()}`), name: emp.name || trimmedName, rate: Number(emp.rate ?? rateNum) };
          setEmployees(prev => [...prev, newEmp]);
        })
        .catch(err => console.error("Failed to create employee", err))
        .finally(() => {
          setEmployeeFormOpen(false);
          setEditingEmployee(null);
          setEmployeeNameInput("");
          setEmployeeRateInput("");
        });
    }
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeNameInput(emp.name);
    setEmployeeRateInput(emp.rate.toString());
    setEmployeeFormOpen(true);
  };

  const handleDeleteEmployee = (empId: string) => {
    fetch(`/api/employees?id=${Number(empId)}`, { method: "DELETE" })
      .catch(err => console.error("Failed to delete employee", err))
      .finally(() => {
        setEmployees(prev => prev.filter(e => e.id !== empId));
        setTimeEntries(prev => prev.filter(t => t.employeeId !== empId));
        setPaychecks(prev => prev.filter(p => p.employeeId !== empId));
      });
  };

  const weekDays = useMemo(() => {
    const startMs = toDateMs(laborWeekStart);
    return Array.from({ length: 7 }).map((_, idx) => {
      const ms = startMs + idx * DAY_MS;
      const d = new Date(ms);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      return { ms, date: toDateString(ms), label };
    });
  }, [laborWeekStart]);

  const laborProjects = useMemo(() => epsNodes.filter(n => n.type === "project"), [epsNodes]);
  const laborProjectsDb = useMemo(() => laborProjects.filter(p => p.projectId != null), [laborProjects]);

  const addTimeEntry = useCallback((empId: string, date: string, defaultProjectId: number | null) => {
    if (!currentUser || currentUser.role !== "admin") {
      const tempId = `TE-${Date.now()}`;
      stageChange({
        entity: "time_entries",
        entityId: tempId,
        operation: "create",
        after: { employeeId: Number(empId), projectId: defaultProjectId, date, hours: 0 },
        impact: "Staged time entry create",
      });
      setTimeEntries(prev => [
        ...prev,
        { id: tempId, employeeId: empId, projectId: defaultProjectId, date, hours: 0 }
      ]);
      return;
    }
    fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: Number(empId),
        projectId: defaultProjectId,
        date,
        hours: 0,
      }),
    })
      .then(res => res.json())
      .then((data) => {
        const te = data.timeEntry || {};
        setTimeEntries(prev => [
          ...prev,
          {
            id: String(te.id || `TE${Date.now()}`),
            employeeId: empId,
            projectId: defaultProjectId,
            date: te.date ? toDateString(toDateMs(te.date)) : date,
            hours: Number(te.hours ?? 0),
          }
        ]);
      })
      .catch(err => console.error("Failed to add time entry", err));
  }, [currentUser, stageChange]);



  const updateTimeEntry = useCallback((entryId: string, field: "projectId" | "hours", value: number | null) => {
    const mappedVal = field === "projectId" && value ? (getProjectDbIdFromNode(value) ?? value) : value;
    const patch: Record<string, number | null> = field === "projectId" ? { projectId: mappedVal } : { hours: value };
    if (!currentUser || currentUser.role !== "admin") {
      const existing = timeEntries.find(t => t.id === entryId);
      const updated = existing ? { ...existing, [field]: value } : null;
      stageChange({
        entity: "time_entries",
        entityId: entryId,
        operation: "update",
        before: existing || null,
        after: updated || { id: entryId, [field]: value },
        impact: "Staged time entry update",
      });
      setTimeEntries(prev => prev.map(t => t.id === entryId ? { ...t, [field]: value } : t));
      return;
    }
    fetch("/api/time-entries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(entryId), ...patch }),
    }).catch(err => console.error("Failed to update time entry", err));
    setTimeEntries(prev => prev.map(t => t.id === entryId ? { ...t, [field]: value } : t));
  }, [getProjectDbIdFromNode, currentUser, stageChange, timeEntries]);

  const deleteTimeEntry = useCallback((entryId: string) => {
    if (!currentUser || currentUser.role !== "admin") {
      const existing = timeEntries.find(t => t.id === entryId);
      stageChange({
        entity: "time_entries",
        entityId: entryId,
        operation: "delete",
        before: existing || null,
        impact: "Staged time entry delete",
      });
      setTimeEntries(prev => prev.filter(t => t.id !== entryId));
      return;
    }
    fetch(`/api/time-entries?id=${Number(entryId)}`, { method: "DELETE" })
      .catch(err => console.error("Failed to delete time entry", err))
      .finally(() => {
        setTimeEntries(prev => prev.filter(t => t.id !== entryId));
      });
  }, [currentUser, stageChange, timeEntries]);

  const weekHoursForEmployee = useCallback((empId: string) => {
    const startMs = toDateMs(laborWeekStart);
    const endMs = startMs + 6 * DAY_MS;
    return timeEntries
      .filter(t => t.employeeId === empId && toDateMs(t.date) >= startMs && toDateMs(t.date) <= endMs)
      .reduce((sum, t) => sum + (t.hours || 0), 0);
  }, [laborWeekStart, timeEntries]);

  const syncPayrollTransactions = useCallback((employee: Employee, weekStart: string, mode: "delete" | "replace", amountOverride?: number) => {
    const startMs = toDateMs(weekStart);
    const endMs = startMs + 6 * DAY_MS;
    const weekEntries = timeEntries.filter(
      t => t.employeeId === employee.id && toDateMs(t.date) >= startMs && toDateMs(t.date) <= endMs && t.projectId
    );
    const hoursByProject = new Map<number, number>();
    weekEntries.forEach((t) => {
      if (!t.projectId) return;
      hoursByProject.set(t.projectId, (hoursByProject.get(t.projectId) || 0) + (t.hours || 0));
    });

    // remove existing payroll txns for this employee/week
    const matchText = `Paycheck - ${employee.name} - Week ${weekStart}`;
    Object.entries(transactions).forEach(([pidStr, txns]) => {
      const pid = Number(pidStr);
      const toRemove = txns.filter(t => typeof t.description === "string" && t.description.includes(matchText));
      if (toRemove.length) {
        toRemove.forEach(t => {
          const tid = Number(t.id);
          if (!isNaN(tid)) {
            fetch(`/api/transactions?id=${tid}`, { method: "DELETE" }).catch(err => console.error("Failed to delete payroll txn", err));
          }
        });
        setTransactions(prev => ({
          ...prev,
          [pid]: prev[pid].filter(t => !toRemove.includes(t)),
        }));
      }
    });

    if (mode === "delete") return;

    // re-add based on hours per project (or total override distributed evenly)
    const totalHours = Array.from(hoursByProject.values()).reduce((s, h) => s + h, 0);
    hoursByProject.forEach((projHours, projId) => {
      const proportion = totalHours > 0 ? projHours / totalHours : 1 / Math.max(hoursByProject.size, 1);
      const amount = amountOverride != null ? amountOverride * proportion : projHours * employee.rate;
      handleAddTransaction(
        {
          date: weekStart,
          description: `${matchText}`,
          type: "Outcome",
          category: "Labor",
          subCategory: "Payroll",
          amount,
        },
        projId
      );
    });
  }, [handleAddTransaction, timeEntries, transactions]);

  const handleRecordPaycheck = (emp: Employee) => {
    const hours = weekHoursForEmployee(emp.id);
    const amount = hours * emp.rate;
    const checkNumber = paycheckNumbers[emp.id] || "";
    if (!checkNumber.trim()) {
      alert("Enter a check number before recording paycheck.");
      return;
    }

    if (!currentUser || currentUser.role !== "admin") {
      const paycheckId = `PC-${Date.now()}`;
      stageChange({
        entity: "paychecks",
        entityId: paycheckId,
        operation: "create",
        after: {
          employeeId: Number(emp.id),
          weekStart: laborWeekStart,
          amount,
          checkNumber: checkNumber.trim(),
        },
        impact: "Staged paycheck",
      });
      syncPayrollTransactions(emp, laborWeekStart, "replace", amount);
      setPaychecks(prev => [...prev, {
        id: paycheckId,
        employeeId: emp.id,
        weekStart: laborWeekStart,
        amount,
        checkNumber: checkNumber.trim(),
      }]);
      setPaycheckNumbers(prev => ({ ...prev, [emp.id]: "" }));
      return;
    }

    syncPayrollTransactions(emp, laborWeekStart, "replace", amount);

    fetch("/api/paychecks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: Number(emp.id),
        weekStart: laborWeekStart,
        amount,
        checkNumber: checkNumber.trim(),
      }),
    })
      .then(res => res.json())
      .then((data) => {
        const pc = data.paycheck || {};
        setPaychecks(prev => [...prev, {
          id: String(pc.id || `PC${Date.now()}`),
          employeeId: emp.id,
          weekStart: pc.weekStart ? toDateString(toDateMs(pc.weekStart)) : laborWeekStart,
          amount: Number(pc.amount ?? amount),
          checkNumber: pc.checkNumber || checkNumber.trim(),
        }]);
      })
      .catch(err => console.error("Failed to add paycheck", err));
    setPaycheckNumbers(prev => ({ ...prev, [emp.id]: "" }));
  };

  const handleOpenEditPaycheck = (pc: Paycheck) => {
    setPaycheckEditModal({
      open: true,
      paycheck: pc,
      amount: pc.amount.toString(),
      checkNumber: pc.checkNumber || "",
    });
  };

  const handleSavePaycheck = async () => {
    if (!paycheckEditModal.paycheck) return;
    const amt = parseFloat(paycheckEditModal.amount) || 0;
    const checkNum = paycheckEditModal.checkNumber.trim();
    const pc = paycheckEditModal.paycheck;
    try {
      const res = await fetch("/api/paychecks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(pc.id),
          amount: amt,
          checkNumber: checkNum,
        }),
      });
      if (!res.ok) throw new Error("Failed to update paycheck");
      const data = await res.json();
      const updated = data.paycheck || {};
      const employee = employees.find(e => e.id === pc.employeeId);
      if (employee) {
        syncPayrollTransactions(employee, pc.weekStart, "replace", amt);
      }
      setPaychecks(prev => prev.map(p => p.id === pc.id ? {
        ...p,
        amount: Number(updated.amount ?? amt),
        checkNumber: updated.checkNumber ?? checkNum,
      } : p));
    } catch (err) {
      console.error("Failed to update paycheck", err);
    } finally {
      setPaycheckEditModal({ open: false, paycheck: null, amount: "", checkNumber: "" });
    }
  };

  const handleDeletePaycheck = async (pc: Paycheck) => {
    try {
      await fetch(`/api/paychecks?id=${Number(pc.id)}`, { method: "DELETE" });
      const employee = employees.find(e => e.id === pc.employeeId);
      if (employee) syncPayrollTransactions(employee, pc.weekStart, "delete");
      setPaychecks(prev => prev.filter(p => p.id !== pc.id));
    } catch (err) {
      console.error("Failed to delete paycheck", err);
    }
  }; 
  
  const handleSellerFieldChange = (projectId: number, field: keyof ProjectPipelineMeta["seller"], value: string) => {
    setPipelineMeta(prev => {
      const next = {
        ...(prev[projectId] || { status: "under_contract", seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] }),
        seller: {
          ...(prev[projectId]?.seller || { name: "", phone: "", email: "" }),
          [field]: value,
        },
      };
      persistPipelineMeta(projectId, next);
      return {
        ...prev,
        [projectId]: next,
      };
    });
  };

  const handleToggleEmailOptionForProject = (projectId: number, optionId: string) => {
    setPipelineMeta(prev => {
      const current = prev[projectId] || { status: "under_contract", seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] };
      const setIds = new Set(current.selectedEmailOptionIds);
      if (setIds.has(optionId)) setIds.delete(optionId); else setIds.add(optionId);
      const next = { ...current, selectedEmailOptionIds: Array.from(setIds) };
      persistPipelineMeta(projectId, next);
      return {
        ...prev,
        [projectId]: next,
      };
    });
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendSellerEmail = (projectId: number) => {
    const meta = pipelineMeta[projectId];
    if (!meta) return;
    if (!isValidEmail(meta.seller.email)) {
      alert("Please enter a valid seller email before sending.");
      return;
    }
    const project = findNode(epsNodes, projectId);
    const selectedOptions = emailOptions.filter(o => meta.selectedEmailOptionIds.includes(o.id));
    const payload = {
      projectId,
      projectName: project?.name || "",
      seller: meta.seller,
      options: selectedOptions,
    };
    console.log("Webhook payload (stubbed):", payload);
    alert("Email send queued (stub). Check console for payload.");
  };

  const handleSaveEmailOption = (option: EmailOption) => {
    setEmailOptions(prev => {
      const idx = prev.findIndex(o => o.id === option.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = option;
        return next;
      }
      return [...prev, option];
    });
  };

  const handleDeleteEmailOption = (id: string) => {
    setEmailOptions(prev => prev.filter(o => o.id !== id));
    setPipelineMeta(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(pid => {
        const meta = next[Number(pid)];
        if (meta) {
          next[Number(pid)] = {
            ...meta,
            selectedEmailOptionIds: meta.selectedEmailOptionIds.filter(x => x !== id),
          };
        }
      });
      return next;
    });
  };

  const ensureUnderContractDetails = useCallback((projectId: number) => {
    setProjectDetails(prev => {
      const existing = prev[projectId] || [];
      const existingNames = new Set(existing.map(d => d.variable));
      const missing = UNDER_CONTRACT_DETAIL_FIELDS.filter(f => !existingNames.has(f.variable));
      if (!missing.length) return prev;

      const nextIdNum = existing.length > 0 ? Math.max(...existing.map(d => parseInt(d.id.substring(1)))) + 1 : 1;
      let counter = nextIdNum;

      // If ARV Estimate is missing, try to compute with SQFT * 125
      const sqftDetail = existing.find(d => d.variable === "SQFT" || d.variable === "Square Footage");
      const sqftVal = sqftDetail ? parseFloat(sqftDetail.value) : 0;
      const defaultArv = Number.isFinite(sqftVal) ? (sqftVal * 125).toString() : "0";

      const newDetails: ProjectDetail[] = missing.map((m) => {
        let value = m.value;
        if (m.variable === "ARV Estimate") value = defaultArv;
        return { ...m, id: `D${counter++}`, value };
      });

      return {
        ...prev,
        [projectId]: [...existing, ...newDetails],
      };
    });
  }, []);

  useEffect(() => {
    if (!activeProjectId) return;
    const status = pipelineMeta[activeProjectId]?.status || "under_contract";
    if (status === "under_contract") {
      ensureUnderContractDetails(activeProjectId);
    }
  }, [activeProjectId, pipelineMeta, ensureUnderContractDetails]);

  const handleProjectSelect = (projectId: number) => {
    const projectDbId = getProjectDbIdFromNode(projectId) ?? projectId;
    setActiveProjectId(projectDbId);
    setMode("Activities");
  };

  const shiftProjectActivities = useCallback((projectId: number, deltaMs: number) => {
    if (!deltaMs) return;
    setActivities(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(a => ({
        ...a,
        start: toDateString(toDateMs(a.start) + deltaMs),
        finish: toDateString(toDateMs(a.finish) + deltaMs),
      })),
    }));
  }, []);

  // --- RENDERING LOGIC ---
  const treeNodes = buildTree(epsNodes);
  const selectedNode = selectedNodeId ? findNode(epsNodes, selectedNodeId) : null;
  const parentMap = useMemo(() => {
    const map = new Map<number, number | null>();
    epsNodes.forEach((n) => map.set(n.id, n.parentId));
    return map;
  }, [epsNodes]);
  const taxVariableMap = useMemo(() => getTaxVariableMap(taxRates), [taxRates]);
  const isDescendantOf = useCallback((nodeId: number, ancestorId: number) => {
    let current: number | null | undefined = nodeId;
    while (current !== null && current !== undefined) {
      const parent = parentMap.get(current);
      if (parent === ancestorId) return true;
      current = parent;
    }
    return false;
  }, [parentMap]);

  const selectedCompany = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === "company") return selectedNode;
    if (selectedNode.type === "project") {
      let current: EpsNode | undefined | null = selectedNode;
      while (current && current.parentId !== null) {
        const parent = findNode(epsNodes, current.parentId);
        if (!parent) break;
        if (parent.type === "company") return parent;
        current = parent;
      }
    }
    return null;
  }, [selectedNode, epsNodes]);

  const selectedProjectDbId = useMemo(() => {
    if (selectedNode?.type !== "project") return null;
    const mapped = getProjectDbIdFromNode(selectedNode.id);
    return mapped ?? (selectedNode.projectId ?? null);
  }, [getProjectDbIdFromNode, selectedNode]);

  useEffect(() => {
    const acquisitionProjectId = activeProjectDbId ?? selectedProjectDbId;
    if (!acquisitionProjectId) {
      setAcquisitionForm({ purchasePrice: "", acquisitionDraw: "", earnestMoney: "", closeDate: "", note: "" });
      setEditingAcquisitionId(null);
      return;
    }
    const acquisition = projectAcquisitions[acquisitionProjectId] || null;
    if (!acquisition) {
      setAcquisitionForm({ purchasePrice: "", acquisitionDraw: "", earnestMoney: "", closeDate: "", note: "" });
      setEditingAcquisitionId(null);
      return;
    }
    setAcquisitionForm({
      purchasePrice: acquisition.purchasePrice?.toString() ?? "",
      acquisitionDraw: acquisition.acquisitionDraw?.toString() ?? "",
      earnestMoney: acquisition.earnestMoney?.toString() ?? "",
      closeDate: acquisition.closeDate || "",
      note: acquisition.note || "",
    });
    setEditingAcquisitionId(acquisition.id);
  }, [activeProjectDbId, projectAcquisitions, selectedProjectDbId]);

  useEffect(() => {
    setClosingCostForm({ side: "purchase", label: "", amount: "", paid: false, paidDate: "", note: "" });
    setEditingClosingCostId(null);
  }, [activeProjectDbId]);

  useEffect(() => {
    if (!activeProjectDbId) {
      setCostOverrideDrafts({});
      return;
    }
    const overrides = projectCostOverrides[activeProjectDbId] || [];
    const next: Record<string, { amount: string; note: string }> = {};
    costCategories.forEach((cat) => {
      const match = overrides.find((o) => o.categoryId === cat.id);
      next[cat.id] = {
        amount: match ? String(match.amount) : "",
        note: match?.note || "",
      };
    });
    setCostOverrideDrafts(next);
  }, [activeProjectDbId, costCategories, projectCostOverrides]);

  useEffect(() => {
    if (!activeProjectDbId) {
      setActiveBreakdownPresetId(null);
      return;
    }
    const defaultPreset = breakdownPresets.find((p) => p.isDefault) || breakdownPresets[0] || null;
    const projectPref = projectBreakdownPrefs[activeProjectDbId];
    setActiveBreakdownPresetId(projectPref?.presetId || defaultPreset?.id || null);
  }, [activeProjectDbId, breakdownPresets, projectBreakdownPrefs]);

  useEffect(() => {
    if (!activeBreakdownPresetId) {
      setBreakdownItemDrafts({});
      return;
    }
    const items = breakdownPresetItems[activeBreakdownPresetId] || [];
    const next: Record<string, { include: boolean; sortOrder: string }> = {};
    items.forEach((item) => {
      next[item.id] = { include: item.include, sortOrder: String(item.sortOrder ?? 0) };
    });
    setBreakdownItemDrafts(next);
  }, [activeBreakdownPresetId, breakdownPresetItems]);

  useEffect(() => {
    if (!activeProjectDbId) {
      setActiveKpiPresetId(null);
      return;
    }
    const defaultPreset = kpiPresets.find((p) => p.isDefault) || kpiPresets[0] || null;
    const projectPref = projectKpiPrefs[activeProjectDbId];
    setActiveKpiPresetId(projectPref?.presetId || defaultPreset?.id || null);
  }, [activeProjectDbId, kpiPresets, projectKpiPrefs]);

  useEffect(() => {
    if (!activeProjectDbId) {
      setKpiOverrideDrafts({});
      return;
    }
    const overrides = projectKpiOverrides[activeProjectDbId] || [];
    const items = activeKpiPresetId ? (kpiPresetItems[activeKpiPresetId] || []) : [];
    const next: Record<string, { value: string; note: string }> = {};
    items.forEach((item) => {
      const match = overrides.find((o) => o.itemId === item.id);
      next[item.id] = {
        value: match ? String(match.overrideValue) : "",
        note: match?.note || "",
      };
    });
    setKpiOverrideDrafts(next);
  }, [activeKpiPresetId, activeProjectDbId, kpiPresetItems, projectKpiOverrides]);

  const selectedProjectActivities = (selectedProjectDbId && activities[selectedProjectDbId]) || [];
  const selectedProjectTransactions = (selectedProjectDbId && transactions[selectedProjectDbId]) || [];
  const selectedProjectUtilities = (selectedProjectDbId && projectUtilities[selectedProjectDbId]) || [];
  const selectedProjectDraws = (selectedProjectDbId && projectDraws[selectedProjectDbId]) || [];
  const selectedProjectLoans = (selectedProjectDbId && projectLoans[selectedProjectDbId]) || [];
  const selectedProjectTaxes = (selectedProjectDbId && projectPropertyTaxes[selectedProjectDbId]) || [];
  const selectedProjectAcquisition = (selectedProjectDbId && projectAcquisitions[selectedProjectDbId]) || null;
  const selectedProjectClosingCosts = (selectedProjectDbId && projectClosingCosts[selectedProjectDbId]) || [];
  const selectedProjectDebtService = (selectedProjectDbId && projectDebtService[selectedProjectDbId]) || [];
  const selectedProjectCostOverrides = (selectedProjectDbId && projectCostOverrides[selectedProjectDbId]) || [];
  const ledgerIncomeTotal = selectedProjectTransactions.reduce((sum, t) => sum + (t.type === "Income" ? t.amount : 0), 0);
  const ledgerOutcomeTotal = selectedProjectTransactions.reduce((sum, t) => sum + (t.type === "Outcome" ? t.amount : 0), 0);
  const ledgerNetTotal = ledgerIncomeTotal - ledgerOutcomeTotal;
  const utilitiesTotal = selectedProjectUtilities.reduce((sum, u) => sum + (u.amount || 0), 0);
  const drawsTotal = selectedProjectDraws.reduce((sum, d) => sum + (d.amount || 0), 0);
  const loansPaidTotal = selectedProjectLoans.reduce((sum, l) => sum + (l.payment || 0), 0);
  const loanFormBreakdown = useMemo(() => {
    const projectKey = selectedProjectDbId;
    if (!projectKey) {
      return { isFirstPayment: true, principal: null as number | null, interest: null as number | null };
    }
    const accountKey = loanForm.accountId || "";
    const candidates = (projectLoans[projectKey] || [])
      .filter((l) => (l.accountId || "") === accountKey)
      .filter((l) => l.id !== editingLoanId);
    if (!candidates.length) {
      return { isFirstPayment: true, principal: null as number | null, interest: null as number | null };
    }
    const currentDateMs = toDateMs(loanForm.date);
    const priorByDate = Number.isFinite(currentDateMs)
      ? candidates
          .filter((l) => toDateMs(l.date) < currentDateMs)
          .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))[0]
      : undefined;
    const latest = candidates.sort((a, b) => toDateMs(b.date) - toDateMs(a.date))[0];
    const previous = priorByDate || latest || null;
    if (!previous || previous.balance === null || previous.balance === undefined) {
      return { isFirstPayment: true, principal: null as number | null, interest: null as number | null };
    }
    const payment = loanForm.payment !== "" ? Number(loanForm.payment) : NaN;
    const currentBalance = loanForm.balance !== "" ? Number(loanForm.balance) : NaN;
    if (!Number.isFinite(payment) || !Number.isFinite(currentBalance)) {
      return { isFirstPayment: false, principal: null as number | null, interest: null as number | null };
    }
    const principal = previous.balance - currentBalance;
    const interest = payment - principal;
    return { isFirstPayment: false, principal, interest };
  }, [editingLoanId, loanForm.accountId, loanForm.balance, loanForm.date, loanForm.payment, projectLoans, selectedProjectDbId]);
  const closingCostsPurchaseTotal = selectedProjectClosingCosts
    .filter((c) => c.side === "purchase")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const closingCostsSaleTotal = selectedProjectClosingCosts
    .filter((c) => c.side === "sale")
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const taxesDueTotal = selectedProjectTaxes
    .filter((t) => t.status !== "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const notificationThresholds = [30, 15, 7, 4, 2, 0];
  const notifications = useMemo(() => {
    const todayMs = getCentralTodayMs();
    const items: NotificationItem[] = [];
    const todayKey = toDateString(todayMs);
    const dayDiff = (dateStr: string) => {
      const target = toDateMs(dateStr);
      if (!Number.isFinite(target)) return 9999;
      return Math.round((target - toDateMs(todayKey)) / DAY_MS);
    };
    const levelForDays = (daysUntil: number): NotificationItem["level"] => {
      if (daysUntil <= 2) return "urgent";
      if (daysUntil <= 7) return "warning";
      return "info";
    };

    rentRollEntries.forEach((entry) => {
      const roll = paymentRollup[entry.id];
      if (!roll || roll.balance <= 0) return;
      const daysUntil = dayDiff(roll.dueDate);
      if (!notificationThresholds.includes(daysUntil)) return;
      const propertyName = rentRollPropertyMap[entry.propertyId]?.name || "Property";
      const id = `rent-${entry.id}-${daysUntil}`;
      items.push({
        id,
        title: `Rent due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
        detail: `${propertyName} · ${entry.unit}${entry.tenant ? ` · ${entry.tenant}` : ""}`,
        dueDate: roll.dueDate,
        daysUntil,
        level: levelForDays(daysUntil),
        target: {
          mode: "RentRoll",
          rentPropertyId: entry.propertyId,
          rentUnitId: entry.id,
        },
      });
    });

    Object.entries(projectUtilities).forEach(([projectIdStr, list]) => {
      const projectId = Number(projectIdStr);
      list.forEach((utility) => {
        const daysUntil = dayDiff(utility.date);
        if (!notificationThresholds.includes(daysUntil)) return;
        const projName = epsProjectNameById(projectId) || `Project ${projectId}`;
        const id = `utility-${utility.id}-${daysUntil}`;
        items.push({
          id,
          title: `Utility due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
          detail: `${projName} · ${utility.service}${utility.provider ? ` · ${utility.provider}` : ""}`,
          dueDate: utility.date,
          daysUntil,
          level: levelForDays(daysUntil),
          target: {
            mode: "Activities",
            projectId,
            activityView: "utilities",
          },
        });
      });
    });

    Object.entries(projectPropertyTaxes).forEach(([projectIdStr, list]) => {
      const projectId = Number(projectIdStr);
      list.forEach((tax) => {
        if (tax.status === "paid") return;
        const daysUntil = dayDiff(tax.dueDate);
        if (!notificationThresholds.includes(daysUntil)) return;
        const projName = epsProjectNameById(projectId) || `Project ${projectId}`;
        const id = `tax-${tax.id}-${daysUntil}`;
        items.push({
          id,
          title: `Property tax due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
          detail: `${projName} · ${tax.taxYear}`,
          dueDate: tax.dueDate,
          daysUntil,
          level: levelForDays(daysUntil),
          target: {
            mode: "Activities",
            projectId,
            activityView: "taxes",
          },
        });
      });
    });

    return items
      .filter((n) => !dismissedNotifications.has(n.id))
      .sort((a, b) => toDateMs(b.dueDate) - toDateMs(a.dueDate));
  }, [dismissedNotifications, epsProjectNameById, notificationThresholds, paymentRollup, projectPropertyTaxes, projectUtilities, rentRollEntries, rentRollPropertyMap]);
  const handleNotificationReadAll = useCallback(() => {
    setReadNotifications((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
    setToastItems([]);
    setHiddenToastIds((prev) => {
      const next = new Set(prev);
      toastItems.forEach((t) => next.add(t.id));
      return next;
    });
    Object.values(toastTimersRef.current).forEach((t) => clearTimeout(t));
    toastTimersRef.current = {};
  }, [notifications, toastItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (toastEnqueueTimerRef.current) {
      clearTimeout(toastEnqueueTimerRef.current);
      toastEnqueueTimerRef.current = null;
    }
    if (toastItems.length >= 3) return;
    const existing = new Set(toastItems.map((t) => t.id));
    const next = notifications.find(
      (note) =>
        !dismissedNotifications.has(note.id) &&
        !readNotifications.has(note.id) &&
        !hiddenToastIds.has(note.id) &&
        !existing.has(note.id)
    );
    if (!next) return;
    toastEnqueueTimerRef.current = window.setTimeout(() => {
      setToastItems((prev) => {
        if (prev.length >= 3) return prev;
        if (prev.find((t) => t.id === next.id)) return prev;
        return [...prev, next];
      });
      toastEnqueueTimerRef.current = null;
    }, 220);
  }, [dismissedNotifications, hiddenToastIds, notifications, readNotifications, toastItems]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextIds = new Set(toastItems.map((n) => n.id));
    Object.entries(toastTimersRef.current).forEach(([id, timer]) => {
      if (!nextIds.has(id)) {
        clearTimeout(timer);
        delete toastTimersRef.current[id];
      }
    });
    toastItems.forEach((note) => {
      if (toastTimersRef.current[note.id]) return;
      const timer = window.setTimeout(() => dismissToast(note.id), 8000);
      toastTimersRef.current[note.id] = timer;
    });
  }, [dismissToast, toastItems]);
  useEffect(() => {
    return () => {
      if (toastEnqueueTimerRef.current) {
        clearTimeout(toastEnqueueTimerRef.current);
      }
    };
  }, []);
  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);
  const selectedProjectDetails = (selectedProjectDbId && projectDetails[selectedProjectDbId]) || [];
  const selectedCustomFormulas = (selectedProjectDbId && customFormulas[selectedProjectDbId]) || [];

  const companyProjects = useMemo(() => {
    if (!selectedCompany) return [];
    return epsNodes.filter((n) => n.type === "project" && isDescendantOf(n.id, selectedCompany.id));
  }, [selectedCompany, epsNodes, isDescendantOf]);

  const centralTodayMs = useMemo(() => getCentralTodayMs(), []);

  const companyProjectSpans = useMemo(() => {
    const spans = companyProjects.map((p) => {
      const acts = activities[p.id] || [];
      if (!acts.length) return null;
      const start = Math.min(...acts.map((a) => toDateMs(a.start)));
      const end = Math.max(...acts.map((a) => toDateMs(a.finish)));
      return { id: p.id, name: p.name, start, end };
    }).filter(Boolean) as { id: number; name: string; start: number; end: number }[];
    return spans;
  }, [companyProjects, activities]);

  const epsGanttTimeline = useMemo(() => {
    if (!companyProjectSpans.length) {
      return { start: centralTodayMs - 7 * DAY_MS, end: centralTodayMs + 21 * DAY_MS };
    }
    const minStart = Math.min(...companyProjectSpans.map((p) => p.start));
    const maxEnd = Math.max(...companyProjectSpans.map((p) => p.end));
    const pad = DAY_MS;
    return {
      start: Math.min(minStart - pad, centralTodayMs - 7 * DAY_MS),
      end: Math.max(maxEnd + pad, centralTodayMs + 7 * DAY_MS),
    };
  }, [companyProjectSpans, centralTodayMs]);

  const epsTimelineSpan = Math.max(DAY_MS, epsGanttTimeline.end - epsGanttTimeline.start);
  const epsDateToXPct = useCallback((ms: number) => ((ms - epsGanttTimeline.start) / epsTimelineSpan) * 100, [epsGanttTimeline.start, epsTimelineSpan]);
  const epsXToMs = useCallback((clientX: number) => {
    const rect = companyGanttRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return epsGanttTimeline.start;
    const ratio = (clientX - rect.left) / rect.width;
    return epsGanttTimeline.start + ratio * epsTimelineSpan;
  }, [epsGanttTimeline.start, epsTimelineSpan]);

  const epsDays = useMemo(() => {
    const arr: { ms: number; day: string; month: string; monthIndex: number; year: number }[] = [];
    for (let d = epsGanttTimeline.start; d <= epsGanttTimeline.end; d += DAY_MS) {
      const date = new Date(d);
      arr.push({
        ms: d,
        day: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
        month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        monthIndex: date.getUTCMonth(),
        year: date.getUTCFullYear(),
      });
    }
    return arr;
  }, [epsGanttTimeline.start, epsGanttTimeline.end]);

  const handleCompanyPanStart = (e: React.PointerEvent) => {
    if (!companyGanttRef.current || e.button !== 0) return;
    e.preventDefault();
    companyPanActive.current = true;
    companyPanState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: companyGanttRef.current.scrollLeft,
      scrollTop: companyGanttRef.current.scrollTop,
    };
    companyGanttRef.current.style.cursor = "grabbing";
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCompanyPanMove = (e: React.PointerEvent) => {
    if (!companyPanActive.current || !companyGanttRef.current) return;
    const dx = e.clientX - companyPanState.current.startX;
    const dy = e.clientY - companyPanState.current.startY;
    companyGanttRef.current.scrollLeft = companyPanState.current.scrollLeft - dx;
    companyGanttRef.current.scrollTop = companyPanState.current.scrollTop - dy;
  };

  const handleCompanyPanEnd = (e?: React.PointerEvent) => {
    if (!companyGanttRef.current) return;
    companyPanActive.current = false;
    companyGanttRef.current.style.cursor = "";
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const updateCompanyThumb = () => {
    const el = companyGanttRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      setCompanyScrollThumb({ widthPct: 100, leftPct: 0 });
      return;
    }
    const widthPct = (clientWidth / scrollWidth) * 100;
    const available = scrollWidth - clientWidth;
    const leftPct = (scrollLeft / available) * (100 - widthPct);
    setCompanyScrollThumb({ widthPct, leftPct });
  };

  const epsDayStep = useMemo(() => {
    if (epsDays.length > 90) return 7;
    if (epsDays.length > 45) return 3;
    return 1;
  }, [epsDays.length]);

  const epsMonths = useMemo(() => {
    if (!epsDays.length) return [];
    const segments: { start: number; end: number; label: string }[] = [];
    let segStart = epsDays[0].ms;
    let currentMonth = epsDays[0].monthIndex;
    let currentYear = epsDays[0].year;

    for (let i = 1; i < epsDays.length; i++) {
      const d = epsDays[i];
      if (d.monthIndex !== currentMonth || d.year !== currentYear) {
        const end = d.ms;
        segments.push({
          start: segStart,
          end,
          label: new Date(segStart).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
        });
        segStart = d.ms;
        currentMonth = d.monthIndex;
        currentYear = d.year;
      }
    }
    const lastEnd = epsDays[epsDays.length - 1].ms + DAY_MS;
    segments.push({
      start: segStart,
      end: lastEnd,
      label: new Date(segStart).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    });
    return segments;
  }, [epsDays]);

  const handleCompanyPointerDown = useCallback((projectId: number, e: React.PointerEvent) => {
    e.preventDefault();
    const span = companyProjectSpans.find(p => p.id === projectId);
    if (!span) return;
    const pointerMs = epsXToMs(e.clientX);
    const grabOffsetMs = pointerMs - span.start;
    setDraggingCompanySpan({ projectId, anchorMs: span.start, grabOffsetMs });
    setCompanyDragPreview({ projectId, deltaMs: 0 });
    companyDeltaRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [companyProjectSpans, epsXToMs]);

  useEffect(() => {
    if (!draggingCompanySpan) return;
    const handleMove = (ev: PointerEvent) => {
      const currentMs = epsXToMs(ev.clientX);
      const deltaRaw = currentMs - draggingCompanySpan.anchorMs - draggingCompanySpan.grabOffsetMs;
      const snapped = Math.round(deltaRaw / DAY_MS) * DAY_MS;
      companyDeltaRef.current = snapped;
      setCompanyDragPreview({ projectId: draggingCompanySpan.projectId, deltaMs: snapped });
    };
    const handleUp = () => {
      if (companyDeltaRef.current && draggingCompanySpan) {
        shiftProjectActivities(draggingCompanySpan.projectId, companyDeltaRef.current);
      }
      setDraggingCompanySpan(null);
      setCompanyDragPreview(null);
      companyDeltaRef.current = 0;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingCompanySpan, epsXToMs, shiftProjectActivities]);

  // ---------------------------------------------------------------------------
  // AUTH GATE
  // ---------------------------------------------------------------------------
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Checking session...</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Please wait.</div>
        </div>
      </div>
    );
  }

  if (authChecked && !currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Sign In</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Use your account to access the dashboard.</p>
          {authError && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100">
              {authError}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 pr-16 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                  placeholder="--------"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-1 my-1 px-3 text-xs rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogin}
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENT ROLL VIEW
  // ---------------------------------------------------------------------------
  if (mode === "RentRoll") {
    const selectedRentPropertyName = rentRollProperty === "all"
      ? "All Properties"
      : rentRollPropertyMap[rentRollProperty]?.name || "Unlinked Property";
    const linkingProperty = linkingPropertyId ? rentRollProperties.find((p) => p.id === linkingPropertyId) : null;
    const daysUntil = (date: string) => {
      if (!date) return null;
      const target = toDateMs(date);
      if (!Number.isFinite(target)) return null;
      const today = getCentralTodayMs();
      return Math.round((target - today) / DAY_MS);
    };

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Rent Roll"
          projectName={selectedRentPropertyName}
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Rent Roll Dashboard</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Monitor occupancy, exposure, and collections across your portfolio.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={rentRollProperty}
                  onChange={(e) => setRentRollProperty(e.target.value)}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                >
                  <option value="all">All Properties</option>
                  {rentRollProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.linkedProjectId ? "(linked)" : "(unlinked)"}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => { setRentRollModalOpen(true); setEditingRentRollId(null); setRentRollForm({ propertyName: "", unit: "", tenant: "", tenantId: "", status: "Occupied", rent: "", leaseEnd: "", initialDueMonthDay: "", bedrooms: "", bathrooms: "", lastPaymentDate: "", lastPaymentPaidStatus: "on_time", lastPaymentPaidDate: "" }); }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  + New Rental
                </button>
              </div>
            </div>

            {rentRollDetailView ? (
              <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Rent Roll Detail</div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                      {rentRollDetailView.type === "unit"
                        ? `${rentRollDetailEntry?.unit || "Unit"} - ${rentRollPropertyMap[rentRollDetailEntry?.propertyId || ""]?.name || "Unlinked Property"}`
                        : rentRollDetailProperty?.name || "Property"}
                    </h3>
                  </div>
                  <button
                    onClick={() => setRentRollDetailView(null)}
                    className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Back to Rent Roll
                  </button>
                </div>
              </div>

              {rentRollDetailView.type === "property" && rentRollDetailProperty && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Linked Project</div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {rentRollDetailProperty.linkedProjectId ? `Project #${rentRollDetailProperty.linkedProjectId}` : "Not linked"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Units</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {rentRollEntries.filter((e) => e.propertyId === rentRollDetailProperty.id).length}
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Units</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                            <tr>
                              <th className="px-4 py-2 text-left">Unit</th>
                              <th className="px-4 py-2 text-left">Tenant</th>
                              <th className="px-4 py-2 text-left">Status</th>
                              <th className="px-4 py-2 text-left">Rent</th>
                              <th className="px-4 py-2 text-left">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rentRollEntries
                              .filter((entry) => entry.propertyId === rentRollDetailProperty.id)
                              .map((entry) => {
                                const paymentInfo = paymentRollup[entry.id];
                                const balanceVal = paymentInfo?.balance ?? entry.balance;
                                return (
                                  <tr
                                    key={entry.id}
                                    className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                                    onClick={() => setRentRollDetailView({ type: "unit", id: entry.id })}
                                  >
                                    <td className="px-4 py-2">{entry.unit}</td>
                                    <td className="px-4 py-2">{entry.tenant}</td>
                                    <td className="px-4 py-2">{entry.status}</td>
                                    <td className="px-4 py-2">{formatCurrency(entry.rent)}</td>
                                    <td className="px-4 py-2">{formatCurrency(balanceVal)}</td>
                                  </tr>
                                );
                              })}
                            {rentRollEntries.filter((entry) => entry.propertyId === rentRollDetailProperty.id).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                                  No units found for this property.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {rentRollDetailView.type === "unit" && rentRollDetailEntry && (
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 h-fit">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Activity</div>
                      <span className="text-[11px] text-slate-400">{tenantActivities.length} items</span>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto">
                      {tenantActivities.length === 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">No activity yet.</div>
                      )}
                      {tenantActivities.map((activity) => {
                        const typeLabel =
                          activity.eventType === "reminder_sent"
                            ? "Reminder sent"
                            : activity.eventType === "reminder_viewed"
                              ? "Reminder viewed"
                              : activity.eventType === "payment_click"
                                ? "Payment link clicked"
                                : activity.eventType;
                        const meta = activity.metadata || {};
                        return (
                          <div key={activity.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">{typeLabel}</div>
                            {activity.statementId && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">Statement {activity.statementId}</div>
                            )}
                            {"dueDate" in meta && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">Due {String(meta.dueDate)}</div>
                            )}
                            {"lateFee" in meta && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">Late fee {formatCurrency(Number((meta as any).lateFee || 0))}</div>
                            )}
                            <div className="text-[11px] text-slate-400">{activity.createdAt || ""}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tenant</div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{rentRollDetailEntry.tenant}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{rentRollDetailEntry.status}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rent</div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatCurrency(rentRollDetailEntry.rent)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Payment Snapshot</h4>
                      <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <div className="flex items-center justify-between">
                          <span>Most Recent Payment Date</span>
                          <span className="font-semibold">{rentRollDetailEntry.lastPaymentDate || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Paid Status</span>
                          <span className="font-semibold">
                            {rentRollDetailEntry.lastPaymentPaidOnDate == null
                              ? "N/A"
                              : rentRollDetailEntry.lastPaymentPaidOnDate
                                ? "On Time"
                                : rentRollDetailEntry.lastPaymentPaidDate
                                  ? "Different Day"
                                  : "Late"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Actual Paid Date</span>
                          <span className="font-semibold">{rentRollDetailEntry.lastPaymentPaidDate || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Lease End</span>
                          <span className="font-semibold">{rentRollDetailEntry.leaseEnd}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Documents</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            value={rentRollDocLabel}
                            onChange={(e) => setRentRollDocLabel(e.target.value)}
                            className="md:col-span-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            placeholder="Label (lease, invoice, inspection)"
                          />
                          <label className="flex items-center justify-center rounded border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                            Upload
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleRentRollDocUpload(rentRollDetailEntry.id, file, rentRollDocLabel);
                                if (e.target) e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          {rentRollDetailDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-100">{doc.label}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{doc.fileName} - {(doc.size / 1024).toFixed(1)} KB</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={doc.dataUrl}
                                  download={doc.fileName}
                                  className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] hover:bg-blue-700"
                                >
                                  Download
                                </a>
                                <button
                                  onClick={() => handleRemoveRentRollDoc(doc.id)}
                                  className="px-2 py-1 rounded bg-red-100 text-red-700 text-[11px] hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                          {rentRollDetailDocs.length === 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">No documents uploaded yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Payment History</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Amount</th>
                            <th className="px-4 py-2 text-left">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentRollDetailPayments.map((payment) => (
                            <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-800">
                              <td className="px-4 py-2">{payment.date}</td>
                              <td className="px-4 py-2">{formatCurrency(payment.amount)}</td>
                              <td className="px-4 py-2">{payment.note || "-"}</td>
                            </tr>
                          ))}
                          {rentRollDetailPayments.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                                No payments recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Rental Ledger</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Track property expenses for this unit.</p>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Total: {formatCurrency(rentRollExpenseTotal)}
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        type="date"
                        value={rentRollExpenseForm.date}
                        onChange={(e) => setRentRollExpenseForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      />
                      <div className="space-y-2">
                        <select
                          value={rentRollExpenseForm.categoryId}
                          onChange={(e) =>
                            setRentRollExpenseForm((prev) => ({
                              ...prev,
                              categoryId: e.target.value,
                              subCategoryId: "",
                            }))
                          }
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                        >
                          <option value="">Category</option>
                          {rentExpenseCategories.filter((c) => !c.parentId).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={rentRollExpenseForm.subCategoryId}
                          onChange={(e) => setRentRollExpenseForm((prev) => ({ ...prev, subCategoryId: e.target.value }))}
                          disabled={!rentRollExpenseForm.categoryId}
                          className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                        >
                          <option value="">Subcategory</option>
                          {rentExpenseCategories
                            .filter((c) => c.parentId === rentRollExpenseForm.categoryId)
                            .map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <input
                        value={rentRollExpenseForm.description}
                        onChange={(e) => setRentRollExpenseForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={rentRollExpenseForm.amount}
                          onChange={(e) => setRentRollExpenseForm((prev) => ({ ...prev, amount: e.target.value }))}
                          className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          placeholder="Amount"
                        />
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleAddRentRollExpense(rentRollDetailEntry.id)}
                            className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setExpenseCategoryModalOpen(true)}
                            className="px-3 py-2 rounded border border-slate-300 text-slate-700 text-xs hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            Manage Categories
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Category</th>
                            <th className="px-4 py-2 text-left">Description</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentRollDetailExpenses.map((expense) => (
                            <tr key={expense.id} className="border-t border-slate-200 dark:border-slate-800">
                              <td className="px-4 py-2">{expense.date}</td>
                              <td className="px-4 py-2">
                                {expense.categoryId && rentExpenseCategoryMap[expense.categoryId]
                                  ? rentExpenseCategoryMap[expense.categoryId].name
                                  : (expense.category || "General")}
                                {expense.subCategoryId && rentExpenseCategoryMap[expense.subCategoryId]
                                  ? ` / ${rentExpenseCategoryMap[expense.subCategoryId].name}`
                                  : ""}
                              </td>
                              <td className="px-4 py-2">{expense.description}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(expense.amount)}</td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => handleRemoveRentRollExpense(expense.id)}
                                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {rentRollDetailExpenses.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                                No expenses recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Tenant Activity</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Recent email opens and reminder events.</p>
                      </div>
                      <button
                        onClick={() => setRentRollActivityCollapsed((prev) => !prev)}
                        className="px-2 py-1 rounded border border-slate-300 text-[11px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {rentRollActivityCollapsed ? "Show" : "Hide"}
                      </button>
                    </div>
                    {!rentRollActivityCollapsed && (
                      <div className="p-3 space-y-2 max-h-80 overflow-y-auto text-sm text-slate-700 dark:text-slate-200">
                        {rentRollRecentActivities.length === 0 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">No tenant activity yet.</div>
                        )}
                        {rentRollRecentActivities.map((activity) => {
                          const entry = rentRollEntries.find((e) => e.id === activity.rentUnitId);
                          const tenant = tenants.find((t) => t.id === activity.tenantId);
                          const typeLabel =
                            activity.eventType === "reminder_sent"
                              ? "Reminder sent"
                              : activity.eventType === "reminder_viewed"
                                ? "Reminder viewed"
                                : activity.eventType === "payment_click"
                                  ? "Payment link clicked"
                                  : activity.eventType;
                          return (
                            <div key={activity.id} className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-2 py-2 text-xs">
                              <div className="font-semibold text-slate-800 dark:text-slate-100">{typeLabel}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {tenant?.name || entry?.tenant || "Tenant"} - {entry?.unit || "Unit"}
                              </div>
                              <div className="text-[11px] text-slate-400">{activity.createdAt || ""}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Occupancy</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{rentRollSummary.occupancyRate}%</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Occupied {rentRollSummary.occupiedUnits} / {rentRollSummary.totalUnits}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Potential Monthly Rent</div>
                        <div className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(rentRollSummary.potential)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Gross scheduled, before concessions</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Collected</div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(rentRollSummary.collected)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Based on payments recorded this month</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Delinquent Balance</div>
                        <div className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(rentRollSummary.delinquent)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Outstanding against current period</div>
                      </div>
                    </div>

                    {currentUser?.role === "admin" && (
                      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tenant Accounts</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Create tenant logins and link to units.</p>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {tenants.length} accounts
                          </div>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                          <input
                            value={tenantForm.name}
                            onChange={(e) => setTenantForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            placeholder="Name"
                          />
                          <input
                            value={tenantForm.email}
                            onChange={(e) => setTenantForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            placeholder="Email"
                          />
                          <input
                            type="password"
                            value={tenantForm.password}
                            onChange={(e) => setTenantForm((prev) => ({ ...prev, password: e.target.value }))}
                            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            placeholder={editingTenantId ? "New password (optional)" : "Temporary password"}
                          />
                          <select
                            value={tenantForm.rentUnitId}
                            onChange={(e) => setTenantForm((prev) => ({ ...prev, rentUnitId: e.target.value }))}
                            className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            <option value="">Link to unit (optional)</option>
                            {rentRollEntries.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {rentRollPropertyMap[entry.propertyId]?.name || "Property"} - {entry.unit}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <input
                                type="checkbox"
                                checked={tenantForm.emailReminders}
                                onChange={(e) => setTenantForm((prev) => ({ ...prev, emailReminders: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
                              />
                              Reminders
                            </label>
                            {editingTenantId && (
                              <button
                                onClick={resetTenantForm}
                                disabled={tenantSaving}
                                className="px-3 py-2 rounded-md border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={handleSaveTenantAccount}
                              disabled={tenantSaving}
                              className="ml-auto px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                            >
                              {tenantSaving ? "Saving..." : (editingTenantId ? "Update Tenant" : "Create Tenant")}
                            </button>
                          </div>
                        </div>
                        {(tenantError || tenantStatus) && (
                          <div className="px-4 pb-4 text-xs">
                            {tenantError && <div className="text-red-500">{tenantError}</div>}
                            {tenantStatus && <div className="text-emerald-500">{tenantStatus}</div>}
                          </div>
                        )}
                        {tenants.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {tenants
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((tenant) => {
                                  const unit = tenant.rentUnitId
                                    ? rentRollEntries.find((entry) => entry.id === tenant.rentUnitId)
                                    : null;
                                  return (
                                    <div key={tenant.id} className="rounded border border-slate-200 dark:border-slate-700 px-3 py-2 bg-slate-50 dark:bg-slate-800/60">
                                      <div className="text-slate-900 dark:text-slate-100 font-semibold">{tenant.name}</div>
                                      <div>{tenant.email}</div>
                                      <div>
                                        {unit
                                          ? `${rentRollPropertyMap[unit.propertyId]?.name || "Property"} - ${unit.unit}`
                                          : "Not linked"}
                                      </div>
                                      <div>{tenant.emailReminders ? "Reminders on" : "Reminders off"}</div>
                                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                        <button
                                          onClick={() => handleEditTenantAccount(tenant)}
                                          className="px-2 py-1 rounded border border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleResetTenantPassword(tenant)}
                                          className="px-2 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
                                        >
                                          Reset Password
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTenantAccount(tenant.id)}
                                          className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unit Ledger</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Lease exposure, balances, and expirations.</p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Showing {rentRollProperty === "all" ? "all properties" : selectedRentPropertyName}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                            <tr>
                              <th className="px-4 py-2 text-left">Property</th>
                              <th className="px-4 py-2 text-left">Unit</th>
                              <th className="px-4 py-2 text-left">Tenant</th>
                              <th className="px-4 py-2 text-left">Status</th>
                              <th className="px-4 py-2 text-left">Beds/Baths</th>
                              <th className="px-4 py-2 text-left">Rent</th>
                              <th className="px-4 py-2 text-left">Balance</th>
                              <th className="px-4 py-2 text-left">Late Fee</th>
                              <th className="px-4 py-2 text-left">Rent Due</th>
                              <th className="px-4 py-2 text-left">Lease End</th>
                              <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                        {filteredRentRoll.map((entry, idx) => {
                          const propertyName = rentRollPropertyMap[entry.propertyId]?.name || "Unlinked Property";
                          const rowBg = idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/60";
                          const rowClass = `${rowBg} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70`;
                          const statusClass = entry.status === "Occupied"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                            : entry.status === "Vacant"
                              ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200";
                          const paymentInfo = paymentRollup[entry.id];
                          const balanceVal = paymentInfo?.balance ?? entry.balance;
                          const paidVal = paymentInfo?.paid ?? 0;
                          const lateFeeVal = paymentInfo?.lateFee ?? 0;
                          const balanceClass = balanceVal > 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-300";
                    const lateFeeClass = lateFeeVal > 0 ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-slate-600 dark:text-slate-300";
                    const dueDate = paymentInfo?.dueDate;
                    const dueInDays = dueDate ? daysUntil(dueDate) : null;
                    const dueLabel = dueDate
                      ? dueInDays === null
                        ? dueDate
                        : dueInDays === 0
                          ? "Due today"
                          : dueInDays < 0
                            ? `${Math.abs(dueInDays)}d overdue`
                            : `Due on ${new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
                      : "No due date";
                    const dueClass = dueInDays == null
                      ? "text-slate-700 dark:text-slate-200"
                      : dueInDays < 0
                        ? "text-red-600 dark:text-red-400"
                        : dueInDays <= 5
                          ? "text-amber-600 dark:text-amber-300"
                          : "text-green-700 dark:text-green-300";
                    return (
                        <tr
                          key={entry.id}
                          className={rowClass}
                          onClick={() => setRentRollDetailView({ type: "unit", id: entry.id })}
                        >
                          <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRentRollDetailView({ type: "property", id: entry.propertyId });
                              }}
                              className="text-left text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                            >
                              {propertyName}
                            </button>
                          </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{entry.unit}</td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{entry.tenant}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusClass}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{entry.bedrooms} bd / {entry.bathrooms} ba</td>
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{formatCurrency(entry.rent)}</td>
                        <td className="px-4 py-2 font-medium">
                          <div className={balanceClass}>{formatCurrency(balanceVal)}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">Paid: {formatCurrency(paidVal)}</div>
                        </td>
                        <td className="px-4 py-2 font-medium">
                          <div className={lateFeeClass}>{lateFeeVal > 0 ? formatCurrency(lateFeeVal) : "$0"}</div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                          <div className={`text-xs font-semibold ${dueClass}`}>{dueLabel}</div>
                          {dueDate && <div className="text-[11px] text-slate-500 dark:text-slate-400">{dueDate}</div>}
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{entry.leaseEnd}</td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                          <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditRentRoll(entry);
                                }}
                                className="px-2 py-1 text-xs rounded-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPaymentModal(entry);
                                }}
                                disabled={(paymentRollup[entry.id]?.balance ?? entry.rent) <= 0}
                                className={`px-2 py-1 text-xs rounded-md ${((paymentRollup[entry.id]?.balance ?? entry.rent) <= 0) ? "bg-emerald-900/40 text-emerald-200 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                              >
                                {((paymentRollup[entry.id]?.balance ?? entry.rent) <= 0) ? "Paid" : "Payment"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingPropertyId(entry.propertyId);
                                  setLinkTargetProjectId(rentRollPropertyMap[entry.propertyId]?.linkedProjectId != null ? String(rentRollPropertyMap[entry.propertyId]?.linkedProjectId) : "");
                                }}
                                className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                              >
                                Link
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRentRollDeleteModal({ open: true, entry });
                                }}
                                className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
                              >
                                Delete
                              </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRentRoll.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                        No units match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
                </div>
                </div>
              </>
            )}

          {rentRollModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setRentRollModalOpen(false); setEditingRentRollId(null); }}>
            <div className="w-full max-w-3xl mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{editingRentRollId ? "Edit Rental" : "New Rental"}</h3>
                <button
                  onClick={() => { setRentRollModalOpen(false); setEditingRentRollId(null); }}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Property Name</label>
                  <input
                    value={rentRollForm.propertyName}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, propertyName: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="e.g., 123 Main"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Unit</label>
                  <input
                    value={rentRollForm.unit}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="Unit A"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Tenant</label>
                  <input
                    value={rentRollForm.tenant}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, tenant: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="Name or Vacant"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Tenant Account</label>
                  <select
                    value={rentRollForm.tenantId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const linked = tenants.find((t) => t.id === nextId);
                      setRentRollForm((prev) => ({
                        ...prev,
                        tenantId: nextId,
                        tenant: linked?.name || prev.tenant,
                      }));
                    }}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="">Not linked</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Status</label>
                  <select
                    value={rentRollForm.status}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, status: e.target.value as RentRollStatus }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="Occupied">Occupied</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Notice">Notice</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Rent</label>
                  <input
                    type="number"
                    value={rentRollForm.rent}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, rent: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="1500"
                  />
                </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Initial Due (MM-DD)</label>
                    <input
                      type="text"
                      value={rentRollForm.initialDueMonthDay}
                      onChange={(e) => setRentRollForm((prev) => ({ ...prev, initialDueMonthDay: e.target.value }))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      placeholder="03-01"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Most Recent Payment Date</label>
                    <input
                      type="date"
                      value={rentRollForm.lastPaymentDate}
                      onChange={(e) => setRentRollForm((prev) => ({ ...prev, lastPaymentDate: e.target.value }))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Paid Status</label>
                    <select
                      value={rentRollForm.lastPaymentPaidStatus}
                      onChange={(e) =>
                        setRentRollForm((prev) => ({
                          ...prev,
                          lastPaymentPaidStatus: e.target.value as "on_time" | "late" | "different_day",
                          lastPaymentPaidDate: e.target.value === "different_day" ? prev.lastPaymentPaidDate : "",
                        }))
                      }
                      disabled={!rentRollForm.lastPaymentDate}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="on_time">On Time</option>
                      <option value="late">Late</option>
                      <option value="different_day">Different Day</option>
                    </select>
                  </div>
                  {rentRollForm.lastPaymentPaidStatus === "different_day" && rentRollForm.lastPaymentDate && (
                    <div>
                      <label className="text-xs text-slate-500 dark:text-slate-400">Actual Paid Date</label>
                      <input
                        type="date"
                        value={rentRollForm.lastPaymentPaidDate}
                        onChange={(e) => setRentRollForm((prev) => ({ ...prev, lastPaymentPaidDate: e.target.value }))}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Lease End</label>
                    <input
                    type="date"
                    value={rentRollForm.leaseEnd}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, leaseEnd: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Bedrooms</label>
                  <input
                    type="number"
                    value={rentRollForm.bedrooms}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, bedrooms: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Bathrooms</label>
                  <input
                    type="number"
                    value={rentRollForm.bathrooms}
                    onChange={(e) => setRentRollForm((prev) => ({ ...prev, bathrooms: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => { setRentRollModalOpen(false); setEditingRentRollId(null); }}
                  className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRentRollUnit}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  Save Unit
                </button>
              </div>
            </div>
          </div>
        )}

        {rentPaymentModal.open && rentPaymentModal.entryId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRentPaymentModal({ open: false, entryId: null, amount: "", date: toDateString(getCentralTodayMs()), note: "" })}>
            <div className="w-full max-w-lg mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Record Payment</h3>
                <button
                  onClick={() => setRentPaymentModal({ open: false, entryId: null, amount: "", date: toDateString(getCentralTodayMs()), note: "" })}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              {rentPaymentModal.entryId && (
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                  Remaining this month: <span className="font-semibold">{formatCurrency(getRemainingBalance(rentPaymentModal.entryId))}</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Amount</label>
                  <input
                    type="number"
                    value={rentPaymentModal.amount}
                    min={0}
                    max={rentPaymentModal.entryId ? getRemainingBalance(rentPaymentModal.entryId) : undefined}
                    onChange={(e) => {
                      const raw = parseFloat(e.target.value) || 0;
                      const limit = rentPaymentModal.entryId ? getRemainingBalance(rentPaymentModal.entryId) : raw;
                      const clamped = Math.min(limit, Math.max(0, raw));
                      setRentPaymentModal((prev) => ({ ...prev, amount: clamped.toString() }));
                    }}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="e.g., 1500"
                  />
                  </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Date</label>
                  <input
                    type="date"
                    value={rentPaymentModal.date}
                    onChange={(e) => setRentPaymentModal((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Note</label>
                  <input
                    value={rentPaymentModal.note}
                    onChange={(e) => setRentPaymentModal((prev) => ({ ...prev, note: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    placeholder="Optional note"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setRentPaymentModal({ open: false, entryId: null, amount: "", date: toDateString(getCentralTodayMs()), note: "" })}
                  className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePayment}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {rentRollDeleteModal.open && rentRollDeleteModal.entry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setRentRollDeleteModal({ open: false, entry: null })}>
            <div className="w-full max-w-md mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Delete Rental</h3>
                <button
                  onClick={() => setRentRollDeleteModal({ open: false, entry: null })}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Are you sure you want to delete {rentRollDeleteModal.entry.unit} at {rentRollDeleteModal.entry.tenant || "this unit"}? This will also remove its payments.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRentRollDeleteModal({ open: false, entry: null })}
                  className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { handleDeleteRentRoll(rentRollDeleteModal.entry!.id); setRentRollDeleteModal({ open: false, entry: null }); }}
                  className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}


        {linkingProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setLinkingPropertyId(null); setLinkTargetProjectId(""); }}>
            <div className="w-full max-w-lg mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Link to EPS Project</h3>
                <button
                  onClick={() => { setLinkingPropertyId(null); setLinkTargetProjectId(""); }}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Property: <span className="font-semibold">{linkingProperty.name}</span></p>
              <select
                value={linkTargetProjectId}
                onChange={(e) => setLinkTargetProjectId(e.target.value)}
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="">Select EPS project</option>
                {epsProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleUnlinkProperty(linkingProperty.id)}
                  className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Unlink
                </button>
                <button
                  onClick={handleSavePropertyLink}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Save Link
                </button>
              </div>
            </div>
          </div>
        )}
        {expenseCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setExpenseCategoryModalOpen(false)}>
            <div className="w-full max-w-2xl mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Expense Categories</h3>
                <button
                  onClick={() => setExpenseCategoryModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <input
                  value={expenseCategoryForm.name}
                  onChange={(e) => setExpenseCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="md:col-span-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Category name"
                />
                <select
                  value={expenseCategoryForm.parentId}
                  onChange={(e) => setExpenseCategoryForm((prev) => ({ ...prev, parentId: e.target.value }))}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">Top-level</option>
                  {rentExpenseCategories.filter((c) => !c.parentId).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleSaveExpenseCategory}
                  className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                >
                  {expenseCategoryForm.id ? "Update Category" : "Add Category"}
                </button>
                {expenseCategoryForm.id && (
                  <button
                    onClick={() => setExpenseCategoryForm({ id: "", name: "", parentId: "" })}
                    className="px-3 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Parent</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentExpenseCategories.map((cat) => (
                      <tr key={cat.id} className="border-t border-slate-200 dark:border-slate-800">
                        <td className="px-4 py-2">{cat.name}</td>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                          {cat.parentId && rentExpenseCategoryMap[cat.parentId]
                            ? rentExpenseCategoryMap[cat.parentId].name
                            : "-"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditExpenseCategory(cat)}
                              className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteExpenseCategory(cat.id)}
                              className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rentExpenseCategories.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                          No categories yet. Add one above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // DEBT SERVICE VIEW
  // ---------------------------------------------------------------------------
  if (mode === "DebtService") {
    const debtProjects = epsProjects
      .map((p) => ({
        id: String(getProjectDbIdFromNode(p.id) ?? p.projectId ?? p.id),
        name: p.name,
      }))
      .filter((p, idx, arr) => arr.findIndex((o) => o.id === p.id) === idx);
    const allDebtEntries = Object.values(projectDebtService).flat();
    const filteredDebtEntries = debtServiceFilterProjectId === "all"
      ? allDebtEntries
      : allDebtEntries.filter((d) => String(d.projectId) === debtServiceFilterProjectId);
    const totalDebtPayment = filteredDebtEntries.reduce((sum, d) => sum + (d.payment || 0), 0);
    const filterLabel = debtServiceFilterProjectId === "all"
      ? "All Projects"
      : (epsProjectNameById(Number(debtServiceFilterProjectId)) || `Project ${debtServiceFilterProjectId}`);

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Debt Service"
          projectName={filterLabel}
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Monthly Debt Service</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Track balances, rates, and maturities across projects.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={debtServiceFilterProjectId}
                    onChange={(e) => setDebtServiceFilterProjectId(e.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="all">All Projects</option>
                    {debtProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    Total Payment: <span className="font-semibold">{formatCurrency(totalDebtPayment)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-9 gap-2">
                <select
                  value={debtServiceForm.projectId}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, projectId: e.target.value }))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Select Project</option>
                  {debtProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  value={debtServiceForm.bank}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, bank: e.target.value }))}
                  placeholder="Bank"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="number"
                  value={debtServiceForm.balance}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, balance: e.target.value }))}
                  placeholder="Balance"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="number"
                  value={debtServiceForm.payment}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, payment: e.target.value }))}
                  placeholder="Payment"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="number"
                  value={debtServiceForm.interestRate}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, interestRate: e.target.value }))}
                  placeholder="Rate %"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                />
                <select
                  value={debtServiceForm.rateType}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, rateType: e.target.value as ProjectDebtService["rateType"] }))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="fixed">Fixed</option>
                  <option value="variable">Variable</option>
                </select>
                <input
                  type="date"
                  value={debtServiceForm.rateAdjustDate}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, rateAdjustDate: e.target.value }))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  type="date"
                  value={debtServiceForm.maturityDate}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, maturityDate: e.target.value }))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <input
                  value={debtServiceForm.note}
                  onChange={(e) => setDebtServiceForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Note"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleSaveDebtService}
                  className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingDebtServiceId ? "Update Debt" : "Add Debt"}
                </button>
                {editingDebtServiceId && (
                  <button
                    onClick={resetDebtServiceForm}
                    className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Debt Schedule</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Click a row to open the project draws.</p>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">{filteredDebtEntries.length} entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                    <tr>
                      <th className="px-4 py-2 text-left">Project</th>
                      <th className="px-4 py-2 text-left">Bank</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-right">Payment</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Adjust Date</th>
                      <th className="px-4 py-2 text-left">Maturity</th>
                      <th className="px-4 py-2 text-left">Note</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDebtEntries.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                          No debt service entries yet.
                        </td>
                      </tr>
                    )}
                    {filteredDebtEntries
                      .slice()
                      .sort((a, b) => (b.maturityDate || "").localeCompare(a.maturityDate || ""))
                      .map((entry, idx) => (
                        <tr
                          key={entry.id}
                          onClick={() => handleOpenDebtDraws(entry.projectId)}
                          className={`border-t border-slate-200 dark:border-slate-800 cursor-pointer ${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"} hover:bg-slate-100 dark:hover:bg-slate-800/80`}
                        >
                          <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                            {epsProjectNameById(entry.projectId) || `Project ${entry.projectId}`}
                          </td>
                          <td className="px-4 py-2">{entry.bank}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(entry.balance)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(entry.payment)}</td>
                          <td className="px-4 py-2 text-right">{entry.interestRate.toFixed(2)}%</td>
                          <td className="px-4 py-2">{entry.rateType}</td>
                          <td className="px-4 py-2">{entry.rateAdjustDate || "-"}</td>
                          <td className="px-4 py-2">{entry.maturityDate || "-"}</td>
                          <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{entry.note || "-"}</td>
                          <td className="px-4 py-2 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDebtService(entry);
                                }}
                                className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDebtService(entry);
                                }}
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACCOUNT VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Account") {
    const initials = (name?: string) =>
      (name || "User")
        .trim()
        .split(/\s+/)
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Account"
          projectName={currentUser?.name || "Profile"}
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto grid gap-6">
            <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Profile</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-slate-600 dark:text-slate-200">
                      {initials(currentUser?.name)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {currentUser?.name || "Unknown User"}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.email || ""}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {currentUser?.role || "viewer"}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={avatarUploading}
                >
                  {avatarUploading ? "Uploading..." : "Upload Photo"}
                </button>
                {avatarError && <span className="text-sm text-red-600">{avatarError}</span>}
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Active on Dashboard</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {activeUsers.length} online
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {activeUsers.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">No active users yet.</div>
                )}
                {activeUsers.map((user) => (
                  <div key={`${user.id}-${user.lastSeen}`} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-800 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-200">
                            {initials(user.name)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{user.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(user.lastSeen).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EXPORTS VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Exports") {
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Exports"
          projectName="Data Exports"
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Export Data</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">Choose what to export and the format (CSV or XLSX).</p>
              </div>
              <button
                onClick={() => setExportModalOpen(true)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                New Export
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Export History</h3>
              {exportHistory.length === 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">No exports yet.</span>
              )}
            </div>
            {exportHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left">Timestamp</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Format</th>
                      <th className="px-3 py-2 text-left">Filename</th>
                      <th className="px-3 py-2 text-left">Re-run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportHistory.map((h, idx) => (
                      <tr key={h.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/60"}>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{new Date(h.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.type}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.format}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.filename}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => rerunExport(h)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Re-export
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setExportModalOpen(false)}>
            <div className="w-full max-w-lg mx-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Export Options</h3>
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <IconX />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Export Type</label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as "main" | "property" | "rentroll")}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="main">Main Ledger</option>
                    <option value="property">Property Ledgers</option>
                    <option value="rentroll">Rent Roll Ledgers</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Format</label>
                  <div className="flex items-center gap-3 mt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input type="radio" name="export-format" value="csv" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} />
                      CSV
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input type="radio" name="export-format" value="xlsx" checked={exportFormat === "xlsx"} onChange={() => setExportFormat("xlsx")} />
                      XLSX
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (exportType === "main") exportMainLedger();
                    if (exportType === "property") exportPropertyLedger();
                    if (exportType === "rentroll") exportRentRollLedger();
                    setExportModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // BANK STATEMENTS VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Statements") {
    const parseCsvContent = (content: string) => {
      const lines = content.split(/\r?\n/).filter(Boolean);
      const rows: { date: string; description: string; amount: number }[] = [];
      const header = lines[0]?.toLowerCase() || "";
      const hasHeader = header.includes("date") || header.includes("amount");
      const dataLines = hasHeader ? lines.slice(1) : lines;
      dataLines.forEach((line) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 2) return;
        const [dateRaw, descRaw, amountRaw] = parts;
        const amount = parseFloat(amountRaw ?? parts[parts.length - 1] ?? "0") || 0;
        const date = dateRaw && dateRaw.includes("-") ? dateRaw : toDateString(getCentralTodayMs());
        const desc = descRaw || "Statement line";
        rows.push({ date, description: desc, amount });
      });
      return rows;
    };
    const parsePdfContent = (content: string) => {
      const lines = content.split(/\r?\n/).filter(Boolean);
      const rows: { date: string; description: string; amount: number }[] = [];
      lines.forEach((line) => {
        const match = line.match(/([0-9]{4}-[0-9]{2}-[0-9]{2}).*?(-?\$?[0-9,]+\.\d{2})/);
        if (match) {
          const date = match[1];
          const amtRaw = match[2].replace(/[$,]/g, "");
          const amount = parseFloat(amtRaw) || 0;
          rows.push({ date, description: line.trim(), amount });
        }
      });
      return rows;
    };

    const handleFileUpload = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const uploaded: { id: string; name: string; size: number; uploadedAt: string }[] = [];
      const parsed: { uploadId: string; rows: { date: string; description: string; amount: number }[] }[] = [];

      const readFile = (file: File) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
            } else if (reader.result instanceof ArrayBuffer) {
              const decoder = new TextDecoder("utf-8", { fatal: false });
              resolve(decoder.decode(reader.result));
            } else {
              resolve("");
            }
          };
          if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
            reader.readAsArrayBuffer(file);
          } else {
            reader.readAsText(file);
          }
        });

      for (const f of Array.from(files)) {
        const id = `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const upload = { id, name: f.name, size: f.size, uploadedAt: new Date().toISOString() };
        uploaded.push(upload);
        if (f.name.toLowerCase().endsWith(".csv")) {
          const content = await readFile(f);
          const rows = parseCsvContent(content);
          parsed.push({ uploadId: id, rows });
        } else {
          const content = await readFile(f);
          const rows = parsePdfContent(content);
          if (!rows || rows.length === 0) {
            parsed.push({
              uploadId: id,
              rows: [{ date: toDateString(getCentralTodayMs()), description: "Unable to parse PDF (image-only or unsupported format)", amount: 0 }],
            });
          } else {
            parsed.push({ uploadId: id, rows });
          }
        }
      }

      // persist to API
      try {
        await fetch("/api/statements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploads: uploaded.map((u) => ({ tempId: u.id, name: u.name, size: u.size, uploadedAt: u.uploadedAt })),
            lines: parsed.flatMap((p) =>
              p.rows.map((r) => ({
                tempUploadId: p.uploadId,
                date: r.date,
                description: r.description,
                amount: r.amount,
              }))
            ),
          }),
        });
        await loadStatements();
      } catch (err) {
        console.error("Failed to save statements", err);
        setStatementUploads((prev) => [...uploaded, ...prev]);
        setParsedStatements((prev) => [...parsed, ...prev]);
      }
    };

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Bank Statements"
          projectName="Uploads"
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Upload Bank Statements</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Upload PDF or CSV statements to store for reconciliation. Files are tracked locally in this demo.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer">
              <input
                type="file"
                accept=".pdf,.csv"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              Upload Statements
            </label>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Upload History</h3>
              {statementUploads.length === 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">No statements uploaded yet.</span>
              )}
            </div>
            {statementUploads.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left">File</th>
                      <th className="px-3 py-2 text-left">Size</th>
                      <th className="px-3 py-2 text-left">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementUploads.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/60"}>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{s.name}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{(s.size / 1024).toFixed(1)} KB</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{new Date(s.uploadedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {parsedStatements.length > 0 && (
            <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">Parsed Statement Lines (Demo)</h3>
                    {parsedStatements.map((parsed) => {
                      const upload = statementUploads.find((s) => s.id === parsed.uploadId);
                      return (
                        <div key={parsed.uploadId} className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {upload?.name || "Statement"} â€” {parsed.rows.length} lines
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Uploaded {upload ? new Date(upload.uploadedAt).toLocaleString() : ""}
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px]">
                                <tr>
                                  <th className="px-3 py-2 text-left">Date</th>
                                  <th className="px-3 py-2 text-left">Description</th>
                                  <th className="px-3 py-2 text-left">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                              {parsed.rows.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="px-3 py-2 text-slate-500 dark:text-slate-400">No lines parsed.</td>
                                </tr>
                              )}
                              {parsed.rows.map((r, idx) => (
                                <tr key={`${parsed.uploadId}-${idx}`} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/60"}>
                                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{r.date}</td>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.description}</td>
                                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{formatCurrency(r.amount)}</td>
                                </tr>
                              ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // USERS / ADMIN VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Users") {
    const isAdmin = currentUser?.role === "admin";
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Users"
          projectName="Admin"
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isAdmin ? (
            <div className="max-w-3xl mx-auto rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-700/70 dark:bg-amber-900/40 dark:text-amber-100">
              Admin access required to manage users.
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">User Management</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Create, edit, or remove platform users. Password is optional when editing; leave blank to keep existing.
                  </p>
                </div>
                <button
                  onClick={() => { resetUserForm(); setUserModalOpen(true); setUserError(null); }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  New User
                </button>
              </div>

              {userError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100">
                  {userError}
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700 dark:bg-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] tracking-wide dark:bg-slate-900/60 dark:text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Created</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                          No users found. Add one to get started.
                        </td>
                      </tr>
                    )}
                    {usersList.map((u, idx) => (
                      <tr key={u.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-900/40"}>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-50">{u.name}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{u.email}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200 capitalize">{u.role}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <button
                            onClick={() => { setUserForm({ id: u.id, email: u.email, name: u.name, role: u.role, password: "" }); setUserModalOpen(true); setUserError(null); }}
                            className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setUserDeleteTarget(u)}
                            className="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {userModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setUserModalOpen(false); resetUserForm(); }}>
            <div
              className="w-[420px] rounded-lg bg-white p-5 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
                {userForm.id ? "Edit User" : "New User"}
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400">Email</label>
                  <input
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    placeholder="user@example.com"
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">{userForm.id ? "New Password (optional)" : "Password"}</label>
                    <input
                      value={userForm.password}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                      type="password"
                      placeholder={userForm.id ? "Leave blank to keep" : "Minimum 8 chars"}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => { setUserModalOpen(false); resetUserForm(); }}
                  className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={userSaving}
                  className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {userSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {userDeleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setUserDeleteTarget(null)}>
            <div
              className="w-[360px] rounded-lg bg-white p-5 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Delete User</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Remove <span className="font-semibold">{userDeleteTarget.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setUserDeleteTarget(null)}
                  className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // COMMITS VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Commits") {
    const selectedCommit = commitList.find((c) => c.id === commitSelectedId) || null;
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Commits"
          projectName="Review & Apply"
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
        />

        <div className="flex-1 overflow-hidden flex">
          <div className="w-2/5 min-w-[380px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            <div className="p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Commit Queue</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending change sets awaiting approval.</p>
              </div>
              <button
                onClick={() => loadCommits(true)}
                className="text-xs px-3 py-1 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>
            {commitError && (
              <div className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100">
                {commitError}
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {commitLoading && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Loading commits…</div>
              )}
              {!commitLoading && commitList.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No commits yet.</div>
              )}
              {commitList.map((c) => {
                const isSelected = c.id === commitSelectedId;
                const statusColor =
                  c.status === "applied" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                  c.status === "approved" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" :
                  c.status === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200" :
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
                return (
                  <button
                    key={c.id}
                    onClick={() => setCommitSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-800 transition-colors ${isSelected ? "bg-slate-100 dark:bg-slate-800/60" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.serial}</div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {c.description || "No description provided."}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{c.authorName || "Unknown"} </span>
                      <span>-</span>
                      <span>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}</span>
                      {c.tags?.length > 0 && (
                        <>
                          <span>-</span>
                          <span className="flex flex-wrap gap-1">{c.tags.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{t}</span>
                          ))}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6">
            {!selectedCommit && (
        <div className="text-sm text-slate-500 dark:text-slate-400">Select a commit to review details.</div>
      )}
      {selectedCommit && (
        <div className="max-w-5xl space-y-4">
          <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{selectedCommit.serial}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedCommit.authorName || "Unknown"} - {selectedCommit.createdAt ? new Date(selectedCommit.createdAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  {currentUser?.role === "admin" && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCommitStatus(selectedCommit.id, "approved")}
                        className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateCommitStatus(selectedCommit.id, "rejected")}
                        className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => updateCommitStatus(selectedCommit.id, "applied")}
                        className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Summary</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedCommit.description || "No description provided."}
                  </p>
                  {selectedCommit.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCommit.tags.map((t) => (
                        <span key={t} className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Changes</h3>
                    <button
                      onClick={() => loadCommits(true)}
                      className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Reload with changes
                    </button>
                  </div>
                  {(!selectedCommit.changes || selectedCommit.changes.length === 0) && (
                    <div className="text-sm text-slate-500 dark:text-slate-400">No change items recorded.</div>
                  )}
                  <div className="space-y-3">
                    {(selectedCommit.changes || []).map((chg) => (
                      <div key={chg.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{chg.entity}{chg.entityId ? ` #${chg.entityId}` : ""}</div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {chg.operation}
                          </span>
                        </div>
                        {chg.impact && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">Impact: {chg.impact}</div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                          <div>
                            <div className="text-[11px] uppercase text-slate-500 dark:text-slate-400 mb-1">Before</div>
                            <pre className="whitespace-pre-wrap rounded bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-700">
                              {chg.before ? JSON.stringify(chg.before, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[11px] uppercase text-slate-500 dark:text-slate-400 mb-1">After</div>
                            <pre className="whitespace-pre-wrap rounded bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-700">
                              {chg.after ? JSON.stringify(chg.after, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
        </div>
      )}
    </div>
  </div>

  {commitDraftOpen && (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 overflow-y-auto py-8"
      onClick={() => setCommitDraftOpen(false)}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Stage Commit</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Describe your change set and add change items.</p>
          </div>
          <button
            onClick={() => setCommitDraftOpen(false)}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        {commitDraftError && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100">
            {commitDraftError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Description</label>
            <textarea
              value={commitDraft.description}
              onChange={(e) => setCommitDraft((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-h-[80px]"
              placeholder="What does this commit contain?"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Tags (auto)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {derivedCommitTags.length === 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">Will auto-fill from staged changes</span>
              )}
              {derivedCommitTags.map((t) => (
                <span key={t} className="px-2 py-1 text-xs rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Derived automatically from staged change entities.</p>
          </div>
        </div>

        <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Staged Changes</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Changes are captured automatically from your actions. Review or remove them below.
          </p>
          {commitDraft.changes.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">No staged changes yet.</div>
          )}
          {commitDraft.changes.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {commitDraft.changes.map((chg) => (
                <div key={chg.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{chg.entity}{chg.entityId ? ` #${chg.entityId}` : ""}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{chg.operation}</span>
                      <button
                        onClick={() => removeDraftChange(chg.id)}
                        className="text-[11px] px-2 py-0.5 rounded border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {chg.impact && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Impact: {chg.impact}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px] mt-2">
                    <div>
                      <div className="text-[11px] uppercase text-slate-500 dark:text-slate-400 mb-1">Before</div>
                      <pre className="whitespace-pre-wrap rounded bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-700">
                        {chg.beforeText || "-"}
                      </pre>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase text-slate-500 dark:text-slate-400 mb-1">After</div>
                      <pre className="whitespace-pre-wrap rounded bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-700">
                        {chg.afterText || "-"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setCommitDraftOpen(false)}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCommitDraft}
            disabled={commitDraftSaving}
            className="px-4 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {commitDraftSaving ? "Saving..." : "Submit Commit"}
          </button>
        </div>
      </div>
    </div>
  )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RESOURCES VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Resources") {
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Resources"
          projectName={activeProject?.name}
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <ActionRibbon
          onOpenTaxRates={() => setTaxRateDialogOpen(true)}
          onManagePresets={() => setFormulaPresetDialogOpen(true)}
          onCreateFormula={handleCreateFormula}
          onAddPresetToProject={openPresetPicker}
          onManageLedgerCategories={() => setLedgerCategoryDialogOpen(true)}
          onManageAccounts={() => setAccountsDialogOpen(true)}
          taxRateCount={taxRates.length}
          presetCount={formulaPresets.length}
          ledgerCategoryCount={ledgerCategories.length}
          accountCount={ledgerAccounts.length}
          hasActiveProject={!!resolveActiveProjectId()}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto pb-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Resource Management</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage labor, equipment, materials, and subcontractors available for project activities.
                </p>
              </div>
              <button
                onClick={() => setResourceManagementDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <IconTool /> Manage Resources
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                    <IconUsers />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {resources.filter(r => r.type === "Labor").length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Labor Resources</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                    <IconTool />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {resources.filter(r => r.type === "Equipment").length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Equipment</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                    <IconFolder />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {resources.filter(r => r.type === "Material").length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Materials</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                    <IconHome />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {resources.filter(r => r.type === "Subcontractor").length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Subcontractors</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">All Resources</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-900">
                    <tr className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-center">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map((r, idx) => (
                      <tr key={r.id} className={`border-t border-slate-200 dark:border-slate-700 ${idx % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.type === 'Labor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            r.type === 'Equipment' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            r.type === 'Material' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(r.rate)}/{r.rateUnit}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">
                          {r.availability ? `${r.availability} hrs/day` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <ResourceManagementDialog
          open={resourceManagementDialog}
          onClose={() => setResourceManagementDialog(false)}
          resources={resources}
          onSave={handleSaveAllResources}
        />

        <TaxRatesDialog
          open={taxRateDialogOpen}
          onClose={() => setTaxRateDialogOpen(false)}
          taxRates={taxRates}
          onSave={handleSaveTaxRate}
          onDelete={handleDeleteTaxRate}
        />

        <FormulaPresetDialog
          open={formulaPresetDialogOpen}
          onClose={() => setFormulaPresetDialogOpen(false)}
          presets={formulaPresets}
          onDelete={handleDeletePreset}
        />

      <PresetPicker
        open={presetPickerOpen}
        onClose={() => setPresetPickerOpen(false)}
        presets={formulaPresets}
        onApply={handleApplyPresetToProject}
      />

      <LedgerAccountsDialog
        open={accountsDialogOpen}
        onClose={() => setAccountsDialogOpen(false)}
        accounts={ledgerAccounts}
        onSave={handleSaveLedgerAccount}
        onDelete={handleDeleteLedgerAccount}
      />

      {paycheckEditModal.open && paycheckEditModal.paycheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPaycheckEditModal({ open: false, paycheck: null, amount: "", checkNumber: "" })}>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-[380px] p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Edit Paycheck</h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Amount</div>
                <input
                  type="number"
                  value={paycheckEditModal.amount}
                  onChange={(e) => setPaycheckEditModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check #</div>
                <input
                  value={paycheckEditModal.checkNumber}
                  onChange={(e) => setPaycheckEditModal(prev => ({ ...prev, checkNumber: e.target.value }))}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPaycheckEditModal({ open: false, paycheck: null, amount: "", checkNumber: "" })} className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSavePaycheck} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      <AcquisitionConfirmModal
        open={acquireConfirmOpen}
        onConfirm={confirmAcquire}
        onCancel={() => { setAcquireConfirmOpen(false); setPendingAcquireProjectId(null); }}
      />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // LABOR VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Labor") {
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Labor"
          projectName={activeProject?.name}
          onModeChange={setMode}
          currentMode={mode}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Labor Tracking</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage employees, weekly hours, and payroll checks.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600 dark:text-slate-300">Week of</label>
                <input
                  type="date"
                  value={laborWeekStart}
                  onChange={(e) => setLaborWeekStart(getWeekStart(toDateMs(e.target.value)))}
                  className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm"
                />
              </div>
              <button
                onClick={() => { setEmployeeFormOpen(true); setEditingEmployee(null); setEmployeeNameInput(""); setEmployeeRateInput(""); }}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700"
              >
                Add Employee
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Employees</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Rate (hr)</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/50"}>
                      <td className="px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">{emp.name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300">${emp.rate.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right space-x-2">
                        <button
                          onClick={() => handleEditEmployee(emp)}
                          className="px-2 py-1 text-xs rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        No employees yet. Add your first employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Weekly Hours & Tags</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Assign project tags per day. You can split a day across multiple projects.</span>
            </div>
            <div className="overflow-x-auto">
              <div className="space-y-4">
                {employees.map((emp, idx) => {
                  const bg = idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/60";
                  return (
                    <div key={emp.id} className={`rounded border border-slate-200 dark:border-slate-700 ${bg} p-3`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total this week: {weekHoursForEmployee(emp.id).toFixed(2)} hrs</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                        {weekDays.map((d) => {
                          const entries = timeEntries.filter(t => t.employeeId === emp.id && t.date === d.date);
                          return (
                            <div key={d.date} className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{d.label}</div>
                              <div className="space-y-2">
                                {entries.map((entry) => (
                                  <div key={entry.id} className="space-y-1">
                                    <select
                                      value={entry.projectId ?? ""}
                                      onChange={(e) => updateTimeEntry(entry.id, "projectId", e.target.value ? Number(e.target.value) : null)}
                                      className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-1"
                                    >
                                      <option value="">Select project</option>
                                      {laborProjectsDb.map(p => (
                                        <option key={p.id} value={p.projectId ?? p.id}>{p.name}</option>
                                      ))}
                                    </select>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        value={entry.hours || ""}
                                        onChange={(e) => updateTimeEntry(entry.id, "hours", parseFloat(e.target.value) || 0)}
                                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-1"
                                        placeholder="hrs"
                                      />
                                      <button
                                        onClick={() => deleteTimeEntry(entry.id)}
                                        className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => addTimeEntry(emp.id, d.date, laborProjectsDb[0]?.projectId ?? null)}
                                  className="w-full text-[11px] px-2 py-1 rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  + Add entry
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {employees.length === 0 && (
                  <div className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded">
                    Add employees to track hours.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Paychecks</h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Record per-employee weekly checks.</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Hours (week)</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Check #</th>
                    <th className="px-3 py-2 text-right">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const hours = weekHoursForEmployee(emp.id);
                    const amount = hours * emp.rate;
                    return (
                      <tr key={emp.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/50"}>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{emp.name}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{hours.toFixed(2)} hrs</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">${amount.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <input
                            value={paycheckNumbers[emp.id] || ""}
                            onChange={(e) => setPaycheckNumbers(prev => ({ ...prev, [emp.id]: e.target.value }))}
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-2 py-1"
                            placeholder="Check #"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleRecordPaycheck(emp)}
                            className="px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 text-xs"
                          >
                            Record
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                        Add employees to record paychecks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {paychecks.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Recent Paychecks</h4>
                <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                  {paychecks.slice(-5).reverse().map((pc) => {
                    const emp = employees.find((e) => e.id === pc.employeeId);
                    return (
                      <div key={pc.id} className="flex items-center justify-between rounded bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                        <div className="space-y-1">
                          <div>{emp?.name || pc.employeeId} - Week of {pc.weekStart}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Check #{pc.checkNumber}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${pc.amount.toFixed(2)}</span>
                          <button onClick={() => handleOpenEditPaycheck(pc)} className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600">Edit</button>
                          <button onClick={() => handleDeletePaycheck(pc)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 hover:bg-red-200">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {employeeFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{editingEmployee ? "Edit Employee" : "Add Employee"}</h3>
                <button onClick={() => { setEmployeeFormOpen(false); setEditingEmployee(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <IconX />
                </button>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={employeeNameInput}
                  onChange={(e) => setEmployeeNameInput(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="Employee name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={employeeRateInput}
                  onChange={(e) => setEmployeeRateInput(e.target.value)}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  placeholder="e.g., 40"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => { setEmployeeFormOpen(false); setEditingEmployee(null); }}
                  className="px-4 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACTIVITIES VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Activities" && activeProject && activeProjectDbId) {
    const projectKey = activeProjectDbId;
    const projectActivitiesRaw = activities[projectKey] || [];
    const compareWbs = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    const projectActivities = [...projectActivitiesRaw].sort((a, b) => compareWbs(a.wbs, b.wbs));
    const projectTransactions = transactions[projectKey] || [];
    const projectUtilitiesList = projectUtilities[projectKey] || [];
    const projectLoanEntries = projectLoans[projectKey] || [];
    const projectDrawsList = projectDraws[projectKey] || [];
    const projectTaxesList = projectPropertyTaxes[projectKey] || [];
    const projectCostOverridesList = projectCostOverrides[projectKey] || [];
    const projectAcquisition = projectAcquisitions[projectKey] || null;
    const currentProjectDetails = projectDetails[projectKey] || [];
    const currentCustomFormulas = customFormulas[projectKey] || [];
    const projectMeta = pipelineMeta[projectKey] || { status: "under_contract", seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] };

    const activityStats = calculateProjectStats(projectActivities, projectTransactions);
    const { totalActualCost } = activityStats;
    const { totalBudget, totalActualCost: totalActualCostFin, totalRevenue, profit } = calculateFinancialKPIs(projectActivities, projectTransactions);
    const todayWeekStart = getWeekStart(getCentralTodayMs());
    const todayWeekEnd = toDateString(toDateMs(todayWeekStart) + 6 * DAY_MS);
    const todayMonthLabel = new Date(toDateMs(todayWeekStart)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const draftDuration = newActivityDraft
      ? Math.max(1, Math.round((toDateMs(newActivityDraft.finish) - toDateMs(newActivityDraft.start)) / DAY_MS) + 1)
      : null;
    const costBreakdown = (() => {
      const baseMap = new Map<string, number>();
      projectTransactions
        .filter((t) => t.type === "Outcome")
        .forEach((t) => {
          const label = (t.category || "Uncategorized").trim();
          const key = label.toLowerCase();
          baseMap.set(key, (baseMap.get(key) || 0) + toNumber(t.amount));
        });
      const utilitiesTotalLocal = projectUtilitiesList.reduce((sum, u) => sum + (u.amount || 0), 0);
      if (utilitiesTotalLocal) {
        const key = "utilities";
        baseMap.set(key, (baseMap.get(key) || 0) + utilitiesTotalLocal);
      }
      const loanInterestTotal = projectLoanEntries.reduce((sum, l) => sum + (l.interest || 0), 0);
      if (loanInterestTotal) {
        const key = "interest";
        baseMap.set(key, (baseMap.get(key) || 0) + loanInterestTotal);
      }
      const categoryMap = new Map(costCategories.map((c) => [c.id, c]));
      const activePresetItems = activeBreakdownPresetId ? (breakdownPresetItems[activeBreakdownPresetId] || []) : [];
      const orderedCategories = activePresetItems.length
        ? activePresetItems
            .filter((item) => item.include)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => categoryMap.get(item.categoryId))
            .filter((c): c is CostCategory => Boolean(c))
        : costCategories;
      const categoryRows = orderedCategories.map((cat) => {
        const keyByCode = cat.code ? cat.code.toLowerCase() : null;
        const keyByName = cat.name.toLowerCase();
        const base = (keyByCode && baseMap.get(keyByCode)) || baseMap.get(keyByName) || 0;
        const override = (projectCostOverridesList.find((o) => o.categoryId === cat.id)?.amount) || 0;
        return {
          id: cat.id,
          label: cat.name,
          base,
          override,
          total: base + override,
        };
      });
      const knownKeys = new Set(
        orderedCategories.flatMap((c) => {
          const keys = [c.name.toLowerCase()];
          if (c.code) keys.push(c.code.toLowerCase());
          return keys;
        })
      );
      let otherTotal = 0;
      baseMap.forEach((amount, key) => {
        if (!knownKeys.has(key)) {
          otherTotal += amount;
        }
      });
      const rows = otherTotal
        ? [
            ...categoryRows,
            { id: "other", label: "Other (unmapped)", base: otherTotal, override: 0, total: otherTotal },
          ]
        : categoryRows;
      return rows.sort((a, b) => b.total - a.total);
    })();

    const transactionCategoryTotals = (() => {
      const map: Record<string, { income: number; outcome: number }> = {};
      projectTransactions.forEach((t) => {
        const key = (t.category || "Uncategorized").trim();
        if (!map[key]) map[key] = { income: 0, outcome: 0 };
        if (t.type === "Income") {
          map[key].income += toNumber(t.amount);
        } else {
          map[key].outcome += toNumber(t.amount);
        }
      });
      return map;
    })();
    const transactionAccountTotals = (() => {
      const map: Record<string, { income: number; outcome: number }> = {};
      projectTransactions.forEach((t) => {
        const name =
          (t.accountId && ledgerAccounts.find((a) => String(a.id) === t.accountId)?.name) ||
          t.accountName ||
          "";
        const key = name.trim() || "Unassigned";
        if (!map[key]) map[key] = { income: 0, outcome: 0 };
        if (t.type === "Income") {
          map[key].income += toNumber(t.amount);
        } else {
          map[key].outcome += toNumber(t.amount);
        }
      });
      return map;
    })();
    const accountBreakdownRows = Object.entries(transactionAccountTotals)
      .map(([name, totals]) => ({
        name,
        income: totals.income,
        outcome: totals.outcome,
        net: totals.income - totals.outcome,
      }))
      .sort((a, b) => (b.outcome + b.income) - (a.outcome + a.income));
    const activityTransactionTotals = (() => {
      const map: Record<string, { income: number; outcome: number; count: number }> = {};
      projectActivities.forEach((activity) => {
        map[activity.id] = { income: 0, outcome: 0, count: 0 };
      });
      projectTransactions.forEach((t) => {
        if (!t.activityId) return;
        if (!map[t.activityId]) {
          map[t.activityId] = { income: 0, outcome: 0, count: 0 };
        }
        if (t.type === "Income") {
          map[t.activityId].income += toNumber(t.amount);
        } else {
          map[t.activityId].outcome += toNumber(t.amount);
        }
        map[t.activityId].count += 1;
      });
      return map;
    })();

    const kpiVariables: Record<string, number> = {
      "Ledger Net": ledgerNetTotal,
      "Ledger Income": ledgerIncomeTotal,
      "Ledger Outcome": ledgerOutcomeTotal,
      "Activities Count": projectActivities.length,
      "Activities Progress": activityStats.overallProgress,
      "Activities Projected Labor": activityStats.projectedLabor,
      "Activities Projected Cost": activityStats.projectedCost,
      "Activities Actual Labor": activityStats.actualLaborCost,
      "Activities Actual Material": activityStats.actualMaterialCost,
      "Activities Actual Total": activityStats.totalActualCost,
      "Utilities Total": projectUtilitiesList.reduce((sum, u) => sum + (u.amount || 0), 0),
      "Draws Total": projectDrawsList.reduce((sum, d) => sum + (d.amount || 0), 0),
      "Loans Paid": projectLoanEntries.reduce((sum, l) => sum + (l.payment || 0), 0),
      "Loan Interest": projectLoanEntries.reduce((sum, l) => sum + (l.interest || 0), 0),
      "Taxes Due": projectTaxesList.filter((t) => t.status !== "paid").reduce((sum, t) => sum + (t.amount || 0), 0),
      "Closing Costs Purchase": closingCostsPurchaseTotal,
      "Closing Costs Sale": closingCostsSaleTotal,
      "Acquisition Draw": projectAcquisition?.acquisitionDraw ?? 0,
      "Purchase Price": projectAcquisition?.purchasePrice ?? 0,
      "Earnest Money": projectAcquisition?.earnestMoney ?? 0,
    };
    Object.entries(transactionCategoryTotals).forEach(([category, totals]) => {
      kpiVariables[`Category Income: ${category}`] = totals.income;
      kpiVariables[`Category Outcome: ${category}`] = totals.outcome;
    });
    Object.entries(transactionAccountTotals).forEach(([account, totals]) => {
      kpiVariables[`Account Income: ${account}`] = totals.income;
      kpiVariables[`Account Outcome: ${account}`] = totals.outcome;
    });
    projectActivities.forEach((activity) => {
      const label = `${activity.wbs} - ${activity.name}`;
      const totals = activityTransactionTotals[activity.id] || { income: 0, outcome: 0, count: 0 };
      kpiVariables[`Activity Income: ${label}`] = totals.income;
      kpiVariables[`Activity Outcome: ${label}`] = totals.outcome;
      kpiVariables[`Activity Net: ${label}`] = totals.income - totals.outcome;
      kpiVariables[`Activity Transactions Count: ${label}`] = totals.count;
      kpiVariables[`Activity Projected Labor: ${label}`] = activity.projectedLabor ?? 0;
      kpiVariables[`Activity Projected Cost: ${label}`] = activity.projectedCost ?? 0;
      kpiVariables[`Activity Budget: ${label}`] = activity.budget ?? 0;
      kpiVariables[`Activity Revenue: ${label}`] = activity.revenue ?? 0;
      kpiVariables[`Activity Progress: ${label}`] = activity.pct ?? 0;
    });
    const kpiItems = activeKpiPresetId ? (kpiPresetItems[activeKpiPresetId] || []).filter((i) => i.enabled) : [];
    const kpiOverridesForProject = projectKpiOverrides[projectKey] || [];
    const formatKpiValue = (value: number, type: KpiPresetItem["resultType"]) => {
      if (type === "percentage") return `${value.toFixed(2)}%`;
      if (type === "number") return value.toFixed(2);
      return formatCurrency(value);
    };
    const getKpiScaleColor = (value: number, item: KpiPresetItem) => {
      const minRaw = item.scaleMin;
      const maxRaw = item.scaleMax;
      if (minRaw === null || minRaw === undefined || maxRaw === null || maxRaw === undefined) return null;
      const min = Number(minRaw);
      const max = Number(maxRaw);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;
      let ratio = (value - min) / (max - min);
      ratio = Math.max(0, Math.min(1, ratio));
      if (item.scaleInvert) ratio = 1 - ratio;
      const mix = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) => ({
        r: Math.round(a.r + (b.r - a.r) * t),
        g: Math.round(a.g + (b.g - a.g) * t),
        b: Math.round(a.b + (b.b - a.b) * t),
      });
      const low = { r: 239, g: 68, b: 68 };
      const mid = { r: 245, g: 158, b: 11 };
      const high = { r: 34, g: 197, b: 94 };
      const color = ratio <= 0.5
        ? mix(low, mid, ratio / 0.5)
        : mix(mid, high, (ratio - 0.5) / 0.5);
      const { r, g, b } = color;
      return `rgb(${r}, ${g}, ${b})`;
    };
    const kpiAvailableVariables = Array.from(
      new Set([
        ...getAvailableVariables(currentProjectDetails, currentCustomFormulas, taxRates).map((v) => v.name),
        ...Object.keys(kpiVariables),
      ])
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const handleGanttCreateRange = (start: string, finish: string) => {
      setNewActivityDraft({ start, finish });
      setNewActivityDialog(true);
      setGanttCreateMode(false);
    };

    const closeNewActivityDialog = () => {
      setNewActivityDialog(false);
      setNewActivityDraft(null);
      setGanttCreateMode(false);
    };

    const handleGanttMenuOpen = (activity: Activity, clientX: number, clientY: number) => {
      setGanttMenu({ x: clientX, y: clientY, activity });
    };

    const closeGanttMenu = () => setGanttMenu({ x: 0, y: 0, activity: null });

    const handleGanttDelete = () => {
      if (ganttMenu.activity) deleteActivityById(ganttMenu.activity.id);
      closeGanttMenu();
    };

    const handleGanttAssignResources = () => {
      if (!ganttMenu.activity) return;
      setActivityForResources(ganttMenu.activity);
      setResourceAssignmentDialog(true);
      closeGanttMenu();
    };

    const handleGanttAddExpense = () => {
      if (!ganttMenu.activity) return;
      setQuickLedgerActivityId(ganttMenu.activity.id);
      setLedgerOpen(true);
      closeGanttMenu();
    };

    const handleGanttAddPredecessor = () => {
      if (!ganttMenu.activity) return;
      setDependencyModal({ open: true, mode: "pred", activity: ganttMenu.activity, targetId: "" });
      closeGanttMenu();
    };

    const handleGanttAddSuccessor = () => {
      if (!ganttMenu.activity) return;
      setDependencyModal({ open: true, mode: "succ", activity: ganttMenu.activity, targetId: "" });
      closeGanttMenu();
    };

    if (projectMeta.status === "under_contract") {
      return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Activities"
          projectName={activeProject.name}
          onModeChange={setMode}
          currentMode={mode}
          isDetailsPanelVisible={isDetailsPanelVisible}
          onToggleDetailsPanel={() => setIsDetailsPanelVisible(prev => !prev)}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
          <ActionRibbon
            onOpenTaxRates={() => setTaxRateDialogOpen(true)}
            onManagePresets={() => setFormulaPresetDialogOpen(true)}
            onCreateFormula={handleCreateFormula}
            onAddPresetToProject={openPresetPicker}
            taxRateCount={taxRates.length}
            presetCount={formulaPresets.length}
            hasActiveProject={!!resolveActiveProjectId()}
          />
          <div className="flex flex-1 overflow-hidden">
            <aside className={`w-80 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 flex-shrink-0 overflow-y-auto ${isDetailsPanelVisible ? 'block' : 'hidden'}`}>
              <ProjectDetailsPanel
                projectId={activeProject.id}
                details={currentProjectDetails}
                onUpdate={handleUpdateProjectDetails}
                onAutoPopulate={handleAutoPopulateProjectDetails}
                isVisible={isDetailsPanelVisible}
                onToggle={() => setIsDetailsPanelVisible(prev => !prev)}
                hiddenVariables={projectMeta.status === "under_contract" ? HIDE_WHEN_UNDER_CONTRACT : []}
              />
            </aside>
            <main className={`flex-1 flex flex-col overflow-hidden transition-[padding] duration-300 ${isDetailsPanelVisible ? 'md:pr-80' : 'pr-0'}`}>
              <ContractView
                projectId={activeProject.id}
                projectName={activeProject.name}
                meta={projectMeta}
                emailOptions={emailOptions}
                details={currentProjectDetails}
                onStatusChange={(status) => handleProjectStatusChange(activeProject.id, status)}
                onSellerChange={(field, value) => handleSellerFieldChange(activeProject.id, field, value)}
                onToggleOption={(optionId) => handleToggleEmailOptionForProject(activeProject.id, optionId)}
                onSend={() => handleSendSellerEmail(activeProject.id)}
                onManageOptions={() => setEmailOptionsDialogOpen(true)}
                onUpdateDetail={(variable, value) => {
                  if (activeProjectDbId) {
                    upsertProjectDetail(activeProjectDbId, variable, value);
                  }
                }}
              />
            </main>
          </div>

        <EmailOptionsDialog
          open={emailOptionsDialogOpen}
          onClose={() => setEmailOptionsDialogOpen(false)}
          options={emailOptions}
          onSave={handleSaveEmailOption}
          onDelete={handleDeleteEmailOption}
        />

        <TaxRatesDialog
          open={taxRateDialogOpen}
          onClose={() => setTaxRateDialogOpen(false)}
          taxRates={taxRates}
          onSave={handleSaveTaxRate}
          onDelete={handleDeleteTaxRate}
        />

        <FormulaPresetDialog
          open={formulaPresetDialogOpen}
          onClose={() => setFormulaPresetDialogOpen(false)}
          presets={formulaPresets}
          onDelete={handleDeletePreset}
        />

        <PresetPicker
          open={presetPickerOpen}
          onClose={() => setPresetPickerOpen(false)}
          presets={formulaPresets}
          onApply={handleApplyPresetToProject}
        />

        <LedgerCategoriesDialog
          open={ledgerCategoryDialogOpen}
          onClose={() => setLedgerCategoryDialogOpen(false)}
          categories={ledgerCategories}
          onCreate={handleCreateLedgerCategory}
          onUpdate={handleUpdateLedgerCategory}
          onDelete={handleDeleteLedgerCategory}
        />

        <LedgerAccountsDialog
          open={accountsDialogOpen}
          onClose={() => setAccountsDialogOpen(false)}
          accounts={ledgerAccounts}
          onSave={handleSaveLedgerAccount}
          onDelete={handleDeleteLedgerAccount}
        />

        <AcquisitionConfirmModal
          open={acquireConfirmOpen}
          onConfirm={confirmAcquire}
          onCancel={() => { setAcquireConfirmOpen(false); setPendingAcquireProjectId(null); }}
        />
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Activities"
          projectName={activeProject.name}
          onModeChange={setMode}
          currentMode={mode}
          isDetailsPanelVisible={isDetailsPanelVisible}
          onToggleDetailsPanel={() => setIsDetailsPanelVisible(prev => !prev)}
          currentUser={currentUser}
          activeUsers={activeUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onNotificationDismiss={handleNotificationDismiss}
          onNotificationRead={handleNotificationRead}
          onNotificationUnread={handleNotificationUnread}
          onNotificationReadAll={handleNotificationReadAll}
          readNotificationIds={readNotifications}
          toastItems={toastItems}
          closingToastIds={closingToastIds}
          onToastClick={handleToastClick}
          onToastDismiss={handleNotificationDismiss}
          onLogout={handleLogout}
          onOpenCommit={openCommitModal}
          commitDraftCount={commitDraftCount}
        />
          <ActionRibbon
            onOpenTaxRates={() => setTaxRateDialogOpen(true)}
            onManagePresets={() => setFormulaPresetDialogOpen(true)}
            onCreateFormula={handleCreateFormula}
            onAddPresetToProject={openPresetPicker}
            onManageLedgerCategories={() => setLedgerCategoryDialogOpen(true)}
            onManageAccounts={() => setAccountsDialogOpen(true)}
            taxRateCount={taxRates.length}
            presetCount={formulaPresets.length}
            ledgerCategoryCount={ledgerCategories.length}
            accountCount={ledgerAccounts.length}
            hasActiveProject={!!resolveActiveProjectId()}
          />
        {/* Acquisition status ribbon removed per request */}

        <div className="flex-1 flex overflow-hidden relative">
          <aside
            className={`flex flex-col flex-shrink-0 overflow-hidden transition-[width,opacity] duration-300 ${
              isProjectExplorerVisible
                ? "w-80 opacity-100 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
                : "w-0 opacity-0 pointer-events-none"
            }`}
          >
            <div className="border-b border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {activityView === "gantt" ? "Activity Hierarchy" : "Project Explorer"}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsProjectExplorerVisible(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Hide
                  </button>
                  <button
                    onClick={() => setMode("EPS")}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Back to EPS
                  </button>
                </div>
              </div>
            </div>
            {activityView === "gantt" ? (
              <div className="p-3 space-y-1 overflow-y-auto">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {activeProject.name}
                </div>
                {projectActivities
                  .slice()
                  .sort((a, b) => a.wbs.localeCompare(b.wbs, undefined, { numeric: true }))
                  .map((a) => {
                    const depth = a.wbs.split(".").length - 1;
                    const isSelected = selectedActivityId === a.id;
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedActivityId(a.id); }}
                        className={`w-full text-left px-2 py-1 rounded transition-colors ${isSelected ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"}`}
                        style={{ paddingLeft: 8 + depth * 12 }}
                      >
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-2">{a.wbs}</span>
                        <span className="font-medium">{a.name}</span>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="p-2 space-y-1 overflow-y-auto">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium p-1">
                  {findNode(epsNodes, activeProject.parentId!)?.name || "Enterprise"} /
                  {activeProject.name}
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-400 p-1">
                  Financial Summary:
                  <ul className="ml-2 mt-1 list-disc list-inside">
                    <li className={profit > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      Profit: {formatCurrency(profit)}
                    </li>
                    <li>Budget: {formatCurrency(totalBudget)}</li>
                    <li>Actual Cost: {formatCurrency(totalActualCostFin)}</li>
                    <li>Revenue: {formatCurrency(totalRevenue)}</li>
                  </ul>
                </div>
              </div>
            )}

            {activityView !== "gantt" && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex flex-col flex-1 min-h-0">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <IconFunction /> Custom Formulas
                </h4>
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {currentCustomFormulas.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No formulas yet. Create one or add a preset.
                    </div>
                  )}
                  {currentCustomFormulas.map((formula) => {
                    const result = evaluateFormula(
                      formula.formula,
                      currentProjectDetails,
                      currentCustomFormulas,
                      taxVariableMap
                    );
                    return (
                      <div key={formula.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-slate-700 dark:text-slate-200 font-semibold">{formula.name}</span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{formula.formula}</p>
                          </div>
                          <span className={`font-semibold ${result.error ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                            {result.error ? 'Error' : formula.resultType === 'currency' ? formatCurrency(result.value) : formula.resultType === 'percentage' ? `${result.value.toFixed(1)}%` : result.value.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleEditFormula(formula)}
                            className="px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFormula(formula.id)}
                            className="px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleCreateFormula}
                    className="w-full text-xs flex items-center justify-center gap-1 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700"
                  >
                    <IconPlus /> {currentCustomFormulas.length > 0 ? 'Manage Formulas' : 'Create Formula'}
                  </button>
                  <button
                    onClick={openPresetPicker}
                    className="w-full text-xs flex items-center justify-center gap-1 p-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded border border-amber-200 dark:border-amber-700"
                  >
                    <IconCopy /> Add Preset
                  </button>
                </div>
              </div>
            )}
          </aside>

          <button
            onClick={() => setIsProjectExplorerVisible((prev) => !prev)}
            aria-label={isProjectExplorerVisible ? "Hide project explorer" : "Show project explorer"}
            style={{ left: isProjectExplorerVisible ? "20rem" : "0" }}
            className="absolute top-1/2 -translate-y-1/2 z-20 rounded-r-md border border-slate-300 bg-white/90 px-1.5 py-2 text-slate-600 shadow-sm transition-[left,background] duration-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isProjectExplorerVisible ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
            </svg>
          </button>

          <main className={`flex-1 flex flex-col overflow-hidden transition-[padding] duration-300 ${isDetailsPanelVisible ? 'md:pr-80' : 'pr-0'}`}>
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setActivityView("overview")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "overview" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Project Overview
                </button>
                <button
                  onClick={() => setActivityView("details")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "details" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Activity Details
                </button>
                <button
                  onClick={() => setActivityView("gantt")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "gantt" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Gantt Chart
                </button>
                <button
                  onClick={() => setActivityView("ledger")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "ledger" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Project Ledger
                </button>
                <button
                  onClick={() => setActivityView("utilities")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "utilities" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Utilities
                </button>
                <button
                  onClick={() => setActivityView("draws")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "draws" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Draws
                </button>
                <button
                  onClick={() => setActivityView("loans")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "loans" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Loans
                </button>
                <button
                  onClick={() => setActivityView("taxes")}
                  className={`px-3 py-1.5 rounded-full transition-colors ${activityView === "taxes" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
                >
                  Property Taxes
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                {!isProjectExplorerVisible && (
                  <button
                    onClick={() => setIsProjectExplorerVisible(true)}
                    className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Show Project Explorer
                  </button>
                )}
                <span className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">Week: {todayWeekStart} to {todayWeekEnd}</span>
                <span className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">Month: {todayMonthLabel}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
              {activityView === "overview" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Ledger Net</div>
                      <div className={`mt-1 text-lg font-semibold ${ledgerNetTotal >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                        {formatCurrency(ledgerNetTotal)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Income {formatCurrency(ledgerIncomeTotal)} / Outcome {formatCurrency(ledgerOutcomeTotal)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Utilities</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(utilitiesTotal)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{selectedProjectUtilities.length} entries</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Draws</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(drawsTotal)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{selectedProjectDraws.length} entries</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Loan Paid</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(loansPaidTotal)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{selectedProjectLoans.length} entries</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Taxes Due</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(taxesDueTotal)}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{selectedProjectTaxes.length} entries</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3 self-start h-fit">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Acquisition</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedProjectAcquisition ? "Saved" : "Not set"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={acquisitionForm.purchasePrice}
                        onChange={(e) => setAcquisitionForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                        placeholder="Purchase Price"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        type="number"
                        value={acquisitionForm.acquisitionDraw}
                        onChange={(e) => setAcquisitionForm((prev) => ({ ...prev, acquisitionDraw: e.target.value }))}
                        placeholder="Acquisition Draw"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        type="number"
                        value={acquisitionForm.earnestMoney}
                        onChange={(e) => setAcquisitionForm((prev) => ({ ...prev, earnestMoney: e.target.value }))}
                        placeholder="Earnest Money"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                      />
                      <input
                        type="date"
                        value={acquisitionForm.closeDate}
                        onChange={(e) => setAcquisitionForm((prev) => ({ ...prev, closeDate: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <input
                      type="text"
                      value={acquisitionForm.note}
                      onChange={(e) => setAcquisitionForm((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="Notes"
                      className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveAcquisition}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingAcquisitionId ? "Update Acquisition" : "Save Acquisition"}
                      </button>
                      {editingAcquisitionId && (
                        <button
                          onClick={resetAcquisitionForm}
                          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Closing Costs</h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Purchase {formatCurrency(closingCostsPurchaseTotal)} | Sale {formatCurrency(closingCostsSaleTotal)}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Purchase</div>
                          <button
                            onClick={() => handleSeedClosingCosts("purchase")}
                            className="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Load Defaults
                          </button>
                        </div>
                        <div className="space-y-2">
                          {selectedProjectClosingCosts.filter((c) => c.side === "purchase").length === 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">No purchase costs yet.</div>
                          )}
                          {selectedProjectClosingCosts
                            .filter((c) => c.side === "purchase")
                            .map((cost) => (
                              <div key={cost.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cost.paid}
                                  onChange={() => handleToggleClosingCostPaid(cost)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                />
                                <div className={`flex-1 text-sm ${cost.paid ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                                  {cost.label}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-200">{formatCurrency(cost.amount)}</div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditClosingCost(cost)}
                                    className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClosingCost(cost.id)}
                                    className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sale</div>
                          <button
                            onClick={() => handleSeedClosingCosts("sale")}
                            className="text-[11px] px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            Load Defaults
                          </button>
                        </div>
                        <div className="space-y-2">
                          {selectedProjectClosingCosts.filter((c) => c.side === "sale").length === 0 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">No sale costs yet.</div>
                          )}
                          {selectedProjectClosingCosts
                            .filter((c) => c.side === "sale")
                            .map((cost) => (
                              <div key={cost.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={cost.paid}
                                  onChange={() => handleToggleClosingCostPaid(cost)}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                />
                                <div className={`flex-1 text-sm ${cost.paid ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                                  {cost.label}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-200">{formatCurrency(cost.amount)}</div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditClosingCost(cost)}
                                    className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClosingCost(cost.id)}
                                    className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                        Add / Edit Closing Cost
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <select
                          value={closingCostForm.side}
                          onChange={(e) => setClosingCostForm((prev) => ({ ...prev, side: e.target.value as ProjectClosingCost["side"] }))}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="purchase">Purchase</option>
                          <option value="sale">Sale</option>
                        </select>
                        <input
                          type="text"
                          value={closingCostForm.label}
                          onChange={(e) => setClosingCostForm((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="Label"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
                        />
                        <input
                          type="number"
                          value={closingCostForm.amount}
                          onChange={(e) => setClosingCostForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="Amount"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={closingCostForm.paid}
                            onChange={(e) => setClosingCostForm((prev) => ({ ...prev, paid: e.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          Paid
                        </label>
                        <input
                          type="date"
                          value={closingCostForm.paidDate}
                          onChange={(e) => setClosingCostForm((prev) => ({ ...prev, paidDate: e.target.value }))}
                          disabled={!closingCostForm.paid}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          value={closingCostForm.note}
                          onChange={(e) => setClosingCostForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Note"
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={handleSaveClosingCost}
                          className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {editingClosingCostId ? "Update Item" : "Add Item"}
                        </button>
                        {editingClosingCostId && (
                          <button
                            onClick={resetClosingCostForm}
                            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cost Breakdown</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Global categories</span>
                        <select
                          value={activeBreakdownPresetId || ""}
                          onChange={(e) => handleSaveBreakdownPref(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="">Select preset</option>
                          {breakdownPresets.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowCostCategoryManager((prev) => !prev)}
                          className="px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {showCostCategoryManager ? "Hide Manager" : "Manage Categories"}
                        </button>
                        {currentUser?.role === "admin" && (
                          <button
                            onClick={() => setShowBreakdownPresetManager((prev) => !prev)}
                            className="px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {showBreakdownPresetManager ? "Hide Presets" : "Manage Presets"}
                          </button>
                        )}
                      </div>
                    </div>
                    {costBreakdown.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">No costs recorded yet.</div>
                    ) : (
                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-2 py-1 text-left">Category</th>
                              <th className="px-2 py-1 text-right">Base</th>
                              <th className="px-2 py-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {costBreakdown.map((row, idx) => (
                              <tr key={`${row.label}-${idx}`} className={idx % 2 === 0 ? "bg-slate-50/60 dark:bg-slate-800/40" : ""}>
                                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">{row.label}</td>
                                <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-200">
                                  {formatCurrency(row.base)}
                                </td>
                                <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-200">
                                  {formatCurrency(row.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {showCostCategoryManager && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                          Cost Categories (Global)
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <input
                            type="text"
                            value={costCategoryForm.name}
                            onChange={(e) => setCostCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Category name"
                            className="flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={costCategoryForm.code}
                            onChange={(e) => setCostCategoryForm((prev) => ({ ...prev, code: e.target.value }))}
                            placeholder="Code (optional)"
                            className="w-40 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <button
                            onClick={handleSaveCostCategory}
                            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {editingCostCategoryId ? "Update" : "Add"}
                          </button>
                          {editingCostCategoryId && (
                            <button
                              onClick={resetCostCategoryForm}
                              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {costCategories.length === 0 && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">No cost categories yet.</div>
                          )}
                          {costCategories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-2 py-1">
                              <div className="text-sm text-slate-700 dark:text-slate-200">
                                {cat.name}
                                {cat.code ? <span className="ml-2 text-[11px] text-slate-400">{cat.code}</span> : null}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditCostCategory(cat)}
                                  className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteCostCategory(cat.id)}
                                  className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {showBreakdownPresetManager && currentUser?.role === "admin" && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                          Breakdown Presets (Global)
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <input
                            type="text"
                            value={breakdownPresetForm.name}
                            onChange={(e) => setBreakdownPresetForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Preset name"
                            className="flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={breakdownPresetForm.description}
                            onChange={(e) => setBreakdownPresetForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Description"
                            className="flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={breakdownPresetForm.isDefault}
                              onChange={(e) => setBreakdownPresetForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            Default
                          </label>
                          <button
                            onClick={handleSaveBreakdownPreset}
                            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {editingBreakdownPresetId ? "Update" : "Add"}
                          </button>
                          {editingBreakdownPresetId && (
                            <button
                              onClick={resetBreakdownPresetForm}
                              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {breakdownPresets.length === 0 && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">No presets yet.</div>
                          )}
                          {breakdownPresets.map((preset) => (
                            <div key={preset.id} className="rounded border border-slate-200 dark:border-slate-700 p-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-700 dark:text-slate-200">
                                  {preset.name}
                                  {preset.isDefault && <span className="ml-2 text-[11px] text-blue-500">Default</span>}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditBreakdownPreset(preset)}
                                    className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBreakdownPreset(preset.id)}
                                    className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveBreakdownItems(preset.id)}
                                  className="px-2 py-1 text-[11px] rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                  Save Items
                                </button>
                                <button
                                  onClick={() => handleSyncBreakdownItems(preset.id)}
                                  className="px-2 py-1 text-[11px] rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                  Sync Categories
                                </button>
                              </div>
                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(breakdownPresetItems[preset.id] || []).map((item) => {
                                  const cat = costCategories.find((c) => c.id === item.categoryId);
                                  if (!cat) return null;
                                  const draft = breakdownItemDrafts[item.id] || { include: item.include, sortOrder: String(item.sortOrder ?? 0) };
                                  return (
                                    <div key={item.id} className="flex items-center gap-2 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={draft.include}
                                        onChange={(e) =>
                                          setBreakdownItemDrafts((prev) => ({
                                            ...prev,
                                            [item.id]: { include: e.target.checked, sortOrder: draft.sortOrder },
                                          }))
                                        }
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                      />
                                      <span className="flex-1 text-slate-600 dark:text-slate-300">{cat.name}</span>
                                      <input
                                        type="number"
                                        value={draft.sortOrder}
                                        onChange={(e) =>
                                          setBreakdownItemDrafts((prev) => ({
                                            ...prev,
                                            [item.id]: { include: draft.include, sortOrder: e.target.value },
                                          }))
                                        }
                                        className="w-16 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-right dark:border-slate-700 dark:bg-slate-900"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Account Breakdown</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{accountBreakdownRows.length} accounts</span>
                    </div>
                    {accountBreakdownRows.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">No account data yet.</div>
                    ) : (
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-xs uppercase text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-2 py-1 text-left">Account</th>
                              <th className="px-2 py-1 text-right">Income</th>
                              <th className="px-2 py-1 text-right">Outcome</th>
                              <th className="px-2 py-1 text-right">Net</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountBreakdownRows.map((row, idx) => (
                              <tr key={`${row.name}-${idx}`} className={idx % 2 === 0 ? "bg-slate-50/60 dark:bg-slate-800/40" : ""}>
                                <td className="px-2 py-1 text-slate-700 dark:text-slate-200">{row.name}</td>
                                <td className="px-2 py-1 text-right text-green-600 dark:text-green-400">
                                  {formatCurrency(row.income)}
                                </td>
                                <td className="px-2 py-1 text-right text-red-500 dark:text-red-400">
                                  {formatCurrency(row.outcome)}
                                </td>
                                <td className="px-2 py-1 text-right text-slate-700 dark:text-slate-200">
                                  {formatCurrency(row.net)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">KPI Cards</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <select
                          value={activeKpiPresetId || ""}
                          onChange={(e) => handleSaveKpiPref(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="">Select preset</option>
                          {kpiPresets.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {currentUser?.role === "admin" && (
                          <button
                            onClick={() => setShowKpiPresetManager((prev) => !prev)}
                            className="px-2 py-1 rounded border border-slate-200 text-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                          >
                            {showKpiPresetManager ? "Hide Presets" : "Manage Presets"}
                          </button>
                        )}
                      </div>
                    </div>
                    {kpiItems.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">No KPI items yet.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                        {kpiItems.map((item) => {
                          const result = evaluateFormula(item.formula, currentProjectDetails, currentCustomFormulas, kpiVariables);
                          const display = result.error ? "Error" : formatKpiValue(result.value, item.resultType);
                          const scaleColor = !result.error ? getKpiScaleColor(result.value, item) : null;
                          return (
                            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {item.name}
                              </div>
                              <div
                                className={`mt-1 text-lg font-semibold ${result.error ? "text-red-500" : "text-slate-800 dark:text-slate-100"}`}
                                style={scaleColor ? { color: scaleColor } : undefined}
                              >
                                {display}
                              </div>
                              {scaleColor && (
                                <div className="mt-2 h-1 w-full rounded-full" style={{ backgroundColor: scaleColor, opacity: 0.8 }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {showKpiPresetManager && currentUser?.role === "admin" && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                          KPI Presets (Global)
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <input
                            type="text"
                            value={kpiPresetForm.name}
                            onChange={(e) => setKpiPresetForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Preset name"
                            className="flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={kpiPresetForm.description}
                            onChange={(e) => setKpiPresetForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="Description"
                            className="flex-1 min-w-[180px] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={kpiPresetForm.isDefault}
                              onChange={(e) => setKpiPresetForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            Default
                          </label>
                          <button
                            onClick={handleSaveKpiPreset}
                            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {editingKpiPresetId ? "Update" : "Add"}
                          </button>
                          {editingKpiPresetId && (
                            <button
                              onClick={resetKpiPresetForm}
                              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                        <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            KPI Items
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                            <select
                              value={kpiItemForm.presetId || activeKpiPresetId || kpiPresets[0]?.id || ""}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, presetId: e.target.value }))}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-1"
                            >
                              <option value="">Select preset</option>
                              {kpiPresets.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={kpiItemForm.name}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="KPI name"
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
                            />
                            <input
                              type="text"
                              value={kpiItemForm.formula}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, formula: e.target.value }))}
                              onSelect={(e) => {
                                const target = e.currentTarget;
                                kpiFormulaSelectionRef.current = {
                                  start: target.selectionStart ?? 0,
                                  end: target.selectionEnd ?? 0,
                                };
                              }}
                              onClick={(e) => {
                                const target = e.currentTarget;
                                kpiFormulaSelectionRef.current = {
                                  start: target.selectionStart ?? 0,
                                  end: target.selectionEnd ?? 0,
                                };
                              }}
                              onKeyUp={(e) => {
                                const target = e.currentTarget;
                                kpiFormulaSelectionRef.current = {
                                  start: target.selectionStart ?? 0,
                                  end: target.selectionEnd ?? 0,
                                };
                              }}
                              ref={kpiFormulaRef}
                              placeholder="Formula (use {Variable})"
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 md:col-span-2"
                            />
                            <select
                              value={kpiItemForm.resultType}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, resultType: e.target.value as KpiPresetItem["resultType"] }))}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                            >
                              <option value="currency">Currency</option>
                              <option value="percentage">Percentage</option>
                              <option value="number">Number</option>
                            </select>
                            <input
                              type="number"
                              value={kpiItemForm.scaleMin}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, scaleMin: e.target.value }))}
                              placeholder="Min"
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                            />
                            <input
                              type="number"
                              value={kpiItemForm.scaleMax}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, scaleMax: e.target.value }))}
                              placeholder="Max"
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={kpiItemForm.scaleInvert}
                                onChange={(e) => setKpiItemForm((prev) => ({ ...prev, scaleInvert: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              Invert
                            </label>
                            <input
                              type="number"
                              value={kpiItemForm.sortOrder}
                              onChange={(e) => setKpiItemForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                              placeholder="Order"
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right dark:border-slate-700 dark:bg-slate-900"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={kpiItemForm.enabled}
                                onChange={(e) => setKpiItemForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              Enabled
                            </label>
                            <button
                              onClick={handleSaveKpiItem}
                              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              {editingKpiItemId ? "Update Item" : "Add Item"}
                            </button>
                            {editingKpiItemId && (
                              <button
                                onClick={resetKpiItemForm}
                                className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {kpiPresets.length === 0 && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">No KPI presets yet.</div>
                          )}
                          {kpiPresets.map((preset) => (
                            <div key={preset.id} className="rounded border border-slate-200 dark:border-slate-700 p-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-700 dark:text-slate-200">
                                  {preset.name}
                                  {preset.isDefault && <span className="ml-2 text-[11px] text-blue-500">Default</span>}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditKpiPreset(preset)}
                                    className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteKpiPreset(preset.id)}
                                    className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 space-y-2">
                                {(kpiPresetItems[preset.id] || []).map((item) => (
                                  <div key={item.id} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs">
                                    <div>
                                      <div className="text-slate-700 dark:text-slate-200">{item.name}</div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditKpiItem(item)}
                                        className="px-2 py-1 text-[11px] rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteKpiItem(item.id)}
                                        className="px-2 py-1 text-[11px] rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 rounded border border-slate-200 dark:border-slate-700 p-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Available Variables
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            Use `{`Variable`}` in formulas. Includes project details, custom formulas, tax rates, activity metrics, and category totals.
                          </div>
                          <div className="max-h-48 overflow-y-auto flex flex-wrap gap-2">
                            {kpiAvailableVariables.map((name) => (
                              <span
                                key={name}
                                onClick={() => handleInsertKpiVariable(name)}
                                className="px-2 py-1 rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 text-[11px]"
                                title={`{${name}}`}
                              >
                                {`{${name}}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Project Ledger</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{projectTransactions.length} txns</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Track income and expenses by category and activity.</p>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        onClick={() => setActivityView("ledger")}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open Ledger
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{ledgerCategories.length} categories</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Utilities</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProjectUtilities.length} entries</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Log utility bills and recurring services per project.</p>
                    <div className="mt-auto">
                      <button
                        onClick={() => setActivityView("utilities")}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open Utilities
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Draws</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProjectDraws.length} entries</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Track lender draws and usage against the loan.</p>
                    <div className="mt-auto">
                      <button
                        onClick={() => setActivityView("draws")}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open Draws
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Loans</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProjectLoans.length} entries</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Model loan balances, payments, and interest schedule.</p>
                    <div className="mt-auto">
                      <button
                        onClick={() => setActivityView("loans")}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open Loans
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Property Taxes</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selectedProjectTaxes.length} entries</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Track annual tax bills and payments by parcel.</p>
                    <div className="mt-auto">
                      <button
                        onClick={() => setActivityView("taxes")}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Open Property Taxes
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {activityView === "ledger" && (
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col flex-1 min-h-0 overflow-hidden">
                  <ProjectLedger
                    projectId={activeProjectDbId ?? activeProject.id}
                    activities={projectActivities}
                    transactions={projectTransactions}
                    categories={ledgerCategories}
                    accounts={ledgerAccounts}
                    onAddTransaction={(t) => handleAddTransaction(t, activeProjectDbId ?? undefined)}
                    onUpdateTransaction={(t) => handleUpdateTransaction(t, activeProjectDbId ?? undefined)}
                    onDeleteTransaction={(id) => handleDeleteTransaction(id, activeProjectDbId ?? undefined)}
                    isOpen
                    setIsOpen={() => {}}
                    draftActivityId={quickLedgerActivityId}
                    setDraftActivityId={setQuickLedgerActivityId}
                    displayMode="inline"
                    containerClassName="flex flex-col flex-1 min-h-0"
                  />
                </div>
              )}

              {activityView === "utilities" && (
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Utilities</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Track utility bills and recurring services for this project.</p>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Total: <span className="font-semibold">{formatCurrency(selectedProjectUtilities.reduce((sum, u) => sum + (u.amount || 0), 0))}</span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Date
                        <input
                          type="date"
                          value={utilityForm.date}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Service
                        <input
                          type="text"
                          value={utilityForm.service}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, service: e.target.value }))}
                          placeholder="Water, Electric"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Provider
                        <input
                          type="text"
                          value={utilityForm.provider}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, provider: e.target.value }))}
                          placeholder="Provider"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Account
                        <select
                          value={utilityForm.accountId}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, accountId: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select</option>
                          {ledgerAccounts.map((acct) => (
                            <option key={acct.id} value={acct.id}>{acct.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Amount
                        <input
                          type="number"
                          value={utilityForm.amount}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
                        Note
                        <input
                          type="text"
                          value={utilityForm.note}
                          onChange={(e) => setUtilityForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Note"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleSaveUtility}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingUtilityId ? "Update Utility" : "Add Utility"}
                      </button>
                      {editingUtilityId && (
                        <button
                          onClick={resetUtilityForm}
                          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedProjectUtilities.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No utilities recorded yet.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Service</th>
                            <th className="px-4 py-2 text-left">Provider</th>
                            <th className="px-4 py-2 text-left">Account</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-left">Note</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProjectUtilities
                            .slice()
                            .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
                            .map((u, idx) => (
                              <tr key={u.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"}>
                                <td className="px-4 py-2">{u.date}</td>
                                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{u.service}</td>
                                <td className="px-4 py-2">{u.provider || "-"}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                  {u.accountName || ledgerAccounts.find((acct) => acct.id === u.accountId)?.name || "-"}
                                </td>
                                <td className="px-4 py-2 text-right">{formatCurrency(u.amount)}</td>
                                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{u.note || "-"}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => handleEditUtility(u)}
                                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUtility(u.id)}
                                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activityView === "draws" && (
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Draws</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Track lender draws and usage against the loan.</p>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Total: <span className="font-semibold">{formatCurrency(selectedProjectDraws.reduce((sum, d) => sum + (d.amount || 0), 0))}</span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Date
                        <input
                          type="date"
                          value={drawForm.date}
                          onChange={(e) => setDrawForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
                        Description
                        <input
                          type="text"
                          value={drawForm.description}
                          onChange={(e) => setDrawForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Description"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Account
                        <select
                          value={drawForm.accountId}
                          onChange={(e) => setDrawForm((prev) => ({ ...prev, accountId: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select</option>
                          {ledgerAccounts.map((acct) => (
                            <option key={acct.id} value={acct.id}>{acct.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Amount
                        <input
                          type="number"
                          value={drawForm.amount}
                          onChange={(e) => setDrawForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
                        Note
                        <input
                          type="text"
                          value={drawForm.note}
                          onChange={(e) => setDrawForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Note"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleSaveDraw}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingDrawId ? "Update Draw" : "Add Draw"}
                      </button>
                      {editingDrawId && (
                        <button
                          onClick={resetDrawForm}
                          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedProjectDraws.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No draws recorded yet.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Description</th>
                            <th className="px-4 py-2 text-left">Account</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-left">Note</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProjectDraws
                            .slice()
                            .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
                            .map((d, idx) => (
                              <tr key={d.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"}>
                                <td className="px-4 py-2">{d.date}</td>
                                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{d.description}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                  {d.accountName || ledgerAccounts.find((acct) => acct.id === d.accountId)?.name || "-"}
                                </td>
                                <td className="px-4 py-2 text-right">{formatCurrency(d.amount)}</td>
                                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{d.note || "-"}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => handleEditDraw(d)}
                                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDraw(d.id)}
                                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activityView === "loans" && (
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Loan Balance</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Track payments, interest, principal, and balance.</p>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Paid: <span className="font-semibold">{formatCurrency(selectedProjectLoans.reduce((sum, l) => sum + (l.payment || 0), 0))}</span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Date
                        <input
                          type="date"
                          value={loanForm.date}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Origination
                        <input
                          type="date"
                          value={loanForm.originationDate}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, originationDate: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Payment
                        <input
                          type="number"
                          value={loanForm.payment}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, payment: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Interest
                        <input
                          type="number"
                          value={
                            loanFormBreakdown.isFirstPayment
                              ? loanForm.interest
                              : (loanFormBreakdown.interest !== null ? String(loanFormBreakdown.interest) : "")
                          }
                          onChange={
                            loanFormBreakdown.isFirstPayment
                              ? (e) => setLoanForm((prev) => ({ ...prev, interest: e.target.value }))
                              : undefined
                          }
                          placeholder={loanFormBreakdown.isFirstPayment ? "0.00" : "Auto"}
                          readOnly={!loanFormBreakdown.isFirstPayment}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Principal
                        <input
                          type="number"
                          value={
                            loanFormBreakdown.isFirstPayment
                              ? loanForm.principal
                              : (loanFormBreakdown.principal !== null ? String(loanFormBreakdown.principal) : "")
                          }
                          onChange={
                            loanFormBreakdown.isFirstPayment
                              ? (e) => setLoanForm((prev) => ({ ...prev, principal: e.target.value }))
                              : undefined
                          }
                          placeholder={loanFormBreakdown.isFirstPayment ? "0.00" : "Auto"}
                          readOnly={!loanFormBreakdown.isFirstPayment}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Account
                        <select
                          value={loanForm.accountId}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, accountId: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="">Select</option>
                          {ledgerAccounts.map((acct) => (
                            <option key={acct.id} value={acct.id}>{acct.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Balance
                        <input
                          type="number"
                          value={loanForm.balance}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, balance: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 md:col-span-2">
                        Note
                        <input
                          type="text"
                          value={loanForm.note}
                          onChange={(e) => setLoanForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Note"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Interest and principal auto-calculate from the prior balance for the selected account.
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleSaveLoan}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingLoanId ? "Update Entry" : "Add Entry"}
                      </button>
                      {editingLoanId && (
                        <button
                          onClick={resetLoanForm}
                          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedProjectLoans.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No loan entries recorded yet.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Origination</th>
                            <th className="px-4 py-2 text-right">Payment</th>
                            <th className="px-4 py-2 text-right">Interest</th>
                            <th className="px-4 py-2 text-right">Principal</th>
                            <th className="px-4 py-2 text-left">Account</th>
                            <th className="px-4 py-2 text-right">Balance</th>
                            <th className="px-4 py-2 text-left">Note</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProjectLoans
                            .slice()
                            .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
                            .map((l, idx) => (
                              <tr key={l.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"}>
                                <td className="px-4 py-2">{l.date}</td>
                                <td className="px-4 py-2">{l.originationDate || "-"}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(l.payment)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(l.interest)}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(l.principal)}</td>
                                <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                  {l.accountName || ledgerAccounts.find((acct) => acct.id === l.accountId)?.name || "-"}
                                </td>
                                <td className="px-4 py-2 text-right">{l.balance === null || l.balance === undefined ? "-" : formatCurrency(l.balance)}</td>
                                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{l.note || "-"}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => handleEditLoan(l)}
                                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLoan(l.id)}
                                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activityView === "taxes" && (
                <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col h-full overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Property Taxes</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Track tax bills and paid status per project.</p>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      Due: <span className="font-semibold">{formatCurrency(selectedProjectTaxes.filter((t) => t.status !== "paid").reduce((sum, t) => sum + (t.amount || 0), 0))}</span>
                    </div>
                  </div>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Tax Year
                        <input
                          type="number"
                          value={taxForm.taxYear}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, taxYear: e.target.value }))}
                          placeholder="YYYY"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Due Date
                        <input
                          type="date"
                          value={taxForm.dueDate}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400 text-right">
                        Amount
                        <input
                          type="number"
                          value={taxForm.amount}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-right text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Status
                        <select
                          value={taxForm.status}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, status: e.target.value as ProjectPropertyTax["status"] }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="due">Due</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Paid Date
                        <input
                          type="date"
                          value={taxForm.paidDate}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, paidDate: e.target.value }))}
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          disabled={taxForm.status !== "paid"}
                        />
                      </label>
                      <label className="text-xs text-slate-500 dark:text-slate-400">
                        Note
                        <input
                          type="text"
                          value={taxForm.note}
                          onChange={(e) => setTaxForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="Note"
                          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={handleSaveTax}
                        className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {editingTaxId ? "Update Tax" : "Add Tax"}
                      </button>
                      {editingTaxId && (
                        <button
                          onClick={resetTaxForm}
                          className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedProjectTaxes.length === 0 ? (
                      <div className="p-6 text-sm text-slate-500 dark:text-slate-400">No property taxes recorded yet.</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-2 text-left">Tax Year</th>
                            <th className="px-4 py-2 text-left">Due Date</th>
                            <th className="px-4 py-2 text-right">Amount</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Paid Date</th>
                            <th className="px-4 py-2 text-left">Note</th>
                            <th className="px-4 py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProjectTaxes
                            .slice()
                            .sort((a, b) => toDateMs(b.dueDate) - toDateMs(a.dueDate))
                            .map((t, idx) => (
                              <tr key={t.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800"}>
                                <td className="px-4 py-2">{t.taxYear}</td>
                                <td className="px-4 py-2">{t.dueDate}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(t.amount)}</td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${t.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : t.status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2">{t.paidDate || "-"}</td>
                                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{t.note || "-"}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="inline-flex gap-2">
                                    <button
                                      onClick={() => handleEditTax(t)}
                                      className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTax(t.id)}
                                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {activityView === "details" && (
              <div className="overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
                  <div className="flex justify-between items-center p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      Activity Details
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Cost: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(totalActualCost)}</span>
                      </div>
                      <button
                        onClick={handleStartNewActivity}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <IconAdd /> New Activity
                      </button>
                    </div>
                  </div>

                  {projectActivities.length === 0 ? (
                    <div className="text-center p-10 text-slate-500">
                      <p className="mb-4">No activities defined for this project.</p>
                      <button
                        onClick={handleStartNewActivity}
                        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Create First Activity
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">ID</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">WBS</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">Name</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-center dark:border-slate-600">Dur</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">Start</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">Finish</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-center dark:border-slate-600">%</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-center dark:border-slate-600">Resources</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-right dark:border-slate-600">Budget</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-right dark:border-slate-600">Res. Cost</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-right dark:border-slate-600">Actual</th>
                            <th className="border-r border-slate-300 px-3 py-2 text-left dark:border-slate-600">Resp.</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectActivities.map((activity, idx) => {
                            const { actualLaborCost, actualMaterialCost } = calculateActivityActuals(activity.id, projectTransactions);
                            const resourceCost = calculateResourceCost(activity.resources, resources);

                            return (
                              <tr
                                key={activity.id}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  handleContextMenu(e.clientX, e.clientY, null, activity, 'activity');
                                }}
                                className={`text-sm ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}
                              >
                                <td className={`border-r border-slate-200 px-3 py-2 font-mono text-xs text-slate-500 dark:border-slate-700 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {activity.id}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'wbs', value: activity.wbs })}
                                  className={`border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-400 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'wbs' ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'wbs', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'wbs', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded"
                                    />
                                  ) : activity.wbs}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'name', value: activity.name })}
                                  className={`border-r border-slate-200 px-3 py-2 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'name' ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'name', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'name', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded"
                                    />
                                  ) : activity.name}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'duration', value: activity.duration.toString() })}
                                  className={`border-r border-slate-200 px-3 py-2 text-center text-slate-600 dark:border-slate-700 dark:text-slate-400 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'duration' ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'duration', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'duration', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded text-center"
                                    />
                                  ) : `${activity.duration}d`}
                                </td>
                                <td className={`border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-400 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {activity.start}
                                </td>
                                <td className={`border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-400 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {activity.finish}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'pct', value: activity.pct.toString() })}
                                  className={`border-r border-slate-200 px-3 py-2 text-center text-blue-600 dark:border-slate-700 dark:text-blue-400 font-bold cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'pct' ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'pct', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'pct', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded text-center"
                                    />
                                  ) : `${activity.pct}%`}
                                </td>
                                <td className={`border-r border-slate-200 px-3 py-2 text-center dark:border-slate-700 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {activity.resources.length > 0 ? (
                                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium">
                                      {activity.resources.length}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'budget', value: activity.budget.toString() })}
                                  className={`border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'budget' ? (
                                    <input
                                      autoFocus
                                      type="number"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'budget', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'budget', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded text-right"
                                    />
                                  ) : formatCurrency(activity.budget)}
                                </td>
                                <td className={`border-r border-slate-200 px-3 py-2 text-right font-medium text-slate-800 dark:border-slate-700 dark:text-slate-200 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {formatCurrency(resourceCost)}
                                </td>
                                <td className={`border-r border-slate-200 px-3 py-2 text-right font-medium text-red-600 dark:border-slate-700 dark:text-red-400 ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  {formatCurrency(actualLaborCost + actualMaterialCost)}
                                </td>
                                <td
                                  onClick={() => setEditingCell({ activityId: activity.id, field: 'responsible', value: activity.responsible })}
                                  className={`border-r border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-400 cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/30 ${ACTIVITY_ROW_HEIGHT_CLASS}`}
                                >
                                  {editingCell?.activityId === activity.id && editingCell.field === 'responsible' ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      value={editingCell.value}
                                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                      onBlur={() => { handleUpdateActivity(activity.id, 'responsible', editingCell.value); setEditingCell(null); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateActivity(activity.id, 'responsible', editingCell.value); setEditingCell(null); } else if (e.key === 'Escape') { setEditingCell(null); } }}
                                      className="w-full bg-transparent outline-none ring-1 ring-blue-500 px-1 rounded"
                                    />
                                  ) : activity.responsible}
                                </td>
                                <td className={`px-3 py-2 text-xs font-semibold ${
                                  activity.status === 'Completed' ? 'text-green-600' :
                                  activity.status === 'In Progress' ? 'text-amber-600' : 'text-slate-600'
                                } ${ACTIVITY_ROW_HEIGHT_CLASS}`}>
                                  <select
                                    value={activity.status}
                                    onChange={(e) => handleUpdateActivity(activity.id, 'status', e.target.value)}
                                    className="bg-transparent border-none outline-none dark:text-slate-200 w-full"
                                  >
                                    <option value="Not Started">Not Started</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                )}

                {activityView === "gantt" && (
                <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-md flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <IconGantt />
                        Gantt Chart
                      </h3>
                      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <button
                          type="button"
                          aria-pressed={ganttCreateMode}
                          onClick={() => setGanttCreateMode((prev) => !prev)}
                          className={`p-2 rounded-md transition border ${ganttCreateMode ? "bg-emerald-100 border-emerald-300 text-emerald-700 shadow-inner dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200" : "bg-white border-transparent text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"}`}
                          title="Click, then left-click + drag on the chart to create a new activity"
                        >
                          <IconMarqueePlus />
                        </button>
                      </div>
                      {ganttCreateMode && (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700">
                          Draw mode active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Drag bars to move or resize. Use the green marquee icon to draw a new activity. Hold middle mouse to pan.</span>
                  </div>
                  <GanttChart
                    activities={projectActivities}
                    onUpdateDates={handleUpdateActivityDates}
                    onOpenContextMenu={handleGanttMenuOpen}
                    selectedId={selectedActivityId}
                    onSelect={setSelectedActivityId}
                    dragging={draggingActivity}
                    setDragging={setDraggingActivity}
                    creationMode={ganttCreateMode}
                    onCreateRange={handleGanttCreateRange}
                  />
                </div>
                )}
              </div>
            </div>

            {activityView !== "ledger" && (
              <ProjectLedger
                projectId={activeProjectDbId ?? activeProject.id}
                activities={projectActivities}
                transactions={projectTransactions}
                categories={ledgerCategories}
                accounts={ledgerAccounts}
                onAddTransaction={(t) => handleAddTransaction(t, activeProjectDbId ?? undefined)}
                onUpdateTransaction={(t) => handleUpdateTransaction(t, activeProjectDbId ?? undefined)}
                onDeleteTransaction={(id) => handleDeleteTransaction(id, activeProjectDbId ?? undefined)}
                isOpen={ledgerOpen}
                setIsOpen={setLedgerOpen}
                draftActivityId={quickLedgerActivityId}
                setDraftActivityId={setQuickLedgerActivityId}
              />
            )}
          </main>

          <ProjectDetailsPanel
            projectId={activeProject.id}
            details={currentProjectDetails}
            onUpdate={handleUpdateProjectDetails}
            onAutoPopulate={handleAutoPopulateProjectDetails}
            isVisible={isDetailsPanelVisible}
            onToggle={() => setIsDetailsPanelVisible(prev => !prev)}
          />
        </div>

        {contextMenu.type && (
          <ContextMenu
            state={contextMenu}
            onClose={() => setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null })}
            onAdd={handleStartAdd}
            onRename={handleStartRename}
            onDelete={contextMenu.type === 'eps' ? handleDeleteNode : handleDeleteActivity}
            onDuplicate={contextMenu.type === 'eps' ? handleDuplicateNode : handleDuplicateActivity}
            onAddResources={handleOpenResourceAssignment}
          />
        )}

        <NewActivityDialog
          open={newActivityDialog}
          projectId={activeProject.id}
          existingActivities={projectActivities}
          allResources={resources}
          initialStart={newActivityDraft?.start}
          initialDuration={draftDuration}
          onClose={closeNewActivityDialog}
          onConfirm={(activity) => {
            handleAddActivity(activity);
            setNewActivityDraft(null);
          }}
        />

        <ResourceAssignmentDialog
          open={resourceAssignmentDialog}
          onClose={() => { setResourceAssignmentDialog(false); setActivityForResources(null); }}
          activity={activityForResources}
          allResources={resources}
          onSave={handleSaveActivityResources}
        />

        <CustomFormulaDialog
          open={formulaDialogOpen}
          onClose={() => { setFormulaDialogOpen(false); setEditingFormula(null); }}
          onSave={handleSaveFormula}
          onSavePreset={handleSaveFormulaPreset}
          editingFormula={editingFormula}
          projectDetails={currentProjectDetails}
          existingFormulas={currentCustomFormulas}
          taxRates={taxRates}
        />

        <TaxRatesDialog
          open={taxRateDialogOpen}
          onClose={() => setTaxRateDialogOpen(false)}
          taxRates={taxRates}
          onSave={handleSaveTaxRate}
          onDelete={handleDeleteTaxRate}
        />

        <FormulaPresetDialog
          open={formulaPresetDialogOpen}
          onClose={() => setFormulaPresetDialogOpen(false)}
          presets={formulaPresets}
          onDelete={handleDeletePreset}
        />

        <PresetPicker
          open={presetPickerOpen}
          onClose={() => setPresetPickerOpen(false)}
          presets={formulaPresets}
          onApply={handleApplyPresetToProject}
        />

        <EditModal
          mode={modalMode}
          title={modalMode === "add" ? "Add EPS Node" : "Rename EPS Node"}
          label="Name"
          value={modalValue}
          open={!!modalMode}
          onChange={setModalValue}
          onCancel={handleCancelEdit}
          onConfirm={modalMode === "add" ? handleConfirmAdd : handleConfirmRename}
        />

        {ganttMenu.activity && (
          <div className="fixed inset-0 z-50" onClick={closeGanttMenu}>
            <div
              className="absolute bg-white dark:bg-slate-800 rounded shadow-lg border border-slate-200 dark:border-slate-700 text-sm overflow-hidden"
              style={{ top: ganttMenu.y, left: ganttMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700">
                {ganttMenu.activity.name}
              </div>
              <button className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={handleGanttAddExpense}>Add Expense</button>
              <button className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={handleGanttAssignResources}>Assign Resources</button>
                  <button className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={handleGanttAddPredecessor}>Add Predecessor</button>
              <button className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={handleGanttAddSuccessor}>Add Successor</button>
              <button className="block w-full px-3 py-2 text-left text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={handleGanttDelete}>Delete Activity</button>
            </div>
          </div>
        )}

        {dependencyModal.open && dependencyModal.activity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDependencyModal({ open: false, mode: "pred", activity: null, targetId: "" })}>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-96 p-4" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {dependencyModal.mode === "pred" ? "Add Predecessor" : "Add Successor"} for {dependencyModal.activity.name}
              </h4>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Select activity</label>
              <select
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-2 text-slate-800 dark:text-slate-100"
                value={dependencyModal.targetId}
                onChange={(e) => setDependencyModal(prev => ({ ...prev, targetId: e.target.value }))}
              >
                <option value="">-- Choose activity --</option>
                {projectActivities
                  .filter(a => a.id !== dependencyModal.activity?.id)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.wbs} - {a.name}
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setDependencyModal({ open: false, mode: "pred", activity: null, targetId: "" })}
                  className="px-3 py-1 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  disabled={!dependencyModal.targetId}
                  onClick={() => {
                    const target = dependencyModal.targetId;
                    if (dependencyModal.activity && target) {
                      if (dependencyModal.mode === "pred") {
                        handleSetPredecessor(dependencyModal.activity.id, target);
                      } else {
                        handleSetSuccessor(dependencyModal.activity.id, target);
                      }
                    }
                    setDependencyModal({ open: false, mode: "pred", activity: null, targetId: "" });
                  }}
                  className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteActivityModal.open && deleteActivityModal.activity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteActivityModal({ open: false, activity: null, targetId: "" })}>
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Delete activity</h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Delete <span className="font-semibold">{deleteActivityModal.activity.name}</span>? You can reassign its transactions to another activity or leave them unassigned.
              </p>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Reassign transactions to</label>
              <select
                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm p-2 text-slate-800 dark:text-slate-100"
                value={deleteActivityModal.targetId}
                onChange={(e) => setDeleteActivityModal((prev) => ({ ...prev, targetId: e.target.value }))}
              >
                <option value="">-- Leave unassigned --</option>
                {projectActivities
                  .filter(a => a.id !== deleteActivityModal.activity?.id)
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.wbs} - {a.name}
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setDeleteActivityModal({ open: false, activity: null, targetId: "" })}
                  className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteActivity}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <LedgerCategoriesDialog
          open={ledgerCategoryDialogOpen}
          onClose={() => setLedgerCategoryDialogOpen(false)}
          categories={ledgerCategories}
          onCreate={handleCreateLedgerCategory}
          onUpdate={handleUpdateLedgerCategory}
          onDelete={handleDeleteLedgerCategory}
        />

        <LedgerAccountsDialog
          open={accountsDialogOpen}
          onClose={() => setAccountsDialogOpen(false)}
          accounts={ledgerAccounts}
          onSave={handleSaveLedgerAccount}
          onDelete={handleDeleteLedgerAccount}
        />
      </div>
    );
  }
  if (mode === "Activities") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Project link is missing.</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Recreate or relink the project node to a valid project before using Activities.</div>
          <button
            onClick={() => setMode("EPS")}
            className="mt-2 px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Back to EPS
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EPS MODE - Default view
  // ---------------------------------------------------------------------------
  const projectStats = (selectedNode && selectedNode.type === "project") ? calculateProjectStats(selectedProjectActivities, selectedProjectTransactions) : null;
  const projectFinancials = (selectedNode && selectedNode.type === "project") ? calculateFinancialKPIs(selectedProjectActivities, selectedProjectTransactions) : null;

  const allActivitiesFlat = Object.values(activities).flat();
  const allTransactionsFlat = Object.values(transactions).flat();

  const globalOverallProgressValue = allActivitiesFlat.reduce((sum, a) => sum + a.pct, 0) / Math.max(allActivitiesFlat.length, 1);
  const globalOverallProgressDisplay = globalOverallProgressValue.toFixed(1);

  const globalStats = calculateProjectStats(allActivitiesFlat, allTransactionsFlat);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TopBar
        title="EPS"
        currentMode={mode}
        onModeChange={setMode}
        currentUser={currentUser}
        activeUsers={activeUsers}
        notifications={notifications}
        onNotificationClick={handleNotificationClick}
        onNotificationDismiss={handleNotificationDismiss}
        onNotificationRead={handleNotificationRead}
        onNotificationUnread={handleNotificationUnread}
        readNotificationIds={readNotifications}
        toastItems={toastItems}
        closingToastIds={closingToastIds}
        onToastClick={handleToastClick}
        onToastDismiss={handleNotificationDismiss}
        onLogout={handleLogout}
        onOpenCommit={openCommitModal}
        commitDraftCount={commitDraftCount}
      />
      <ActionRibbon
        onOpenTaxRates={() => setTaxRateDialogOpen(true)}
        onManagePresets={() => setFormulaPresetDialogOpen(true)}
        onCreateFormula={handleCreateFormula}
        onAddPresetToProject={openPresetPicker}
        onManageAccounts={() => setAccountsDialogOpen(true)}
        taxRateCount={taxRates.length}
        presetCount={formulaPresets.length}
        accountCount={ledgerAccounts.length}
        hasActiveProject={!!resolveActiveProjectId()}
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 flex flex-col flex-shrink-0">
          <div className="border-b border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Enterprise Project Structure
            </h3>
          </div>
          <div
            className="flex-1 overflow-y-auto p-2"
            onContextMenu={(e) => {
              const isNode = (e.target as HTMLElement).closest("[data-eps-node]");
              if (isNode) return;
              e.preventDefault();
              handleContextMenu(e.clientX, e.clientY, null, null, "eps");
            }}
          >
            {treeNodes.map((node) => (
              <EpsNodeComponent
                key={node.id}
                node={node}
                depth={0}
                selectedNodeId={selectedNodeId}
                expanded={expanded}
                onNodeClick={handleNodeClick}
                onContextMenu={handleContextMenu}
                onToggleExpand={handleToggleExpand}
                pipelineMetaMap={pipelineMeta}
              />
            ))}
            {!treeNodes.length && (
              <div className="p-4 text-center text-sm text-slate-500">
                No Enterprise nodes. Right-click to add one.
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex rounded-full bg-slate-200/70 dark:bg-slate-800/70 p-1">
              <button
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${epsViewTab === "overview" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-300"}`}
                onClick={() => setEpsViewTab("overview")}
              >
                Overview
              </button>
              <button
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${epsViewTab === "gantt" ? "bg-blue-600 text-white shadow" : "text-slate-600 dark:text-slate-300"}`}
                onClick={() => setEpsViewTab("gantt")}
              >
                Company Gantt
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {selectedCompany
                ? `${companyProjects.length} project${companyProjects.length === 1 ? "" : "s"} in ${selectedCompany.name}`
                : "Select a company to view its project span"}
            </div>
          </div>

          {epsViewTab === "overview" ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:col-span-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
                Global Enterprise Overview
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Activities</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {allActivitiesFlat.length}
                  </div>
                </div>
                <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Overall Progress</div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {globalOverallProgressDisplay}%
                  </div>
                </div>
                <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Actual Cost</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(globalStats.totalActualCost)}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
              {selectedNode && (
                <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                    {selectedNode.name}
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Type:</span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-slate-50">
                        {PRETTY_TYPE[selectedNode.type]}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">ID:</span>
                      <span className="ml-2 font-mono text-slate-900 dark:text-slate-50">
                        {selectedNode.id.toString().padStart(6, "0")}
                      </span>
                    </div>
                  </div>
                  {selectedNode.type === "project" && (
                    <>
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Status:</span>
                        <div className="inline-flex rounded-full bg-slate-200/60 dark:bg-slate-800/60 p-1 text-xs">
                          <button
                            onClick={() => selectedProjectDbId && handleProjectStatusChange(selectedProjectDbId, "under_contract")}
                            className={`px-3 py-1 rounded-full ${selectedProjectDbId && pipelineMeta[selectedProjectDbId]?.status === "under_contract" ? "bg-amber-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            Not Acquired
                          </button>
                          <button
                            onClick={() => selectedProjectDbId && handleProjectStatusChange(selectedProjectDbId, "acquired")}
                            className={`px-3 py-1 rounded-full ${selectedProjectDbId && pipelineMeta[selectedProjectDbId]?.status === "acquired" ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            Acquired
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => selectedProjectDbId && handleProjectSelect(selectedProjectDbId)}
                        className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Open Project View
                      </button>
                    </>
                  )}
                </div>
              )}

              {selectedNode && selectedNode.type === "project" && (
                <ProjectAnalysisPanel
                  projectDetails={selectedProjectDetails}
                  projectActivities={selectedProjectActivities}
                  projectTransactions={selectedProjectTransactions}
                  customFormulas={selectedCustomFormulas}
                  onEditFormula={(formula) => {
                    if (selectedProjectDbId) setActiveProjectId(selectedProjectDbId);
                    handleEditFormula(formula);
                  }}
                  onDeleteFormula={(formulaId) => {
                    const confirmed = window.confirm("Delete this formula?");
                    if (confirmed) {
                      setCustomFormulas(prev => ({
                        ...prev,
                        [selectedProjectDbId || selectedNode.id]: (prev[selectedProjectDbId || selectedNode.id] || []).filter(f => f.id !== formulaId)
                      }));
                    }
                  }}
                  onCreateFormula={() => {
                    if (selectedProjectDbId) setActiveProjectId(selectedProjectDbId);
                    handleCreateFormula();
                  }}
                  onAddPreset={() => {
                    if (selectedProjectDbId) setActiveProjectId(selectedProjectDbId);
                    setPresetPickerOpen(true);
                  }}
                  taxRates={taxRates}
                />
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
                  {projectStats ? "Project Stats" : "Global Stats"}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Activities</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {projectStats ? projectStats.totalActivities : globalStats.totalActivities}
                    </div>
                  </div>
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Projected Labor (Hours)</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {projectStats ? projectStats.projectedLabor : globalStats.projectedLabor}h
                    </div>
                  </div>
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Projected Cost (Materials)</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(projectStats ? projectStats.projectedCost : globalStats.projectedCost)}
                    </div>
                  </div>
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actual Labor Cost</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(projectStats ? projectStats.actualLaborCost : globalStats.actualLaborCost)}
                    </div>
                  </div>
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actual Material Cost</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(projectStats ? projectStats.actualMaterialCost : globalStats.actualMaterialCost)}
                    </div>
                  </div>
                  <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Actual Cost</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(projectStats ? projectStats.totalActualCost : globalStats.totalActualCost)}
                    </div>
                  </div>
                </div>
              </div>

              {projectFinancials && (
                <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-3">
                    Financial Key Performance Indicators
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Budget</div>
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(projectFinancials.totalBudget)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Revenue</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(projectFinancials.totalRevenue)}
                      </div>
                    </div>
                    <div className="rounded bg-slate-50 p-3 dark:bg-slate-900">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actual Cost</div>
                      <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(projectFinancials.totalActualCost)}
                      </div>
                    </div>
                    <div className={`rounded p-3 dark:bg-slate-900 ${projectFinancials.profit > 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Profit / (Loss)</div>
                      <div className={`text-xl font-bold ${projectFinancials.profit > 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                        {formatCurrency(projectFinancials.profit)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="rounded-lg border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Company Portfolio Gantt</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Spanning all projects within the selected company.</p>
                </div>
                {selectedNode?.type === "company" && companyProjectSpans.length > 0 && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {companyProjectSpans.length} project bars
                  </div>
                )}
              </div>
              <div className="p-4">
              {!selectedCompany && (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Select a company to see its project timelines.
                </div>
              )}
              {selectedCompany && companyProjectSpans.length === 0 && (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  No activities scheduled for projects in this company yet.
                </div>
              )}
                  {selectedCompany && companyProjectSpans.length > 0 && (
                    <div
                    ref={companyGanttRef}
                    className="relative rounded-md border border-slate-200 dark:border-slate-700 bg-slate-900 p-3 overflow-auto cursor-grab"
                    data-company-scroll
                    style={{ maxHeight: "calc(100vh - 300px)", scrollbarWidth: "none", msOverflowStyle: "none" }}
                    onPointerDown={handleCompanyPanStart}
                    onPointerMove={handleCompanyPanMove}
                    onPointerUp={handleCompanyPanEnd}
                    onPointerCancel={handleCompanyPanEnd}
                    onPointerLeave={handleCompanyPanEnd}
                    onScroll={updateCompanyThumb}
                  >
                    <div className="relative h-8 border-b border-slate-700/60">
                      {epsMonths.map((m, idx) => {
                        const left = epsDateToXPct(m.start);
                        const right = epsDateToXPct(m.end);
                        const width = Math.max(2, right - left);
                        return (
                          <div
                            key={`${m.label}-${idx}`}
                            className="absolute top-0 bottom-0 border-r border-slate-700/60"
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <div className="text-[11px] font-semibold text-slate-200 text-center pt-1">
                              {m.label.toUpperCase()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="relative h-8 border-b border-slate-700/60">
                      {epsDays.filter((_, i) => i % epsDayStep === 0).map((d) => {
                        const x = epsDateToXPct(d.ms);
                        return (
                          <div key={d.ms} className="absolute top-0 bottom-0" style={{ left: `${x}%` }}>
                            <div className="absolute top-0 bottom-0 border-l border-slate-700/40 left-1/2" />
                            <div className="text-[10px] text-slate-300 text-center -translate-x-1/2">{d.day}</div>
                            <div className="text-[9px] text-slate-500 text-center -translate-x-1/2 mt-0.5">
                              {d.month[0]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="relative" style={{ minHeight: Math.max(companyProjectSpans.length * 36 + 40, 160) }}>
                      {epsDays.filter((_, i) => i % epsDayStep === 0).map((d) => (
                        <div
                          key={`grid-${d.ms}`}
                          className="absolute top-0 bottom-0 border-l border-slate-800"
                          style={{ left: `${epsDateToXPct(d.ms)}%` }}
                        />
                      ))}
                      {centralTodayMs >= epsGanttTimeline.start && centralTodayMs <= epsGanttTimeline.end && (
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-red-500/60"
                      style={{ left: `${epsDateToXPct(centralTodayMs)}%` }}
                        />
                      )}
                      {companyProjectSpans.map((p, idx) => {
                        const delta = companyDragPreview?.projectId === p.id ? companyDragPreview.deltaMs : 0;
                        const left = epsDateToXPct(p.start + delta);
                        const right = epsDateToXPct(p.end + delta);
                        const width = Math.max(1, right - left);
                        const top = idx * 36 + 12;
                        return (
                          <div key={p.id} className="absolute left-0 right-0" style={{ top }}>
                            <div
                              className="absolute h-3 rounded bg-blue-500 shadow-sm"
                              style={{ left: `${left}%`, width: `${width}%` }}
                              onPointerDown={(e) => handleCompanyPointerDown(p.id, e)}
                            />
                            <div
                              className="absolute flex items-center pointer-events-none"
                              style={{ left: `${right}%`, top: 0, bottom: 0, transform: "translateX(6px)" }}
                            >
                              <span className="text-[10px] font-bold text-white whitespace-nowrap">
                                {p.name}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pointer-events-none absolute bottom-2 left-3 right-3 h-1.5 bg-slate-700/50 rounded-full">
                      <div
                        className="h-full bg-blue-400/80 rounded-full"
                        style={{
                          width: `${companyScrollThumb.widthPct}%`,
                          transform: `translateX(${companyScrollThumb.leftPct}%)`,
                        }}
                      />
                    </div>
                    <style>{`
                      [data-company-scroll]::-webkit-scrollbar { display: none; }
                    `}</style>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {contextMenu.type && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null })}
          onAdd={handleStartAdd}
          onRename={handleStartRename}
          onDelete={handleDeleteNode}
          onDuplicate={handleDuplicateNode}
        />
      )}

      <CustomFormulaDialog
        open={formulaDialogOpen}
        onClose={() => { setFormulaDialogOpen(false); setEditingFormula(null); }}
        onSave={handleSaveFormula}
        onSavePreset={handleSaveFormulaPreset}
        editingFormula={editingFormula}
        projectDetails={selectedProjectDetails}
        existingFormulas={selectedCustomFormulas}
        taxRates={taxRates}
      />

      <TaxRatesDialog
        open={taxRateDialogOpen}
        onClose={() => setTaxRateDialogOpen(false)}
        taxRates={taxRates}
        onSave={handleSaveTaxRate}
        onDelete={handleDeleteTaxRate}
      />

      <FormulaPresetDialog
        open={formulaPresetDialogOpen}
        onClose={() => setFormulaPresetDialogOpen(false)}
        presets={formulaPresets}
        onDelete={handleDeletePreset}
      />

      <EmailOptionsDialog
        open={emailOptionsDialogOpen}
        onClose={() => setEmailOptionsDialogOpen(false)}
        options={emailOptions}
        onSave={handleSaveEmailOption}
        onDelete={handleDeleteEmailOption}
      />

      <PresetPicker
        open={presetPickerOpen}
        onClose={() => setPresetPickerOpen(false)}
        presets={formulaPresets}
        onApply={handleApplyPresetToProject}
      />

      {paycheckEditModal.open && paycheckEditModal.paycheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPaycheckEditModal({ open: false, paycheck: null, amount: "", checkNumber: "" })}>
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 w-[380px] p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Edit Paycheck</h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Amount</div>
                <input
                  type="number"
                  value={paycheckEditModal.amount}
                  onChange={(e) => setPaycheckEditModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Check #</div>
                <input
                  value={paycheckEditModal.checkNumber}
                  onChange={(e) => setPaycheckEditModal(prev => ({ ...prev, checkNumber: e.target.value }))}
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setPaycheckEditModal({ open: false, paycheck: null, amount: "", checkNumber: "" })} className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">Cancel</button>
              <button onClick={handleSavePaycheck} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      <AcquisitionConfirmModal
        open={acquireConfirmOpen}
        onConfirm={confirmAcquire}
        onCancel={() => { setAcquireConfirmOpen(false); setPendingAcquireProjectId(null); }}
      />

      <EditModal
        mode={modalMode}
        title={modalMode === "add" ? "Add EPS Node" : "Rename Node"}
        label="Name"
        value={modalValue}
        open={!!modalMode}
        onChange={setModalValue}
        onCancel={handleCancelEdit}
        onConfirm={modalMode === "add" ? handleConfirmAdd : handleConfirmRename}
      />
    </div>
  );
}


