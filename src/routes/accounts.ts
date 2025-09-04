import express, { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { io } from "../app"; // import Socket.IO instance

const router = express.Router();

// Extend Express.Request to include userId
interface AuthRequest extends Request {
  userId?: string;
}

// Middleware: Auth
async function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Unauthorized" });

  const token = header.replace("Bearer ", "");
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Create account
router.post("/", auth, async (req: AuthRequest, res: Response) => {
  const { phone, pin } = req.body;
  try {
    const inserted = await db.insert(accounts).values({
      userId: req.userId!,
      phone,
      pin,
      balance: 0,
      isMain: false,
    }).returning();

    const newAccount = inserted[0];

    // Emit real-time update to all connected clients
    io.emit("accounts_update", { userId: req.userId, accounts: await getUserAccounts(req.userId!) });

    res.json(newAccount);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user accounts
router.get("/", auth, async (req: AuthRequest, res: Response) => {
  try {
    const userAccounts = await getUserAccounts(req.userId!);
    res.json(userAccounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function: fetch user accounts
async function getUserAccounts(userId: string) {
  return await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));
}

export default router;
