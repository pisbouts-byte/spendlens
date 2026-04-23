import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ override: true });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PLAID_CLIENT_ID: z.string().default(""),
  PLAID_SECRET: z.string().default(""),
  PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
  PLAID_WEBHOOK_URL: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
  ENCRYPTION_KEY: z.string().length(64).default("0".repeat(64)),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  // SMTP (optional — if not set, reset links are logged to console)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = validateEnv();
