import { env, cwd } from 'node:process';
import { resolve } from 'node:path';
import { z } from 'zod';
import dotenv from 'dotenv';

const DEFAULT_ENV_MODE = 'production';

// Grab the raw environment before Zod does its strict validation
const currentEnv = env.NODE_ENV || DEFAULT_ENV_MODE;

// Load the environment-specific file FIRST (e.g., .env.staging or .env.production)
dotenv.config({ path: resolve(cwd(), `.env.${currentEnv}`) });

// Fallback: Load the standard .env to fill in any gaps (like shared variables)
dotenv.config();

// Define the schema for your expected environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'staging', 'test']).default(DEFAULT_ENV_MODE),

  // Gmail Configuration
  // We make these optional or provide defaults because they might not be needed in development
  GMAIL_USER: z.email('GMAIL_USER must be a valid email').optional().default(''),
  GMAIL_APP_PASSWORD: z.string().optional().default(''),
  // FUTURE: defaltFrom and replyTo should be campaign properties
  GMAIL_DEFAULT_FROM: z.string().default('"Mailing Manager" <no-reply@gmail.com>'),
  GMAIL_REPLY_TO: z.string().optional().default(''),

  PORT: z.coerce.number().default(3000)
});

// Parse and validate process.env
// If this fails (e.g., invalid email format), Zod will throw a clear error
// and stop the server before it even tries to boot.
const parsedEnv = envSchema.parse(env);
console.log('backend/src/main/config/env.ts, parsedEnv.PORT: ', parsedEnv.PORT);

// Export the structured config just like before
export const envConfig = {
  env: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  gmail: {
    user: parsedEnv.GMAIL_USER,
    appPassword: parsedEnv.GMAIL_APP_PASSWORD,
    defaultFrom: parsedEnv.GMAIL_DEFAULT_FROM,
    replyTo: parsedEnv.GMAIL_REPLY_TO
  }
};
