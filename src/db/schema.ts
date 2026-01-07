import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  boolean,
  timestamp,
  numeric,
  text,
  foreignKey,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ----------------------------
// PROJECTS
// ----------------------------
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),

  code: varchar("code", { length: 32 }).notNull(),         // e.g. KFX-2025
  name: varchar("name", { length: 255 }).notNull(),
  bank: varchar("bank", { length: 128 }),                  // lender/bank reference

  status: varchar("status", { length: 32 }).default("Active").notNull(),

  startDate: date("start_date").notNull(),
  finishDate: date("finish_date"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ----------------------------
// PROJECT PIPELINE META
// ----------------------------
export const projectPipelineMeta = pgTable("project_pipeline_meta", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).default("under_contract").notNull(),
  sellerName: varchar("seller_name", { length: 255 }).default(""),
  sellerPhone: varchar("seller_phone", { length: 64 }).default(""),
  sellerEmail: varchar("seller_email", { length: 255 }).default(""),
  selectedEmailOptionIds: text("selected_email_option_ids").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT DETAILS (variable/value pairs)
// ----------------------------
export const projectDetails = pgTable("project_details", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  variable: varchar("variable", { length: 255 }).notNull(),
  value: text("value").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT UTILITIES
// ----------------------------
export const projectUtilities = pgTable("project_utilities", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  service: varchar("service", { length: 128 }).notNull(),
  provider: varchar("provider", { length: 128 }).default(""),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT DRAWS
// ----------------------------
export const projectDraws = pgTable("project_draws", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT LOANS
// ----------------------------
export const projectLoans = pgTable("project_loans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  payment: numeric("payment", { precision: 14, scale: 2 }).notNull(),
  interest: numeric("interest", { precision: 14, scale: 2 }).default("0"),
  principal: numeric("principal", { precision: 14, scale: 2 }).default("0"),
  balance: numeric("balance", { precision: 14, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT PROPERTY TAXES
// ----------------------------
export const projectPropertyTaxes = pgTable("project_property_taxes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  taxYear: integer("tax_year").notNull(),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).default("due").notNull(),
  paidDate: date("paid_date"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// COST CATEGORIES (GLOBAL)
// ----------------------------
export const costCategories = pgTable("cost_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  code: varchar("code", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT COST OVERRIDES
// ----------------------------
export const projectCostOverrides = pgTable(
  "project_cost_overrides",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => costCategories.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (table) => ({
    uniqueProjectCategory: uniqueIndex("project_cost_overrides_unique").on(table.projectId, table.categoryId),
  })
);

// ----------------------------
// BREAKDOWN PRESETS (GLOBAL)
// ----------------------------
export const breakdownPresets = pgTable("breakdown_presets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const breakdownPresetItems = pgTable("breakdown_preset_items", {
  id: serial("id").primaryKey(),
  presetId: integer("preset_id")
    .notNull()
    .references(() => breakdownPresets.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => costCategories.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0).notNull(),
  include: boolean("include").default(true).notNull(),
});

export const projectBreakdownPrefs = pgTable(
  "project_breakdown_prefs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    presetId: integer("preset_id")
      .notNull()
      .references(() => breakdownPresets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (table) => ({
    uniqueProject: uniqueIndex("project_breakdown_prefs_unique").on(table.projectId),
  })
);

// ----------------------------
// KPI PRESETS (GLOBAL)
// ----------------------------
export const kpiPresets = pgTable("kpi_presets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const kpiPresetItems = pgTable("kpi_preset_items", {
  id: serial("id").primaryKey(),
  presetId: integer("preset_id")
    .notNull()
    .references(() => kpiPresets.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 128 }).notNull(),
  formula: text("formula").notNull(),
  resultType: varchar("result_type", { length: 32 }).default("currency").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  scaleMin: numeric("scale_min", { precision: 14, scale: 2 }),
  scaleMax: numeric("scale_max", { precision: 14, scale: 2 }),
  scaleInvert: boolean("scale_invert").default(false).notNull(),
});

export const projectKpiPrefs = pgTable(
  "project_kpi_prefs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    presetId: integer("preset_id")
      .notNull()
      .references(() => kpiPresets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (table) => ({
    uniqueProject: uniqueIndex("project_kpi_prefs_unique").on(table.projectId),
  })
);

export const projectKpiOverrides = pgTable(
  "project_kpi_overrides",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => kpiPresetItems.id, { onDelete: "cascade" }),
    overrideValue: numeric("override_value", { precision: 14, scale: 2 }).default("0").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  },
  (table) => ({
    uniqueProjectItem: uniqueIndex("project_kpi_overrides_unique").on(table.projectId, table.itemId),
  })
);

// ----------------------------
// PROJECT ACQUISITION + CLOSING COSTS
// ----------------------------
export const projectAcquisitions = pgTable("project_acquisitions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }).default("0"),
  acquisitionDraw: numeric("acquisition_draw", { precision: 14, scale: 2 }).default("0"),
  earnestMoney: numeric("earnest_money", { precision: 14, scale: 2 }).default("0"),
  closeDate: date("close_date"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const projectClosingCosts = pgTable("project_closing_costs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  side: varchar("side", { length: 16 }).notNull(), // purchase | sale
  code: varchar("code", { length: 64 }),
  label: varchar("label", { length: 128 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
  paid: boolean("paid").default(false).notNull(),
  paidDate: date("paid_date"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT DEBT SERVICE
// ----------------------------
export const projectDebtService = pgTable("project_debt_service", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  bank: varchar("bank", { length: 128 }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0").notNull(),
  payment: numeric("payment", { precision: 14, scale: 2 }).default("0").notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 3 }).default("0").notNull(),
  rateType: varchar("rate_type", { length: 16 }).default("fixed").notNull(),
  rateAdjustDate: date("rate_adjust_date"),
  maturityDate: date("maturity_date"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// PROJECT CUSTOM FORMULAS
// ----------------------------
export const formulas = pgTable("formulas", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  formula: text("formula").notNull(),
  description: text("description"),
  resultType: varchar("result_type", { length: 32 }).default("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// FORMULA PRESETS (GLOBAL)
// ----------------------------
export const formulaPresets = pgTable("formula_presets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  formula: text("formula").notNull(),
  description: text("description"),
  resultType: varchar("result_type", { length: 32 }).default("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// TAX RATES
// ----------------------------
export const taxRates = pgTable("tax_rates", {
  id: serial("id").primaryKey(),
  county: varchar("county", { length: 255 }).notNull(),
  state: varchar("state", { length: 64 }),
  rate: numeric("rate", { precision: 6, scale: 3 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// USERS (AUTH)
// ----------------------------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 32 }).notNull().default("viewer"),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// DASHBOARD PRESENCE
// ----------------------------
export const dashboardPresence = pgTable(
  "dashboard_presence",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).default(sql`now()`).notNull(),
  },
  (table) => ({
    userSessionUnique: uniqueIndex("dashboard_presence_user_session_idx").on(
      table.userId,
      table.sessionId
    ),
  })
);

// ----------------------------
// COMMITS (STAGING) + CHANGES
// ----------------------------
export const commits = pgTable("commits", {
  id: serial("id").primaryKey(),
  serial: varchar("serial", { length: 64 }).notNull().unique(),
  description: text("description"),
  tags: text("tags").array(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
});

export const commitChanges = pgTable("commit_changes", {
  id: serial("id").primaryKey(),
  commitId: integer("commit_id").notNull().references(() => commits.id, { onDelete: "cascade" }),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: integer("entity_id"),
  operation: varchar("operation", { length: 32 }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  impact: text("impact"),
});

// ----------------------------
// EPS NODES (ENTERPRISE TREE)
// ----------------------------
export const epsNodes = pgTable("eps_nodes", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  type: varchar("type", { length: 32 }).notNull(), // enterprise | business_unit | portfolio | company | project
  name: varchar("name", { length: 255 }).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  parentFk:
    // Drizzle's `foreignKey` typing doesn't expose onDelete, but we want cascade in DB
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "eps_nodes_parent_fk",
    }),
}));

export const epsNodesRelations = relations(epsNodes, ({ one, many }) => ({
  parent: one(epsNodes, {
    fields: [epsNodes.parentId],
    references: [epsNodes.id],
    relationName: "eps_children",
  }),
  children: many(epsNodes, { relationName: "eps_children" }),
  project: one(projects, {
    fields: [epsNodes.projectId],
    references: [projects.id],
  }),
}));

// ----------------------------
// WBS NODES
// ----------------------------



export const wbsNodes = pgTable("wbs_nodes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`now()`),
});

export type WbsNode = typeof wbsNodes.$inferSelect;


export const wbsNodesRelations = relations(wbsNodes, ({ one, many }) => ({
  // each node’s parent (nullable)
  parent: one(wbsNodes, {
    fields: [wbsNodes.parentId],
    references: [wbsNodes.id],
    relationName: "children", // 👈 tie to the "children" side
  }),

  // each node’s children (the inverse of the relation above)
  children: many(wbsNodes, {
    relationName: "children",
  }),
}));

// ----------------------------
// ACTIVITIES (TASKS)
// ----------------------------
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  wbsId: integer("wbs_id")
    .notNull()
    .references(() => wbsNodes.id, { onDelete: "cascade" }),

  code: varchar("code", { length: 32 }).notNull(),          // e.g. FD.1.1
  name: varchar("name", { length: 255 }).notNull(),

  bucket: varchar("bucket", { length: 128 }),               // Ops / Finance / Property Management, Auto-categorization
  property: varchar("property", { length: 255 }),           // “202 Live Oak”, “2509 Hemphill”, etc.

  priority: varchar("priority", { length: 16 }).default("Medium").notNull(),
  status: varchar("status", { length: 32 }).default("Planned").notNull(),

  startDate: date("start_date").notNull(),
  finishDate: date("finish_date").notNull(),

  durationDays: integer("duration_days").notNull(),
  percentComplete: integer("percent_complete").default(0).notNull(),

  responsible: varchar("responsible", { length: 255 }),      // Colten / Bobby / Finance / PM, etc.
  projectedLabor: numeric("projected_labor", { precision: 14, scale: 2 }).default("0").notNull(),
  projectedCost: numeric("projected_cost", { precision: 14, scale: 2 }).default("0").notNull(),
  budget: numeric("budget", { precision: 14, scale: 2 }).default("0").notNull(),
  revenue: numeric("revenue", { precision: 14, scale: 2 }).default("0").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ----------------------------
// RESOURCES
// ----------------------------
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),         // e.g. Colten McGee
  role: varchar("role", { length: 128 }).notNull(),         // e.g. Finance / Maintenance / Contractor

  costType: varchar("cost_type", { length: 32 }).default("Labor").notNull(),  // Labor / Material / Subcontract
  unitType: varchar("unit_type", { length: 32 }).default("Hours").notNull(),  // Hours / Each / Lump Sum

  standardRate: numeric("standard_rate", { precision: 12, scale: 2 }).default("0"),
  overtimeRate: numeric("overtime_rate", { precision: 12, scale: 2 }).default("0"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// ----------------------------
// STATEMENTS (UPLOADS) & LINES
// ----------------------------
export const statementUploads = pgTable("statement_uploads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  size: integer("size").default(0).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).default(sql`now()`).notNull(),
});

export const statementLines = pgTable("statement_lines", {
  id: serial("id").primaryKey(),
  uploadId: integer("upload_id")
    .notNull()
    .references(() => statementUploads.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
});

// ----------------------------
// RENT ROLL
// ----------------------------
export const rentProperties = pgTable("rent_properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  linkedProjectId: integer("linked_project_id").references(() => projects.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const rentUnits = pgTable("rent_units", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id")
    .notNull()
    .references(() => rentProperties.id, { onDelete: "cascade" }),
  unit: varchar("unit", { length: 128 }).notNull(),
  tenant: varchar("tenant", { length: 255 }),
  status: varchar("status", { length: 32 }).default("Occupied").notNull(), // Occupied | Vacant | Notice
  rent: numeric("rent", { precision: 12, scale: 2 }).notNull(),
    leaseEnd: varchar("lease_end", { length: 64 }), // keep as string to match existing UI input
    initialDueMonthDay: varchar("initial_due_month_day", { length: 8 }).default("01-01").notNull(),
    bedrooms: integer("bedrooms").default(0),
    bathrooms: integer("bathrooms").default(0),
    lastPaymentDate: date("last_payment_date"),
    lastPaymentPaidOnDate: boolean("last_payment_paid_on_date"),
    lastPaymentPaidDate: date("last_payment_paid_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  });

export const rentPayments = pgTable("rent_payments", {
  id: serial("id").primaryKey(),
  rentUnitId: integer("rent_unit_id")
    .notNull()
    .references(() => rentUnits.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const rentDocuments = pgTable("rent_documents", {
  id: serial("id").primaryKey(),
  rentUnitId: integer("rent_unit_id")
    .notNull()
    .references(() => rentUnits.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 128 }).notNull(),
  size: integer("size").notNull(),
  dataUrl: text("data_url").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).default(sql`now()`),
});

export const rentExpenseCategories = pgTable("rent_expense_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  parentFk:
    // Drizzle's `foreignKey` typing doesn't expose onDelete, but we want cascade in DB
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "rent_expense_categories_parent_fk",
    }),
}));

export const rentExpenses = pgTable("rent_expenses", {
  id: serial("id").primaryKey(),
  rentUnitId: integer("rent_unit_id")
    .notNull()
    .references(() => rentUnits.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  category: varchar("category", { length: 128 }),
  categoryId: integer("category_id").references(() => rentExpenseCategories.id, { onDelete: "set null" }),
  subCategoryId: integer("sub_category_id").references(() => rentExpenseCategories.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// TRANSACTIONS / LEDGER
// ----------------------------
export const ledgerCategories = pgTable("ledger_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  parentFk:
    // Drizzle's `foreignKey` typing doesn't expose onDelete, but we want cascade in DB
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "ledger_categories_parent_fk",
    }),
}));

export const ledgerAccounts = pgTable("ledger_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 32 }).default("bank").notNull(),
  institution: varchar("institution", { length: 128 }),
  last4: varchar("last4", { length: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const ledgerTransactions = pgTable("ledger_transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "set null" }),
  type: varchar("type", { length: 16 }).notNull(), // Income | Outcome
  categoryId: integer("category_id").references(() => ledgerCategories.id, { onDelete: "set null" }),
  category: varchar("category", { length: 128 }).notNull(),
  subCategoryId: integer("sub_category_id").references(() => ledgerCategories.id, { onDelete: "set null" }),
  subCategory: varchar("sub_category", { length: 128 }),
  accountId: integer("account_id").references(() => ledgerAccounts.id, { onDelete: "set null" }),
  accountName: varchar("account_name", { length: 128 }),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// EMPLOYEES / LABOR
// ----------------------------
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  rate: numeric("rate", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  hours: numeric("hours", { precision: 8, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const paychecks = pgTable("paychecks", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  checkNumber: varchar("check_number", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// EXPORT LOGS
// ----------------------------
export const exportLogs = pgTable("export_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  format: varchar("format", { length: 16 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

// ----------------------------
// RESOURCE ASSIGNMENTS
// ----------------------------
export const resourceAssignments = pgTable("resource_assignments", {
  id: serial("id").primaryKey(),

  activityId: integer("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),

  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),

  plannedUnits: numeric("planned_units", { precision: 12, scale: 2 }).default("0"),  // hours or qty
  plannedCost: numeric("planned_cost", { precision: 14, scale: 2 }).default("0"),    // total cost

  unitType: varchar("unit_type", { length: 32 }).default("Hours").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});
