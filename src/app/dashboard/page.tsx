"use client";

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
}

interface RentPayment {
  id: string;
  rentRollEntryId: string;
  amount: number;
  date: string;
  note?: string;
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

const INITIAL_FORMULA_PRESETS: CustomFormula[] = [
  {
    id: "P1",
    name: "Gross Profit",
    formula: "{ARV Estimate} - {All-In Cost}",
    description: "Quick profit check before taxes/fees",
    resultType: "currency",
  },
  {
    id: "P2",
    name: "Tax Liability",
    formula: "{Net Income} * ({County Tax Rate} / 100)",
    description: "Applies selected county tax rate to net income",
    resultType: "currency",
  },
];

const INITIAL_TAX_RATES: TaxRate[] = [
  { id: "TR1", county: "Tarrant", state: "TX", rate: 2.5, note: "Example property tax rate" },
  { id: "TR2", county: "Harris", state: "TX", rate: 2.3 },
];

const INITIAL_PIPELINE_META: Record<number, ProjectPipelineMeta> = {
  5: { status: "acquired", seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] },
  6: { status: "under_contract", seller: { name: "John Seller", phone: "555-123-4567", email: "john@example.com" }, selectedEmailOptionIds: [] },
};

const INITIAL_EMAIL_OPTIONS: EmailOption[] = [
  {
    id: "EO1",
    name: "Welcome Introduction",
    description: "Friendly intro and confirmation of interest",
    subject: "Great to meet you about the property",
    body: "Hi {Seller Name},\n\nThanks for discussing {Property Name}. We're excited to move forward. I'll send next steps shortly.\n\nBest,\n{Your Name}",
  },
  {
    id: "EO2",
    name: "Request Disclosures",
    description: "Ask for disclosures and recent repairs",
    subject: "Disclosures and recent updates",
    body: "Hi {Seller Name},\n\nCould you share any disclosures, recent repairs, or known issues for {Property Name}? This helps us finalize our underwriting.\n\nThanks!",
  },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "EMP1", name: "Alice Foreman", rate: 42 },
  { id: "EMP2", name: "Bob Carpenter", rate: 38 },
];

const INITIAL_TIME_ENTRIES: TimeEntry[] = [];
const INITIAL_PAYCHECKS: Paycheck[] = [];

const INITIAL_RENT_ROLL_PROPERTIES: RentRollProperty[] = [
  { id: "PROP-LO", name: "202 Live Oak", linkedProjectId: 5 },
  { id: "PROP-HE", name: "2905 Hemphill", linkedProjectId: 6 },
  { id: "PROP-VI", name: "1410 Vine", linkedProjectId: 7 },
  { id: "PROP-DO", name: "Downtown Office Complex", linkedProjectId: 9 },
  { id: "PROP-RS", name: "Retail Strip Center", linkedProjectId: 10 },
  { id: "PROP-AR", name: "Arrears Demo", linkedProjectId: null },
];

const INITIAL_RENT_ROLL: RentRollEntry[] = [
  { id: "RR1", propertyId: "PROP-LO", unit: "Unit A", tenant: "Megan Carter", status: "Occupied", rent: 1650, balance: 0, leaseEnd: "2025-11-30", initialDueMonthDay: "03-01", bedrooms: 3, bathrooms: 2 },
  { id: "RR2", propertyId: "PROP-LO", unit: "Unit B", tenant: "Vacant", status: "Vacant", rent: 1450, balance: 0, leaseEnd: "Listing", initialDueMonthDay: "03-01", bedrooms: 2, bathrooms: 1 },
  { id: "RR3", propertyId: "PROP-HE", unit: "Unit 1", tenant: "Sergio Patel", status: "Occupied", rent: 1350, balance: 120, leaseEnd: "2025-06-30", initialDueMonthDay: "03-05", bedrooms: 2, bathrooms: 1 },
  { id: "RR4", propertyId: "PROP-VI", unit: "Unit 3", tenant: "Danielle Wu", status: "Notice", rent: 1200, balance: 350, leaseEnd: "2025-04-30", initialDueMonthDay: "02-28", bedrooms: 1, bathrooms: 1 },
  { id: "RR5", propertyId: "PROP-DO", unit: "Suite 210", tenant: "Northwind Legal", status: "Occupied", rent: 4800, balance: 0, leaseEnd: "2026-01-31", initialDueMonthDay: "03-03", bedrooms: 0, bathrooms: 1 },
  { id: "RR6", propertyId: "PROP-RS", unit: "Unit 5", tenant: "Vacant", status: "Vacant", rent: 3200, balance: 0, leaseEnd: "Marketing", initialDueMonthDay: "03-10", bedrooms: 0, bathrooms: 1 },
  { id: "RR7", propertyId: "PROP-AR", unit: "Unit 301", tenant: "Arrears Tenant", status: "Occupied", rent: 1800, balance: 0, leaseEnd: "2025-12-31", initialDueMonthDay: "02-05", bedrooms: 2, bathrooms: 2 },
];

const INITIAL_RENT_PAYMENTS: RentPayment[] = [
  { id: "PAY1", rentRollEntryId: "RR1", amount: 1650, date: "2025-12-01", note: "ACH" },
  { id: "PAY2", rentRollEntryId: "RR3", amount: 1230, date: "2025-11-06", note: "Partial" },
  { id: "PAY3", rentRollEntryId: "RR5", amount: 4800, date: "2025-12-03", note: "Check" },
  { id: "PAY4", rentRollEntryId: "RR7", amount: 1800, date: "2025-11-05", note: "Feb Rent" },
  { id: "PAY5", rentRollEntryId: "RR7", amount: 1800, date: "2025-12-05", note: "Mar Rent" },
];

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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyCents = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
  // Midnight in Central converted to absolute ms via UTC (central midnight = 06:00 UTC in CST/05:00 in CDT)
  return Date.UTC(year, month - 1, day);
};
const toDateMs = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, (month || 1) - 1, day || 1);
};
const toDateString = (ms: number) => {
  const d = new Date(ms);
  const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
  return iso.slice(0, 10);
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
const toExcelXml = (sheets: { name: string; rows: (string | number)[][] }[]) => {
  const worksheetXml = sheets.map(sheet => {
    const rowsXml = sheet.rows.map(row => {
      const cells = row.map(cell => `<Cell><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${String(cell ?? "")}</Data></Cell>`).join("");
      return `<Row>${cells}</Row>`;
    }).join("");
    return `<Worksheet ss:Name="${sheet.name}"><Table>${rowsXml}</Table></Worksheet>`;
  }).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 ${worksheetXml}
</Workbook>`;
};
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
      onSavePreset({ ...newFormula, id: editingFormula?.id?.startsWith("P") ? editingFormula.id : `P${Date.now()}` });
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
  onAddTransaction: (transaction: Omit<Transaction, "id">) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  draftActivityId?: string | null;
  setDraftActivityId?: (id: string | null) => void;
  onExpand?: () => void;
}

const ProjectLedger: React.FC<ProjectLedgerProps> = ({
  projectId,
  activities,
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  isOpen,
  setIsOpen,
  draftActivityId,
  setDraftActivityId,
}) => {
  const [form, setForm] = useState<LedgerFormState>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    type: "Outcome",
    category: "Materials",
    amount: 0,
    activityId: "",
  });
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (draftActivityId) {
      setForm(prev => ({ ...prev, activityId: draftActivityId }));
    }
  }, [draftActivityId]);

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

    if (selectedTransactionId) {
      onUpdateTransaction({
        id: selectedTransactionId,
        ...form,
        amount: amountValue,
        activityId: form.activityId === 'project-level' ? undefined : form.activityId,
      });
    } else {
      onAddTransaction({
        ...form,
        amount: amountValue,
        activityId: form.activityId === 'project-level' ? undefined : form.activityId,
      });
    }

    setForm((prev) => ({
      ...prev,
      description: "",
      amount: 0,
      activityId: "",
    }));
    setSelectedTransactionId(null);
    if (setDraftActivityId) setDraftActivityId(null);
  };

  const categories = ["Labor", "Materials", "Equipment", "Client Payment", "Other"];
  const activityOptions = activities.map(a => ({ id: a.id, name: `${a.wbs} - ${a.name}` }));

  const expandedTop = "top-[120px]";
  const expandedBodyHeight = "calc(100vh - 120px - 44px)"; // ribbon offset minus header height
  const containerClasses = isExpanded && isOpen
    ? `fixed inset-x-0 ${expandedTop} bottom-0 z-30`
    : "relative -mt-px";
  const targetMaxHeight = isExpanded ? expandedBodyHeight : "16rem";
  const targetHeight = isExpanded ? expandedBodyHeight : "16rem";
  const bodyStyle: React.CSSProperties = {
    maxHeight: isOpen ? targetMaxHeight : "0px",
    height: isOpen ? targetHeight : "0px",
    opacity: isOpen ? 1 : 0,
  };
  const bodyClasses = `flex overflow-hidden bg-white dark:bg-slate-900 transition-[max-height,height,opacity] duration-400 ease-in-out`;

  return (
    <div className={`border-t border-slate-300 dark:border-slate-700 ${containerClasses}`}>
      <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setIsOpen(!isOpen)}>
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="18" height="4" rx="1" />
            <path d="M12 10v14" />
            <path d="M17 10h1c1 0 2 1 2 2v8c0 1-1 2-2 2H6c-1 0-2-1-2-2v-8c0-1 1-2 2-2h1" />
          </svg>
          Project Ledger ({transactions.length} Transactions)
        </h4>
        <div className="flex items-center gap-2">
          {isOpen && (
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
          {isOpen ? <IconChevronUp /> : <IconChevronDown />}
        </div>
      </div>

      <div className={`overflow-hidden ${bodyClasses}`} style={bodyStyle} aria-hidden={!isOpen}>
        <div className="flex-1 overflow-y-auto border-r border-slate-300 dark:border-slate-700">
          <table className="min-w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-xs font-medium uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left w-24">Activity</th>
                <th className="px-3 py-2 text-right w-24">Amount</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200 truncate max-w-xs">{t.description}</td>
                  <td className="px-3 py-2 text-slate-600 dark:text-slate-400 truncate">{t.category}</td>
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
                        setForm({
                          date: t.date,
                          description: t.description,
                          type: t.type,
                          category: t.category,
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
  const [companyScrollThumb, setCompanyScrollThumb] = useState({ widthPct: 100, leftPct: 0 });
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
  const dayWidthPct = (DAY_MS / totalSpan) * 100;

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
    document.addEventListener("pointerlockchange", handleLockChange);
    document.addEventListener("pointerlockerror", handleLockChange);
    window.addEventListener("mousemove", handlePointerLockMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
      document.removeEventListener("pointerlockerror", handleLockChange);
      window.removeEventListener("mousemove", handlePointerLockMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      if (document.pointerLockElement === scrollRef.current) {
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

  const renderMonths = () => {
    const months = [];
    let cursor = new Date(timeline.start);
    cursor.setUTCDate(1);
    while (cursor.getTime() < timeline.end) {
      const startMs = cursor.getTime();
      const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)).getTime();
      const endMs = Math.min(next, timeline.end);
      const width = ((endMs - startMs) / totalSpan) * 100;
      months.push(
        <div key={startMs} className="absolute top-0 left-0 h-6 border-r border-slate-300/60 dark:border-slate-600/60 text-[11px] flex items-center px-2 text-slate-600 dark:text-slate-300 font-semibold"
          style={{ width: `${width}%`, transform: `translateX(${dateToX(startMs)}%)` }}>
          {cursor.toLocaleString("en-US", { month: "short", year: "numeric" })}
        </div>
      );
      cursor = new Date(next);
    }
    return months;
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
  onModeChange?: (mode: "EPS" | "Activities" | "Resources" | "Labor" | "RentRoll" | "Exports" | "Statements") => void;
  currentMode: "EPS" | "Activities" | "Resources" | "Labor" | "RentRoll" | "Exports" | "Statements";
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
            <p className="text-sm text-slate-500 dark:text-slate-400">Saved formulas available across all projects. Create new presets from the formula dialog using “Save as preset”.</p>
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
  taxRateCount: number;
  presetCount: number;
  hasActiveProject: boolean;
}> = ({
  onOpenTaxRates,
  onManagePresets,
  onCreateFormula,
  onAddPresetToProject,
  taxRateCount,
  presetCount,
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
  const meta = node.type === "project" ? pipelineMetaMap?.[node.id] : undefined;
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
  const [mode, setMode] = useState<"EPS" | "Activities" | "Resources" | "Labor" | "RentRoll" | "Exports" | "Statements">("EPS");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [epsNodes, setEpsNodes] = useState<EpsNode[]>([]);
  const [wbsNodesDb, setWbsNodesDb] = useState<DbWbsNode[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [activities, setActivities] = useState<Record<number, Activity[]>>({});
  const [transactions, setTransactions] = useState<Record<number, Transaction[]>>({});
  const [projectDetails, setProjectDetails] = useState<Record<number, ProjectDetail[]>>({});
  const [customFormulas, setCustomFormulas] = useState<Record<number, CustomFormula[]>>({});
  const [formulaPresets, setFormulaPresets] = useState<CustomFormula[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [pipelineMeta, setPipelineMeta] = useState<Record<number, ProjectPipelineMeta>>({});
  const [emailOptions, setEmailOptions] = useState<EmailOption[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rentRollProperties, setRentRollProperties] = useState<RentRollProperty[]>([]);
  const [rentRollEntries, setRentRollEntries] = useState<RentRollEntry[]>([]);
  const [rentRollProperty, setRentRollProperty] = useState<string>("all");
  const [rentRollForm, setRentRollForm] = useState({
    propertyName: "",
    unit: "",
    tenant: "",
    status: "Occupied" as RentRollStatus,
    rent: "",
    leaseEnd: "",
    initialDueMonthDay: "",
    bedrooms: "",
    bathrooms: "",
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
  const [linkingPropertyId, setLinkingPropertyId] = useState<string | null>(null);
  const [linkTargetProjectId, setLinkTargetProjectId] = useState<string>("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"main" | "property" | "rentroll">("main");
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [exportHistory, setExportHistory] = useState<{ id: string; type: string; format: string; filename: string; timestamp: string }[]>([]);
  const [statementUploads, setStatementUploads] = useState<{ id: string; name: string; size: number; uploadedAt: string }[]>([]);
  const [parsedStatements, setParsedStatements] = useState<{ uploadId: string; rows: { date: string; description: string; amount: number }[] }[]>([]);
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
      const [propsRes, unitsRes, payRes] = await Promise.all([
        fetch("/api/rent/properties"),
        fetch("/api/rent/units"),
        fetch("/api/rent/payments"),
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
      setActiveProjectId(firstProject?.projectId ?? firstProject?.id ?? null);
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
      const res = await fetch("/api/activities");
      if (!res.ok) return {};
      const data = await res.json();
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
          resources: [],
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
          category: t.category || "",
          subCategory: t.subCategory || undefined,
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
        date: toDateString(toDateMs(t.date)),
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
    const [projectsLoaded, wbsLoaded] = await Promise.all([loadProjects(), loadWbs()]);
    const epsLoaded = await loadEpsNodes();

    // auto-create EPS nodes for projects that don't have one yet
    const epsProjects = new Set((epsLoaded || []).filter((n: any) => n.type === "project").map((n: any) => Number(n.projectId || n.id)));
    const missingProjects = (projectsLoaded || []).filter((p: any) => !epsProjects.has(Number(p.id)));
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
      loadTransactions(),
      loadResourcesFromDb(),
      loadEmployees(),
      loadTimeEntries(),
      loadPaychecks(),
      loadProjectDetailsDb(),
      loadPipelineMeta(),
    ]);
    return { projectsLoaded, wbsLoaded };
  }, [loadActivities, loadEpsNodes, loadEmployees, loadPaychecks, loadPipelineMeta, loadProjectDetailsDb, loadProjects, loadResourcesFromDb, loadTimeEntries, loadTransactions, loadWbs]);
  const [isDetailsPanelVisible, setIsDetailsPanelVisible] = useState(true);
  const [epsViewTab, setEpsViewTab] = useState<"overview" | "gantt">("overview");
  const [activityView, setActivityView] = useState<"details" | "gantt">("details");
  const [ledgerOpen, setLedgerOpen] = useState(false);
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
  const [emailOptionsDialogOpen, setEmailOptionsDialogOpen] = useState(false);
  const [acquireConfirmOpen, setAcquireConfirmOpen] = useState(false);
  const [pendingAcquireProjectId, setPendingAcquireProjectId] = useState<number | null>(null);
  const [laborWeekStart, setLaborWeekStart] = useState(() => getWeekStart(getCentralTodayMs()));
  const [paycheckNumbers, setPaycheckNumbers] = useState<Record<string, string>>({});
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeNameInput, setEmployeeNameInput] = useState("");
  const [employeeRateInput, setEmployeeRateInput] = useState("");

  const rentRollPropertyMap = useMemo(() => {
    return rentRollProperties.reduce<Record<string, RentRollProperty>>((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }, [rentRollProperties]);

  const filteredRentRoll = useMemo(() => {
    if (rentRollProperty === "all") return rentRollEntries;
    return rentRollEntries.filter((entry) => entry.propertyId === rentRollProperty);
  }, [rentRollEntries, rentRollProperty]);
  const paymentRollup = useMemo(() => {
    const todayMs = getCentralTodayMs();
    const todayKey = getMonthKey(toDateString(todayMs));
    const paymentsByEntryMonth: Record<string, Record<string, number>> = {};
    rentPayments.forEach((p) => {
      const key = getMonthKey(p.date);
      paymentsByEntryMonth[p.rentRollEntryId] = paymentsByEntryMonth[p.rentRollEntryId] || {};
      paymentsByEntryMonth[p.rentRollEntryId][key] = (paymentsByEntryMonth[p.rentRollEntryId][key] || 0) + p.amount;
    });

    const map: Record<string, { paid: number; balance: number; monthKey: string; monthLabel: string; dueDate: string; lateFee: number; totalDue: number }> = {};
    rentRollEntries.forEach((entry) => {
      const { month } = parseMonthDay(entry.initialDueMonthDay || "01-01");
      const todayYear = Number(todayKey.split("-")[0]);
      const startKey = `${todayYear}-${String(month).padStart(2, "0")}`;

      const months = monthKeySequence(startKey, todayKey);
      const paymentsForEntry = Object.entries(paymentsByEntryMonth[entry.id] || {}).reduce((sum, [, amt]) => sum + amt, 0);

      let totalLateFeeOutstanding = 0;
      let totalDueOutstanding = 0;
      let remainingPaid = paymentsForEntry;
      let remainingBalance = 0;
      let firstUnpaidKey = months[0];
      let firstUnpaidDueDate = "";

      months.forEach((key, idx) => {
        const dueDate = getMonthDayDate(key, entry.initialDueMonthDay || "01-01");
        // For past months, assume fully late; for current month compute actual lateness
        const daysLate = idx < months.length - 1
          ? 30 // prior months accrue full late fee
          : Math.max(0, Math.floor((todayMs - toDateMs(dueDate)) / DAY_MS));
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
  }, [rentRollEntries, rentPayments]);

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

  const downloadXlsx = useCallback((filename: string, sheets: { name: string; rows: (string | number)[][] }[]) => {
    const xml = toExcelXml(sheets);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
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

  const logExport = useCallback((type: string, format: string, filename: string) => {
    setExportHistory((prev) => [
      { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, format, filename, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const exportMainLedger = () => {
    const rows: (string | number)[][] = [
      ["Date", "Type", "Amount", "Description", "Source", "Property/Project", "Category", "Note"],
    ];
    // Rent payments
    rentPayments.forEach((p) => {
      const entry = rentRollEntries.find((e) => e.id === p.rentRollEntryId);
      const propertyName = entry ? rentRollPropertyMap[entry.propertyId]?.name || "Unlinked Property" : "Unlinked Property";
      const desc = entry ? `Rent payment - ${entry.unit}` : "Rent payment";
      rows.push([p.date, "Income", p.amount, desc, "Rent Payment", propertyName, "Rent", p.note || ""]);
    });
    // Project transactions
    Object.entries(transactions).forEach(([projIdStr, txns]) => {
      const projId = Number(projIdStr);
      const projName = epsProjectNameById(projId) || `Project ${projId}`;
      txns.forEach((t) => {
        rows.push([t.date, t.type, t.amount, t.description, "Project", projName, t.category, t.subCategory || ""]);
      });
    });
    rows.sort((a, b) => toDateMs(String(b[0])) - toDateMs(String(a[0])));
    if (exportFormat === "csv") {
      downloadCsv("main-ledger.csv", rows);
      logExport("Main Ledger", "CSV", "main-ledger.csv");
    } else {
      downloadXlsx("main-ledger.xls", [{ name: "Main Ledger", rows }]);
      logExport("Main Ledger", "XLSX", "main-ledger.xls");
    }
  };

  const exportPropertyLedger = () => {
    if (exportFormat === "csv") {
      rentRollProperties.forEach((prop) => {
        const rows: (string | number)[][] = [["Date", "Type", "Amount", "Description", "Source", "Category", "Note"]];
        const inferredProjectId = getPropertyProjectId(prop);
        const includePayments = isProjectAcquired(inferredProjectId);
        const linkedTxns = inferredProjectId ? (transactions[inferredProjectId] || []) : [];
        linkedTxns
          .slice()
          .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
          .forEach((t) => {
            rows.push([t.date, t.type, t.amount, t.description, "Project", t.category, t.subCategory || ""]);
          });
        if (includePayments) {
          rentPayments
            .filter((p) => rentRollEntries.find((e) => e.id === p.rentRollEntryId)?.propertyId === prop.id)
            .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
            .forEach((p) => {
              const entry = rentRollEntries.find((e) => e.id === p.rentRollEntryId);
              rows.push([p.date, "Income", p.amount, entry ? `Rent payment - ${entry.unit}` : "Rent payment", "Rent Payment", "Rent", p.note || ""]);
            });
        }
        const filename = `property-ledger-${slugify(prop.name)}.csv`;
        downloadCsv(filename, rows);
        logExport(`Property Ledger (${prop.name})`, "CSV", filename);
      });
    } else {
      const sheets = rentRollProperties.map((prop) => {
        const rows: (string | number)[][] = [["Date", "Type", "Amount", "Description", "Source", "Category", "Note"]];
        const inferredProjectId = getPropertyProjectId(prop);
        const includePayments = isProjectAcquired(inferredProjectId);
        const linkedTxns = inferredProjectId ? (transactions[inferredProjectId] || []) : [];
        linkedTxns
          .slice()
          .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
          .forEach((t) => {
            rows.push([t.date, t.type, t.amount, t.description, "Project", t.category, t.subCategory || ""]);
          });
        if (includePayments) {
          rentPayments
            .filter((p) => rentRollEntries.find((e) => e.id === p.rentRollEntryId)?.propertyId === prop.id)
            .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
            .forEach((p) => {
              const entry = rentRollEntries.find((e) => e.id === p.rentRollEntryId);
              rows.push([p.date, "Income", p.amount, entry ? `Rent payment - ${entry.unit}` : "Rent payment", "Rent Payment", "Rent", p.note || ""]);
            });
        }
        return { name: prop.name.slice(0, 28) || "Property", rows };
      });
      downloadXlsx("property-ledgers.xls", sheets);
      logExport("Property Ledgers", "XLSX", "property-ledgers.xls");
    }
  };

  const exportRentRollLedger = () => {
    if (exportFormat === "csv") {
      rentRollProperties.forEach((prop) => {
        const rows: (string | number)[][] = [["Date", "Tenant/Unit", "Amount", "Note"]];
        rentRollEntries
          .filter((e) => e.propertyId === prop.id)
          .forEach((entry) => {
            rentPayments
              .filter((p) => p.rentRollEntryId === entry.id)
              .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
              .forEach((p) => {
                rows.push([p.date, `${entry.unit} - ${entry.tenant || "Vacant"}`, p.amount, p.note || ""]);
              });
          });
        const filename = `rent-roll-${slugify(prop.name)}.csv`;
        downloadCsv(filename, rows);
        logExport(`Rent Roll (${prop.name})`, "CSV", filename);
      });
    } else {
      const sheets = rentRollProperties.map((prop) => {
        const rows: (string | number)[][] = [["Date", "Tenant/Unit", "Amount", "Note"]];
        rentRollEntries
          .filter((e) => e.propertyId === prop.id)
          .forEach((entry) => {
            rentPayments
              .filter((p) => p.rentRollEntryId === entry.id)
              .sort((a, b) => toDateMs(b.date) - toDateMs(a.date))
              .forEach((p) => {
                rows.push([p.date, `${entry.unit} - ${entry.tenant || "Vacant"}`, p.amount, p.note || ""]);
              });
          });
        return { name: prop.name.slice(0, 28), rows };
      });
      downloadXlsx("rent-roll-ledger.xls", sheets);
      logExport("Rent Roll Ledgers", "XLSX", "rent-roll-ledger.xls");
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
    if (mode === "Statements") {
      loadStatements();
    }
    if (mode === "RentRoll") {
      loadRentData();
    }
  }, [mode, loadStatements, loadRentData]);

  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadDbData();
    loadRentData();
  }, [loadDbData, loadRentData]);

  // --- EPS Node Operations ---
  const handleNodeClick = useCallback((node: EpsNode) => {
    setSelectedNodeId(node.id);
    if (node.type === "project") {
      setActiveProjectId(node.projectId ?? node.id);
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

  const handleStartAddWithType = (type: EpsNodeType, parentId: number | null) => {
    setPendingAddConfig({ type, parentId });
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
      setActiveProjectId(project.id ? Number(project.id) : newNode.id);
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

    fetch(`/api/eps?id=${contextMenu.node.id}`, { method: "DELETE" }).catch(err => console.error("Failed to delete eps node", err));
    if (contextMenu.node.type === "project") {
      fetch(`/api/projects?id=${contextMenu.node.id}`, { method: "DELETE" })
        .catch(err => console.error("Failed to delete project", err));
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
  const handleStartNewActivity = () => {
    if (!activeProjectId) return;
    setGanttCreateMode(false);
    setNewActivityDraft(null);
    setNewActivityDialog(true);
  };

  const handleAddActivity = useCallback(async (activity: Activity) => {
    if (!activeProjectId) return;

    try {
      const existingWbs = wbsNodesDb.find(
        (n) => n.projectId === activeProjectId && n.code === activity.wbs
      );
      let wbsId = existingWbs?.id;
      if (!wbsId) {
        const resWbs = await fetch("/api/wbs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProjectId,
            code: activity.wbs || "1.0",
            name: activity.name,
            parentId: null,
            sortOrder: 0,
          }),
        });
        if (resWbs.ok) {
          const data = await resWbs.json();
          wbsId = Number(data.node?.id);
          const createdNode: DbWbsNode = {
            id: wbsId,
            projectId: activeProjectId,
            code: activity.wbs || "1.0",
            name: activity.name,
            parentId: null,
          };
          setWbsNodesDb((prev) => [...prev, createdNode]);
        }
      }

      if (!wbsId) throw new Error("Unable to resolve WBS for activity");

      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          wbsId: wbsId,
          code: activity.wbs || activity.id,
          name: activity.name,
          bucket: activity.bucket,
          property: activity.property,
          priority: "Medium",
          status: activity.status,
          startDate: activity.start,
          finishDate: activity.finish,
          durationDays: activity.duration,
          percentComplete: activity.pct,
          responsible: activity.responsible,
        }),
      });
      if (!res.ok) throw new Error("Failed to create activity");
      const data = await res.json();
      const saved = data.activity || {};
      const mapped: Activity = {
        ...activity,
        id: String(saved.id || activity.id),
        wbs: activity.wbs || "",
      };
      setActivities(prev => ({
        ...prev,
        [activeProjectId]: [...(prev[activeProjectId] || []), mapped]
      }));
    } catch (err) {
      console.error("Failed to add activity", err);
    }
  }, [activeProjectId, wbsNodesDb]);

  const handleUpdateActivity = (
    activityId: string,
    field: keyof Activity,
    value: string
  ) => {
    if (!activeProjectId) return;

    const newValue = field === 'duration' || field === 'pct' || field === 'projectedLabor' || field === 'projectedCost' || field === 'budget' || field === 'revenue'
      ? parseFloat(value)
      : value;

    const payload: any = { id: Number(activityId) };
    if (field === "name") payload.name = value;
    if (field === "status") payload.status = value;
    if (field === "responsible") payload.responsible = value;
    if (field === "duration") payload.durationDays = newValue;
    if (field === "pct") payload.percentComplete = newValue;
    if (field === "start" || field === "finish") {
      const act = activities[activeProjectId]?.find(a => a.id === activityId);
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
      [activeProjectId]: (prev[activeProjectId] || []).map(a =>
        a.id === activityId ? { ...a, [field]: newValue } : a
      )
    }));
  };

  const handleDeleteActivity = () => {
    if (!activeProjectId || !contextMenu.activity) return;

    fetch(`/api/activities?id=${Number(contextMenu.activity.id)}`, { method: "DELETE" })
      .catch(err => console.error("Failed to delete activity", err));

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

  const handleAddTransaction = useCallback(async (transaction: Omit<Transaction, "id">, projectIdOverride?: number) => {
    const targetProjectId = projectIdOverride || activeProjectId;
    if (!targetProjectId) return;
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transaction,
          projectId: targetProjectId,
          activityId: transaction.activityId ? Number(transaction.activityId) : null,
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
        [targetProjectId]: [...(prev[targetProjectId] || []), newTransaction]
      }));
    } catch (err) {
      console.error("Failed to add transaction", err);
    }
  }, [activeProjectId]);

  const handleUpdateTransaction = (transaction: Transaction, projectIdOverride?: number) => {
    const targetProjectId = projectIdOverride || activeProjectId;
    if (!targetProjectId) return;
    fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: Number(transaction.id),
        projectId: targetProjectId,
        activityId: transaction.activityId ? Number(transaction.activityId) : null,
        type: transaction.type,
        category: transaction.category,
        subCategory: transaction.subCategory,
        date: transaction.date,
        amount: transaction.amount,
        description: transaction.description,
      }),
    }).catch(err => console.error("Failed to update transaction", err));
    setTransactions(prev => ({
      ...prev,
      [targetProjectId]: (prev[targetProjectId] || []).map(t => t.id === transaction.id ? transaction : t),
    }));
  };

  const handleDeleteTransaction = (transactionId: string, projectIdOverride?: number) => {
    const targetProjectId = projectIdOverride || activeProjectId;
    if (!targetProjectId) return;
    fetch(`/api/transactions?id=${Number(transactionId)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete transaction", err));
    setTransactions(prev => ({
      ...prev,
      [targetProjectId]: (prev[targetProjectId] || []).filter(t => t.id !== transactionId),
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
    const currentIds = new Set(resources.map(r => r.id));
    const updatedIds = new Set(updatedResources.map(r => r.id));
    // deletions
    resources.forEach((r) => {
      if (!updatedIds.has(r.id) && r.id && !isNaN(Number(r.id))) {
        fetch(`/api/resources?id=${Number(r.id)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete resource", err));
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
    if (!activeProjectId) return;
    const prevDetails = projectDetails[activeProjectId] || [];
    const prevIds = new Set(prevDetails.map(d => d.id));
    const updatedIds = new Set(updatedDetails.map(d => d.id));

    // deletions
    prevDetails.forEach((d) => {
      if (!updatedIds.has(d.id) && d.id && !isNaN(Number(d.id))) {
        fetch(`/api/project-details?id=${Number(d.id)}`, { method: "DELETE" }).catch(err => console.error("Failed to delete project detail", err));
      }
    });

    // upserts
    updatedDetails.forEach((d) => {
      const payload = { projectId: activeProjectId, variable: d.variable, value: d.value };
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
                [activeProjectId]: updatedDetails.map(ud => ud === d ? { ...ud, id: String(detail.id) } : ud),
              }));
            }
          })
          .catch(err => console.error("Failed to create project detail", err));
      }
    });

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
      setActiveProjectId(selectedNode.id);
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

  const handleSaveFormulaPreset = (formula: CustomFormula) => {
    setFormulaPresets((prev) => {
      const existingIdx = prev.findIndex(p => p.id === formula.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = formula;
        return next;
      }
      return [...prev, { ...formula, id: formula.id.startsWith("P") ? formula.id : `P${Date.now()}` }];
    });
  };

  const handleDeletePreset = (presetId: string) => {
    setFormulaPresets(prev => prev.filter(p => p.id !== presetId));
  };

  const handleSaveTaxRate = (taxRate: TaxRate) => {
    setTaxRates((prev) => {
      const idx = prev.findIndex(tr => tr.id === taxRate.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = taxRate;
        return next;
      }
      return [...prev, taxRate];
    });
  };

  const handleDeleteTaxRate = (id: string) => {
    setTaxRates(prev => prev.filter(tr => tr.id !== id));
  };

  const resolveActiveProjectId = () => {
    if (activeProjectId) return activeProjectId;
    if (selectedNode && selectedNode.type === "project") return selectedNode.id;
    return null;
  };

  const handleApplyPresetToProject = (presetId: string) => {
    const projectId = resolveActiveProjectId();
    if (!projectId) return;
    const preset = formulaPresets.find(p => p.id === presetId);
    if (!preset) return;
    const cloned: CustomFormula = { ...preset, id: `CF${Date.now()}` };
    setCustomFormulas(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), cloned],
    }));
    setPresetPickerOpen(false);

    // Auto-generate missing detail variables for this preset and surface them in the details panel
    const placeholderVars = extractVariables(preset.formula);
    const taxVarNames = new Set(Object.keys(taxVariableMap));

    setProjectDetails(prev => {
      const existingDetails = prev[projectId] || [];
      const existingDetailNames = new Set(existingDetails.map(d => d.variable));
      const existingFormulaNames = new Set((customFormulas[projectId] || []).map(f => f.name));

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
        [projectId]: [...existingDetails, ...newDetails],
      };
    });
  };

  const openPresetPicker = () => {
    if (selectedNode && selectedNode.type === "project") {
      setActiveProjectId(selectedNode.id);
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

  const handleProjectStatusChange = (projectId: number, status: ProjectStatus) => {
    const existing = pipelineMeta[projectId] || { seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] as string[], status: "under_contract" as ProjectStatus };
    if (existing.status === "under_contract" && status === "acquired") {
      setPendingAcquireProjectId(projectId);
      setAcquireConfirmOpen(true);
      return;
    }
    const nextMeta = { ...existing, status };
    setPipelineMeta(prev => ({
      ...prev,
      [projectId]: nextMeta,
    }));
    persistPipelineMeta(projectId, nextMeta);
  };

  const confirmAcquire = () => {
    if (pendingAcquireProjectId == null) {
      setAcquireConfirmOpen(false);
      return;
    }
    setPipelineMeta(prev => {
      const existing = prev[pendingAcquireProjectId] || { seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] as string[], status: "under_contract" as ProjectStatus };
      const next = { ...existing, status: "acquired" as ProjectStatus };
      persistPipelineMeta(pendingAcquireProjectId, next);
      return { ...prev, [pendingAcquireProjectId]: next };
    });
    setAcquireConfirmOpen(false);
    setPendingAcquireProjectId(null);
  };

  const epsProjects = useMemo(() => epsNodes.filter(n => n.type === "project"), [epsNodes]);
  const epsProjectMap = useMemo(() => {
    const map: Record<number, string> = {};
    epsProjects.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [epsProjects]);
  const epsProjectNameById = useCallback((id: number | null | undefined) => (id && epsProjectMap[id]) || "", [epsProjectMap]);
  const isProjectAcquired = useCallback((id: number | null | undefined) => {
    if (!id) return true;
    return pipelineMeta[id]?.status === "acquired";
  }, [pipelineMeta]);
  const getPropertyProjectId = useCallback((prop: RentRollProperty) => {
    const inferred = epsProjects.find(p => p.name.toLowerCase() === prop.name.toLowerCase());
    return prop.linkedProjectId ?? inferred?.id ?? null;
  }, [epsProjects]);

  const ensureRentProperty = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = rentRollProperties.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
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
  }, [rentRollProperties]);

  const handleSaveRentRollUnit = async () => {
    const propertyId = await ensureRentProperty(rentRollForm.propertyName);
    if (!propertyId || !rentRollForm.unit.trim()) return;
    const rent = parseFloat(rentRollForm.rent) || 0;
    const bedrooms = parseInt(rentRollForm.bedrooms || "0", 10) || 0;
    const bathrooms = parseInt(rentRollForm.bathrooms || "0", 10) || 0;
    const initialDueMonthDay = rentRollForm.initialDueMonthDay || "01-01";
    if (editingRentRollId) {
      try {
        const res = await fetch("/api/rent/units", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: Number(editingRentRollId),
            propertyId: Number(propertyId),
            unit: rentRollForm.unit.trim(),
            tenant: rentRollForm.tenant.trim() || "Vacant",
            status: rentRollForm.status,
            rent,
            leaseEnd: rentRollForm.leaseEnd || "TBD",
            initialDueMonthDay,
            bedrooms,
            bathrooms,
          }),
        });
        if (!res.ok) throw new Error("Failed to update unit");
        const data = await res.json();
        const unit = data.unit || {};
        setRentRollEntries((prev) =>
          prev.map((entry) =>
            entry.id === editingRentRollId
              ? {
                  ...entry,
                  propertyId,
                  unit: unit.unit || rentRollForm.unit.trim(),
                  tenant: unit.tenant || rentRollForm.tenant.trim() || "Vacant",
                  status: (unit.status as RentRollStatus) || rentRollForm.status,
                  rent: Number(unit.rent ?? rent),
                  leaseEnd: unit.leaseEnd || rentRollForm.leaseEnd || "TBD",
                  initialDueMonthDay: unit.initialDueMonthDay || initialDueMonthDay,
                  bedrooms: Number(unit.bedrooms ?? bedrooms),
                  bathrooms: Number(unit.bathrooms ?? bathrooms),
                }
              : entry
          )
        );
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
            tenant: rentRollForm.tenant.trim() || "Vacant",
            status: rentRollForm.status,
            rent,
            leaseEnd: rentRollForm.leaseEnd || "TBD",
            initialDueMonthDay,
            bedrooms,
            bathrooms,
          }),
        });
        if (!res.ok) throw new Error("Failed to create unit");
        const data = await res.json();
        const unit = data.unit || {};
        const newEntry: RentRollEntry = {
          id: String(unit.id || `RR${Date.now().toString(36)}`),
          propertyId,
          unit: unit.unit || rentRollForm.unit.trim(),
          tenant: unit.tenant || rentRollForm.tenant.trim() || "Vacant",
          status: (unit.status as RentRollStatus) || rentRollForm.status,
          rent: Number(unit.rent ?? rent),
          balance: 0,
          leaseEnd: unit.leaseEnd || rentRollForm.leaseEnd || "TBD",
          initialDueMonthDay: unit.initialDueMonthDay || initialDueMonthDay,
          bedrooms: Number(unit.bedrooms ?? bedrooms),
          bathrooms: Number(unit.bathrooms ?? bathrooms),
        };
        setRentRollEntries((prev) => [...prev, newEntry]);
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
      status: "Occupied" as RentRollStatus,
      rent: "",
      leaseEnd: "",
      initialDueMonthDay: "",
      bedrooms: "",
      bathrooms: "",
    });
  };

  const handleEditRentRoll = (entry: RentRollEntry) => {
    const propertyName = rentRollPropertyMap[entry.propertyId]?.name || "";
    setRentRollForm({
      propertyName,
      unit: entry.unit,
      tenant: entry.tenant === "Vacant" ? "" : entry.tenant,
      status: entry.status,
      rent: entry.rent.toString(),
      leaseEnd: entry.leaseEnd === "TBD" ? "" : entry.leaseEnd,
      initialDueMonthDay: entry.initialDueMonthDay || "",
      bedrooms: entry.bedrooms.toString(),
      bathrooms: entry.bathrooms.toString(),
    });
    setEditingRentRollId(entry.id);
    setRentRollModalOpen(true);
  };

  const handleDeleteRentRoll = (entryId: string) => {
    fetch(`/api/rent/units?id=${Number(entryId)}`, { method: "DELETE" })
      .catch((err) => console.error("Failed to delete unit", err))
      .finally(() => {
        setRentRollEntries((prev) => prev.filter((e) => e.id !== entryId));
        setRentPayments((prev) => prev.filter((p) => p.rentRollEntryId !== entryId));
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

  const addTimeEntry = useCallback((empId: string, date: string, defaultProjectId: number | null) => {
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
  }, []);

  const updateTimeEntry = useCallback((entryId: string, field: "projectId" | "hours", value: number | null) => {
    const patch: any = field === "projectId" ? { projectId: value } : { hours: value };
    fetch("/api/time-entries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(entryId), ...patch }),
    }).catch(err => console.error("Failed to update time entry", err));
    setTimeEntries(prev => prev.map(t => t.id === entryId ? { ...t, [field]: value } : t));
  }, []);

  const deleteTimeEntry = useCallback((entryId: string) => {
    fetch(`/api/time-entries?id=${Number(entryId)}`, { method: "DELETE" })
      .catch(err => console.error("Failed to delete time entry", err))
      .finally(() => {
        setTimeEntries(prev => prev.filter(t => t.id !== entryId));
      });
  }, []);

  const weekHoursForEmployee = useCallback((empId: string) => {
    const startMs = toDateMs(laborWeekStart);
    const endMs = startMs + 6 * DAY_MS;
    return timeEntries
      .filter(t => t.employeeId === empId && toDateMs(t.date) >= startMs && toDateMs(t.date) <= endMs)
      .reduce((sum, t) => sum + (t.hours || 0), 0);
  }, [laborWeekStart, timeEntries]);

  const handleRecordPaycheck = (emp: Employee) => {
    const hours = weekHoursForEmployee(emp.id);
    const amount = hours * emp.rate;
    const checkNumber = paycheckNumbers[emp.id] || "";
    if (!checkNumber.trim()) {
      alert("Enter a check number before recording paycheck.");
      return;
    }

    // group hours by project for the selected week
    const startMs = toDateMs(laborWeekStart);
    const endMs = startMs + 6 * DAY_MS;
    const weekEntries = timeEntries.filter(
      t => t.employeeId === emp.id && toDateMs(t.date) >= startMs && toDateMs(t.date) <= endMs && t.projectId
    );
    const hoursByProject = new Map<number, number>();
    weekEntries.forEach((t) => {
      if (!t.projectId) return;
      hoursByProject.set(t.projectId, (hoursByProject.get(t.projectId) || 0) + (t.hours || 0));
    });

    hoursByProject.forEach((projHours, projId) => {
      const projAmount = projHours * emp.rate;
      handleAddTransaction(
        {
          date: laborWeekStart,
          description: `Paycheck - ${emp.name} - ${formatCurrencyCents(projAmount)}`,
          type: "Outcome",
          category: "Labor",
          subCategory: "Payroll",
          amount: projAmount,
        },
        projId
      );
    });

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
    setActiveProjectId(projectId);
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
  const activeProject = activeProjectId ? findNode(epsNodes, activeProjectId) : null;
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

  const selectedProjectActivities = (selectedNode && activities[selectedNode.id]) || [];
  const selectedProjectTransactions = (selectedNode && transactions[selectedNode.id]) || [];
  const selectedProjectDetails = (selectedNode && selectedNode.type === "project" && projectDetails[selectedNode.id]) || [];
  const selectedCustomFormulas = (selectedNode && selectedNode.type === "project" && customFormulas[selectedNode.id]) || [];

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
                  onClick={() => { setRentRollModalOpen(true); setEditingRentRollId(null); setRentRollForm({ propertyName: "", unit: "", tenant: "", status: "Occupied", rent: "", leaseEnd: "", initialDueMonthDay: "", bedrooms: "", bathrooms: "" }); }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  + New Rental
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportMainLedger}
                    className="px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Export Main Ledger
                  </button>
                  <button
                    onClick={exportPropertyLedger}
                    className="px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Export Property Ledgers
                  </button>
                  <button
                    onClick={exportRentRollLedger}
                    className="px-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Export Rent Roll Ledger
                  </button>
                </div>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Occupancy</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{rentRollSummary.occupancyRate}%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Occupied {rentRollSummary.occupiedUnits} / {rentRollSummary.totalUnits}</div>
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
                      <tr key={entry.id} className={rowBg}>
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{propertyName}</td>
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
                              onClick={() => handleEditRentRoll(entry)}
                              className="px-2 py-1 text-xs rounded-md bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleOpenPaymentModal(entry)}
                              disabled={(paymentRollup[entry.id]?.balance ?? entry.rent) <= 0}
                              className={`px-2 py-1 text-xs rounded-md ${((paymentRollup[entry.id]?.balance ?? entry.rent) <= 0) ? "bg-emerald-900/40 text-emerald-200 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            >
                              {((paymentRollup[entry.id]?.balance ?? entry.rent) <= 0) ? "Paid" : "Payment"}
                            </button>
                            <button
                              onClick={() => { setLinkingPropertyId(entry.propertyId); setLinkTargetProjectId(rentRollPropertyMap[entry.propertyId]?.linkedProjectId != null ? String(rentRollPropertyMap[entry.propertyId]?.linkedProjectId) : ""); }}
                              className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Link
                            </button>
                            <button
                              onClick={() => setRentRollDeleteModal({ open: true, entry })}
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
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EXPORTS VIEW
  // ---------------------------------------------------------------------------
  if (mode === "Exports") {
    return (
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <TopBar title="Exports" projectName="Data Exports" onModeChange={setMode} currentMode={mode} />
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
                    </tr>
                  </thead>
                  <tbody>
                    {exportHistory.map((h, idx) => (
                      <tr key={h.id} className={idx % 2 === 0 ? "" : "bg-slate-50 dark:bg-slate-800/60"}>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{new Date(h.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.type}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.format}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{h.filename}</td>
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
                    onChange={(e) => setExportType(e.target.value as any)}
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
        <TopBar title="Bank Statements" projectName="Uploads" onModeChange={setMode} currentMode={mode} />
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
                              {upload?.name || "Statement"} — {parsed.rows.length} lines
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
        <ActionRibbon
          onOpenTaxRates={() => setTaxRateDialogOpen(true)}
          onManagePresets={() => setFormulaPresetDialogOpen(true)}
          onCreateFormula={handleCreateFormula}
          onAddPresetToProject={openPresetPicker}
          taxRateCount={taxRates.length}
          presetCount={formulaPresets.length}
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
                                      {laborProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
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
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <button
                                  onClick={() => addTimeEntry(emp.id, d.date, laborProjects[0]?.id ?? null)}
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
                  {paychecks.slice(-5).reverse().map(pc => {
                    const emp = employees.find(e => e.id === pc.employeeId);
                    return (
                      <div key={pc.id} className="flex items-center justify-between rounded bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                        <span>{emp?.name || pc.employeeId} • Week of {pc.weekStart} • Check #{pc.checkNumber}</span>
                        <span className="font-semibold">${pc.amount.toFixed(2)}</span>
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
  if (mode === "Activities" && activeProject) {
    const projectActivities = activities[activeProject.id] || [];
    const projectTransactions = transactions[activeProject.id] || [];
    const currentProjectDetails = projectDetails[activeProject.id] || [];
    const currentCustomFormulas = customFormulas[activeProject.id] || [];
    const projectMeta = pipelineMeta[activeProject.id] || { status: "under_contract", seller: { name: "", phone: "", email: "" }, selectedEmailOptionIds: [] };

    const { totalActualCost } = calculateProjectStats(projectActivities, projectTransactions);
    const { totalBudget, totalActualCost: totalActualCostFin, totalRevenue, profit } = calculateFinancialKPIs(projectActivities, projectTransactions);
    const todayWeekStart = getWeekStart(getCentralTodayMs());
    const todayWeekEnd = toDateString(toDateMs(todayWeekStart) + 6 * DAY_MS);
    const todayMonthLabel = new Date(toDateMs(todayWeekStart)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const draftDuration = newActivityDraft
      ? Math.max(1, Math.round((toDateMs(newActivityDraft.finish) - toDateMs(newActivityDraft.start)) / DAY_MS) + 1)
      : null;

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
                onUpdateDetail={(variable, value) => upsertProjectDetail(activeProject.id, variable, value)}
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
        {activityView !== "gantt" && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                Acquired
              </span>
              <span className="text-slate-600 dark:text-slate-300">Project is acquired. You can revert to Not Acquired if needed.</span>
            </div>
            <button
              onClick={() => handleProjectStatusChange(activeProject.id, "under_contract")}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Mark Not Acquired
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-80 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 flex flex-col flex-shrink-0 overflow-y-auto">
            <div className="border-b border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50 px-3 py-2 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {activityView === "gantt" ? "Activity Hierarchy" : "Project Explorer"}
                </h3>
                <button
                  onClick={() => setMode("EPS")}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ← Back to EPS
                </button>
              </div>
            </div>
            {activityView === "gantt" ? (
              <div className="p-3 space-y-1">
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
            )}

            {activityView !== "gantt" && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <IconFunction /> Custom Formulas
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
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

          <main className={`flex-1 flex flex-col overflow-hidden transition-[padding] duration-300 ${isDetailsPanelVisible ? 'md:pr-80' : 'pr-0'}`}>
        <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-300 bg-white p-1 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">Week: {todayWeekStart} – {todayWeekEnd}</span>
                <span className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">Month: {todayMonthLabel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 h-full">
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

            <ProjectLedger
              projectId={activeProject.id}
              activities={projectActivities}
              transactions={projectTransactions}
              onAddTransaction={(t) => handleAddTransaction(t, activeProject.id)}
              onUpdateTransaction={(t) => handleUpdateTransaction(t, activeProject.id)}
              onDeleteTransaction={(id) => handleDeleteTransaction(id, activeProject.id)}
              isOpen={ledgerOpen}
              setIsOpen={setLedgerOpen}
              draftActivityId={quickLedgerActivityId}
              setDraftActivityId={setQuickLedgerActivityId}
            />
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
      <TopBar title="EPS" currentMode={mode} onModeChange={setMode} />
      <ActionRibbon
        onOpenTaxRates={() => setTaxRateDialogOpen(true)}
        onManagePresets={() => setFormulaPresetDialogOpen(true)}
        onCreateFormula={handleCreateFormula}
        onAddPresetToProject={openPresetPicker}
        taxRateCount={taxRates.length}
        presetCount={formulaPresets.length}
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
                            onClick={() => handleProjectStatusChange(selectedNode.id, "under_contract")}
                            className={`px-3 py-1 rounded-full ${pipelineMeta[selectedNode.id]?.status === "under_contract" ? "bg-amber-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            Not Acquired
                          </button>
                          <button
                            onClick={() => handleProjectStatusChange(selectedNode.id, "acquired")}
                            className={`px-3 py-1 rounded-full ${pipelineMeta[selectedNode.id]?.status === "acquired" ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-300"}`}
                          >
                            Acquired
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleProjectSelect(selectedNode.id)}
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
                  onAddPreset={() => {
                    setActiveProjectId(selectedNode.id);
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
