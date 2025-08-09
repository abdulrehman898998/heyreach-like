import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MinimalHeader } from "@/components/layout/minimal-header";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, FileText, Trash2, CheckCircle } from "lucide-react";

interface CSVColumn {
  name: string;
  sampleValue: string;
}

export default function LeadsProfessional() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showColumnSelection, setShowColumnSelection] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const leadFiles = Array.isArray(leadsData) ? leadsData : [];

  // Parse CSV for column selection
  const parseCSVForColumns = (file: File): Promise<CSVColumn[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV must have at least a header and one data row'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const firstDataRow = lines[1].split(',').map(d => d.trim().replace(/"/g, ''));

          const columns: CSVColumn[] = headers.map((header, index) => ({
            name: header,
            sampleValue: firstDataRow[index] || 'N/A'
          }));

          resolve(columns);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; columns: string[] }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('selectedColumns', JSON.stringify(data.columns));
      
      const response = await fetch('/api/leads/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedFile(null);
      setCsvColumns([]);
      setSelectedColumns([]);
      setShowColumnSelection(false);
      setIsUploading(false);
      toast({
        title: "Success",
        description: "Leads uploaded successfully",
      });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Error",
        description: "Failed to upload leads",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadFileId: number) => {
      const response = await fetch(`/api/leads/${leadFileId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Success",
        description: "Lead file deleted",
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      try {
        const columns = await parseCSVForColumns(file);
        setCsvColumns(columns);
        setSelectedColumns(columns.map(col => col.name)); // Select all by default
        setShowColumnSelection(true);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleColumnToggle = (columnName: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnName) 
        ? prev.filter(col => col !== columnName)
        : [...prev, columnName]
    );
  };

  const handleUpload = () => {
    if (selectedFile && selectedColumns.length > 0) {
      setIsUploading(true);
      uploadMutation.mutate({ file: selectedFile, columns: selectedColumns });
    } else {
      toast({
        title: "Error",
        description: "Please select at least one column",
        variant: "destructive",
      });
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'File Name',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'totalRows',
      title: 'Leads',
      render: (value: number) => <span>{value}</span>
    },
    {
      key: 'uploadedAt',
      title: 'Uploaded',
      render: (value: string) => (
        <span className="text-muted-foreground">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'id',
      title: 'Actions',
      render: (value: number) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate(value)}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ];

  const headerActions = (
    <Button onClick={() => setLocation('/campaigns/create')} disabled={leadFiles.length === 0}>
      Create Campaign
    </Button>
  );

  return (
    <div className="min-h-screen">
      <MinimalHeader 
        title="Leads"
        subtitle="Upload and manage your contact lists"
        actions={headerActions}
      />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Upload Section */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="text-lg">Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showColumnSelection ? (
              <>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="w-full"
                  />
                  
                  {!selectedFile && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                        input?.click();
                      }}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose CSV File
                    </Button>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Upload a CSV file with columns like "Profiles" (Instagram URLs) and "messages" (custom messages).
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>File: {selectedFile?.name}</span>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Select columns to import:</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {csvColumns.map((column) => (
                      <Card key={column.name} className="p-3 hover-lift">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedColumns.includes(column.name)}
                            onCheckedChange={() => handleColumnToggle(column.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{column.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              Sample: {column.sampleValue}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleUpload}
                    disabled={isUploading || selectedColumns.length === 0}
                    className="primary-gradient"
                  >
                    {isUploading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {selectedColumns.length} Column{selectedColumns.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowColumnSelection(false);
                      setSelectedFile(null);
                      setCsvColumns([]);
                      setSelectedColumns([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="card-gradient">
          <DataTable
            title="Uploaded Files"
            columns={columns}
            data={leadFiles}
            loading={isLoading}
            emptyState={{
              icon: <Users className="h-12 w-12" />,
              title: "No leads uploaded",
              description: "Upload a CSV file to start creating campaigns",
              action: null
            }}
          />
        </Card>
      </div>
    </div>
  );
}