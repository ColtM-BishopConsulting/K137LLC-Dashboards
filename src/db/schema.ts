import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  timestamp,
  numeric,
  text,
  foreignKey,
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
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "eps_nodes_parent_fk",
    onDelete: "set null",
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

// ----------------------------
// TRANSACTIONS / LEDGER
// ----------------------------
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  activityId: integer("activity_id").references(() => activities.id, { onDelete: "set null" }),
  type: varchar("type", { length: 16 }).notNull(), // Income | Outcome
  category: varchar("category", { length: 128 }).notNull(),
  subCategory: varchar("sub_category", { length: 128 }),
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
