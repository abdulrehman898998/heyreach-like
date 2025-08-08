import { storage } from "../storage";
import { type NewTemplate, type Template, extractTemplateVariables, generateMessage, getAvailableDynamicFields, validateSpintax } from "@shared/schema";

export interface TemplatePreviewRequest {
  content: string;
  sampleData: Record<string, string>;
}

export interface TemplatePreviewResult {
  original: string;
  generated: string;
  variables: string[];
  variations: string[];
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
}

export class TemplateService {
  /**
   * Create a new message template
   */
  async createTemplate(userId: string, name: string, content: string): Promise<Template> {
    // Validate template
    const validation = this.validateTemplate(content);
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.errors.join(", ")}`);
    }

    const templateData: NewTemplate = {
      userId,
      name,
      content,
      variables: validation.variables,
    };

    return await storage.createTemplate(templateData);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: number, updates: { name?: string; content?: string }): Promise<Template> {
    // If content is being updated, validate it
    if (updates.content) {
      const validation = this.validateTemplate(updates.content);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(", ")}`);
      }

      // Update variables if content changed
      updates = {
        ...updates,
        variables: validation.variables,
      } as any;
    }

    return await storage.updateTemplate(templateId, updates);
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: number): Promise<Template | undefined> {
    return await storage.getTemplateById(templateId);
  }

  /**
   * Get all templates for a user
   */
  async getUserTemplates(userId: string): Promise<Template[]> {
    return await storage.getTemplatesByUser(userId);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: number): Promise<void> {
    await storage.deleteTemplate(templateId);
  }

  /**
   * Search templates by keyword
   */
  async searchTemplates(userId: string, keyword: string): Promise<Template[]> {
    return await storage.searchTemplates(userId, keyword);
  }

  /**
   * Validate template content
   */
  validateTemplate(content: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables = extractTemplateVariables(content);

    // Check for empty content
    if (!content.trim()) {
      errors.push("Template content cannot be empty");
    }

    // Check for minimum length
    if (content.trim().length < 10) {
      warnings.push("Template content is very short");
    }

    // Check for maximum length (Instagram message limit)
    if (content.length > 1000) {
      errors.push("Template content exceeds Instagram message limit (1000 characters)");
    }

    // Validate spintax syntax
    const spintaxValidation = validateSpintax(content);
    if (!spintaxValidation.isValid) {
      errors.push(...spintaxValidation.errors);
    }

    // Check for balanced variable braces (legacy {{variable}} syntax)
    const variableRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      
      if (!variableName) {
        errors.push("Variable name cannot be empty");
      }

      if (variableName.includes(' ')) {
        warnings.push(`Variable "${variableName}" contains spaces - consider using underscores`);
      }
    }

    // Check for common issues
    if (content.includes('{{}}')) {
      errors.push("Empty variable placeholder detected");
    }

    if (content.includes('{}')) {
      warnings.push("Empty spintax placeholder detected");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      variables,
    };
  }

  /**
   * Generate preview of template with sample data
   */
  generatePreview(request: TemplatePreviewRequest): TemplatePreviewResult {
    const { content, sampleData } = request;
    
    // Extract variables from template
    const variables = extractTemplateVariables(content);
    
    // Generate multiple variations
    const variations: string[] = [];
    for (let i = 0; i < 3; i++) {
      variations.push(generateMessage(content, sampleData));
    }

    // Generate one main preview
    const generated = generateMessage(content, sampleData);

    return {
      original: content,
      generated,
      variables,
      variations,
    };
  }

  /**
   * Get available variables from lead data
   */
  getAvailableVariables(leadData: Record<string, any>): string[] {
    const variables = ['name', 'profile_url'];
    
    // Add custom fields
    if (leadData.customFields) {
      Object.keys(leadData.customFields).forEach(field => {
        variables.push(field);
      });
    }

    return variables;
  }

  /**
   * Get available dynamic fields for slash-based selection
   */
  getAvailableDynamicFields(content: string): string[] {
    return getAvailableDynamicFields(content);
  }

  /**
   * Get all possible column names from lead files
   */
  async getAvailableColumns(userId: string): Promise<string[]> {
    try {
      const leadFiles = await storage.getLeadFilesByUser(userId);
      const allColumns = new Set<string>();
      
      // Add standard columns for Instagram automation
      allColumns.add('name');
      allColumns.add('profile_url');
      allColumns.add('username');
      allColumns.add('email');
      allColumns.add('phone');
      allColumns.add('company');
      allColumns.add('website');
      allColumns.add('bio');
      allColumns.add('followers');
      allColumns.add('following');
      allColumns.add('posts');
      allColumns.add('location');
      allColumns.add('industry');
      allColumns.add('interests');
      
      // Add custom fields from all lead files
      for (const file of leadFiles) {
        try {
          if (file.columnMapping && typeof file.columnMapping === 'object') {
            const mapping = file.columnMapping as Record<string, any>;
            
            // Add custom fields
            if (mapping.customFields && typeof mapping.customFields === 'object') {
              Object.keys(mapping.customFields).forEach(field => {
                if (typeof field === 'string' && field.trim()) {
                  allColumns.add(field.trim());
                }
              });
            }
            
            // Also check for direct column mappings
            Object.keys(mapping).forEach(key => {
              if (key !== 'customFields' && typeof key === 'string') {
                const trimmedKey = key.trim();
                if (trimmedKey) {
                  allColumns.add(trimmedKey);
                }
              }
            });
          }
        } catch (error) {
          console.error('Error processing lead file column mapping:', error);
          // Continue with other files
        }
      }
      
      return Array.from(allColumns).sort();
    } catch (error) {
      console.error('Error getting available columns:', error);
      // Return default columns if there's an error
      return [
        'name', 'profile_url', 'username', 'email', 'phone', 'company', 
        'website', 'bio', 'followers', 'following', 'posts', 'location', 
        'industry', 'interests'
      ];
    }
  }

  /**
   * Generate sample data for template testing
   */
  generateSampleData(variables: string[]): Record<string, string> {
    const sampleData: Record<string, string> = {};

    variables.forEach(variable => {
      switch (variable) {
        case 'name':
          sampleData.name = 'John Doe';
          break;
        case 'profile_url':
          sampleData.profile_url = 'https://instagram.com/johndoe';
          break;
        default:
          sampleData[variable] = `Sample ${variable}`;
      }
    });

    return sampleData;
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(userId: string) {
    const templates = await storage.getTemplatesByUser(userId);
    
    const stats = {
      total: templates.length,
      withVariables: templates.filter((t: any) => t.variables && t.variables.length > 0).length,
      withVariations: templates.filter((t: any) => t.content.includes('{')).length,
      averageLength: 0,
      mostUsedVariables: new Map<string, number>(),
    };

    // Calculate average length
    if (templates.length > 0) {
      const totalLength = templates.reduce((sum, t) => sum + t.content.length, 0);
      stats.averageLength = Math.round(totalLength / templates.length);
    }

    // Count variable usage
    templates.forEach(template => {
      if (template.variables) {
        template.variables.forEach(variable => {
          const count = stats.mostUsedVariables.get(variable) || 0;
          stats.mostUsedVariables.set(variable, count + 1);
        });
      }
    });

    return {
      ...stats,
      mostUsedVariables: Array.from(stats.mostUsedVariables.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([variable, count]) => ({ variable, count })),
    };
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: number, newName: string): Promise<Template> {
    const original = await storage.getTemplateById(templateId);
    if (!original) {
      throw new Error("Template not found");
    }

    return await this.createTemplate(original.userId, newName, original.content);
  }

  /**
   * Test template with multiple sample datasets
   */
  testTemplate(content: string, sampleDatasets: Record<string, string>[]): string[] {
    return sampleDatasets.map(data => generateMessage(content, data));
  }
}

export const templateService = new TemplateService();
