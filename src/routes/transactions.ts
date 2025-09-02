import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { db } from "../db/client";
import { accounts, transactions } from "../db/schema";
import { eq, sql } from "drizzle-orm"; // <- eq for where, sql for arithmetic

const router = express.Router();

// Deposit
router.post("/:accountId/deposit", authenticate, async (req: AuthRequest, res) => {
  const { amount, note } = req.body;
  const { accountId } = req.params;

  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

  try {
    // Update balance
    await db.update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, accountId));

    const tx = await db.insert(transactions).values({
      accountId,
      type: "deposit",
      amount,
      note,
    }).returning();

    res.json(tx[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Withdraw (with PIN)
router.post("/:accountId/withdraw", authenticate, async (req: AuthRequest, res) => {
  const { amount, note, pin } = req.body;
  const { accountId } = req.params;

  if (!amount || amount <= 0 || !pin) return res.status(400).json({ error: "Invalid request" });

  try {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId));
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.pin !== pin) return res.status(401).json({ error: "Invalid PIN" });
    if ((account.balance ?? 0) < amount) return res.status(400).json({ error: "Insufficient funds" });

    await db.update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, accountId));

    const tx = await db.insert(transactions).values({
      accountId,
      type: "withdraw",
      amount,
      note,
    }).returning();

    res.json(tx[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
