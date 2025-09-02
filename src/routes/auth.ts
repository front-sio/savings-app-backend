// src/routes/auth.ts
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq, or } from "drizzle-orm";

import { db } from "../db/client";
import { users } from "../db/schema";

const router = express.Router();

/**
 * Helper: Normalize phone
 * Converts:
 *  - 0XXXXXXXXX => countryCode + XXXXXXXX
 *  - +XXXXXXXXX => remove +
 */
function normalizePhone(phone: string, countryCode = "255") {
  phone = phone.trim();
  if (phone.startsWith("+")) phone = phone.substring(1);
  if (phone.startsWith("0")) phone = countryCode + phone.substring(1);
  return phone;
}

// -----------------------------
// Register endpoint
// -----------------------------
router.post("/register", async (req, res) => {
  const {
    name,
    username,
    phone,
    email,
    password,
    gender,
    street,
    ward,
    city,
    country,
  } = req.body;

  if (!name || !password || !gender || (!phone && !email && !username)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Check existing user
    const existing = await db.select().from(users).where(
      or(
        email ? eq(users.email, email) : undefined,
        username ? eq(users.username, username) : undefined,
        normalizedPhone ? eq(users.phone, normalizedPhone) : undefined
      )
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists with provided info" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const inserted = await db.insert(users)
      .values({
        name,
        username: username || null,
        phone: normalizedPhone,
        email: email || null,
        password: hashedPassword,
        gender,
        street: street || null,
        ward: ward || null,
        city: city || null,
        country: country || null,
      })
      .returning();

    const user = inserted[0];

    // JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err: any) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Login endpoint
// -----------------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Missing identifier or password" });
  }

  try {
    let queryIdentifier = identifier;
    if (/^\+?\d+$/.test(identifier)) {
      queryIdentifier = normalizePhone(identifier);
    }

    const [user] = await db.select().from(users).where(
      or(
        eq(users.phone, queryIdentifier),
        eq(users.email, queryIdentifier),
        eq(users.username, queryIdentifier)
      )
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password) {
      return res.status(500).json({ error: "Password not set for user" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
