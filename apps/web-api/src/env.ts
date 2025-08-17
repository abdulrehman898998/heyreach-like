import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file explicitly
dotenv.config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5433/heyreach'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // S3 (MinIO)
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('heyreach-artifacts'),
  S3_REGION: z.string().default('us-east-1'),
  
  // App
  APP_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().default('this_is_a_very_long_secret_key_for_jwt_tokens_12345_abcdef_ghijkl'),
  COOKIE_ENC_KEY_BASE64: z.string().optional(),
  
  // Playwright
  PLAYWRIGHT_HEADLESS: z.string().default('true').transform(val => val === 'true'),
  DEFAULT_UA: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  DEFAULT_TIMEZONE: z.string().default('Europe/London'),
  DEFAULT_LOCALE: z.string().default('en-GB'),
  
  // MCP
  MCP_URL: z.string().optional(),
  MCP_API_KEY: z.string().optional(),
  
  // Proxy/IP Intel
  REQUIRE_RESIDENTIAL: z.string().default('true').transform(val => val === 'true'),
  ALLOW_MOBILE: z.string().default('true').transform(val => val === 'true'),
  ALLOW_DATACENTER: z.string().default('false').transform(val => val === 'true'),
  ASN_DENYLIST: z.string().default('16509,13335').transform(val => val.split(',').map(Number).filter(Boolean)),
  IP_INTEL_CACHE_TTL: z.string().default('1800').transform(Number),
  PROXY_HEALTH_TIMEOUT_MS: z.string().default('2500').transform(Number),
  MAX_PROXY_ROTATIONS_PER_24H: z.string().default('1').transform(Number),
  RISK_PAUSE_THRESHOLD: z.string().default('60').transform(Number),
  
  // Server
  PORT: z.string().transform(Number).default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const env = envSchema.parse(process.env);

export default env;
