import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Sparkles, Copy, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessageTemplate {
  id: number;
  name: string;
  baseTemplate: string;
  variables: Record<string, string> | null;
  aiVariations: string[] | null;
  isActive: boolean;
  createdAt: string;
}

const MessageTemplates: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    baseTemplate: '',
    variables: {} as Record<string, string>,
  });
  const [generationCount, setGenerationCount] = useState(3);
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; baseTemplate: string; variables: Record<string, string> }) => {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Template created successfully!",
        description: "Your message template has been saved.",
      });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', baseTemplate: '', variables: {} });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate AI variations mutation
  const generateMutation = useMutation({
    mutationFn: async ({ templateId, count }: { templateId: number; count: number }) => {
      const response = await fetch(`/api/templates/${templateId}/generate-variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (!response.ok) throw new Error('Failed to generate variations');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Variations generated successfully!",
        description: "AI has created new message variations for your template.",
      });
      setIsGenerateDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (formData.name && formData.baseTemplate) {
      createMutation.mutate(formData);
    }
  };

  const handleGenerateVariations = () => {
    if (selectedTemplate) {
      generateMutation.mutate({ templateId: selectedTemplate.id, count: generationCount });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Template copied successfully.",
    });
  };

  const addVariable = () => {
    const key = prompt('Enter variable name (e.g., firstName):');
    const value = prompt('Enter default value:');
    if (key && value) {
      setFormData(prev => ({
        ...prev,
        variables: { ...prev.variables, [key]: value }
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Message Templates</h1>
          <p className="text-gray-600">Create and manage AI-powered message templates</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a message template with variables for personalization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  placeholder="e.g., Professional Outreach"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Base Template</label>
                <Textarea
                  placeholder="Hi {firstName}! I noticed your profile and thought we might have some mutual interests. Would love to connect!"
                  value={formData.baseTemplate}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseTemplate: e.target.value }))}
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{variableName}'} for personalization
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Variables</label>
                <div className="space-y-2">
                  {Object.entries(formData.variables).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <Input
                        value={key}
                        disabled
                        className="flex-1"
                      />
                      <Input
                        value={value}
                        disabled
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newVars = { ...formData.variables };
                          delete newVars[key];
                          setFormData(prev => ({ ...prev, variables: newVars }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addVariable}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variable
                  </Button>
                </div>
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={!formData.name || !formData.baseTemplate || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates?.map((template) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant={template.isActive ? "default" : "secondary"}>
                  {template.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>
                Created {new Date(template.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {template.baseTemplate}
                </p>
              </div>
              
              {template.variables && Object.keys(template.variables).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(template.variables).map((key) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {template.aiVariations && template.aiVariations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">AI Variations:</p>
                  <div className="space-y-1">
                    {template.aiVariations.slice(0, 2).map((variation, index) => (
                      <p key={index} className="text-xs text-gray-600 line-clamp-2">
                        {variation}
                      </p>
                    ))}
                    {template.aiVariations.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{template.aiVariations.length - 2} more variations
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(template.baseTemplate)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsGenerateDialogOpen(true);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first message template to get started with AI-powered messaging
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generate Variations Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Variations</DialogTitle>
            <DialogDescription>
              Generate multiple variations of your template using AI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Number of Variations</label>
              <Select value={generationCount.toString()} onValueChange={(value) => setGenerationCount(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 variations</SelectItem>
                  <SelectItem value="5">5 variations</SelectItem>
                  <SelectItem value="10">10 variations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleGenerateVariations} 
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Variations'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessageTemplates;
