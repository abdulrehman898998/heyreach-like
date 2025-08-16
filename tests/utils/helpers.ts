import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { generateJWT } from '../../apps/web-api/src/lib/crypto'
import { createTestUser, testDb, schema } from './setup'
import { eq } from 'drizzle-orm'

// Create axios instance for API testing
export function createApiClient(baseURL: string = 'http://localhost:3001'): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// API response validation helpers
export function expectSuccessResponse(response: AxiosResponse) {
  expect(response.status).toBeGreaterThanOrEqual(200)
  expect(response.status).toBeLessThan(300)
  expect(response.data).toHaveProperty('success', true)
}

export function expectErrorResponse(response: AxiosResponse, statusCode: number = 400) {
  expect(response.status).toBe(statusCode)
  expect(response.data).toHaveProperty('success', false)
  expect(response.data).toHaveProperty('error')
}

export function expectValidationError(response: AxiosResponse) {
  expectErrorResponse(response, 400)
  expect(response.data.error).toMatch(/validation|invalid|required/i)
}

// Authentication helpers
export async function createTestUserAndLogin(
  email: string = 'test@example.com',
  password: string = 'password123'
) {
  const user = await createTestUser(email, password)
  const token = await generateJWT({ id: user.id, email: user.email })
  
  return { user, token }
}

export async function loginUser(email: string, password: string): Promise<string> {
  const client = createApiClient()
  const response = await client.post('/api/auth/login', { email, password })
  
  expectSuccessResponse(response)
  return response.data.data.token
}

export async function registerUser(email: string, password: string): Promise<string> {
  const client = createApiClient()
  const response = await client.post('/api/auth/register', { email, password })
  
  expectSuccessResponse(response)
  return response.data.data.token
}

// API request helpers with authentication
export async function authenticatedRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  token: string,
  data?: any
): Promise<AxiosResponse> {
  const client = createApiClient()
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }

  switch (method) {
    case 'GET':
      return client.get(endpoint, config)
    case 'POST':
      return client.post(endpoint, data, config)
    case 'PUT':
      return client.put(endpoint, data, config)
    case 'DELETE':
      return client.delete(endpoint, config)
    default:
      throw new Error(`Unsupported HTTP method: ${method}`)
  }
}

// Database query helpers
export async function getUserById(userId: number) {
  return testDb.query.users.findFirst({
    where: eq(schema.users.id, userId),
  })
}

export async function getAccountById(accountId: number) {
  return testDb.query.accounts.findFirst({
    where: eq(schema.accounts.id, accountId),
  })
}

export async function getCampaignById(campaignId: number) {
  return testDb.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, campaignId),
  })
}

export async function getProxyById(proxyId: number) {
  return testDb.query.proxies.findFirst({
    where: eq(schema.proxies.id, proxyId),
  })
}

export async function getLeadById(leadId: number) {
  return testDb.query.leads.findFirst({
    where: eq(schema.leads.id, leadId),
  })
}

// Data validation helpers
export function validateUserData(userData: any) {
  expect(userData).toHaveProperty('id')
  expect(userData).toHaveProperty('email')
  expect(userData).toHaveProperty('created_at')
  expect(typeof userData.id).toBe('number')
  expect(typeof userData.email).toBe('string')
  expect(userData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
}

export function validateAccountData(accountData: any) {
  expect(accountData).toHaveProperty('id')
  expect(accountData).toHaveProperty('user_id')
  expect(accountData).toHaveProperty('username')
  expect(accountData).toHaveProperty('status')
  expect(accountData).toHaveProperty('home_country')
  expect(typeof accountData.id).toBe('number')
  expect(typeof accountData.username).toBe('string')
  expect(['warming', 'active', 'paused', 'needs_manual_verification']).toContain(accountData.status)
}

export function validateCampaignData(campaignData: any) {
  expect(campaignData).toHaveProperty('id')
  expect(campaignData).toHaveProperty('user_id')
  expect(campaignData).toHaveProperty('name')
  expect(campaignData).toHaveProperty('account_ids')
  expect(campaignData).toHaveProperty('status')
  expect(typeof campaignData.id).toBe('number')
  expect(typeof campaignData.name).toBe('string')
  expect(Array.isArray(campaignData.account_ids)).toBe(true)
  expect(['draft', 'active', 'paused', 'completed']).toContain(campaignData.status)
}

export function validateProxyData(proxyData: any) {
  expect(proxyData).toHaveProperty('id')
  expect(proxyData).toHaveProperty('provider')
  expect(proxyData).toHaveProperty('endpoint_template')
  expect(proxyData).toHaveProperty('ip_type')
  expect(proxyData).toHaveProperty('country')
  expect(proxyData).toHaveProperty('status')
  expect(typeof proxyData.id).toBe('number')
  expect(typeof proxyData.provider).toBe('string')
  expect(['residential', 'mobile', 'datacenter']).toContain(proxyData.ip_type)
  expect(['active', 'inactive', 'testing']).toContain(proxyData.status)
}

export function validateLeadData(leadData: any) {
  expect(leadData).toHaveProperty('id')
  expect(leadData).toHaveProperty('user_id')
  expect(leadData).toHaveProperty('profile_url')
  expect(leadData).toHaveProperty('status')
  expect(typeof leadData.id).toBe('number')
  expect(typeof leadData.profile_url).toBe('string')
  expect(leadData.profile_url).toMatch(/^https:\/\/instagram\.com\//)
  expect(['pending', 'sent', 'failed', 'blocked']).toContain(leadData.status)
}

// Time helpers for testing
export function getDateString(daysOffset: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return date.toISOString().split('T')[0]
}

export function getTimestamp(secondsOffset: number = 0): Date {
  const date = new Date()
  date.setSeconds(date.getSeconds() + secondsOffset)
  return date
}

// File upload helpers
export function createTestCSV(leads: Array<{ profile_url: string; first_name?: string; company?: string }>): string {
  const headers = ['profile_url', 'first_name', 'company']
  const rows = leads.map(lead => [
    lead.profile_url,
    lead.first_name || '',
    lead.company || ''
  ])
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

export function createTestFile(content: string, filename: string = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' })
  return new File([blob], filename, { type: 'text/csv' })
}

// Rate limiting helpers
export async function waitForRateLimit(ms: number = 1000): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

// Error testing helpers
export async function expectApiError(
  apiCall: () => Promise<AxiosResponse>,
  expectedStatus: number = 400,
  expectedError?: string
) {
  try {
    await apiCall()
    throw new Error('Expected API call to fail but it succeeded')
  } catch (error: any) {
    if (error.response) {
      expect(error.response.status).toBe(expectedStatus)
      if (expectedError) {
        expect(error.response.data.error).toMatch(expectedError)
      }
    } else {
      throw error
    }
  }
}

// Pagination helpers
export function validatePaginationResponse(response: AxiosResponse) {
  expectSuccessResponse(response)
  expect(response.data.data).toHaveProperty('items')
  expect(response.data.data).toHaveProperty('pagination')
  expect(response.data.data.pagination).toHaveProperty('page')
  expect(response.data.data.pagination).toHaveProperty('limit')
  expect(response.data.data.pagination).toHaveProperty('total')
  expect(Array.isArray(response.data.data.items)).toBe(true)
}

// Bulk operation helpers
export async function createBulkTestData(
  count: number,
  creator: () => Promise<any>
): Promise<any[]> {
  const promises = Array.from({ length: count }, () => creator())
  return Promise.all(promises)
}

// Cleanup helpers
export async function cleanupTestData(userId: number) {
  // Delete in reverse order of dependencies
  await testDb.delete(schema.notifications).where(eq(schema.notifications.user_id, userId))
  await testDb.delete(schema.action_logs).where(eq(schema.action_logs.account_id, userId))
  await testDb.delete(schema.messages).where(eq(schema.messages.account_id, userId))
  await testDb.delete(schema.leads).where(eq(schema.leads.user_id, userId))
  await testDb.delete(schema.campaigns).where(eq(schema.campaigns.user_id, userId))
  await testDb.delete(schema.proxy_bindings).where(eq(schema.proxy_bindings.account_id, userId))
  await testDb.delete(schema.accounts).where(eq(schema.accounts.user_id, userId))
  await testDb.delete(schema.users).where(eq(schema.users.id, userId))
}
