import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // S3 (MinIO)
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_REGION: z.string(),
  
  // App
  APP_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  COOKIE_ENC_KEY_BASE64: z.string().optional(),
  
  // Playwright
  PLAYWRIGHT_HEADLESS: z.string().transform(val => val === 'true'),
  DEFAULT_UA: z.string(),
  DEFAULT_TIMEZONE: z.string(),
  DEFAULT_LOCALE: z.string(),
  
  // MCP
  MCP_URL: z.string().url().optional(),
  MCP_API_KEY: z.string().optional(),
  
  // Proxy/IP Intel
  REQUIRE_RESIDENTIAL: z.string().transform(val => val === 'true'),
  ALLOW_MOBILE: z.string().transform(val => val === 'true'),
  ALLOW_DATACENTER: z.string().transform(val => val === 'true'),
  ASN_DENYLIST: z.string().transform(val => val.split(',').map(Number).filter(Boolean)),
  IP_INTEL_CACHE_TTL: z.string().transform(Number),
  PROXY_HEALTH_TIMEOUT_MS: z.string().transform(Number),
  MAX_PROXY_ROTATIONS_PER_24H: z.string().transform(Number),
  RISK_PAUSE_THRESHOLD: z.string().transform(Number),
  
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

export default env;
