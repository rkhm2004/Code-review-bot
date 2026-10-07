import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3001").transform(Number),
  GITHUB_TOKEN: z.string().min(1),
  ANALYSIS_SERVICE_URL: z.string().url().default("http://analysis-service:8000"),
  LOG_LEVEL: z.enum(["info", "error", "debug", "warn"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
