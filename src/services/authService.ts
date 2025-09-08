import bcrypt from "bcrypt";

export async function hashPin(pin: string) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(pin, saltRounds);
  return hash;
}

export async function verifyPin(pin: string, hashedPin: string) {
  return await bcrypt.compare(pin, hashedPin);
}

// For tracking 3 attempts
const pinAttempts: Record<string, number> = {}; // userId -> attempts

export function recordPinAttempt(userId: string, success: boolean) {
  if (success) {
    pinAttempts[userId] = 0;
    return;
  }
  pinAttempts[userId] = (pinAttempts[userId] || 0) + 1;
  if (pinAttempts[userId] >= 3) throw new Error("Too many wrong attempts");
  throw new Error(`Invalid PIN. Attempts left: ${3 - pinAttempts[userId]}`);
}
