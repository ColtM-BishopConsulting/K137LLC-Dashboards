"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  children?: EpsNode[];
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
  projectedLabor: number;
  projectedCost: number;
  budget: number;
  revenue: number;
  resources: ActivityResource[];
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "Income" | "Outcome";
  category: string;
  subCategory?: string;
  amount: number;
  activityId?: string;
}

interface ProjectDetail {
  id: string;
  variable: string;
  value: string;
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
  category: string;
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

const IconFunction = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    <path d="M15 7h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
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

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------
const MOCK_EPS: EpsNode[] = [
  { id: 1, parentId: null, type: "enterprise", name: "Koufax 137 LLC" },
  { id: 2, parentId: 1, type: "business_unit", name: "Real Estate Division" },
  { id: 3, parentId: 2, type: "portfolio", name: "Brownwood Area Portfolio" },
  { id: 4, parentId: 3, type: "company", name: "Residential Renovations" },
  { id: 5, parentId: 4, type: "project", name: "202 Live Oak" },
  { id: 6, parentId: 4, type: "project", name: "2905 Hemphill" },
  { id: 7, parentId: 4, type: "project", name: "1410 Vine" },
  { id: 8, parentId: 3, type: "company", name: "Commercial Development" },
  { id: 9, parentId: 8, type: "project", name: "Downtown Office Complex" },
  { id: 10, parentId: 8, type: "project", name: "Retail Strip Center" },
];

const INITIAL_RESOURCES: Resource[] = [
  { id: "R1", name: "Project Manager", type: "Labor", rate: 85, rateUnit: "hour", availability: 8 },
  { id: "R2", name: "Site Supervisor", type: "Labor", rate: 65, rateUnit: "hour", availability: 10 },
  { id: "R3", name: "General Laborer", type: "Labor", rate: 35, rateUnit: "hour", availability: 8 },
  { id: "R4", name: "Electrician", type: "Labor", rate: 75, rateUnit: "hour", availability: 8 },
  { id: "R5", name: "Plumber", type: "Labor", rate: 70, rateUnit: "hour", availability: 8 },
  { id: "R6", name: "Excavator", type: "Equipment", rate: 450, rateUnit: "day" },
  { id: "R7", name: "Concrete Mixer", type: "Equipment", rate: 200, rateUnit: "day" },
  { id: "R8", name: "Lumber Package", type: "Material", rate: 5000, rateUnit: "lump" },
  { id: "R9", name: "Roofing Sub", type: "Subcontractor", rate: 8500, rateUnit: "lump" },
  { id: "R10", name: "HVAC Contractor", type: "Subcontractor", rate: 12000, rateUnit: "lump" },
];

const INITIAL_ACTIVITIES: Record<number, Activity[]> = {
  5: [
    { id: "A1000", wbs: "1.1", name: "Project Initiation", start: "2025-01-01", finish: "2025-01-02", duration: 2, pct: 100, responsible: "PM", status: "Completed", projectedLabor: 16, projectedCost: 500, budget: 1000, revenue: 5000, resources: [{ resourceId: "R1", quantity: 16 }] },
    { id: "A1010", wbs: "1.2", name: "Site Preparation", start: "2025-01-03", finish: "2025-01-07", duration: 5, pct: 75, responsible: "Site Super", status: "In Progress", projectedLabor: 40, projectedCost: 1500, budget: 5000, revenue: 0, resources: [{ resourceId: "R2", quantity: 40 }, { resourceId: "R3", quantity: 40 }] },
    { id: "A1020", wbs: "1.2.1", name: "Demolition", start: "2025-01-03", finish: "2025-01-04", duration: 2, pct: 100, responsible: "Demo Crew", status: "Completed", projectedLabor: 32, projectedCost: 2500, budget: 3000, revenue: 0, resources: [{ resourceId: "R3", quantity: 32 }] },
    { id: "A1030", wbs: "1.2.2", name: "Site Grading", start: "2025-01-05", finish: "2025-01-07", duration: 3, pct: 50, responsible: "Site Super", status: "In Progress", projectedLabor: 24, projectedCost: 1800, budget: 3500, revenue: 0, resources: [{ resourceId: "R6", quantity: 3 }] },
    { id: "A1040", wbs: "1.3", name: "Foundation", start: "2025-01-08", finish: "2025-01-15", duration: 8, pct: 0, responsible: "Concrete Sub", status: "Not Started", projectedLabor: 120, projectedCost: 15000, budget: 18000, revenue: 0, resources: [] },
    { id: "A1050", wbs: "1.4", name: "Framing", start: "2025-01-16", finish: "2025-01-29", duration: 14, pct: 0, responsible: "Framing Crew", status: "Not Started", projectedLabor: 240, projectedCost: 22000, budget: 25000, revenue: 0, resources: [] },
    { id: "A1060", wbs: "1.5", name: "Roofing", start: "2025-01-30", finish: "2025-02-04", duration: 6, pct: 0, responsible: "Roofing Sub", status: "Not Started", projectedLabor: 60, projectedCost: 8500, budget: 10000, revenue: 0, resources: [{ resourceId: "R9", quantity: 1 }] },
    { id: "A1070", wbs: "1.6", name: "MEP Rough-In", start: "2025-02-05", finish: "2025-02-13", duration: 9, pct: 0, responsible: "MEP Subs", status: "Not Started", projectedLabor: 180, projectedCost: 17500, budget: 20000, revenue: 0, resources: [{ resourceId: "R4", quantity: 40 }, { resourceId: "R5", quantity: 40 }, { resourceId: "R10", quantity: 1 }] },
  ],
  6: [
    { id: "B1000", wbs: "1.1", name: "Planning & Permits", start: "2025-01-15", finish: "2025-01-22", duration: 8, pct: 25, responsible: "PM", status: "In Progress", projectedLabor: 40, projectedCost: 1200, budget: 3000, revenue: 2500, resources: [{ resourceId: "R1", quantity: 40 }] },
    { id: "B1010", wbs: "1.2", name: "Interior Demolition", start: "2025-01-23", finish: "2025-01-26", duration: 4, pct: 0, responsible: "Demo Crew", status: "Not Started", projectedLabor: 64, projectedCost: 4000, budget: 6000, revenue: 0, resources: [] },
    { id: "B1020", wbs: "1.3", name: "Structural Repairs", start: "2025-01-27", finish: "2025-02-05", duration: 10, pct: 0, responsible: "Structural Sub", status: "Not Started", projectedLabor: 80, projectedCost: 11000, budget: 15000, revenue: 0, resources: [] },
  ],
};

const INITIAL_TRANSACTIONS: Record<number, Transaction[]> = {
  5: [
    { id: "T1000", date: "2025-01-01", description: "Initial Client Deposit", type: "Income", category: "Client Payment", amount: 10000, activityId: "A1000" },
    { id: "T1001", date: "2025-01-02", description: "Permit Fees", type: "Outcome", category: "Materials", subCategory: "Permits", amount: 450, activityId: "A1000" },
    { id: "T1002", date: "2025-01-04", description: "Demo Crew (Day 1-2)", type: "Outcome", category: "Labor", subCategory: "Demolition", amount: 2200, activityId: "A1020" },
    { id: "T1003", date: "2025-01-05", description: "Gravel Delivery", type: "Outcome", category: "Materials", subCategory: "Site Work", amount: 600, activityId: "A1030" },
    { id: "T1004", date: "2025-01-06", description: "Excavator Rental", type: "Outcome", category: "Equipment", subCategory: "Site Work", amount: 750, activityId: "A1030" },
  ],
  6: [
    { id: "T2000", date: "2025-01-16", description: "Initial Client Payment", type: "Income", category: "Client Payment", amount: 5000, activityId: "B1000" },
    { id: "T2001", date: "2025-01-16", description: "City Planning Fees", type: "Outcome", category: "Materials", subCategory: "Permits", amount: 800, activityId: "B1000" },
  ]
};

const INITIAL_PROJECT_DETAILS: Record<number, ProjectDetail[]> = {
  5: [
    { id: "D1", variable: "Property Type", value: "Single Family" },
    { id: "D2", variable: "Square Footage", value: "1800" },
    { id: "D3", variable: "Bed/Bath", value: "3 Bed / 2 Bath" },
    { id: "D4", variable: "Overdue Taxes", value: "0" },
    { id: "D5", variable: "Purchase Price", value: "250000" },
    { id: "D6", variable: "ARV Estimate", value: "450000" },
    { id: "D7", variable: "Rehab Cost", value: "85000" },
    { id: "D8", variable: "Holding Cost", value: "10000" },
    { id: "D9", variable: "Exit Price Factor", value: "250" },
  ],
  6: [
    { id: "D1", variable: "Property Type", value: "Duplex" },
    { id: "D2", variable: "Square Footage", value: "2200" },
    { id: "D3", variable: "Bed/Bath", value: "4 Bed / 3 Bath" },
    { id: "D4", variable: "Overdue Taxes", value: "2500" },
  ],
};

const INITIAL_CUSTOM_FORMULAS: Record<number, CustomFormula[]> = {
  5: [
    {
      id: "CF1",
      name: "All-In Cost",
      formula: "{Purchase Price} + {Rehab Cost} + {Holding Cost}",
      description: "Total investment including purchase, rehab, and holding costs",
      resultType: "currency",
    },
    {
      id: "CF2",
      name: "Equity at ARV",
      formula: "{ARV Estimate} - {All-In Cost}",
      description: "Projected equity based on ARV minus total investment",
      resultType: "currency",
    },
    {
      id: "CF3",
      name: "ROI Percentage",
      formula: "(({ARV Estimate} - {All-In Cost}) / {All-In Cost}) * 100",
      description: "Return on investment as a percentage",
      resultType: "percentage",
    },
  ],
  6: [],
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
      if (parent) parent.children!.push(node);
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
const evaluateFormula = (
  formula: string,
  projectDetails: ProjectDetail[],
  customFormulas: CustomFormula[],
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
          newEvaluatedSet
        );

        if (result.error === null) {
          variableMap[cf.name] = result.value;
        }
      }
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

    if (sanitized !== processedFormula.replace(/\s/g, '')) {
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
  customFormulas: CustomFormula[]
): { name: string; type: "detail" | "formula"; value?: number }[] => {
  const variables: { name: string; type: "detail" | "formula"; value?: number }[] = [];

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

  if (!state.node && !state.activity) return null;

  const menuItems = state.type === 'eps' ? [
    { label: getAddTarget(state.node).label.replace("Add ", "Add "), icon: <IconAdd />, action: onAdd, divider: false },
    { label: "Rename", icon: <IconEdit />, action: onRename, divider: false },
    { label: "Duplicate", icon: <IconCopy />, action: onDuplicate, divider: true },
    { label: "Cut", icon: null, action: onCut, divider: false },
    { label: "Copy", icon: <IconCopy />, action: onCopy, divider: false },
    { label: "Paste", icon: null, action: onPaste, divider: true, disabled: true },
    { label: "Delete", icon: <IconDelete />, action: onDelete, divider: false, danger: true },
  ] : [
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
  editingFormula: CustomFormula | null;
  projectDetails: ProjectDetail[];
  existingFormulas: CustomFormula[];
}

const CustomFormulaDialog: React.FC<CustomFormulaDialogProps> = ({
  open,
  onClose,
  onSave,
  editingFormula,
  projectDetails,
  existingFormulas,
}) => {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [description, setDescription] = useState("");
  const [resultType, setResultType] = useState<"currency" | "percentage" | "number">("currency");
  const [previewResult, setPreviewResult] = useState<{ value: number; error: string | null }>({ value: 0, error: null });

  useEffect(() => {
    if (editingFormula) {
      setName(editingFormula.name);
      setFormula(editingFormula.formula);
      setDescription(editingFormula.description || "");
      setResultType(editingFormula.resultType);
    } else {
      setName("");
      setFormula("");
      setDescription("");
      setResultType("currency");
    }
  }, [editingFormula, open]);

  useEffect(() => {
    if (formula) {
      const result = evaluateFormula(formula, projectDetails, existingFormulas.filter(f => f.id !== editingFormula?.id));
      setPreviewResult(result);
    } else {
      setPreviewResult({ value: 0, error: null });
    }
  }, [formula, projectDetails, existingFormulas, editingFormula]);

  const availableVariables = getAvailableVariables(
    projectDetails,
    existingFormulas.filter(f => f.id !== editingFormula?.id)
  );

  const insertVariable = (varName: string) => {
    setFormula(prev => prev + `{${varName}}`);
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
            </div>
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
}

const NewActivityDialog: React.FC<NewActivityDialogProps> = ({
  open,
  projectId,
  existingActivities,
  allResources,
  onClose,
  onConfirm,
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
      setForm({
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
      setSelectedResourceId("");
      setResourceQuantity(1);
    }
  }, [open]);

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
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ProjectLedger: React.FC<ProjectLedgerProps> = ({
  projectId,
  activities,
  transactions,
  onAddTransaction,
  isOpen,
  setIsOpen,
}) => {
  const [form, setForm] = useState<LedgerFormState>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "Outcome",
    category: "Materials",
    amount: 0,
    activityId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const parsed = parseFloat(value);
      setForm((prev) => ({ ...prev, amount: Number.isFinite(parsed) ? parsed : 0 }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = toNumber(form.amount);
    if (!form.description || amountValue <= 0 || !form.date) return;

    onAddTransaction({
      ...form,
      amount: amountValue,
      activityId: form.activityId === 'project-level' ? undefined : form.activityId,
    });

    setForm((prev) => ({
      ...prev,
      description: "",
      amount: 0,
    }));
  };

  const categories = ["Labor", "Materials", "Equipment", "Client Payment", "Other"];
  const activityOptions = activities.map(a => ({ id: a.id, name: `${a.wbs} - ${a.name}` }));

  return (
    <div className="border-t border-slate-300 dark:border-slate-700">
      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setIsOpen(!isOpen)}>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="4" rx="1" />
            <path d="M12 10v14" />
            <path d="M17 10h1c1 0 2 1 2 2v8c0 1-1 2-2 2H6c-1 0-2-1-2-2v-8c0-1 1-2 2-2h1" />
          </svg>
          Project Ledger ({transactions.length} Transactions)
        </h4>
        {isOpen ? <IconChevronUp /> : <IconChevronDown />}
      </div>

      {isOpen && (
        <div className="h-64 flex overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex-1 overflow-y-auto border-r border-slate-300 dark:border-slate-700">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 text-xs font-medium uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Activity</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{t.description}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{t.category}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">
                      {t.activityId || "-"}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${t.type === "Income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "Income" ? "+" : "-"} {formatCurrency(toNumber(t.amount))}
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
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
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
}

const CustomFormulasDisplay: React.FC<CustomFormulasDisplayProps> = ({
  formulas,
  projectDetails,
  onEdit,
  onDelete,
  onCreate,
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
        const result = evaluateFormula(formula.formula, projectDetails, formulas);
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
}> = ({
  projectDetails,
  projectActivities,
  projectTransactions,
  customFormulas,
  onEditFormula,
  onDeleteFormula,
  onCreateFormula,
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
}

const ProjectDetailsPanel: React.FC<ProjectDetailsPanelProps> = ({
  projectId,
  details,
  onUpdate,
  onAutoPopulate
}) => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    <div className="w-80 border-l border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 flex flex-col overflow-hidden fixed right-0 top-0 bottom-0 pt-16">
      <div className="border-b border-slate-300 bg-gradient-to-r from-white to-slate-50 px-4 py-3 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Project Variables / Details
        </h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Define key project variables here. These variables are used by the financial and custom analysis tools.
        </p>
        <div className="space-y-1">
          {details.map((detail) => (
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
                onClick={() => startEditing(detail.id, 'value', detail.value)}
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
                  detail.value
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
  onModeChange?: (mode: "EPS" | "Activities" | "Resources") => void;
  currentMode: "EPS" | "Activities" | "Resources";
  isDetailsPanelVisible?: boolean;
  onToggleDetailsPanel?: () => void;
}> = ({
  title,
  projectName,
  onModeChange,
  currentMode,
  isDetailsPanelVisible,
  onToggleDetailsPanel
}) => {
  const { theme, setTheme } = useTheme();

  return (
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
            onClick={() => onModeChange && onModeChange("Resources")}
            className={`rounded px-3 py-1 transition-colors ${
              currentMode === "Resources"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            Resources
          </button>
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
  onContextMenu: (x: number, y: number, node: EpsNode, activity: null, type: 'eps') => void;
  onToggleExpand: (nodeId: number) => void;
}

const EpsNodeComponent: React.FC<EpsNodeProps> = ({
  node,
  depth,
  selectedNodeId,
  expanded,
  onNodeClick,
  onContextMenu,
  onToggleExpand,
}) => {
  const isSelected = node.id === selectedNodeId;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = hasChildren && expanded.has(node.id);
  const paddingLeft = `${depth * 15}px`;

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onContextMenu(e.clientX, e.clientY, node, null, 'eps');
  }, [node, onContextMenu]);

  return (
    <div key={node.id}>
      <div
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
  const [mode, setMode] = useState<"EPS" | "Activities" | "Resources">("EPS");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [epsNodes, setEpsNodes] = useState<EpsNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<number, Activity[]>>(INITIAL_ACTIVITIES);
  const [transactions, setTransactions] = useState<Record<number, Transaction[]>>(INITIAL_TRANSACTIONS);
  const [projectDetails, setProjectDetails] = useState<Record<number, ProjectDetail[]>>(INITIAL_PROJECT_DETAILS);
  const [customFormulas, setCustomFormulas] = useState<Record<number, CustomFormula[]>>(INITIAL_CUSTOM_FORMULAS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [isDetailsPanelVisible, setIsDetailsPanelVisible] = useState(true);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    node: null,
    type: null,
    activity: null,
  });

  // Modal states
  const [modalMode, setModalMode] = useState<"add" | "rename" | null>(null);
  const [modalValue, setModalValue] = useState("");
  const [pendingAddConfig, setPendingAddConfig] = useState<{ type: EpsNodeType; parentId: number | null; } | null>(null);

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
    setEpsNodes(MOCK_EPS);

    const initialExpanded = new Set<number>();
    let current = findNode(MOCK_EPS, 5);
    while (current && current.parentId !== null) {
      initialExpanded.add(current.parentId);
      current = findNode(MOCK_EPS, current.parentId);
    }
    setExpanded(initialExpanded);
    setSelectedNodeId(5);
    setActiveProjectId(5);
  }, []);

  // --- EPS Node Operations ---
  const handleNodeClick = useCallback((node: EpsNode) => {
    setSelectedNodeId(node.id);
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
    if (!contextMenu.node) return;
    const target = getAddTarget(contextMenu.node);
    setPendingAddConfig({ type: target.type, parentId: target.parentId });
    setModalMode("add");
    setModalValue("");
  };

  const handleConfirmAdd = () => {
    if (!modalMode || modalMode !== "add" || !pendingAddConfig) {
      setModalMode(null);
      return;
    }

    const trimmed = modalValue.trim();
    if (!trimmed) {
      setModalMode(null);
      return;
    }

    const nextId = getNextId(epsNodes);
    const newNode: EpsNode = {
      id: nextId,
      parentId: pendingAddConfig.parentId,
      type: pendingAddConfig.type,
      name: trimmed,
    };

    setEpsNodes((prev) => [...prev, newNode]);

    setSelectedNodeId(nextId);
    if (pendingAddConfig.parentId != null) {
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(pendingAddConfig.parentId!);
        return next;
      });
    }

    if (newNode.type === 'project') {
      setProjectDetails(prev => ({
        ...prev,
        [newNode.id]: DEFAULT_BRRRR_FIELDS.map((d, i) => ({ ...d, id: `D${i + 1}` })),
      }));
      setCustomFormulas(prev => ({
        ...prev,
        [newNode.id]: [],
      }));
    }

    setPendingAddConfig(null);
    setModalMode(null);
  };

  const handleStartRename = () => {
    if (!contextMenu.node) return;
    setModalMode("rename");
    setModalValue(contextMenu.node.name);
  };

  const handleConfirmRename = () => {
    if (!modalMode || modalMode !== "rename" || !contextMenu.node) {
      setModalMode(null);
      return;
    }

    const trimmed = modalValue.trim();
    if (!trimmed || trimmed === contextMenu.node.name) {
      setModalMode(null);
      return;
    }

    setEpsNodes((prev) =>
      prev.map((n) =>
        n.id === contextMenu.node!.id ? { ...n, name: trimmed } : n
      )
    );
    setModalMode(null);
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

    const nextId = getNextId(epsNodes);
    const newName = `${nodeToDupe.name} (Copy)`;

    const newNode: EpsNode = {
      id: nextId,
      parentId: nodeToDupe.parentId,
      type: nodeToDupe.type,
      name: newName,
    };

    setEpsNodes(prev => [...prev, newNode]);

    if (nodeToDupe.type === 'project') {
      const projectActivities = activities[nodeToDupe.id] || [];
      let activityIdCounter = parseInt(getNextActivityId(activities).replace(/^[A-Z]/, ''));

      const newActivities: Activity[] = projectActivities.map(a => {
        const newId = `A${(activityIdCounter).toString().padStart(4, '0')}`;
        activityIdCounter += 10;
        return {
          ...a,
          id: newId,
        };
      });
      setActivities(prev => ({ ...prev, [nextId]: newActivities }));

      setProjectDetails(prev => ({
        ...prev,
        [nextId]: (projectDetails[nodeToDupe.id] || []).map((d, i) => ({ ...d, id: `D${i + 1}` })),
      }));

      setCustomFormulas(prev => ({
        ...prev,
        [nextId]: (customFormulas[nodeToDupe.id] || []).map((f, i) => ({ ...f, id: `CF${Date.now()}${i}` })),
      }));
    }

    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  // --- Activity & Transaction Operations ---
  const handleStartNewActivity = () => {
    if (!activeProjectId) return;
    setNewActivityDialog(true);
  };

  const handleAddActivity = (activity: Activity) => {
    if (!activeProjectId) return;
    setActivities(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), activity]
    }));
  };

  const handleUpdateActivity = (
    activityId: string,
    field: keyof Activity,
    value: string
  ) => {
    if (!activeProjectId) return;

    const newValue = field === 'duration' || field === 'pct' || field === 'projectedLabor' || field === 'projectedCost' || field === 'budget' || field === 'revenue'
      ? parseFloat(value)
      : value;

    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(a =>
        a.id === activityId ? { ...a, [field]: newValue } : a
      )
    }));
  };

  const handleDeleteActivity = () => {
    if (!activeProjectId || !contextMenu.activity) return;

    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).filter(a => a.id !== contextMenu.activity!.id)
    }));

    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
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
    };
    handleAddActivity(newActivity);
    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  const handleAddTransaction = (transaction: Omit<Transaction, "id">) => {
    if (!activeProjectId) return;
    const newTransaction: Transaction = {
      ...transaction,
      id: `T${Date.now()}`,
    };
    setTransactions(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), newTransaction]
    }));
  };

  // --- Resource Operations ---
  const handleOpenResourceAssignment = () => {
    if (!contextMenu.activity) return;
    setActivityForResources(contextMenu.activity);
    setResourceAssignmentDialog(true);
    setContextMenu({ x: 0, y: 0, node: null, type: null, activity: null });
  };

  const handleSaveActivityResources = (activityId: string, newResources: ActivityResource[]) => {
    if (!activeProjectId) return;

    setActivities(prev => ({
      ...prev,
      [activeProjectId]: (prev[activeProjectId] || []).map(a =>
        a.id === activityId ? { ...a, resources: newResources } : a
      )
    }));
  };

  const handleSaveAllResources = (updatedResources: Resource[]) => {
    setResources(updatedResources);
  };

  // --- Project Details Operations ---
  const handleUpdateProjectDetails = (updatedDetails: ProjectDetail[]) => {
    if (!activeProjectId) return;
    setProjectDetails(prev => ({
      ...prev,
      [activeProjectId]: updatedDetails,
    }));
  };

  const handleAutoPopulateProjectDetails = (fields: Omit<ProjectDetail, 'id'>[]) => {
    if (!activeProjectId) return;
    const currentDetails = projectDetails[activeProjectId] || [];
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
      [activeProjectId]: [...currentDetails, ...newDetails],
    }));
  };

  // --- Custom Formula Operations ---
  const handleCreateFormula = () => {
    setEditingFormula(null);
    setFormulaDialogOpen(true);
  };

  const handleEditFormula = (formula: CustomFormula) => {
    setEditingFormula(formula);
    setFormulaDialogOpen(true);
  };

  const handleDeleteFormula = (formulaId: string) => {
    if (!activeProjectId && !selectedNodeId) return;
    const projectId = activeProjectId || selectedNodeId;
    if (!projectId) return;

    const confirmed = window.confirm("Are you sure you want to delete this formula?");
    if (!confirmed) return;

    setCustomFormulas(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(f => f.id !== formulaId)
    }));
  };

  const handleSaveFormula = (formula: CustomFormula) => {
    const projectId = activeProjectId || selectedNodeId;
    if (!projectId) return;

    setCustomFormulas(prev => {
      const existing = prev[projectId] || [];
      const existingIndex = existing.findIndex(f => f.id === formula.id);

      if (existingIndex >= 0) {
        const updated = [...existing];
        updated[existingIndex] = formula;
        return { ...prev, [projectId]: updated };
      } else {
        return { ...prev, [projectId]: [...existing, formula] };
      }
    });
  };

  const handleProjectSelect = (projectId: number) => {
    setActiveProjectId(projectId);
    setMode("Activities");
  };

  // --- RENDERING LOGIC ---
  const treeNodes = buildTree(epsNodes);
  const selectedNode = selectedNodeId ? findNode(epsNodes, selectedNodeId) : null;
  const activeProject = activeProjectId ? findNode(epsNodes, activeProjectId) : null;

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
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACTIVITIES VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Activities" && activeProject) {
    const projectActivities = activities[activeProject.id] || [];
    const projectTransactions = transactions[activeProject.id] || [];
    const currentProjectDetails = projectDetails[activeProject.id] || [];
    const currentCustomFormulas = customFormulas[activeProject.id] || [];

    const { totalActualCost } = calculateProjectStats(projectActivities, projectTransactions);
    const { totalBudget, totalActualCost: totalActualCostFin, totalRevenue, profit } = calculateFinancialKPIs(projectActivities, projectTransactions);

    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar
          title="Activities"
          projectName={activeProject.name}
          onModeChange={setMode}
          currentMode={mode}
          isDetailsPanelVisible={isDetailsPanelVisible}
          onToggleDetailsPanel={() => setIsDetailsPanelVisible(prev => !prev)}
        />

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="border-b border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Project Explorer
                </h3>
                <button
                  onClick={() => setMode("EPS")}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ← Back to EPS
                </button>
              </div>
            </div>
            <div className="p-2 space-y-1">
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

            {/* Custom Formulas Section in Sidebar */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                <IconFunction /> Custom Formulas
              </h4>
              <div className="space-y-2">
                {currentCustomFormulas.slice(0, 3).map((formula) => {
                  const result = evaluateFormula(formula.formula, currentProjectDetails, currentCustomFormulas);
                  return (
                    <div key={formula.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">{formula.name}</span>
                        <span className={`font-semibold ${result.error ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                          {result.error ? 'Error' : formula.resultType === 'currency' ? formatCurrency(result.value) : formula.resultType === 'percentage' ? `${result.value.toFixed(1)}%` : result.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={handleCreateFormula}
                  className="w-full text-xs flex items-center justify-center gap-1 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                >
                  <IconPlus /> {currentCustomFormulas.length > 0 ? 'Manage Formulas' : 'Create Formula'}
                </button>
              </div>
            </div>
          </aside>

          <main className={`flex-1 flex flex-col overflow-hidden ${isDetailsPanelVisible ? 'pr-80' : ''}`}>
            <div className="flex-1 overflow-hidden p-4">
              <div className="grid grid-rows-[60%_40%] gap-4 h-full">
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

                <div className="rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-md">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <IconGantt /> Gantt Chart (Placeholder)
                  </h3>
                  <div className="text-center p-10 text-slate-500">
                    <p>Gantt Chart visualization of activities goes here.</p>
                  </div>
                </div>
              </div>
            </div>

            <ProjectLedger
              projectId={activeProject.id}
              activities={projectActivities}
              transactions={projectTransactions}
              onAddTransaction={handleAddTransaction}
              isOpen={ledgerOpen}
              setIsOpen={setLedgerOpen}
            />
          </main>

          {isDetailsPanelVisible && (
            <ProjectDetailsPanel
              projectId={activeProject.id}
              details={currentProjectDetails}
              onUpdate={handleUpdateProjectDetails}
              onAutoPopulate={handleAutoPopulateProjectDetails}
            />
          )}
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
          onClose={() => setNewActivityDialog(false)}
          onConfirm={handleAddActivity}
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
          editingFormula={editingFormula}
          projectDetails={currentProjectDetails}
          existingFormulas={currentCustomFormulas}
        />

        <EditModal
          mode={modalMode}
          title={modalMode === "add" ? "Add EPS Node" : "Rename EPS Node"}
          label="Name"
          value={modalValue}
          open={!!modalMode}
          onChange={setModalValue}
          onCancel={() => { setModalMode(null); setPendingAddConfig(null); }}
          onConfirm={modalMode === "add" ? handleConfirmAdd : handleConfirmRename}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EPS MODE - Default view
  // ---------------------------------------------------------------------------
  const selectedProjectActivities = (selectedNode && activities[selectedNode.id]) || [];
  const selectedProjectTransactions = (selectedNode && transactions[selectedNode.id]) || [];
  const selectedProjectDetails = (selectedNode && projectDetails[selectedNode.id]) || [];
  const selectedCustomFormulas = (selectedNode && customFormulas[selectedNode.id]) || [];

  const projectStats = (selectedNode && selectedNode.type === "project") ? calculateProjectStats(selectedProjectActivities, selectedProjectTransactions) : null;
  const projectFinancials = (selectedNode && selectedNode.type === "project") ? calculateFinancialKPIs(selectedProjectActivities, selectedProjectTransactions) : null;

  const allActivitiesFlat = Object.values(activities).flat();
  const allTransactionsFlat = Object.values(transactions).flat();

  const globalOverallProgressValue = allActivitiesFlat.reduce((sum, a) => sum + a.pct, 0) / Math.max(allActivitiesFlat.length, 1);
  const globalOverallProgressDisplay = globalOverallProgressValue.toFixed(1);

  const globalStats = calculateProjectStats(allActivitiesFlat, allTransactionsFlat);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TopBar title="EPS" currentMode={mode} onModeChange={setMode} />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 flex flex-col flex-shrink-0">
          <div className="border-b border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-3 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Enterprise Project Structure
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
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
                    <button
                      onClick={() => handleProjectSelect(selectedNode.id)}
                      className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Open Project Activities →
                    </button>
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
                    setActiveProjectId(selectedNode.id);
                    handleEditFormula(formula);
                  }}
                  onDeleteFormula={(formulaId) => {
                    const confirmed = window.confirm("Delete this formula?");
                    if (confirmed) {
                      setCustomFormulas(prev => ({
                        ...prev,
                        [selectedNode.id]: (prev[selectedNode.id] || []).filter(f => f.id !== formulaId)
                      }));
                    }
                  }}
                  onCreateFormula={() => {
                    setActiveProjectId(selectedNode.id);
                    handleCreateFormula();
                  }}
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
        editingFormula={editingFormula}
        projectDetails={selectedProjectDetails}
        existingFormulas={selectedCustomFormulas}
      />

      <EditModal
        mode={modalMode}
        title={modalMode === "add" ? "Add EPS Node" : "Rename Node"}
        label="Name"
        value={modalValue}
        open={!!modalMode}
        onChange={setModalValue}
        onCancel={() => setModalMode(null)}
        onConfirm={modalMode === "add" ? handleConfirmAdd : handleConfirmRename}
      />
    </div>
  );
}
