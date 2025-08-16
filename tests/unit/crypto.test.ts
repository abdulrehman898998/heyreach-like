import { describe, it, expect, beforeEach } from 'vitest'
import { 
  encryptJson, 
  decryptJson, 
  generateSecureString, 
  hashPassword, 
  verifyPassword,
  generateJWT,
  verifyJWT
} from '../../apps/web-api/src/lib/crypto'

describe('Crypto Utilities', () => {
  const testData = {
    username: 'testuser',
    password: 'testpass',
    cookies: ['session=abc123', 'csrf=def456'],
    timestamp: Date.now()
  }

  describe('AES-GCM Encryption/Decryption', () => {
    it('should encrypt and decrypt JSON data correctly', () => {
      const encrypted = encryptJson(testData)
      const decrypted = decryptJson(encrypted)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(JSON.stringify(testData))
      expect(decrypted).toEqual(testData)
    })

    it('should handle empty objects', () => {
      const emptyObj = {}
      const encrypted = encryptJson(emptyObj)
      const decrypted = decryptJson(encrypted)

      expect(decrypted).toEqual(emptyObj)
    })

    it('should handle nested objects', () => {
      const nestedData = {
        user: {
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark',
              notifications: true
            }
          }
        },
        metadata: {
          created: new Date().toISOString(),
          tags: ['important', 'urgent']
        }
      }

      const encrypted = encryptJson(nestedData)
      const decrypted = decryptJson(encrypted)

      expect(decrypted).toEqual(nestedData)
    })

    it('should handle arrays', () => {
      const arrayData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]

      const encrypted = encryptJson(arrayData)
      const decrypted = decryptJson(encrypted)

      expect(decrypted).toEqual(arrayData)
    })

    it('should handle special characters and unicode', () => {
      const specialData = {
        text: 'Hello 世界! 🌍',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        emoji: '😀🎉🚀💻',
        unicode: 'áéíóúñüç'
      }

      const encrypted = encryptJson(specialData)
      const decrypted = decryptJson(encrypted)

      expect(decrypted).toEqual(specialData)
    })

    it('should fail with invalid encrypted data', () => {
      expect(() => {
        decryptJson('invalid-encrypted-data')
      }).toThrow()
    })

    it('should fail with empty encrypted data', () => {
      expect(() => {
        decryptJson('')
      }).toThrow()
    })

    it('should fail with corrupted encrypted data', () => {
      const encrypted = encryptJson(testData)
      const corrupted = encrypted.slice(0, -10) + 'corrupted'

      expect(() => {
        decryptJson(corrupted)
      }).toThrow()
    })
  })

  describe('Secure String Generation', () => {
    it('should generate strings of specified length', () => {
      const length = 32
      const result = generateSecureString(length)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(length * 0.8) // Base64 encoding
    })

    it('should generate different strings each time', () => {
      const strings = new Set()
      
      for (let i = 0; i < 100; i++) {
        strings.add(generateSecureString(16))
      }
      
      expect(strings.size).toBe(100)
    })

    it('should use default length when not specified', () => {
      const result = generateSecureString()
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(20)
    })

    it('should handle zero length', () => {
      const result = generateSecureString(0)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBe(0)
    })
  })

  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testpassword123'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are long
    })

    it('should verify correct passwords', async () => {
      const password = 'testpassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'testpassword123'
      const wrongPassword = 'wrongpassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)
      
      expect(isValid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
      
      // Both should still verify correctly
      const valid1 = await verifyPassword(password, hash1)
      const valid2 = await verifyPassword(password, hash2)
      
      expect(valid1).toBe(true)
      expect(valid2).toBe(true)
    })

    it('should handle empty passwords', async () => {
      const password = ''
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should handle special characters in passwords', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      
      expect(isValid).toBe(true)
    })

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000)
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)
      
      expect(isValid).toBe(true)
    })
  })

  describe('JWT Token Generation and Verification', () => {
    it('should generate valid JWT tokens', async () => {
      const payload = {
        id: 123,
        email: 'test@example.com',
        role: 'user'
      }
      
      const token = await generateJWT(payload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    })

    it('should verify valid JWT tokens', async () => {
      const payload = {
        id: 123,
        email: 'test@example.com',
        role: 'user'
      }
      
      const token = await generateJWT(payload)
      const verified = await verifyJWT(token)
      
      expect(verified).toBeDefined()
      expect(verified.id).toBe(payload.id)
      expect(verified.email).toBe(payload.email)
      expect(verified.role).toBe(payload.role)
      expect(verified).toHaveProperty('iat') // issued at
      expect(verified).toHaveProperty('exp') // expiration
    })

    it('should fail with invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '', // Empty token
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ]

      for (const token of invalidTokens) {
        await expect(verifyJWT(token)).rejects.toThrow()
      }
    })

    it('should handle different payload types', async () => {
      const testCases = [
        { id: 1, name: 'Simple' },
        { user: { id: 1, profile: { name: 'John' } }, roles: ['admin', 'user'] },
        { data: [1, 2, 3], metadata: { count: 3 } },
        { empty: null, boolean: true, number: 42 }
      ]

      for (const payload of testCases) {
        const token = await generateJWT(payload)
        const verified = await verifyJWT(token)
        
        expect(verified).toMatchObject(payload)
      }
    })

    it('should include standard JWT claims', async () => {
      const payload = { id: 123 }
      const token = await generateJWT(payload)
      const verified = await verifyJWT(token)
      
      expect(verified).toHaveProperty('iat') // issued at
      expect(verified).toHaveProperty('exp') // expiration
      expect(typeof verified.iat).toBe('number')
      expect(typeof verified.exp).toBe('number')
      expect(verified.exp).toBeGreaterThan(verified.iat)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing encryption key', () => {
      // Temporarily remove the key
      const originalKey = process.env.COOKIE_ENC_KEY_BASE64
      delete process.env.COOKIE_ENC_KEY_BASE64
      
      expect(() => {
        encryptJson(testData)
      }).toThrow()
      
      // Restore the key
      process.env.COOKIE_ENC_KEY_BASE64 = originalKey
    })

    it('should handle invalid encryption key', () => {
      const originalKey = process.env.COOKIE_ENC_KEY_BASE64
      process.env.COOKIE_ENC_KEY_BASE64 = 'invalid-key'
      
      expect(() => {
        encryptJson(testData)
      }).toThrow()
      
      process.env.COOKIE_ENC_KEY_BASE64 = originalKey
    })

    it('should handle missing JWT secret', async () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET
      
      await expect(generateJWT({ id: 1 })).rejects.toThrow()
      
      process.env.JWT_SECRET = originalSecret
    })
  })

  describe('Performance', () => {
    it('should handle encryption/decryption efficiently', () => {
      const start = Date.now()
      
      for (let i = 0; i < 100; i++) {
        const encrypted = encryptJson(testData)
        decryptJson(encrypted)
      }
      
      const end = Date.now()
      const duration = end - start
      
      // Should complete 100 operations in reasonable time
      expect(duration).toBeLessThan(5000) // 5 seconds
    })

    it('should handle password hashing efficiently', async () => {
      const start = Date.now()
      
      for (let i = 0; i < 10; i++) {
        await hashPassword('testpassword123')
      }
      
      const end = Date.now()
      const duration = end - start
      
      // Should complete 10 hashes in reasonable time
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should handle JWT operations efficiently', async () => {
      const payload = { id: 123, email: 'test@example.com' }
      const start = Date.now()
      
      for (let i = 0; i < 100; i++) {
        const token = await generateJWT(payload)
        await verifyJWT(token)
      }
      
      const end = Date.now()
      const duration = end - start
      
      // Should complete 100 JWT operations in reasonable time
      expect(duration).toBeLessThan(1000) // 1 second
    })
  })
})
