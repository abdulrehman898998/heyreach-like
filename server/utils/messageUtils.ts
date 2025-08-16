/**
 * Replace variables in message content with actual values from lead data
 * Supports both {{variable}} and /variable formats
 */
export function replaceVariables(content: string, variables: Record<string, any>): string {
  if (!content || !variables) {
    return content;
  }

  let result = content;

  // Replace {{variable}} format
  result = result.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = variables[variable];
    return value !== undefined && value !== null ? String(value) : match;
  });

  // Replace /variable format
  result = result.replace(/\/(\w+)/g, (match, variable) => {
    const value = variables[variable];
    return value !== undefined && value !== null ? String(value) : match;
  });

  return result;
}

/**
 * Extract variables from message content
 * Returns an array of variable names found in the content
 */
export function extractVariables(content: string): string[] {
  if (!content) {
    return [];
  }

  const variables = new Set<string>();

  // Extract {{variable}} format
  const curlyMatches = content.match(/\{\{(\w+)\}\}/g);
  if (curlyMatches) {
    curlyMatches.forEach(match => {
      const variable = match.slice(2, -2); // Remove {{ and }}
      variables.add(variable);
    });
  }

  // Extract /variable format
  const slashMatches = content.match(/\/(\w+)/g);
  if (slashMatches) {
    slashMatches.forEach(match => {
      const variable = match.slice(1); // Remove /
      variables.add(variable);
    });
  }

  return Array.from(variables);
}

/**
 * Validate if all required variables are present in the lead data
 */
export function validateVariables(content: string, variables: Record<string, any>): {
  isValid: boolean;
  missing: string[];
  available: string[];
} {
  const required = extractVariables(content);
  const available = Object.keys(variables);
  const missing = required.filter(variable => !available.includes(variable));

  return {
    isValid: missing.length === 0,
    missing,
    available
  };
}

/**
 * Generate a preview of the message with sample data
 */
export function generatePreview(content: string, sampleData: Record<string, any>): string {
  return replaceVariables(content, sampleData);
}

/**
 * Get sample data for common variables
 */
export function getSampleData(): Record<string, any> {
  return {
    firstname: 'John',
    lastname: 'Doe',
    company: 'Tech Corp',
    email: 'john@example.com',
    phone: '+1234567890',
    website: 'www.example.com',
    industry: 'Technology',
    position: 'Manager',
    location: 'New York',
    message: 'Hello!',
    custom1: 'Custom Value 1',
    custom2: 'Custom Value 2'
  };
}
