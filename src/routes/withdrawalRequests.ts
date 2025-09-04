import express from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { db } from "../db/client";
import { withdrawalRequests } from "../db/schema";
import { eq } from "drizzle-orm";
import { io } from "../app"; // Import Socket.IO instance

const router = express.Router();

// --------------------
// Create withdrawal request
// --------------------
router.post("/", authenticate, async (req: AuthRequest, res) => {
  const { transactionId, reason, documentUrl } = req.body;
  if (!transactionId || !reason)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const request = await db.insert(withdrawalRequests).values({
      transactionId,
      userId: req.userId!,
      reason,
      documentUrl,
    }).returning();

    // Emit real-time update for this user
    io.emit("withdrawal_requests_update", {
      userId: req.userId,
      request: request[0],
    });

    res.json(request[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// Get user's withdrawal requests
// --------------------
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const requests = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, req.userId!));

    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
