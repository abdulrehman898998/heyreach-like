import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'

interface Account {
  id: number
  username: string
  status: 'warming' | 'active' | 'paused' | 'banned'
  warmup_progress?: number
}

interface Campaign {
  id: number
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  accountId: number
  accountUsername: string
  profileUrlColumn: string
  messageTemplate: string
  schedule: string
  leads: number
  messagesSent: number
  replies: number
  createdDate: string
}

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
}

interface CSVRow {
  [key: string]: string
}

interface AutomationPreview {
  profileUrl: string
  message: string
  rowData: CSVRow
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [csvUploads, setCsvUploads] = useState<CSVUpload[]>([])
  const [selectedUpload, setSelectedUpload] = useState<CSVUpload | null>(null)
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    accountId: '',
    uploadId: '',
    profileUrlColumn: '',
    messageTemplate: '',
    schedule: 'run_now'
  })
  const [showVariableDropdown, setShowVariableDropdown] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [automationPreview, setAutomationPreview] = useState<AutomationPreview[]>([])

  // Load accounts and demo CSV uploads (in real app, this would come from Leads page)
  useEffect(() => {
    setAccounts([
      {
        id: 1,
        username: 'hassan26711',
        status: 'warming',
        warmup_progress: 0
      },
      {
        id: 2,
        username: 'test_account',
        status: 'active'
      }
    ])

    // Demo CSV uploads - this would normally come from the Leads page
    setCsvUploads([
      {
        id: 1,
        name: 'leads.csv',
        uploaded_at: new Date().toISOString(),
        leads: [
          {
            id: 1,
            first_name: 'Amarat',
            last_name: 'Gill',
            username: '',
            profile_url: 'https://instagram.com/amarat_gill',
            status: 'pending',
            created_at: new Date().toISOString(),
            custom_fields: {
              'Job Title': 'Operations Director',
              'Location': 'West Midlands',
              'Company Domain': 'United Kingdom'
            }
          },
          {
            id: 2,
            first_name: 'Richard',
            last_name: 'Gavrilovic',
            username: '',
            profile_url: 'https://instagram.com/richard_gavrilovic',
            status: 'pending',
            created_at: new Date().toISOString(),
            custom_fields: {
              'Job Title': 'Warehouse Manager',
              'Location': 'Greater Cambridge Area',
              'Company Domain': 'apc-overnight.com'
            }
          },
          {
            id: 3,
            first_name: 'Ian',
            last_name: 'Shepherd',
            username: '',
            profile_url: 'https://instagram.com/ian_shepherd',
            status: 'pending',
            created_at: new Date().toISOString(),
            custom_fields: {
              'Job Title': 'Operations Director',
              'Location': 'Greater Middlesbrough and Stockton Area',
              'Company Domain': 'accessjobs.online'
            }
          },
          {
            id: 4,
            first_name: 'Harry',
            last_name: 'Barsk',
            username: '',
            profile_url: 'https://instagram.com/harry_barsk',
            status: 'pending',
            created_at: new Date().toISOString(),
            custom_fields: {
              'Job Title': 'Operations Director',
              'Location': 'London',
              'Company Domain': 'England'
            }
          },
          {
            id: 5,
            first_name: 'Charlene',
            last_name: 'Joyce',
            username: '',
            profile_url: 'https://instagram.com/charlene_joyce',
            status: 'pending',
            created_at: new Date().toISOString(),
            custom_fields: {
              'Job Title': 'Operations Director',
              'Location': 'United Kingdom',
              'Company Domain': 'couturecargo.co.uk'
            }
          }
        ]
      }
    ])
  }, [])

  // Generate CSV columns from selected upload
  useEffect(() => {
    if (selectedUpload && selectedUpload.leads.length > 0) {
      const firstLead = selectedUpload.leads[0]
      const columns: CSVColumn[] = []
      
      // Add standard fields
      if (firstLead.first_name) columns.push({ name: 'first_name', type: 'text' })
      if (firstLead.last_name) columns.push({ name: 'last_name', type: 'text' })
      if (firstLead.username) columns.push({ name: 'username', type: 'text' })
      if (firstLead.profile_url) columns.push({ name: 'profile_url', type: 'url' })
      
      // Add custom fields
      if (firstLead.custom_fields) {
        Object.keys(firstLead.custom_fields).forEach(key => {
          const value = firstLead.custom_fields[key]
          let type: 'text' | 'url' | 'email' | 'number' = 'text'
          
          if (typeof value === 'string') {
            if (value.includes('@') && value.includes('.')) type = 'email'
            else if (value.includes('http')) type = 'url'
            else if (!isNaN(Number(value))) type = 'number'
          }
          
          columns.push({ name: key, type })
        })
      }
      
      setCsvColumns(columns)
    }
  }, [selectedUpload])

  // Generate automation preview when profile URL column or message template changes
  useEffect(() => {
    if (formData.profileUrlColumn && formData.messageTemplate && selectedUpload && selectedUpload.leads.length > 0) {
      const preview = selectedUpload.leads.slice(0, 5).map(lead => {
        let message = formData.messageTemplate
        
        // Replace variables in message template
        csvColumns.forEach(column => {
          const variable = `{${column.name}}`
          if (message.includes(variable)) {
            let value = ''
            if (column.name === 'first_name') value = lead.first_name
            else if (column.name === 'last_name') value = lead.last_name || ''
            else if (column.name === 'username') value = lead.username
            else if (column.name === 'profile_url') value = lead.profile_url
            else if (lead.custom_fields && lead.custom_fields[column.name]) {
              value = lead.custom_fields[column.name]
            }
            message = message.replace(new RegExp(variable, 'g'), value)
          }
        })
        
        return {
          profileUrl: lead.profile_url,
          message: message,
          rowData: {
            first_name: lead.first_name,
            last_name: lead.last_name || '',
            username: lead.username,
            profile_url: lead.profile_url,
            ...lead.custom_fields
          }
        }
      })
      
      setAutomationPreview(preview)
    } else {
      setAutomationPreview([])
    }
  }, [formData.profileUrlColumn, formData.messageTemplate, selectedUpload, csvColumns])

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 animate-pulse'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault()
    
    const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId))
    const selectedUploadData = csvUploads.find(upload => upload.id === parseInt(formData.uploadId))
    
    const newCampaign: Campaign = {
      id: Date.now(),
      name: formData.name,
      status: 'draft',
      accountId: parseInt(formData.accountId),
      accountUsername: selectedAccount?.username || '',
      profileUrlColumn: formData.profileUrlColumn,
      messageTemplate: formData.messageTemplate,
      schedule: formData.schedule,
      leads: selectedUploadData?.leads.length || 0,
      messagesSent: 0,
      replies: 0,
      createdDate: new Date().toISOString().split('T')[0]
    }

    setCampaigns(prev => [...prev, newCampaign])
    setShowCreateModal(false)
    setCurrentStep(1)
    setFormData({
      name: '',
      accountId: '',
      uploadId: '',
      profileUrlColumn: '',
      messageTemplate: '',
      schedule: 'run_now'
    })
    setSelectedUpload(null)
  }

  const handleMessageInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    
    setFormData({...formData, messageTemplate: value})
    setCursorPosition(cursorPos)
    
    // Check if user typed "/" to show variable dropdown
    if (value[cursorPos - 1] === '/') {
      setShowVariableDropdown(true)
    } else {
      setShowVariableDropdown(false)
    }
  }

  const insertVariable = (variable: string) => {
    const beforeSlash = formData.messageTemplate.substring(0, cursorPosition - 1)
    const afterSlash = formData.messageTemplate.substring(cursorPosition)
    const newMessage = beforeSlash + `{${variable}}` + afterSlash
    
    setFormData({...formData, messageTemplate: newMessage})
    setShowVariableDropdown(false)
  }

  const handleUploadSelect = (uploadId: string) => {
    const upload = csvUploads.find(u => u.id === parseInt(uploadId))
    setSelectedUpload(upload || null)
    setFormData({...formData, uploadId, profileUrlColumn: '', messageTemplate: ''})
  }

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const activeAccounts = accounts.filter(acc => acc.status === 'active')

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex space-x-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-1 mx-2 ${
                step < currentStep ? 'bg-primary-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Campaign Basics</h3>
      
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
        <input
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g., AI Creator Outreach"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>

      {/* Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
        <select
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.accountId}
          onChange={(e) => setFormData({...formData, accountId: e.target.value})}
        >
          <option value="">Choose an account</option>
          {activeAccounts.map(account => (
            <option key={account.id} value={account.id}>
              @{account.username} (Active)
            </option>
          ))}
        </select>
        {activeAccounts.length === 0 && (
          <p className="text-xs text-red-500 mt-1">No active accounts available. Complete warmup first.</p>
        )}
      </div>

      {/* CSV Upload Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Leads CSV</label>
        <select
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.uploadId}
          onChange={(e) => handleUploadSelect(e.target.value)}
        >
          <option value="">Choose a CSV upload</option>
          {csvUploads.map(upload => (
            <option key={upload.id} value={upload.id}>
              {upload.name} ({upload.leads.length} leads)
            </option>
          ))}
        </select>
        {csvUploads.length === 0 && (
          <p className="text-xs text-red-500 mt-1">No CSV uploads available. Upload leads first.</p>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={nextStep}
          disabled={!formData.name || !formData.accountId || !formData.uploadId || activeAccounts.length === 0 || csvUploads.length === 0}
        >
          Next Step
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Automation Setup</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Setup */}
        <div className="space-y-6">
          {/* Profile URL Column Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile URL Column</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={formData.profileUrlColumn}
              onChange={(e) => setFormData({...formData, profileUrlColumn: e.target.value})}
            >
              <option value="">Select CSV column for profile URLs</option>
              {csvColumns.map(column => (
                <option key={column.name} value={column.name}>
                  {column.name} ({column.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">This column contains Instagram profile URLs for automation</p>
          </div>

          {/* Message Template Builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
            <div className="relative">
              <div className="min-h-[120px] w-full px-3 py-2 border border-gray-300 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 bg-white">
                <div className="flex flex-wrap items-start gap-1 min-h-[100px]">
                  {formData.messageTemplate.split(/(\{[^}]+\})/).map((part, index) => {
                    if (part.match(/^\{[^}]+\}$/)) {
                      // This is a variable - render as styled tag
                      const variableName = part.slice(1, -1)
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:from-blue-600 hover:to-purple-700 transition-all duration-200 cursor-pointer group"
                          onClick={() => {
                            // Remove variable when clicked
                            const newTemplate = formData.messageTemplate.replace(part, '')
                            setFormData({...formData, messageTemplate: newTemplate})
                          }}
                        >
                          <span className="mr-1">📝</span>
                          {variableName}
                          <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                        </span>
                      )
                    } else if (part.trim()) {
                      // This is regular text
                      return (
                        <span key={index} className="text-gray-700">
                          {part}
                        </span>
                      )
                    } else {
                      // Empty space
                      return <span key={index}>&nbsp;</span>
                    }
                  })}
                  <input
                    type="text"
                    className="flex-1 min-w-[100px] outline-none bg-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Type your message here..."
                    value=""
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.includes('/')) {
                        // Show dropdown for variable selection
                        setShowVariableDropdown(true)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '/') {
                        setShowVariableDropdown(true)
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Variable Dropdown */}
              {showVariableDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                  {csvColumns.map(column => (
                    <button
                      key={column.name}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                      onClick={() => {
                        const newMessage = formData.messageTemplate + `{${column.name}}`
                        setFormData({...formData, messageTemplate: newMessage})
                        setShowVariableDropdown(false)
                      }}
                    >
                      <span className="text-blue-600 font-mono">/{column.name}</span>
                      <span className="text-gray-500 text-sm">({column.type})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2">Type "/" to insert variables from your CSV</p>
              <div className="flex flex-wrap gap-2">
                {csvColumns.map(column => (
                  <button
                    key={column.name}
                    type="button"
                    className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full text-xs font-medium hover:from-blue-200 hover:to-purple-200 transition-all duration-200 border border-blue-200"
                    onClick={() => {
                      const newMessage = formData.messageTemplate + `{${column.name}}`
                      setFormData({...formData, messageTemplate: newMessage})
                    }}
                  >
                    <span className="mr-1">📝</span>
                    {column.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Live Preview */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Live Preview</h4>
          
          {formData.profileUrlColumn && formData.messageTemplate && selectedUpload ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Showing first 5 leads from {selectedUpload.name}:</p>
              {automationPreview.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Profile:</span>
                        <a href={item.profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline ml-1">
                          {item.profileUrl}
                        </a>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Message:</span>
                        <div className="bg-white rounded p-2 mt-1 text-sm text-gray-600 border">
                          "{item.message}"
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {selectedUpload.leads.length > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  + {selectedUpload.leads.length - 5} more leads will be processed
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-2">📋</div>
              <p className="text-sm text-gray-500">
                Select profile URL column and create message template to see live preview
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          Previous
        </Button>
        <Button 
          onClick={nextStep}
          disabled={!formData.profileUrlColumn || !formData.messageTemplate}
        >
          Next Step
        </Button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Launch Campaign</h3>
      
      {/* Campaign Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Campaign Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Campaign Name:</span>
            <p className="text-gray-600">{formData.name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Account:</span>
            <p className="text-gray-600">@{accounts.find(acc => acc.id === parseInt(formData.accountId))?.username}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">CSV Upload:</span>
            <p className="text-gray-600">{csvUploads.find(u => u.id === parseInt(formData.uploadId))?.name}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Profile URL Column:</span>
            <p className="text-gray-600">{formData.profileUrlColumn}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Leads to Process:</span>
            <p className="text-gray-600">{selectedUpload?.leads.length || 0} leads</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="font-medium text-gray-700">Message Template:</span>
          <div className="bg-white rounded p-3 mt-1 text-sm text-gray-600 border">
            {formData.messageTemplate || 'No template set'}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">When to start?</label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={formData.schedule}
          onChange={(e) => setFormData({...formData, schedule: e.target.value})}
        >
          <option value="run_now">🚀 Start Immediately</option>
          <option value="schedule_later">⏰ Schedule for Later</option>
        </select>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          Previous
        </Button>
        <Button 
          onClick={handleCreateCampaign}
          className="bg-green-600 hover:bg-green-700"
        >
          🚀 Create & Launch Campaign
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-600">Create and manage your Instagram DM campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Create Campaign
        </Button>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Campaign Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(campaign.status)}`}>
                      {campaign.status === 'active' ? '🟢 Active' : campaign.status}
                    </span>
                    <span className="text-sm text-gray-500">@{campaign.accountUsername}</span>
                    <span className="text-sm text-gray-500">Created {campaign.createdDate}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {campaign.status === 'draft' ? (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      ▶️ Start Campaign
                    </Button>
                  ) : campaign.status === 'active' ? (
                    <Button size="sm" variant="outline" className="bg-yellow-600 text-white hover:bg-yellow-700">
                      ⏸️ Pause
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-primary-600 hover:bg-primary-700">
                      ▶️ Resume
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Leads</p>
                  <p className="text-lg font-semibold text-gray-900">{campaign.leads}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Messages Sent</p>
                  <p className="text-lg font-semibold text-gray-900">{campaign.messagesSent}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Replies</p>
                  <p className="text-lg font-semibold text-gray-900">{campaign.replies}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Reply Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {campaign.messagesSent > 0 ? `${Math.round((campaign.replies / campaign.messagesSent) * 100)}%` : '0%'}
                  </p>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Profile URL Column:</span>
                    <p className="text-gray-600">{campaign.profileUrlColumn || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Schedule:</span>
                    <p className="text-gray-600">{campaign.schedule === 'run_now' ? 'Run Now' : campaign.schedule}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Message Template:</span>
                  <div className="bg-white rounded p-3 mt-1 text-sm text-gray-600 border">
                    {campaign.messageTemplate || 'No template set'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-gray-500 mb-4">No campaigns created yet</div>
            <Button onClick={() => setShowCreateModal(true)}>
              Create your first campaign
            </Button>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create New Campaign</h2>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                ✕
              </Button>
            </div>
            
            {renderStepIndicator()}
            
            <form onSubmit={handleCreateCampaign}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}