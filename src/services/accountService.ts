import { db } from "../db/client";
import { accounts, transactions, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyPin, recordPinAttempt } from "./authService";

interface PinRequest {
  userId: string;
  accountId: string;
  amount: number;
  pin: string;
  note?: string;
}

export async function depositWithPin({ userId, accountId, amount, pin, note }: PinRequest) {
  const userRow = await db.select().from(users).where(eq(users.id, userId));
  const user = userRow[0];
  if (!user) throw new Error("User not found");
  if (!user.pin) throw new Error("User PIN not set");

  const valid = await verifyPin(pin, user.pin);
  recordPinAttempt(userId, valid);

  return db.transaction(async (tx) => {
    const [transaction] = await tx.insert(transactions)
      .values({ accountId, type: "deposit", amount, note })
      .returning();

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, accountId));

    return transaction;
  });
}

export async function withdrawWithPin({ userId, accountId, amount, pin, note }: PinRequest) {
  const userRow = await db.select().from(users).where(eq(users.id, userId));
  const user = userRow[0];
  if (!user) throw new Error("User not found");
  if (!user.pin) throw new Error("User PIN not set");

  const valid = await verifyPin(pin, user.pin);
  recordPinAttempt(userId, valid);

  const accountRow = await db.select().from(accounts).where(eq(accounts.id, accountId));
  const account = accountRow[0];
  if (!account) throw new Error("Account not found");
  if (account.balance === null || account.balance === undefined) throw new Error("Account balance invalid");
  if (account.balance < amount) throw new Error("Insufficient balance");

  return db.transaction(async (tx) => {
    const [transaction] = await tx.insert(transactions)
      .values({ accountId, type: "withdraw", amount, note })
      .returning();

    await tx.update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, accountId));

    return transaction;
  });
}
