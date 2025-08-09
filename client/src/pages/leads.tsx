import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CsvPreview {
  fileName: string;
  columnNames: string[];
  rowCount: number;
  preview: Record<string, any>[];
}

export default function LeadsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/lead-files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setCsvPreview(data.data);
        setCsvData(selectedFile?.text ? "" : ""); // We'll read the file content for import
        toast({
          title: "File uploaded successfully",
          description: `Found ${data.data.columnNames.length} columns and ${data.data.rowCount} rows`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Please check your CSV file format",
        variant: "destructive",
      });
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || selectedColumns.length === 0) {
        throw new Error('Missing file or columns');
      }
      
      const fileContent = await selectedFile.text();
      
      return apiRequest('/api/lead-files/import', {
        method: 'POST',
        body: {
          fileName: selectedFile.name,
          csvData: fileContent,
          selectedColumns
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Leads imported successfully",
        description: `Imported ${data.leadsCount} leads`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/lead-files'] });
      // Reset form
      setSelectedFile(null);
      setCsvPreview(null);
      setSelectedColumns([]);
      setCsvData("");
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import leads",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCsvPreview(null);
      setSelectedColumns([]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleImport = () => {
    importMutation.mutate();
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Leads</h1>
          <p className="text-muted-foreground">Upload your CSV file with Instagram profiles and messages</p>
        </div>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 1: Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium">Choose CSV File</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : "Select a file with Instagram profiles and messages"}
                </p>
              </label>
            </div>
            
            {selectedFile && !csvPreview && (
              <Button 
                onClick={handleUpload} 
                disabled={uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload & Preview"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Selection */}
      {csvPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Step 2: Select Columns to Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which columns from your CSV you want to import:
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {csvPreview.columnNames.map((column) => (
                  <div key={column} className="flex items-center space-x-2">
                    <Checkbox 
                      id={column}
                      checked={selectedColumns.includes(column)}
                      onCheckedChange={() => handleColumnToggle(column)}
                    />
                    <Label htmlFor={column} className="text-sm font-medium">
                      {column}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedColumns.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Preview (first 3 rows):</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {selectedColumns.map(col => (
                            <th key={col} className="px-4 py-2 text-left font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.preview.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {selectedColumns.map(col => (
                              <td key={col} className="px-4 py-2">
                                {String(row[col] || "").substring(0, 50)}
                                {String(row[col] || "").length > 50 ? "..." : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleImport}
                disabled={selectedColumns.length === 0 || importMutation.isPending}
                className="w-full"
                size="lg"
              >
                {importMutation.isPending ? "Importing..." : `Import ${selectedColumns.length} Selected Columns`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}