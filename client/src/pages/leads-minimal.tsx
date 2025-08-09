import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MinimalHeader } from "@/components/layout/minimal-header";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, FileText, Trash2 } from "lucide-react";

export default function LeadsMinimal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch leads
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  const leadFiles = leadsData || [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      setIsUploading(true);
      uploadMutation.mutate(selectedFile);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'File Name',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
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
        <span className="text-gray-600">
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
    <div className="min-h-screen bg-gray-50">
      <MinimalHeader 
        title="Leads"
        subtitle="Upload and manage your contact lists"
        actions={headerActions}
      />
      
      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload CSV File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            
            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              Upload a CSV file with columns like "Profiles" (Instagram URLs) and "messages" (custom messages).
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
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
      </div>
    </div>
  );
}