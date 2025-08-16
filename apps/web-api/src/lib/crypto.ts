import crypto from 'crypto';
import env from '../env';

// AES-GCM encryption key (32 bytes)
const getEncryptionKey = (): Buffer => {
  if (!env.COOKIE_ENC_KEY_BASE64) {
    throw new Error('COOKIE_ENC_KEY_BASE64 environment variable is required');
  }
  
  const key = Buffer.from(env.COOKIE_ENC_KEY_BASE64, 'base64');
  if (key.length !== 32) {
    throw new Error('COOKIE_ENC_KEY_BASE64 must be a 32-byte base64 string');
  }
  
  return key;
};

// Encrypt JSON object to base64 string
export function encryptJson<T>(obj: T): string {
  try {
    const key = getEncryptionKey();
    const jsonString = JSON.stringify(obj);
    const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
    
    const cipher = crypto.createCipherGCM('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('heyreach-cookies', 'utf8')); // Additional authenticated data
    
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt base64 string to JSON object
export function decryptJson<T>(encryptedData: string): T {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV (12 bytes), encrypted data, and auth tag (16 bytes)
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(combined.length - 16);
    const encrypted = combined.subarray(12, combined.length - 16);
    
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('heyreach-cookies', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// Generate a secure random string
export function generateSecureString(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password with bcrypt
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export async function generateJWT(payload: Record<string, any>): Promise<string> {
  const jwt = await import('jsonwebtoken');
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export async function verifyJWT(token: string): Promise<Record<string, any>> {
  const jwt = await import('jsonwebtoken');
  return jwt.verify(token, env.JWT_SECRET);
}
