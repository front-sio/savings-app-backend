// src/routes/auth.ts
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";

import { users } from "../db/schema";
import { db } from "../db/client";

const router = express.Router();

// Normalize phone number (default country code: 255)
function normalizePhone(phone: string, countryCode = "255") {
  phone = phone.trim();
  if (phone.startsWith("+")) phone = phone.substring(1);
  if (phone.startsWith("0")) phone = countryCode + phone.substring(1);
  return phone;
}

// Helper: safely get JWT_SECRET
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
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT secret is not configured" });
  }

  try {
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Build conditions dynamically
    const conditions = [];
    if (email) conditions.push(eq(users.email, email));
    if (normalizedPhone) conditions.push(eq(users.phone, normalizedPhone));

    const existing =
      conditions.length > 0
        ? await db.select().from(users).where(or(...conditions))
        : [];

    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
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

    // Sign JWT
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Remove password before sending back
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const JWT_SECRET = getJwtSecret();
  if (!JWT_SECRET) {
    return res.status(500).json({ error: "JWT secret is not configured" });
  }

  try {
    let queryIdentifier = identifier;

    // Normalize if it's a phone number
    if (/^\+?\d+$/.test(identifier)) {
      queryIdentifier = normalizePhone(identifier);
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, queryIdentifier), eq(users.email, queryIdentifier), eq(users.username, queryIdentifier)));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Sign JWT
    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Remove password before sending back
    const { password: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
