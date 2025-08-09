import { z } from "zod";

// Campaign validation schemas
export const campaignSchema = z.object({
  name: z.string()
    .min(1, "Campaign name is required")
    .max(100, "Campaign name must be less than 100 characters"),
  profileUrl: z.string()
    .min(1, "Profile URL template is required")
    .refine((url) => {
      // Must contain at least one variable or be a valid URL
      return url.includes("{{") || isValidUrl(url);
    }, "Profile URL must contain variables or be a valid URL"),
  message: z.string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be less than 2000 characters"),
  selectedAccounts: z.array(z.number())
    .min(1, "At least one Instagram account must be selected"),
  leadFileId: z.number()
    .min(1, "Lead file must be selected")
});

// Instagram URL validation
export function isValidInstagramUrl(url: string): boolean {
  const instagramUrlPattern = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/;
  return instagramUrlPattern.test(url);
}

// General URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// CSV validation
export function validateCsvFile(file: File): { isValid: boolean; error?: string } {
  if (!file.name.endsWith('.csv')) {
    return { isValid: false, error: "File must be a CSV format" };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return { isValid: false, error: "File size must be less than 10MB" };
  }
  
  return { isValid: true };
}

// Message template validation
export function validateMessageTemplate(template: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (template.length < 10) {
    errors.push("Message must be at least 10 characters long");
  }
  
  if (template.length > 2000) {
    errors.push("Message must be less than 2000 characters");
  }
  
  // Check for balanced brackets
  const openBrackets = (template.match(/\{\{/g) || []).length;
  const closeBrackets = (template.match(/\}\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push("Unbalanced variable brackets - check {{ }} syntax");
  }
  
  return { isValid: errors.length === 0, errors };
}

// Rate limiting validation
export const rateLimitSchema = z.object({
  maxMessagesPerDay: z.number()
    .min(1, "Must send at least 1 message per day")
    .max(200, "Maximum 200 messages per day per account"),
  delayBetweenMessages: z.number()
    .min(30, "Minimum 30 seconds between messages")
    .max(3600, "Maximum 1 hour between messages")
});

// Lead file validation helpers
export function validateInstagramProfileUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
    /^https?:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?$/,
    /^@[a-zA-Z0-9_.]+$/,
    /^[a-zA-Z0-9_.]+$/
  ];
  
  return patterns.some(pattern => pattern.test(url.trim()));
}

export function normalizeInstagramUrl(url: string): string {
  const trimmed = url.trim();
  
  // Already a full URL
  if (trimmed.startsWith('http')) {
    return trimmed;
  }
  
  // Handle @username format
  if (trimmed.startsWith('@')) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }
  
  // Handle plain username
  return `https://instagram.com/${trimmed}`;
}