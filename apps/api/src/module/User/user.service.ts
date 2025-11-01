import bcrypt from "bcrypt";
import crypto from "crypto";
import jwtLib from "../../lib/jwt";
import { sendMail } from "../../lib/email";
import { HttpError } from "../../lib/http";
import prisma from "../../lib";
const SALT_ROUNDS = 12;

export async function registerUser(email: string, password: string) {
  // ensure email is unique
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw new HttpError("Email already registered", 409, "user_exists");

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, role: "admin" },
  });
  return user;
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createTokensForUser(user: any) {
  const payload = { userId: user.id, role: user.role };
  const access = jwtLib.signAccessToken(payload);
  const refresh = jwtLib.signRefreshToken(payload);
  return { access, refresh };
}

export async function generatePasswordResetToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

export async function sendResetEmail(email: string, token: string) {
  const resetUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: "Reset your password",
    text: `Reset password: ${resetUrl}`,
  });
}

export async function consumeResetToken(token: string, newPassword: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record) throw new Error("Invalid or expired token");
  if (record.usedAt) throw new Error("Token already used");
  if (record.expiresAt < new Date()) throw new Error("Token expired");
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: hash },
  });
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  return true;
}

export default {
  registerUser,
  verifyCredentials,
  createTokensForUser,
  generatePasswordResetToken,
  sendResetEmail,
  consumeResetToken,
};
