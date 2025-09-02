import { pgTable, text, timestamp, uuid, boolean, numeric, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  name: text("name"),
  phone: text("phone"),
  acceptedTos: boolean("accepted_tos").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savingsPlans = pgTable("savings_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: text("frequency").notNull(), // daily, weekly, monthly
  nextDue: timestamp("next_due"),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("active"),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  savingsPlanId: uuid("savings_plan_id").references(() => savingsPlans.id),
  type: text("type").notNull(), // deposit | withdrawal
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  reason: text("reason"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("pending"),
});
