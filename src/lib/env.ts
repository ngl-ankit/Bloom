import { z } from "zod";

/**
 * Validated environment configuration.
 * DATABASE_URL is required. Everything else is optional with graceful fallbacks.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16).default("dev-only-session-secret-change-me"),
  APP_URL: z.string().default("http://localhost:3000"),
  // AI provider (Grok-compatible OpenAI-style API by default)
  AI_PROVIDER_BASE_URL: z.string().optional(), // e.g. https://api.x.ai/v1
  AI_PROVIDER_API_KEY: z.string().optional(),
  AI_PROVIDER_MODEL: z.string().optional(), // e.g. grok-3-mini
  // Optional email (Resend-compatible)
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Cron job auth
  CRON_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_PROVIDER_API_KEY && process.env.AI_PROVIDER_BASE_URL);
}
