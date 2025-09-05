// src/routes/auth.ts
import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";

import { users, pin_attempts } from "../db/schema";
import { db } from "../db/client";
import { AuthRequest, authenticate } from "../middleware/auth";

const router = express.Router();

// -------------------- HELPERS --------------------
function normalizePhone(phone: string, countryCode = "255") {
  phone = phone.trim();
  if (phone.startsWith("+")) phone = phone.substring(1);
  if (phone.startsWith("0")) phone = countryCode + phone.substring(1);
  return phone;
}

function getJwtSecret(): string | null {
  return process.env.JWT_SECRET || null;
}

// -------------------- REGISTER --------------------
router.post("/register", async (req, res) => {
  const { name, username, phone, email, password, gender } = req.body;

  if (!name || !password || !gender || (!phone && !email && !username)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) return res.status(500).json({ error: "JWT secret not set" });

  try {
    const normalizedPhone = phone ? normalizePhone(phone) : null;
    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (normalizedPhone) conditions.push(eq(users.phone, normalizedPhone));

    const existing =
      conditions.length > 0
        ? await db.select().from(users).where(or(...conditions))
        : [];

    if (existing.length > 0)
      return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await db
      .insert(users)
      .values({
        name,
        phone: normalizedPhone,
        email: email || null,
        username: username || null,
        password: hashedPassword,
        gender,
      })
      .returning();

    const user = inserted[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password: _, pin, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: "Missing fields" });

  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) return res.status(500).json({ error: "JWT secret not set" });

  try {
    let queryIdentifier = identifier;
    if (/^\+?\d+$/.test(identifier)) queryIdentifier = normalizePhone(identifier);

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.phone, queryIdentifier),
          eq(users.email, queryIdentifier),
          eq(users.username, queryIdentifier)
        )
      );

    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
    const { password: _, pin, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- GET PROFILE --------------------
router.get("/profile", authenticate, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!));

    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _, pin, ...safeUser } = user;

    // Add hasPin flag
    res.json({ 
      user: { 
        ...safeUser, 
        hasPin: !!pin  // true if pin exists, false if null
      } 
    });
  } catch (err: any) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- UPDATE PROFILE --------------------
router.put("/update-profile", authenticate, async (req: AuthRequest, res) => {
  const { name, phone, email } = req.body;
  if (!name && !phone && !email)
    return res.status(400).json({ error: "No fields provided" });

  try {
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    const updated = await db
      .update(users)
      .set({
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(normalizedPhone ? { phone: normalizedPhone } : {}),
      })
      .where(eq(users.id, req.userId!))
      .returning();

    if (!updated[0]) return res.status(404).json({ error: "User not found" });

    const { password: _, pin, ...safeUser } = updated[0];
    res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (err: any) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- ADD PIN --------------------
router.post("/add-pin", authenticate, async (req: AuthRequest, res) => {
  const { newPin } = req.body;

  if (!newPin) {
    return res.status(400).json({ error: "New PIN is required" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!));

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.pin) {
      return res.status(400).json({ error: "PIN already set. Use change-pin." });
    }

    const hashedPin = await bcrypt.hash(newPin, 10);

    const updated = await db
      .update(users)
      .set({ pin: hashedPin })
      .where(eq(users.id, req.userId!))
      .returning();

    res.json({
      message: "PIN added successfully",
      user: updated[0],
    });
  } catch (err: any) {
    console.error("Add PIN error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- CHANGE PIN --------------------
router.post("/change-pin", authenticate, async (req: AuthRequest, res) => {
  const { oldPin, newPin } = req.body;

  if (!oldPin || !newPin) {
    return res.status(400).json({ error: "Both old and new PIN are required" });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!));

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.pin) {
      return res.status(400).json({ error: "No PIN set. Use add-pin." });
    }

    const valid = await bcrypt.compare(oldPin, user.pin);
    if (!valid) return res.status(401).json({ error: "Invalid old PIN" });

    const hashedPin = await bcrypt.hash(newPin, 10);

    const updated = await db
      .update(users)
      .set({ pin: hashedPin })
      .where(eq(users.id, req.userId!))
      .returning();

    res.json({
      message: "PIN changed successfully",
      user: updated[0],
    });
  } catch (err: any) {
    console.error("Change PIN error:", err);
    res.status(500).json({ error: err.message });
  }
});


// -------------------- VERIFY PIN --------------------
router.post("/verify-pin", authenticate, async (req: AuthRequest, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4)
    return res
      .status(400)
      .json({ error: "PIN must be at least 4 digits" });

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId!));
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.pin) return res.status(400).json({ error: "No PIN set" });

    // Check attempts
    const [attempt] = await db
      .select()
      .from(pin_attempts)
      .where(eq(pin_attempts.userId, req.userId!));

    const attemptCount = attempt?.count ?? 0;

    if (attemptCount >= 3)
      return res
        .status(403)
        .json({ error: "Too many failed attempts. Try later." });

    const valid = await bcrypt.compare(pin, user.pin);

    if (!valid) {
      // Increment attempt
      if (attempt) {
        await db
          .update(pin_attempts)
          .set({ count: attemptCount + 1, lastAttempt: new Date() })
          .where(eq(pin_attempts.userId, req.userId!));
      } else {
        await db.insert(pin_attempts).values({
          userId: req.userId!,
          count: 1,
          lastAttempt: new Date(),
        });
      }
      return res.status(401).json({ error: "Invalid PIN" });
    }

    // Reset attempts on success
    if (attempt) {
      await db
        .update(pin_attempts)
        .set({ count: 0 })
        .where(eq(pin_attempts.userId, req.userId!));
    }

    res.json({ message: "PIN verified successfully" });
  } catch (err: any) {
    console.error("Verify PIN error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
