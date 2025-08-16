import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MessageTemplate {
  id: number;
  name: string;
  content: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewData, setPreviewData] = useState({
    firstname: 'John',
    lastname: 'Doe',
    company: 'TechCorp',
    website: 'techcorp.com',
    product: 'Amazing Product'
  });

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

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setTemplates([...templates, data.template]);
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    
    try {
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(templates.map(t => t.id === editingTemplate.id ? data.template : t));
        setEditingTemplate(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const response = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', content: '', isActive: true });
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      isActive: template.isActive
    });
  };

  const replaceVariables = (content: string, data: any) => {
    return content.replace(/\{\{(\w+)\}\}|\/(\w+)/g, (match, var1, var2) => {
      const variable = var1 || var2;
      return data[variable] || match;
    });
  };

  const getPreviewContent = () => {
    return replaceVariables(formData.content, previewData);
  };

  const insertVariable = (variable: string) => {
    const format = formData.content.includes('{{') ? `{{${variable}}}` : `/${variable}`;
    setFormData({
      ...formData,
      content: formData.content + format
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const availableVariables = [
    { key: 'firstname', label: 'First Name', example: 'John' },
    { key: 'lastname', label: 'Last Name', example: 'Doe' },
    { key: 'company', label: 'Company', example: 'TechCorp' },
    { key: 'website', label: 'Website', example: 'techcorp.com' },
    { key: 'product', label: 'Product', example: 'Amazing Product' },
    { key: 'email', label: 'Email', example: 'john@example.com' },
    { key: 'phone', label: 'Phone', example: '+1234567890' },
    { key: 'location', label: 'Location', example: 'New York' }
  ];

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1">Message Templates</h1>
          <p className="body-text">Create and manage message templates with dynamic variables for your campaigns</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Template
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Templates</p>
                <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {templates.filter(t => t.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {templates.reduce((sum, t) => sum + t.usageCount, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Length</p>
                <p className="text-2xl font-bold text-gray-900">
                  {templates.length > 0 
                    ? Math.round(templates.reduce((sum, t) => sum + t.content.length, 0) / templates.length)
                    : 0} chars
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              {/* Template Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`badge ${template.isActive ? 'badge-success' : 'badge-neutral'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => copyToClipboard(template.content)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Copy template"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openEditModal(template)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Edit template"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete template"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Template Content Preview */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Preview:</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 max-h-24 overflow-y-auto">
                  {template.content.length > 100 
                    ? template.content.substring(0, 100) + '...'
                    : template.content
                  }
                </div>
              </div>

              {/* Template Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{template.usageCount}</p>
                  <p className="text-xs text-gray-500">Times Used</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{template.content.length}</p>
                  <p className="text-xs text-gray-500">Characters</p>
                </div>
              </div>

              {/* Variables Used */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <span key={variable} className="badge badge-info text-xs">
                      {variable}
                    </span>
                  ))}
                  {template.variables.length === 0 && (
                    <span className="text-xs text-gray-500">No variables</span>
                  )}
                </div>
              </div>

              {/* Created Date */}
              <div className="text-xs text-gray-500">
                Created: {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-6">Create your first message template to start personalizing your campaigns</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Your First Template
          </button>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateModal || editingTemplate) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Template Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Welcome Message, Follow-up, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input-field h-32 resize-none"
                    placeholder="Hi {{firstname}}, I noticed your company {{company}} and thought you might be interested in our {{product}}..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {{variable}} or /variable format for dynamic content
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active (available for campaigns)
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                    className="btn-primary flex-1"
                  >
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingTemplate(null);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Variables Panel */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Variables</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVariables.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => insertVariable(variable.key)}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="font-medium text-gray-900">{variable.label}</div>
                        <div className="text-sm text-gray-500">Example: {variable.example}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Live Preview</h3>
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="text-sm text-gray-600 mb-2">Preview with sample data:</div>
                    <div className="bg-white rounded p-3 text-sm text-gray-700 whitespace-pre-wrap">
                      {getPreviewContent() || 'Start typing to see preview...'}
                    </div>
                  </div>
                </div>

                {/* Sample Data */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Sample Data</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(previewData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
