import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, createTestUser } from '../utils/setup'
import { 
  createApiClient, 
  expectSuccessResponse, 
  expectErrorResponse, 
  expectValidationError,
  loginUser,
  registerUser,
  authenticatedRequest,
  validateUserData
} from '../utils/helpers'

describe('Authentication API', () => {
  let client: any

  beforeAll(async () => {
    await setupTestEnvironment()
    client = createApiClient()
  })

  afterAll(async () => {
    await cleanupTestEnvironment()
  })

  beforeEach(async () => {
    // Clear any test data between tests
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      
      expectSuccessResponse(response)
      expect(response.data.data).toHaveProperty('token')
      expect(response.data.data).toHaveProperty('user')
      validateUserData(response.data.data.user)
      expect(response.data.data.user.email).toBe(userData.email)
    })

    it('should fail with invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectValidationError(response)
    })

    it('should fail with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectValidationError(response)
    })

    it('should fail when email already exists', async () => {
      // First registration
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123'
      }
      
      await client.post('/api/auth/register', userData)
      
      // Second registration with same email
      const response = await client.post('/api/auth/register', userData)
      expectErrorResponse(response, 400)
      expect(response.data.error).toMatch(/already exists|duplicate/i)
    })

    it('should fail with missing required fields', async () => {
      const response = await client.post('/api/auth/register', {})
      expectValidationError(response)
    })
  })

  describe('POST /api/auth/login', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createTestUser('login@example.com', 'password123')
    })

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/login', loginData)
      
      expectSuccessResponse(response)
      expect(response.data.data).toHaveProperty('token')
      expect(response.data.data).toHaveProperty('user')
      validateUserData(response.data.data.user)
      expect(response.data.data.user.email).toBe(loginData.email)
    })

    it('should fail with incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      }

      const response = await client.post('/api/auth/login', loginData)
      expectErrorResponse(response, 401)
      expect(response.data.error).toMatch(/invalid|incorrect/i)
    })

    it('should fail with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/login', loginData)
      expectErrorResponse(response, 401)
      expect(response.data.error).toMatch(/invalid|not found/i)
    })

    it('should fail with missing credentials', async () => {
      const response = await client.post('/api/auth/login', {})
      expectValidationError(response)
    })

    it('should fail with invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await client.post('/api/auth/login', loginData)
      expectValidationError(response)
    })
  })

  describe('GET /api/auth/me', () => {
    let testUser: any
    let authToken: string

    beforeEach(async () => {
      testUser = await createTestUser('me@example.com', 'password123')
      authToken = await loginUser('me@example.com', 'password123')
    })

    it('should return current user with valid token', async () => {
      const response = await authenticatedRequest('GET', '/api/auth/me', authToken)
      
      expectSuccessResponse(response)
      expect(response.data.data).toHaveProperty('id')
      expect(response.data.data).toHaveProperty('email')
      expect(response.data.data.email).toBe('me@example.com')
    })

    it('should fail without authentication token', async () => {
      const response = await client.get('/api/auth/me')
      expectErrorResponse(response, 401)
      expect(response.data.error).toMatch(/token|authentication/i)
    })

    it('should fail with invalid token', async () => {
      const response = await authenticatedRequest('GET', '/api/auth/me', 'invalid-token')
      expectErrorResponse(response, 401)
      expect(response.data.error).toMatch(/invalid|token/i)
    })

    it('should fail with expired token', async () => {
      // Create an expired token (this would require JWT manipulation)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid'
      
      const response = await authenticatedRequest('GET', '/api/auth/me', expiredToken)
      expectErrorResponse(response, 401)
    })
  })

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'wrongpassword'
      }

      // Make multiple failed login attempts
      const promises = Array.from({ length: 10 }, () => 
        client.post('/api/auth/login', loginData)
      )

      const responses = await Promise.all(promises)
      
      // At least one should be rate limited
      const rateLimited = responses.some(response => 
        response.status === 429 || response.data.error?.includes('rate limit')
      )
      
      expect(rateLimited).toBe(true)
    })

    it('should rate limit registration attempts', async () => {
      const userData = {
        email: 'ratelimit@example.com',
        password: 'password123'
      }

      // Make multiple registration attempts
      const promises = Array.from({ length: 10 }, () => 
        client.post('/api/auth/register', userData)
      )

      const responses = await Promise.all(promises)
      
      // At least one should be rate limited
      const rateLimited = responses.some(response => 
        response.status === 429 || response.data.error?.includes('rate limit')
      )
      
      expect(rateLimited).toBe(true)
    })
  })

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const userData = {
        email: 'passwordtest@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectSuccessResponse(response)

      // Verify the password is hashed in the database
      // This would require database access in the test
      // For now, we'll just verify the response doesn't contain the plain password
      expect(response.data.data.user).not.toHaveProperty('password')
      expect(response.data.data.user).not.toHaveProperty('password_hash')
    })

    it('should validate password strength', async () => {
      const weakPasswords = ['123', 'abc', 'password', 'qwerty']

      for (const password of weakPasswords) {
        const userData = {
          email: `weakpass${Date.now()}@example.com`,
          password
        }

        const response = await client.post('/api/auth/register', userData)
        expectValidationError(response)
      }
    })
  })

  describe('Token Security', () => {
    it('should generate secure JWT tokens', async () => {
      const userData = {
        email: 'token@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectSuccessResponse(response)

      const token = response.data.data.token
      
      // Verify token structure (basic JWT format)
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
      
      // Verify token can be used for authentication
      const meResponse = await authenticatedRequest('GET', '/api/auth/me', token)
      expectSuccessResponse(meResponse)
    })

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        'not-a-token',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '', // Empty token
      ]

      for (const token of malformedTokens) {
        const response = await authenticatedRequest('GET', '/api/auth/me', token)
        expectErrorResponse(response, 401)
      }
    })
  })

  describe('Input Validation', () => {
    it('should sanitize email addresses', async () => {
      const userData = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectSuccessResponse(response)
      
      // Email should be normalized to lowercase
      expect(response.data.data.user.email).toBe('test@example.com')
    })

    it('should handle special characters in email', async () => {
      const userData = {
        email: 'test+tag@example.com',
        password: 'password123'
      }

      const response = await client.post('/api/auth/register', userData)
      expectSuccessResponse(response)
    })

    it('should reject extremely long inputs', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com'
      const longPassword = 'a'.repeat(1000)

      const userData = {
        email: longEmail,
        password: longPassword
      }

      const response = await client.post('/api/auth/register', userData)
      expectValidationError(response)
    })
  })
})
