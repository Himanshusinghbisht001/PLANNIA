import { z } from 'zod';

/**
 * Zod schema for all required environment variables.
 * If any required variable is missing the process will exit immediately
 * with a descriptive error — never silently produce wrong behaviour.
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  FRONTEND_URL: z.string().url({ message: 'FRONTEND_URL must be a valid URL' }),

  // Authentication — Clerk
  CLERK_SECRET_KEY: z
    .string()
    .min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z
    .string()
    .min(1, 'CLERK_WEBHOOK_SECRET is required'),

  // Database
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .startsWith('mongodb', 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),

  // AI
  GEMINI_API_KEY: z
    .string()
    .min(1, 'GEMINI_API_KEY is required'),

  // Security
  ARCJET_KEY: z
    .string()
    .min(1, 'ARCJET_KEY is required'),

  // Payments — Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required'),
  STRIPE_PRO_PRICE_ID: z
    .string()
    .min(1, 'STRIPE_PRO_PRICE_ID is required'),
});

/**
 * Parse and validate environment variables at startup.
 * Throws and exits process if validation fails.
 */
function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Invalid environment configuration:\n');
    result.error.issues.forEach((issue) => {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nFix the above environment variables and restart the server.\n');
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();

export type Env = typeof env;
