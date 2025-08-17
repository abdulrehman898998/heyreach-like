import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'

interface Lead {
  id: number
  first_name: string
  last_name?: string
  username: string
  profile_url: string
  status: 'pending' | 'contacted' | 'replied' | 'failed'
  custom_fields?: any
  created_at: string
}

interface CSVUpload {
  id: number
  name: string
  uploaded_at: string
  leads: Lead[]
}

interface CSVColumn {
  name: string
  type: 'text' | 'url' | 'email' | 'number'
  selected: boolean
  mappedTo?: string
}

export default function Leads() {
  const [uploads, setUploads] = useState<CSVUpload[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showColumnMapping, setShowColumnMapping] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUpload, setPreviewUpload] = useState<CSVUpload | null>(null)
  
  // CSV processing states
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({})

  const handlePreview = (upload: CSVUpload) => {
    setPreviewUpload(upload)
    setShowPreview(true)
  }

  const handleDeleteUpload = (id: number) => {
    setUploads(prev => prev.filter(upload => upload.id !== id))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Accept CSV files by extension or MIME type
      const isCSV = file.type === 'text/csv' || 
                   file.name.toLowerCase().endsWith('.csv') ||
                   file.type === 'application/csv'
      
      if (isCSV) {
        setCsvFile(file)
        processCSVFile(file)
      } else {
        alert('Please select a valid CSV file')
      }
    }
  }

  const processCSVFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Parse CSV data (first 5 rows for preview)
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      }).filter(row => Object.values(row).some(val => val !== ''))

      setCsvData(data)
      
      // Create column options
      const columns: CSVColumn[] = headers.map(header => ({
        name: header,
        type: 'text',
        selected: false
      }))
      
      setCsvColumns(columns)
      setShowColumnMapping(true)
    }
    reader.readAsText(file)
  }

  const handleColumnToggle = (columnName: string) => {
    setCsvColumns(prev => prev.map(col => 
      col.name === columnName ? { ...col, selected: !col.selected } : col
    ))
  }

  const handleMappingChange = (columnName: string, mappedTo: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [columnName]: mappedTo
    }))
  }

  const handleImport = () => {
    if (!csvFile) return

    // Create leads from CSV data
    const leads: Lead[] = csvData.map((row, index) => {
      const lead: Lead = {
        id: index + 1,
        first_name: row[columnMapping['first_name']] || row['first_name'] || '',
        last_name: row[columnMapping['last_name']] || row['last_name'] || '',
        username: row[columnMapping['username']] || row['username'] || '',
        profile_url: row[columnMapping['profile_url']] || row['profile_url'] || '',
        status: 'pending',
        created_at: new Date().toISOString(),
        custom_fields: {}
      }

      // Add custom fields for unmapped columns
      csvColumns.forEach(col => {
        if (col.selected && !Object.values(columnMapping).includes(col.name)) {
          lead.custom_fields![col.name] = row[col.name] || ''
        }
      })

      return lead
    })

    const newUpload: CSVUpload = {
      id: Date.now(),
      name: csvFile.name,
      uploaded_at: new Date().toISOString(),
      leads
    }

    setUploads(prev => [...prev, newUpload])
    setShowColumnMapping(false)
    setShowUploadModal(false)
    setCsvFile(null)
    setCsvData([])
    setCsvColumns([])
    setColumnMapping({})
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'contacted': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'replied': return 'bg-green-50 text-green-700 border-green-200'
      case 'failed': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const totalLeads = uploads.reduce((sum, upload) => sum + upload.leads.length, 0)
  const pendingLeads = uploads.reduce((sum, upload) => sum + upload.leads.filter(lead => lead.status === 'pending').length, 0)
  const contactedLeads = uploads.reduce((sum, upload) => sum + upload.leads.filter(lead => lead.status === 'contacted').length, 0)
  const repliedLeads = uploads.reduce((sum, upload) => sum + upload.leads.filter(lead => lead.status === 'replied').length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Lead Management</h2>
          <p className="text-sm text-gray-600 mt-1">Import and manage your prospect leads</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <span className="mr-2">📥</span>
          Import CSV
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-gray-900">{totalLeads}</p>
                <p className="text-sm text-gray-600">Total Leads</p>
              </div>
              <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                📋
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-gray-700">{pendingLeads}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                ⏳
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-blue-700">{contactedLeads}</p>
                <p className="text-sm text-gray-600">Contacted</p>
              </div>
              <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                💬
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-green-700">{repliedLeads}</p>
                <p className="text-sm text-gray-600">Replied</p>
              </div>
              <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center text-green-600">
                ✅
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Uploads List */}
      <div className="space-y-4">
        {uploads.map((upload) => (
          <Card key={upload.id} className="border border-gray-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
                    📄
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{upload.name}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">
                        {upload.leads.length} leads
                      </span>
                      <span className="text-sm text-gray-500">
                        Uploaded {new Date(upload.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePreview(upload)}
                    className="text-xs"
                  >
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleDeleteUpload(upload.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {uploads.length === 0 && (
          <Card className="border border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-3 text-3xl">📋</div>
              <h3 className="text-base font-medium text-gray-900 mb-2">No CSV uploads yet</h3>
              <p className="text-sm text-gray-500 mb-4">Import your first CSV file to start managing leads</p>
              <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
                Import Your First CSV
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Column Mapping Modal */}
      {showColumnMapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Map CSV Columns</CardTitle>
                  <CardDescription>Select which columns to import and map them to lead fields</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowColumnMapping(false)}>
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="p-6">
                  {/* Column Selection */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Select Columns to Import</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {csvColumns.map((column) => (
                        <div key={column.name} className="flex items-center space-x-3 p-3 border border-gray-200 rounded">
                          <input
                            type="checkbox"
                            checked={column.selected}
                            onChange={() => handleColumnToggle(column.name)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{column.name}</p>
                            <p className="text-xs text-gray-500">CSV Column</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column Mapping */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Map to Lead Fields</h3>
                    <div className="space-y-3">
                      {csvColumns.filter(col => col.selected).map((column) => (
                        <div key={column.name} className="flex items-center space-x-4 p-3 border border-gray-200 rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{column.name}</p>
                            <p className="text-xs text-gray-500">CSV Column</p>
                          </div>
                          <div className="text-gray-400">→</div>
                          <div className="flex-1">
                            <select
                              value={columnMapping[column.name] || ''}
                              onChange={(e) => handleMappingChange(column.name, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Keep as custom field</option>
                              <option value="first_name">First Name</option>
                              <option value="last_name">Last Name</option>
                              <option value="username">Username</option>
                              <option value="profile_url">Profile URL</option>
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                              <option value="company">Company</option>
                              <option value="job_title">Job Title</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CSV Preview */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">CSV Preview (First 5 rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            {csvColumns.filter(col => col.selected).map((column) => (
                              <th key={column.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                {column.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.map((row, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              {csvColumns.filter(col => col.selected).map((column) => (
                                <td key={column.name} className="px-3 py-2 text-sm text-gray-900">
                                  {row[column.name] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowColumnMapping(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={csvColumns.filter(col => col.selected).length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Import {csvData.length} Leads
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview: {previewUpload.name}</CardTitle>
                  <CardDescription>{previewUpload.leads.length} leads imported</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3 p-6">
                  {previewUpload.leads.map((lead, index) => (
                    <div key={lead.id} className="bg-gray-50 rounded border border-gray-200 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600 text-xs font-medium">
                            {index + 1}
                          </div>
                                                     <div>
                             <h4 className="font-medium text-gray-900 text-sm">
                               Lead #{index + 1}
                             </h4>
                             <div className="flex items-center space-x-3 mt-1">
                               <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(lead.status)}`}>
                                 {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                               </span>
                             </div>
                             {lead.custom_fields && (
                               <div className="flex flex-wrap gap-1 mt-2">
                                 {Object.entries(lead.custom_fields).map(([key, value]) => (
                                   <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-white border border-gray-200 text-gray-600">
                                     <span className="font-medium">{key}:</span>
                                     <span className="ml-1">{value as string}</span>
                                   </span>
                                 ))}
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 border border-gray-200">
            <CardHeader>
              <CardTitle>Import CSV File</CardTitle>
              <CardDescription>Upload a CSV file with your leads data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                                 <div 
                   className="border-2 border-dashed border-gray-300 rounded p-6 text-center hover:border-blue-400 transition-colors"
                   onDrop={(e) => {
                     e.preventDefault()
                     const file = e.dataTransfer.files[0]
                     if (file && file.name.toLowerCase().endsWith('.csv')) {
                       setCsvFile(file)
                       processCSVFile(file)
                     } else {
                       alert('Please drop a valid CSV file')
                     }
                   }}
                   onDragOver={(e) => e.preventDefault()}
                 >
                   <div className="text-gray-400 mb-3 text-2xl">📁</div>
                   <p className="text-sm text-gray-600 mb-1">Drag and drop your CSV file here</p>
                   <p className="text-xs text-gray-500">or click to browse</p>
                   <input
                     type="file"
                     accept=".csv"
                     onChange={handleFileSelect}
                     className="hidden"
                     id="csv-upload"
                   />
                   <label htmlFor="csv-upload" className="cursor-pointer inline-block">
                     <Button variant="outline" className="mt-3">
                       Choose File
                     </Button>
                   </label>
                 </div>
                <div className="text-xs text-gray-500">
                  <p><strong>Import any CSV:</strong> All columns will be preserved in original form</p>
                  <p><strong>Profile URLs:</strong> Will be selected during campaign creation</p>
                  <p className="mt-1">Maximum file size: 10MB</p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    disabled={!csvFile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Next: Map Columns
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}