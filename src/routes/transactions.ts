import express, { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { accounts, transactions } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { io } from "../app"; // import Socket.IO instance

const router = express.Router();

// Extend Express.Request to include userId
interface AuthRequest extends Request {
  userId?: string;
}

// --------------------
// Auth Middleware
// --------------------
async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });

  try {
    const token = header.replace("Bearer ", "");
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --------------------
// Deposit
// --------------------
router.post("/:accountId/deposit", auth, async (req: AuthRequest, res: Response) => {
  const { amount, note } = req.body;
  const { accountId } = req.params;

  try {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.userId!)));

    if (!account) return res.status(404).json({ error: "Account not found" });

    const insertedTransaction = await db.insert(transactions).values({
      accountId,
      type: "deposit",
      amount,
      note,
    }).returning();

    await db.update(accounts)
      .set({ balance: (account.balance ?? 0) + amount })
      .where(eq(accounts.id, accountId));

    // Emit real-time update
    const updatedAccounts = await db.select().from(accounts)
      .where(eq(accounts.userId, req.userId!));

    io.emit("accounts_update", { userId: req.userId, accounts: updatedAccounts });
    io.emit("transactions_update", { accountId, transaction: insertedTransaction[0] });

    res.json({ success: true, transaction: insertedTransaction[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Withdraw
// --------------------
router.post("/:accountId/withdraw", auth, async (req: AuthRequest, res: Response) => {
  const { amount, note } = req.body;
  const { accountId } = req.params;

  try {
    const [account] = await db.select().from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, req.userId!)));

    if (!account) return res.status(404).json({ error: "Account not found" });
    if ((account.balance ?? 0) < amount) return res.status(400).json({ error: "Insufficient funds" });

    const insertedTransaction = await db.insert(transactions).values({
      accountId,
      type: "withdraw",
      amount,
      note,
    }).returning();

    await db.update(accounts)
      .set({ balance: (account.balance ?? 0) - amount })
      .where(eq(accounts.id, accountId));

    // Emit real-time update
    const updatedAccounts = await db.select().from(accounts)
      .where(eq(accounts.userId, req.userId!));

    io.emit("accounts_update", { userId: req.userId, accounts: updatedAccounts });
    io.emit("transactions_update", { accountId, transaction: insertedTransaction[0] });

    res.json({ success: true, transaction: insertedTransaction[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Transaction history
// --------------------
router.get("/:accountId/history", auth, async (req: AuthRequest, res: Response) => {
  const { accountId } = req.params;

  try {
    const history = await db.select().from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.createdAt));

    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
