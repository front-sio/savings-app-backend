// src/db/schema.ts
import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { pgTable, pgEnum, uuid, varchar, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Enable UUID generation in PostgreSQL before running migrations:
 * CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 */

/**
 * Gender enum
 */
export const GenderEnum = pgEnum("gender_enum", ["male", "female"]);

/**
 * Users table
 */
export const users = pgTable("users", {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  username: varchar("username", { length: 50 }).unique(),
  password: text("password").notNull(),
  pin: text("pin"), // hashed PIN
  gender: GenderEnum("gender").notNull(),
  street: text("street"),
  ward: text("ward"),
  city: text("city"),
  country: text("country"),
  postal_code: text("postal_code"),
  createdAt: timestamp("created_at").defaultNow(),
});


export const pin_attempts = pgTable("pin_attempts", {
  userId: uuid("user_id").primaryKey(),
  count: integer("count").default(0),
  lastAttempt: timestamp("last_attempt").defaultNow(),
});


/**
 * Accounts table
 */
// src/db/schema.ts
export const accounts = pgTable("accounts", {
  id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  phone: varchar("phone", { length: 20 }).unique(),
  balance: integer("balance").default(0),
  targetAmount: integer("target_amount").default(0),  // new field: target for this account
  planType: varchar("plan_type", { length: 50 }),     // 'project' or 'goal'
  planNote: text("plan_note"),                        // additional notes
  isMain: boolean("is_main").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});


/**
 * Transactions table
 */
export const transactions = pgTable("transactions", {
 id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  type: varchar("type", { length: 50 }).notNull(), // deposit / withdraw
  amount: integer("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Withdrawal requests table
 */
export const withdrawalRequests = pgTable("withdrawal_requests", {
 id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  reason: text("reason"),
  documentUrl: text("document_url"),
  status: text("status").default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});





