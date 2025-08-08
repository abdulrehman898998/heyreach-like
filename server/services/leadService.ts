import { storage } from "../storage";
import { parse } from "csv-parse/sync";
import { type ColumnMapping, type NewLead, type NewLeadFile } from "@shared/schema";

export interface CSVUploadResult {
  success: boolean;
  fileId?: number;
  totalRows: number;
  errors: string[];
  preview: Record<string, string>[];
}

export interface ColumnMappingRequest {
  profileUrl: string;
  name?: string;
  customFields: Record<string, string>;
}

export interface CSVPreviewResult {
  success: boolean;
  availableColumns: string[];
  suggestedMapping: ColumnMappingRequest;
  preview: Record<string, string>[];
  totalRows: number;
}

function inferColumnMapping(headers: string[]): ColumnMappingRequest {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const candidates = [
    "profile_url",
    "instagram_url",
    "profile",
    "url",
    "instagram",
    "username",
    "handle",
  ];
  let profileUrlHeader = headers[0];
  for (const c of candidates) {
    const idx = normalized.indexOf(c);
    if (idx !== -1) {
      profileUrlHeader = headers[idx];
      break;
    }
  }
  const nameIdx = normalized.indexOf("name");
  const nameHeader = nameIdx !== -1 ? headers[nameIdx] : undefined;
  const customFields: Record<string, string> = {};
  headers.forEach((h) => {
    if (h === profileUrlHeader) return;
    if (nameHeader && h === nameHeader) return;
    customFields[h] = h;
  });
  return {
    profileUrl: profileUrlHeader,
    name: nameHeader,
    customFields,
  };
}

export class LeadService {
  /**
   * Preview CSV content and get available columns for mapping
   */
  async previewCSV(
    csvContent: string
  ): Promise<CSVPreviewResult> {
    try {
      // Remove UTF-8 BOM if present
      const cleanContent = csvContent.replace(/^\uFEFF/, '');
      
      // Parse CSV content
      const records = parse(cleanContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        return {
          success: false,
          availableColumns: [],
          suggestedMapping: { profileUrl: "", customFields: {} },
          preview: [],
          totalRows: 0,
        };
      }

      // Get available columns
      const firstRow = records[0];
      const availableColumns = Object.keys(firstRow as Record<string, any>);

      // Generate suggested mapping
      const suggestedMapping = inferColumnMapping(availableColumns);

      // Create preview (first 5 rows)
      const preview: Record<string, string>[] = [];
      for (let i = 0; i < Math.min(5, records.length); i++) {
        const row = records[i];
        const previewRow: Record<string, string> = {};

        // Add profile URL
        previewRow.profileUrl = (row as Record<string, any>)[suggestedMapping.profileUrl] || "";

        // Add name if mapped
        if (suggestedMapping.name) {
          previewRow.name = (row as Record<string, any>)[suggestedMapping.name] || "";
        }

        // Add custom fields
        for (const [fieldName, columnName] of Object.entries(suggestedMapping.customFields)) {
          previewRow[fieldName] = (row as Record<string, any>)[columnName] || "";
        }

        preview.push(previewRow);
      }

      return {
        success: true,
        availableColumns,
        suggestedMapping,
        preview,
        totalRows: records.length,
      };
    } catch (error) {
      console.error("Error previewing CSV:", error);
      return {
        success: false,
        availableColumns: [],
        suggestedMapping: { profileUrl: "", customFields: {} },
        preview: [],
        totalRows: 0,
      };
    }
  }

  /**
   * Process uploaded CSV file and store leads
   */
  async processCSVUpload(
    userId: string,
    filename: string,
    csvContent: string,
    columnMapping?: ColumnMappingRequest
  ): Promise<CSVUploadResult> {
    const errors: string[] = [];
    const preview: Record<string, string>[] = [];

    try {
      // Remove UTF-8 BOM if present
      const cleanContent = csvContent.replace(/^\uFEFF/, '');
      
      // Parse CSV content
      const records = parse(cleanContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      if (records.length === 0) {
        return {
          success: false,
          totalRows: 0,
          errors: ["CSV file is empty or has no valid data"],
          preview: [],
        };
      }

      // Build or validate column mapping
      const firstRow = records[0];
      const availableColumns = Object.keys(firstRow as Record<string, any>);

      const effectiveMapping: ColumnMappingRequest = columnMapping
        ? columnMapping
        : inferColumnMapping(availableColumns);

      if (!availableColumns.includes(effectiveMapping.profileUrl)) {
        errors.push(`Profile URL column "${effectiveMapping.profileUrl}" not found in CSV`);
      }

      if (effectiveMapping.name && !availableColumns.includes(effectiveMapping.name)) {
        errors.push(`Name column "${effectiveMapping.name}" not found in CSV`);
      }

      // Validate custom field mappings
      for (const [, columnName] of Object.entries(effectiveMapping.customFields)) {
        if (!availableColumns.includes(columnName)) {
          errors.push(`Custom field column "${columnName}" not found in CSV`);
        }
      }

      // Create preview (first 5 rows)
      for (let i = 0; i < Math.min(5, records.length); i++) {
        const row = records[i];
        const previewRow: Record<string, string> = {};

        // Add profile URL
        previewRow.profileUrl = (row as Record<string, any>)[effectiveMapping.profileUrl] || "";

        // Add name if mapped
        if (effectiveMapping.name) {
          previewRow.name = (row as Record<string, any>)[effectiveMapping.name] || "";
        }

        // Add custom fields
        for (const [fieldName, columnName] of Object.entries(effectiveMapping.customFields)) {
                      previewRow[fieldName] = (row as Record<string, any>)[columnName] || "";
        }

        preview.push(previewRow);
      }

      // Validate profile URLs
      const invalidUrls: string[] = [];
      for (const record of records) {
        const profileUrl = (record as Record<string, any>)[effectiveMapping.profileUrl];
        if (!this.isValidInstagramProfileUrl(profileUrl)) {
          invalidUrls.push(profileUrl);
        }
      }

      if (invalidUrls.length > 0) {
        errors.push(`${invalidUrls.length} invalid Instagram profile URLs found`);
      }

      // If there are validation errors, return them (with preview to assist mapping)
      if (errors.length > 0) {
        return {
          success: false,
          totalRows: records.length,
          errors,
          preview,
        };
      }

      // Create lead file record
      const leadFileData: NewLeadFile = {
        userId,
        filename,
        totalRows: records.length,
        columnMapping: effectiveMapping as ColumnMapping,
      };

      const leadFile = await storage.createLeadFile(leadFileData);

      // Process and store leads
      const leadsData: NewLead[] = (records as Record<string, any>[]).map((record: Record<string, any>) => {
        const customFields: Record<string, string> = {};
        for (const [fieldName, columnName] of Object.entries(effectiveMapping.customFields)) {
          customFields[fieldName] = record[columnName] || "";
        }
        return {
          fileId: leadFile.id,
          profileUrl: record[effectiveMapping.profileUrl],
          name: effectiveMapping.name ? record[effectiveMapping.name] : null,
          customFields,
        };
      });

      await storage.createLeads(leadsData);

      return {
        success: true,
        fileId: leadFile.id,
        totalRows: records.length,
        errors: [],
        preview,
      };
    } catch (error) {
      console.error("Error processing CSV upload:", error);
      return {
        success: false,
        totalRows: 0,
        errors: [`Error processing CSV: ${error instanceof Error ? error.message : "Unknown error"}`],
        preview: [],
      };
    }
  }

  /**
   * Validate Instagram profile URL format
   */
  private isValidInstagramProfileUrl(url: string): boolean {
    if (!url) return false;

    // Basic Instagram URL validation
    const instagramUrlPattern = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/;
    return instagramUrlPattern.test(url);
  }

  /**
   * Get leads with pagination
   */
  async getLeads(fileId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const leads = await storage.getLeadsByFileWithPagination(fileId, offset, limit);
    const total = await storage.getLeadCountByFile(fileId);

    return {
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get lead file details
   */
  async getLeadFile(fileId: number) {
    return await storage.getLeadFileById(fileId);
  }

  /**
   * Get all lead files for a user
   */
  async getUserLeadFiles(userId: string) {
    return await storage.getLeadFilesByUser(userId);
  }

  /**
   * Delete lead file and all associated leads
   */
  async deleteLeadFile(fileId: number) {
    await storage.deleteLeadFile(fileId);
  }

  /**
   * Search leads by keyword
   */
  async searchLeads(fileId: number, keyword: string) {
    const allLeads = await storage.getLeadsByFile(fileId);
    
    return allLeads.filter(lead => {
      const searchText = `${lead.name || ""} ${lead.profileUrl} ${JSON.stringify(lead.customFields)}`.toLowerCase();
      return searchText.includes(keyword.toLowerCase());
    });
  }

  /**
   * Get lead statistics
   */
  async getLeadStats(fileId: number) {
    const leads = await storage.getLeadsByFile(fileId);
    
    const stats = {
      total: leads.length,
      withNames: leads.filter(lead => lead.name).length,
      withoutNames: leads.filter(lead => !lead.name).length,
      customFields: new Set<string>(),
    };

    // Count custom fields
    leads.forEach(lead => {
      if (lead.customFields && typeof lead.customFields === 'object') {
        Object.keys(lead.customFields as Record<string, any>).forEach(field => {
          stats.customFields.add(field);
        });
      }
    });

    return {
      ...stats,
      customFields: Array.from(stats.customFields),
    };
  }
}

export const leadService = new LeadService();
