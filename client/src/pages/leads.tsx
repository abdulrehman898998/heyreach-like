import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  Check, 
  Users, 
  Database, 
  CheckCircle, 
  X,
  PlusIcon,
  TrashIcon,
  Eye,
  ExternalLink
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CsvPreview {
  fileName: string;
  columnNames: string[];
  rowCount: number;
  preview: Record<string, any>[];
}

interface Lead {
  id: number;
  profileUrl: string;
  name: string;
  customFields: Record<string, any>;
  createdAt: string;
  leadFileId: number;
}

interface LeadFile {
  id: number;
  name: string;
  originalName: string;
  columnNames: string[];
  rowCount: number;
  createdAt: string;
}

export default function LeadsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing lead files
  const { data: leadFilesData } = useQuery({
    queryKey: ['lead-files'],
    queryFn: async () => {
      const response = await fetch('/api/lead-files');
      const data = await response.json();
      return data.success ? data.leadFiles : [];
    }
  });

  const leadFiles: LeadFile[] = leadFilesData || [];
  
  // Debug logging
  console.log('Lead files data:', leadFilesData);
  console.log('Processed lead files:', leadFiles);

  // Function to preview leads from a specific file
  const handlePreviewFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/leads/files/${fileId}/leads`);
      const data = await response.json();
      if (data.success) {
        setPreviewLeads(data.leads);
        setPreviewFileId(fileId);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load leads preview",
        variant: "destructive",
      });
    }
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || selectedColumns.length === 0) {
        throw new Error('Missing file or columns');
      }
      
      const fileContent = await selectedFile.text();
      
      const response = await apiRequest('POST', '/api/lead-files/import', {
        fileName: selectedFile.name,
        csvData: fileContent,
        selectedColumns
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Leads imported successfully",
        description: `Imported ${data.leadsCount || data.leadFile?.totalRows || 0} leads`,
      });
      queryClient.invalidateQueries({ queryKey: ['lead-files'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Reset form
      setSelectedFile(null);
      setCsvPreview(null);
      setSelectedColumns([]);
      setIsProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import leads",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCsvPreview(null);
      setSelectedColumns([]);
      setIsProcessing(true);

      try {
        // Read and parse CSV immediately
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Create preview data
        const preview = lines.slice(1, 4).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        }).filter(row => Object.values(row).some(v => v !== ''));

        const csvPreview: CsvPreview = {
          fileName: file.name,
          columnNames: headers,
          rowCount: lines.length - 1,
          preview
        };

        setCsvPreview(csvPreview);
        // Auto-select all columns by default
        setSelectedColumns(headers);
      } catch (error) {
        toast({
          title: "Error reading file",
          description: "Please check your CSV file format",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleSelectAll = () => {
    if (csvPreview) {
      setSelectedColumns(csvPreview.columnNames);
    }
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const handleImport = () => {
    setIsProcessing(true);
    importMutation.mutate();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setCsvPreview(null);
    setSelectedColumns([]);
  };

  const handleDeleteFile = async (fileId: number) => {
    try {
      console.log('🗑️ Attempting to delete file with ID:', fileId);
      const response = await fetch(`/api/lead-files/${fileId}`, {
        method: 'DELETE',
      });
      
      console.log('🗑️ Delete response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🗑️ Delete response:', result);
        toast({
          title: "File deleted successfully",
          description: "The lead file has been removed",
        });
        queryClient.invalidateQueries({ queryKey: ['lead-files'] });
      } else {
        const errorData = await response.json();
        console.log('🗑️ Delete error:', errorData);
        throw new Error(errorData.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('🗑️ Delete error:', error);
      toast({
        title: "Delete failed",
        description: `Failed to delete the lead file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground">Upload and manage your Instagram lead files</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Lead Files</p>
                <p className="text-2xl font-bold text-gray-900">{leadFiles.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leadFiles.reduce((sum: number, file: LeadFile) => sum + (file.rowCount || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ready for Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leadFiles.filter((file: LeadFile) => (file.rowCount || 0) > 0).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Lead File
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!csvPreview ? (
            /* File Selection Area */
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
                disabled={isProcessing}
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileText className="h-16 w-16 mx-auto text-blue-400 mb-6" />
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  Choose CSV File
                </p>
                <p className="text-base text-gray-600 mb-2">
                  Select a file with Instagram profiles and messages
                </p>
                <p className="text-sm text-gray-500">
                  Supported format: CSV with headers
                </p>
              </label>
            </div>
          ) : (
            /* Column Selection Area */
            <div className="space-y-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900">{csvPreview.fileName}</h3>
                    <p className="text-sm text-gray-500">
                      {csvPreview.rowCount} rows • {csvPreview.columnNames.length} columns
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Select Columns to Import</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      className="px-4 py-2 font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDeselectAll}
                      className="px-4 py-2 font-medium bg-red-50 border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {csvPreview.columnNames.map((column) => (
                    <div 
                      key={column} 
                      className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        selectedColumns.includes(column) 
                          ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox 
                        id={column}
                        checked={selectedColumns.includes(column)}
                        onCheckedChange={() => handleColumnToggle(column)}
                        className="w-5 h-5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label 
                        htmlFor={column} 
                        className={`text-sm font-semibold cursor-pointer flex-1 ${
                          selectedColumns.includes(column) ? 'text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {column}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Preview Table */}
                {selectedColumns.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Preview (first 3 rows):</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {selectedColumns.map(col => (
                                <th key={col} className="px-4 py-3 text-left font-medium text-gray-700">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {csvPreview.preview.slice(0, 3).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                {selectedColumns.map(col => (
                                  <td key={col} className="px-4 py-3 text-gray-600">
                                    <div className="max-w-xs truncate" title={String(row[col] || "")}>
                                      {String(row[col] || "").substring(0, 50)}
                                      {String(row[col] || "").length > 50 ? "..." : ""}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isProcessing}
                    className="flex-1 px-8 py-3 text-lg font-semibold border-2 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={selectedColumns.length === 0 || isProcessing}
                    className="flex-1 px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5 mr-3" />
                        Import {selectedColumns.length} Columns
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Lead Files */}
      {leadFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Existing Lead Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadFiles.map((file: LeadFile) => (
                <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <p className="text-sm text-gray-500">
                        {file.rowCount} leads • {file.columnNames?.length || 0} columns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewFile(file.id)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

            {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads from File: {previewFileId ? leadFiles.find((f: LeadFile) => f.id === previewFileId)?.name : 'N/A'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {previewLeads.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Profile</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Message</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {previewLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <a
                            href={lead.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                          >
                            <span>View Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {lead.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="max-w-xs truncate" title={lead.customFields?.messages || lead.customFields?.message || 'No message'}>
                          {lead.customFields?.messages || lead.customFields?.message || 'No message'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No leads found in this file.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* No Leads Message */}
      {leadFiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lead Files Yet</h3>
            <p className="text-gray-600 mb-6">
              Upload your first CSV file to start managing your Instagram leads
            </p>
            <Button
              onClick={() => document.getElementById('csv-upload')?.click()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}