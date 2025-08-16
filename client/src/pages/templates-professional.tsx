import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: number;
  name: string;
  content: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TemplatesProfessional: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    isActive: true
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTemplate 
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setEditingTemplate(null);
        setFormData({ name: '', content: '', isActive: true });
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      isActive: template.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const response = await fetch(`/api/templates/${template.id}/duplicate`, {
        method: 'POST',
      });
      
      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const extractVariables = (content: string): string[] => {
    const variablePattern = /\{\{(\w+)\}\}|\/(\w+)/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1] || match[2]);
    }
    
    return Array.from(variables);
  };

  const getSampleData = (variables: string[]) => {
    const sampleData: { [key: string]: string } = {
      firstname: 'John',
      lastname: 'Doe',
      company: 'Tech Corp',
      website: 'example.com',
      email: 'john@example.com',
      phone: '+1234567890',
      industry: 'Technology',
      location: 'New York'
    };
    
    return variables.reduce((acc, variable) => {
      acc[variable] = sampleData[variable] || `[${variable}]`;
      return acc;
    }, {} as { [key: string]: string });
  };

  const generatePreview = (content: string, variables: string[]) => {
    let preview = content;
    const sampleData = getSampleData(variables);
    
    variables.forEach(variable => {
      const pattern1 = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      const pattern2 = new RegExp(`\\/${variable}`, 'g');
      preview = preview.replace(pattern1, sampleData[variable]);
      preview = preview.replace(pattern2, sampleData[variable]);
    });
    
    return preview;
  };

  const insertVariable = (variable: string) => {
    const format = `{{${variable}}}`;
    setFormData(prev => ({
      ...prev,
      content: prev.content + format
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-md">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Message Templates</h1>
              <p className="text-gray-600">Create and manage your message templates for campaigns</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Template</span>
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const variables = extractVariables(template.content);
            const preview = generatePreview(template.content, variables);
            
            return (
              <div key={template.id} className="card">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    <div className="flex items-center space-x-2">
                      {template.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XMarkIcon className="w-3 h-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Preview:</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 max-h-20 overflow-y-auto">
                      {preview}
                    </div>
                  </div>
                  
                  {variables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {variables.map((variable) => (
                          <span
                            key={variable}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="card-footer">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="btn-secondary btn-sm flex items-center space-x-1"
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="btn-secondary btn-sm flex items-center space-x-1"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        <span>Duplicate</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="btn-danger btn-sm flex items-center space-x-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {templates.length === 0 && (
          <div className="text-center py-12">
            <DocumentDuplicateIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-6">Create your first message template to get started with campaigns</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary"
            >
              Create Template
            </button>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Enter template name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Content
                </label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {['firstname', 'lastname', 'company', 'website', 'email', 'phone'].map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="btn-secondary btn-sm"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    className="input h-32 resize-none"
                    placeholder="Enter your message content. Use {{variable}} or /variable for dynamic content."
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active template</span>
                </label>
              </div>
              
              {formData.content && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                    {generatePreview(formData.content, extractVariables(formData.content))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTemplate(null);
                    setFormData({ name: '', content: '', isActive: true });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesProfessional;
