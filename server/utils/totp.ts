import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

/**
 * Generate a new TOTP secret for 2FA
 * @returns A 32-character base32 encoded secret
 */
export function generateTOTP(): string {
  // Generate 20 random bytes and convert to base32
  const secret = authenticator.generateSecret(20);
  return secret;
}

/**
 * Verify a TOTP code against a secret
 * @param secret The TOTP secret
 * @param token The 6-digit code to verify
 * @returns True if the code is valid
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate a QR code URL for 2FA setup
 * @param username Instagram username
 * @param secret TOTP secret
 * @returns QR code URL
 */
export function generateQRCodeURL(username: string, secret: string): string {
  const issuer = 'Instagram Automation';
  const label = `Instagram:${username}`;
  
  return authenticator.keyuri(username, issuer, secret);
}

/**
 * Generate a backup code for account recovery
 * @returns 8-digit backup code
 */
export function generateBackupCode(): string {
  // Generate 4 random bytes and convert to 8-digit number
  const bytes = randomBytes(4);
  const number = bytes.readUInt32BE(0);
  return (number % 100000000).toString().padStart(8, '0');
}

/**
 * Validate TOTP secret format
 * @param secret The secret to validate
 * @returns True if the secret is valid
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    // Check if it's a valid base32 string
    if (!/^[A-Z2-7]+=*$/.test(secret)) {
      return false;
    }
    
    // Try to generate a token to verify the secret works
    authenticator.generate(secret);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get time remaining until next TOTP code change
 * @returns Seconds remaining (0-29)
 */
export function getTimeRemaining(): number {
  const epoch = Math.floor(Date.now() / 1000);
  return 30 - (epoch % 30);
}
