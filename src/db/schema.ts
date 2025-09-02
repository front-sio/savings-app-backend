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
  phone: varchar("phone", { length: 20 }).unique(), // Allow null
  email: varchar("email", { length: 255 }).unique(), // Allow null
  username: varchar("username", { length: 50 }).unique(), // Allow null
  password: text("password").notNull(),
  gender: GenderEnum("gender").notNull(),
  street: text("street"),
  ward: text("ward"),
  city: text("city"),
  country: text("country"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Accounts table
 */
export const accounts = pgTable("accounts", {
 id: uuid('id').default(sql`uuid_generate_v4()`).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  phone: varchar("phone", { length: 20 }).unique(),
  pin: text("pin"),
  balance: integer("balance").default(0),
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
