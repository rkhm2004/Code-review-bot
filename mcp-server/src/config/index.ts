import 'dotenv/config'; // Modern way to load env
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  GITHUB_TOKEN: z.string().min(1),
  LOG_LEVEL: z.enum(['info', 'error', 'debug', 'warn']).default('info'),
});

// process is now recognized because of @types/node and tsconfig types field
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid env:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;