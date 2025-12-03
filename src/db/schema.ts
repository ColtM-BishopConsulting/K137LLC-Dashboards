import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
// WBS NODES
// ----------------------------
export const wbsNodes = pgTable("wbs_nodes", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  code: varchar("code", { length: 32 }).notNull(),          // e.g. FD.1
  name: varchar("name", { length: 255 }).notNull(),

  parentId: integer("parent_id").references(() => wbsNodes.id, {
    onDelete: "cascade",
  }),

  sortOrder: integer("sort_order").default(0).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

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
