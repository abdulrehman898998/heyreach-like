import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Users, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authHeaders } from "@/lib/queryClient";

interface LeadFile {
  id: number;
  name: string;
  totalRows: number;
  uploadedAt: string;
}

interface ColumnMapping {
  selectedColumns: string[];
}

interface CSVPreview {
  availableColumns: string[];
  preview: Record<string, string>[];
  totalRows: number;
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [csvPreview, setCsvPreview] = useState<CSVPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showColumnMapping, setShowColumnMapping] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setPreview([]);
    setCsvPreview(null);
    setColumnMapping(null);
    setShowColumnMapping(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        headers: {
          ...authHeaders(),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.preview) {
          // Show column mapping interface
                     setCsvPreview({
             availableColumns: data.availableColumns || [],
             preview: Array.isArray(data.preview) ? data.preview : [],
             totalRows: data.totalRows || 0,
           });
           setColumnMapping({ selectedColumns: data.availableColumns || [] });
          setShowColumnMapping(true);
        } else {
          // Direct upload successful
          toast({
            title: "Upload successful!",
            description: `Uploaded ${data.totalRows} leads from ${file.name}`,
          });
          setPreview(Array.isArray(data.preview) ? data.preview : []);
          fetchLeadFiles();
        }
      } else {
        setPreview(Array.isArray(data.preview) ? data.preview : []);
        throw new Error((data && data.errors && data.errors.join(', ')) || data.error || 'Validation failed');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchLeadFiles = async () => {
    try {
      const response = await fetch('/api/leads/files', {
        headers: {
          ...authHeaders(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setLeadFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to fetch lead files:', error);
    }
  };

  const handleColumnToggle = (columnName: string) => {
    if (!columnMapping) return;

    const isSelected = columnMapping.selectedColumns.includes(columnName);
    setColumnMapping({
      ...columnMapping,
      selectedColumns: isSelected 
        ? columnMapping.selectedColumns.filter(col => col !== columnName)
        : [...columnMapping.selectedColumns, columnName]
    });
  };

  const handleFinalUpload = async () => {
    if (!selectedFile || !columnMapping) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('columnMapping', JSON.stringify({
      selectedColumns: columnMapping.selectedColumns
    }));

    try {
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        headers: {
          ...authHeaders(),
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast({
          title: "Upload successful!",
          description: `Uploaded ${data.totalRows} leads from ${selectedFile.name}`,
        });
        setPreview(Array.isArray(data.preview) ? data.preview : []);
        fetchLeadFiles();
        setShowColumnMapping(false);
        setSelectedFile(null);
        setCsvPreview(null);
        setColumnMapping(null);
      } else {
        throw new Error((data && data.errors && data.errors.join(', ')) || data.error || 'Validation failed');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelUpload = () => {
    setShowColumnMapping(false);
    setSelectedFile(null);
    setCsvPreview(null);
    setColumnMapping(null);
    setPreview([]);
  };

  useEffect(() => {
    fetchLeadFiles();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {showColumnMapping ? 'Map Columns' : 'Upload Leads'}
            </CardTitle>
            <CardDescription>
              {showColumnMapping 
                ? 'Select which columns to import and map them to lead fields'
                : 'Upload a CSV from any source. We automatically detect headers and let you map columns.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showColumnMapping ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="file-upload">CSV File</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
                
                {isUploading && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Analyzing CSV...
                  </div>
                )}

                {preview.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
                    <div className="overflow-x-auto border rounded-md">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {Object.keys(preview[0]).map((key) => (
                              <th key={key} className="text-left py-2 px-3 font-medium text-slate-600">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.keys(preview[0]).map((key) => (
                                <td key={key} className="py-2 px-3 text-slate-700">{row[key]}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Column Mapping Interface */}
                {csvPreview && columnMapping && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-md">
                      <p className="text-sm font-medium">File: {selectedFile?.name}</p>
                      <p className="text-sm text-slate-600">{csvPreview.totalRows} rows detected</p>
                    </div>

                                         {/* Column Selection */}
                     <div className="space-y-2">
                       <Label className="flex items-center gap-2">
                         <CheckCircle className="h-4 w-4 text-green-600" />
                         Select Columns to Import
                       </Label>
                       <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                         {csvPreview.availableColumns.map((column) => (
                           <div key={column} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               id={`column-${column}`}
                               checked={columnMapping.selectedColumns.includes(column)}
                               onChange={() => handleColumnToggle(column)}
                               className="rounded border-gray-300"
                             />
                             <label htmlFor={`column-${column}`} className="text-sm font-medium">
                               {column}
                             </label>
                           </div>
                         ))}
                       </div>
                     </div>

                                         {/* Preview */}
                     {csvPreview.preview.length > 0 && (
                       <div className="mt-4">
                         <p className="text-sm font-medium mb-2">Preview of selected columns</p>
                         <div className="overflow-x-auto border rounded-md">
                           <table className="min-w-full text-sm">
                             <thead className="bg-slate-50">
                               <tr>
                                 {columnMapping.selectedColumns.map((column) => (
                                   <th key={column} className="text-left py-2 px-3 font-medium text-slate-600">{column}</th>
                                 ))}
                               </tr>
                             </thead>
                             <tbody>
                               {csvPreview.preview.map((row, idx) => (
                                 <tr key={idx} className="border-t">
                                   {columnMapping.selectedColumns.map((column) => (
                                     <td key={column} className="py-2 px-3 text-slate-700">{row[column] || ''}</td>
                                   ))}
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={handleCancelUpload}
                        disabled={isUploading}
                      >
                        Cancel
                      </Button>
                                             <Button
                         onClick={handleFinalUpload}
                         disabled={isUploading || columnMapping.selectedColumns.length === 0}
                         className="flex-1"
                       >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          `Upload ${csvPreview.totalRows} Leads`
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Lead Files List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Files
            </CardTitle>
            <CardDescription>
              Your uploaded lead files and their statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadFiles.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p>No lead files uploaded yet</p>
                <p className="text-sm">Upload your first CSV file to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-slate-600">
                        {file.totalRows} leads • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
