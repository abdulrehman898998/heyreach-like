import { redis } from './redis';
import { ACTIVE_CONFIG, WARMUP_CONFIG, REDIS_KEYS } from '@heyreach/shared/constants';
import { ACCOUNT_STATUS } from '@heyreach/shared/constants';

// Check if account can send DM based on daily limit
export async function canSendDM(accountId: number, dailyCap: number = ACTIVE_CONFIG.DAILY_MSG_LIMIT): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = REDIS_KEYS.DAILY_MSG_COUNT(accountId, today);
  
  const currentCount = await redis.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;
  
  return count < dailyCap;
}

// Increment daily message count
export async function incrementDailyMessageCount(accountId: number): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const key = REDIS_KEYS.DAILY_MSG_COUNT(accountId, today);
  
  const count = await redis.incr(key);
  
  // Set expiry to end of day (UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
  
  await redis.expire(key, ttl);
  
  return count;
}

// Get next delay for DM sending based on account status
export async function nextDelayMs(accountId: number, isWarmed: boolean): Promise<number> {
  if (isWarmed) {
    // After warmup: 2-6 minutes random
    return Math.floor(
      Math.random() * (ACTIVE_CONFIG.DM_SPACING_MAX - ACTIVE_CONFIG.DM_SPACING_MIN) + 
      ACTIVE_CONFIG.DM_SPACING_MIN
    );
  } else {
    // During warmup: 10-20 minutes random
    return Math.floor(
      Math.random() * (WARMUP_CONFIG.DM_SPACING_WARMUP_MAX - WARMUP_CONFIG.DM_SPACING_WARMUP_MIN) + 
      WARMUP_CONFIG.DM_SPACING_WARMUP_MIN
    );
  }
}

// Get action spacing delay
export function actionSpacingMs(): number {
  return Math.floor(
    Math.random() * (WARMUP_CONFIG.ACTION_SPACING_MAX - WARMUP_CONFIG.ACTION_SPACING_MIN) + 
    WARMUP_CONFIG.ACTION_SPACING_MIN
  );
}

// Check if account is in night silence window
export function isInNightSilenceWindow(homeCountry: string): boolean {
  // Simple implementation - can be enhanced with timezone handling
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Night silence: 00:00-06:00 UTC (adjust based on home country)
  return hour >= 0 && hour < 6;
}

// Rate limiting middleware for API endpoints
export function createRateLimiter(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  });
}

// Account-specific rate limiter
export function createAccountRateLimiter(
  windowMs: number = 60 * 1000, // 1 minute
  maxRequests: number = 10
) {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: 'Account rate limit exceeded, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Use account ID from params
      return `account:${req.params.id}`;
    }
  });
}

// Proxy rotation rate limiter
export async function canRotateProxy(accountId: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = REDIS_KEYS.PROXY_ROTATIONS(accountId, today);
  
  const rotations = await redis.get(key);
  const count = rotations ? parseInt(rotations, 10) : 0;
  
  return count < 1; // Max 1 rotation per 24h
}

// Increment proxy rotation count
export async function incrementProxyRotationCount(accountId: number): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const key = REDIS_KEYS.PROXY_ROTATIONS(accountId, today);
  
  const count = await redis.incr(key);
  
  // Set expiry to end of day (UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
  
  await redis.expire(key, ttl);
  
  return count;
}
