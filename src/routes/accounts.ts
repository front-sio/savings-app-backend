import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { db } from "../db/client";
import { accounts } from "../db/schema";
import { eq } from "drizzle-orm"; // <- Import eq

const router = express.Router();

// Create account
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { phone, pin, isMain } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: "Phone and PIN are required" });

  try {
    const account = await db.insert(accounts).values({
      userId: req.userId!,
      phone,
      pin,
      isMain: isMain || false,
    }).returning();

    res.json(account[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user accounts
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, req.userId!));
    res.json(userAccounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
