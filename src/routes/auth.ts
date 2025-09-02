import { Router } from "express";
import { db } from "../db/client";
import { users } from "../db/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

router.post("/register", async (req, res) => {
  const { email, password, name, phone, acceptedTos } = req.body;
  if (!acceptedTos) return res.status(400).json({ error: "Must accept Terms" });

  const hash = await bcrypt.hash(password, 12);
  try {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: hash, name, phone, acceptedTos })
      .returning({ id: users.id, email: users.email });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
