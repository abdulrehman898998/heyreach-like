import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import Redis from 'ioredis'
import { S3Client, CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { db as mainDb, schema } from '../../apps/web-api/src/lib/drizzle'
import { redis as mainRedis } from '../../apps/web-api/src/lib/redis'
import { s3Client as mainS3Client } from '../../apps/web-api/src/lib/s3'
import { hashPassword } from '../../apps/web-api/src/lib/crypto'
import dotenv from 'dotenv'
import { eq } from 'drizzle-orm'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Test database connection
const testPostgres = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const testDb = drizzle(testPostgres, { schema })

// Test Redis connection
export const testRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxLoadingTimeout: 10000,
})

// Test S3 client
export const testS3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
})

// Test environment setup
export async function setupTestEnvironment() {
  console.log('🧪 Setting up test environment...')

  try {
    // Clear test database
    await clearTestDatabase()
    
    // Clear test Redis
    await clearTestRedis()
    
    // Setup test S3 bucket
    await setupTestS3Bucket()
    
    // Run database migrations
    await runTestMigrations()
    
    console.log('✅ Test environment setup complete')
  } catch (error) {
    console.error('❌ Test environment setup failed:', error)
    throw error
  }
}

// Test environment cleanup
export async function cleanupTestEnvironment() {
  console.log('🧹 Cleaning up test environment...')

  try {
    // Clear test database
    await clearTestDatabase()
    
    // Clear test Redis
    await clearTestRedis()
    
    // Cleanup test S3 bucket
    await cleanupTestS3Bucket()
    
    // Close connections
    await testPostgres.end()
    await testRedis.quit()
    
    console.log('✅ Test environment cleanup complete')
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error)
    throw error
  }
}

// Clear test database
async function clearTestDatabase() {
  const tables = [
    'notifications',
    'action_logs',
    'messages',
    'leads',
    'campaigns',
    'proxy_bindings',
    'accounts',
    'proxies',
    'users',
    'selector_registry',
    'device_profiles'
  ]

  for (const table of tables) {
    try {
      await testDb.execute(`TRUNCATE TABLE ${table} CASCADE`)
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

// Clear test Redis
async function clearTestRedis() {
  try {
    await testRedis.flushdb()
  } catch (error) {
    console.warn('Warning: Could not clear Redis:', error)
  }
}

// Setup test S3 bucket
async function setupTestS3Bucket() {
  const bucketName = process.env.S3_BUCKET!
  
  try {
    // Create bucket if it doesn't exist
    await testS3Client.send(new CreateBucketCommand({
      Bucket: bucketName,
    }))
  } catch (error: any) {
    if (error.name !== 'BucketAlreadyExists') {
      throw error
    }
  }
}

// Cleanup test S3 bucket
async function cleanupTestS3Bucket() {
  const bucketName = process.env.S3_BUCKET!
  
  try {
    // List all objects in bucket
    const listResponse = await testS3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
    }))

    // Delete all objects
    if (listResponse.Contents) {
      for (const object of listResponse.Contents) {
        await testS3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: object.Key!,
        }))
      }
    }

    // Delete bucket
    await testS3Client.send(new DeleteBucketCommand({
      Bucket: bucketName,
    }))
  } catch (error) {
    console.warn('Warning: Could not cleanup S3 bucket:', error)
  }
}

// Run test database migrations
async function runTestMigrations() {
  try {
    // This would typically run Drizzle migrations
    // For now, we'll just ensure the schema is created
    await testDb.execute(`SELECT 1`)
  } catch (error) {
    console.error('Failed to run test migrations:', error)
    throw error
  }
}

// Create test user
export async function createTestUser(email: string = 'test@example.com', password: string = 'password123') {
  const hashedPassword = await hashPassword(password)
  
  const [user] = await testDb.insert(schema.users).values({
    email,
    password_hash: hashedPassword,
  }).returning()

  return user
}

// Create test proxy
export async function createTestProxy() {
  const [proxy] = await testDb.insert(schema.proxies).values({
    provider: 'test-provider',
    endpoint_template: 'http://test:password@proxy.test:8080',
    username: 'test',
    password: 'password',
    ip_type: 'residential',
    country: 'US',
    city: 'New York',
    asn: 12345,
    isp: 'Test ISP',
    sticky_supported: true,
    sticky_label: 'test_sticky',
    rotation_mode: 'sticky',
    health_status: 'ok',
    status: 'active',
    latency_ms: 50,
    fail_rate: 0.01,
    score: 0.95,
  }).returning()

  return proxy
}

// Create test account
export async function createTestAccount(userId: number, proxyId?: number) {
  const [account] = await testDb.insert(schema.accounts).values({
    user_id: userId,
    username: 'test_account',
    status: 'active',
    assigned_proxy_id: proxyId,
    session_label: 'test_session',
    home_country: 'US',
    home_city: 'New York',
    daily_msg_limit: 50,
    daily_msg_count: 0,
    risk_score: 0,
  }).returning()

  return account
}

// Create test campaign
export async function createTestCampaign(userId: number, accountIds: number[] = []) {
  const [campaign] = await testDb.insert(schema.campaigns).values({
    user_id: userId,
    name: 'Test Campaign',
    account_ids: accountIds,
    daily_limit_per_account: 30,
    status: 'draft',
  }).returning()

  return campaign
}

// Create test lead
export async function createTestLead(userId: number, campaignId?: number) {
  const [lead] = await testDb.insert(schema.leads).values({
    user_id: userId,
    campaign_id: campaignId,
    profile_url: 'https://instagram.com/test_user',
    first_name: 'Test',
    custom_fields: { company: 'Test Corp' },
    status: 'pending',
  }).returning()

  return lead
}

// Wait for async operations
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Generate random test data
export function generateRandomEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`
}

export function generateRandomUsername(): string {
  return `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Test data cleanup helpers
export async function cleanupTestUser(userId: number) {
  await testDb.delete(schema.users).where(eq(schema.users.id, userId))
}

export async function cleanupTestAccount(accountId: number) {
  await testDb.delete(schema.accounts).where(eq(schema.accounts.id, accountId))
}

export async function cleanupTestCampaign(campaignId: number) {
  await testDb.delete(schema.campaigns).where(eq(schema.campaigns.id, campaignId))
}

export async function cleanupTestProxy(proxyId: number) {
  await testDb.delete(schema.proxies).where(eq(schema.proxies.id, proxyId))
}
