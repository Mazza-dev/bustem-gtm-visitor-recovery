import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull(),
  kind: text("kind").notNull(),
  source: text("source").notNull().default("direct"),
  page: text("page").notNull().default("/"),
  createdAt: text("created_at").notNull(),
});

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitorId: text("visitor_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  brandUrl: text("brand_url").notNull(),
  company: text("company").notNull(),
  reportSummary: text("report_summary").notNull().default(""),
  reportUrl: text("report_url").notNull().default(""),
  status: text("status").notNull().default("submitted"),
  submittedAt: text("submitted_at").notNull(),
  reportSentAt: text("report_sent_at"),
  lastActivityAt: text("last_activity_at").notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  source: text("source").notNull().default("manual"),
});

export const followups = sqliteTable("followups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").notNull(),
  contactId: integer("contact_id"),
  channel: text("channel").notNull(),
  message: text("message").notNull(),
  state: text("state").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
});
