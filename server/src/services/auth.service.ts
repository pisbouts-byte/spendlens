import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { signToken } from "../utils/jwt.js";
import { ConflictError, UnauthorizedError, BadRequestError, NotFoundError } from "../utils/errors.js";
import { sendPasswordResetEmail } from "./email.service.js";
import { DEFAULT_CATEGORIES } from "@spendlens/shared";
import type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from "@spendlens/shared";

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      hashedPassword,
      name: input.name ?? null,
      settings: {
        create: {
          weekStartDay: 1,
          currency: "USD",
        },
      },
      categories: {
        create: DEFAULT_CATEGORIES.map((cat, i) => ({
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          isDefault: true,
          sortOrder: i,
        })),
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  const token = signToken({ userId: user.id });

  return { token, user };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.hashedPassword);

  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signToken({ userId: user.id });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return user;
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function forgotPassword(input: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Always return success to avoid email enumeration
  if (!user) {
    return { message: "If an account with that email exists, a password reset link has been sent." };
  }

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Build reset URL and send email
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${token}`;
  const emailSent = await sendPasswordResetEmail(user.email, resetUrl);

  if (!emailSent) {
    // SMTP not configured — log the link for dev use
    console.log(`[Password Reset] Reset link for ${user.email}: ${resetUrl}`);
  }

  return { message: "If an account with that email exists, a password reset link has been sent." };
}

export async function resetPassword(input: ResetPasswordInput) {
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token: input.token },
    include: { user: true },
  });

  if (!resetRecord) {
    throw new BadRequestError("Invalid or expired reset token");
  }

  if (resetRecord.usedAt) {
    throw new BadRequestError("This reset token has already been used");
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new BadRequestError("This reset token has expired");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Update password and mark token as used in a transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { message: "Password has been reset successfully" };
}

export async function deleteAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Cascade deletes handle all related records (settings, categories,
  // transactions, plaid items, budgets, recurring patterns, corrections, password resets)
  await prisma.user.delete({
    where: { id: userId },
  });

  return { message: "Account and all associated data have been permanently deleted" };
}
