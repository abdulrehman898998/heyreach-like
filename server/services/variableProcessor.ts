interface Lead {
  id: number;
  leadFileId: number;
  profileUrl: string;
  name: string;
  customFields: Record<string, any>;
}

interface ProcessedMessage {
  message: string;
  variables: Record<string, string>;
}

export class VariableProcessor {
  /**
   * Process a message template by replacing variables with actual data from a lead
   */
  static processMessageTemplate(template: string, lead: Lead): ProcessedMessage {
    if (!template) {
      return { message: '', variables: {} };
    }

    let processedMessage = template;
    const variables: Record<string, string> = {};

    // Extract all variables from the template (format: /variableName)
    const variableRegex = /\/([a-zA-Z0-9_\s]+)/g;
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableName = match[1].trim();
      const fullVariable = match[0]; // /variableName

      // Try to find the value in different places
      let value = '';

      // First, check if it's a special field
      if (variableName.toLowerCase() === 'username') {
        // Extract username from profile URL
        value = this.extractUsernameFromUrl(lead.profileUrl);
      } else if (variableName.toLowerCase() === 'profileurl') {
        value = lead.profileUrl || '';
      } else if (variableName.toLowerCase() === 'name') {
        value = lead.name || '';
      }

      // If not found in special fields, check custom fields
      if (!value && lead.customFields) {
        const customValue = lead.customFields[variableName];
        // Handle different data types safely
        if (customValue !== null && customValue !== undefined) {
          if (typeof customValue === 'string') {
            value = customValue;
          } else if (typeof customValue === 'number') {
            value = customValue.toString();
          } else if (typeof customValue === 'boolean') {
            value = customValue.toString();
          } else {
            value = String(customValue);
          }
        }
      }

      // Ensure value is a string and not NaN
      if (value === 'NaN' || value === 'undefined' || value === 'null') {
        value = '';
      }

      // Store the variable value
      variables[variableName] = value;

      // Replace the variable in the message
      processedMessage = processedMessage.replace(fullVariable, value);
    }

    return {
      message: processedMessage,
      variables
    };
  }

  /**
   * Extract username from various Instagram URL formats
   */
  private static extractUsernameFromUrl(profileUrl: string): string {
    if (!profileUrl) return '';

    try {
      // Handle different URL formats
      const urlPatterns = [
        /instagram\.com\/([^\/\?]+)/, // instagram.com/username
        /instagram\.com\/p\/[^\/]+\//, // instagram.com/p/postid/
        /instagram\.com\/reel\/[^\/]+\//, // instagram.com/reel/reelid/
        /instagram\.com\/stories\/[^\/]+\//, // instagram.com/stories/username/
      ];

      for (const pattern of urlPatterns) {
        const match = profileUrl.match(pattern);
        if (match && match[1]) {
          // Clean up the username
          let username = match[1].split('?')[0]; // Remove query parameters
          username = username.split('#')[0]; // Remove hash fragments
          return username;
        }
      }

      // If no pattern matches, try to extract from the last part of the URL
      const urlParts = profileUrl.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && lastPart !== '') {
        return lastPart.split('?')[0].split('#')[0];
      }

      return '';
    } catch (error) {
      console.error('Error extracting username from URL:', error);
      return '';
    }
  }

  /**
   * Get all available variables from a lead
   */
  static getAvailableVariables(lead: Lead): Record<string, string> {
    const variables: Record<string, string> = {};

    // Add special fields
    variables['Username'] = this.extractUsernameFromUrl(lead.profileUrl);
    variables['ProfileUrl'] = lead.profileUrl || '';
    variables['Name'] = lead.name || '';

    // Add custom fields
    if (lead.customFields) {
      Object.entries(lead.customFields).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'string') {
            variables[key] = value;
          } else if (typeof value === 'number') {
            variables[key] = value.toString();
          } else if (typeof value === 'boolean') {
            variables[key] = value.toString();
          } else {
            variables[key] = String(value);
          }
        } else {
          variables[key] = '';
        }
      });
    }

    return variables;
  }

  /**
   * Validate if all variables in a template are available in the lead data
   */
  static validateTemplate(template: string, lead: Lead): { valid: boolean; missingVariables: string[] } {
    if (!template) {
      return { valid: true, missingVariables: [] };
    }

    const variableRegex = /\/([a-zA-Z0-9_\s]+)/g;
    const missingVariables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableName = match[1].trim();
      let found = false;

      // Check special fields
      if (variableName.toLowerCase() === 'username' || 
          variableName.toLowerCase() === 'profileurl' || 
          variableName.toLowerCase() === 'name') {
        found = true;
      }

      // Check custom fields
      if (!found && lead.customFields && lead.customFields[variableName] !== undefined) {
        found = true;
      }

      if (!found) {
        missingVariables.push(variableName);
      }
    }

    return {
      valid: missingVariables.length === 0,
      missingVariables
    };
  }

  /**
   * Get a preview of how a message template would look with sample data
   */
  static getMessagePreview(template: string, sampleLead: Lead): string {
    const processed = this.processMessageTemplate(template, sampleLead);
    return processed.message;
  }
}
