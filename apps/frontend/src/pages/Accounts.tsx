import { useState, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { useAuth } from '../contexts/AuthContext'

interface Account {
  id: number
  username: string
  status: 'warming' | 'active' | 'paused' | 'banned'
  warmup_progress: number
  risk_score: number
  daily_msg_limit: number
  daily_msg_count: number
  last_login_at: string
  created_at: string
  home_country?: string
  home_city?: string
}

export default function Accounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    secretKey: '',
    home_country: 'PK',
    home_city: 'Karachi',
    daily_msg_limit: 50,
    use_location: true,
    auth_method: 'password' as 'password' | 'cookies',
    session_cookies: ''
  })

  // Fetch accounts on component mount and auto-refresh every 30 seconds
  useEffect(() => {
    fetchAccounts()
    
    const interval = setInterval(() => {
      fetchAccounts()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.error('No authentication token found')
        return
      }

      const response = await fetch('http://localhost:8080/api/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Accounts data from backend:', data)
        setAccounts(data.data?.items || [])
      } else {
        console.error('Failed to fetch accounts:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200'
      case 'warming': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'paused': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'banned': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'active': return '🟢'
      case 'warming': return '🔥'
      case 'paused': return '⏸️'
      case 'banned': return '🚫'
      default: return '⚪'
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Authentication required. Please login again.')
        return
      }

      const accountData = {
        username: formData.username,
        password: formData.auth_method === 'password' ? formData.password : undefined,
        secret_key: formData.secretKey || undefined,
        home_country: formData.use_location ? formData.home_country : undefined,
        home_city: formData.use_location ? formData.home_city : undefined,
        daily_msg_limit: formData.daily_msg_limit,
        auth_method: formData.auth_method,
        session_cookies: formData.auth_method === 'cookies' ? JSON.parse(formData.session_cookies) : undefined
      }

      const response = await fetch('http://localhost:8080/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accountData)
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Account created successfully:', data)
        
        // Start warmup for the new account
        await startWarmup(data.data.id)
        
        // Refresh accounts list
        await fetchAccounts()
        
        setShowAddModal(false)
        setFormData({ 
          username: '', 
          password: '', 
          secretKey: '',
          home_country: 'PK',
          home_city: 'Karachi',
          daily_msg_limit: 50,
          use_location: true,
          auth_method: 'password',
          session_cookies: ''
        })
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error adding account:', error)
      alert('Failed to add account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startWarmup = async (accountId: number) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/accounts/${accountId}/start-warmup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        console.log('Warmup started successfully for account:', accountId)
      } else {
        console.error('Failed to start warmup for account:', accountId)
      }
    } catch (error) {
      console.error('Error starting warmup:', error)
    }
  }

  const handleDeleteAccount = async (id: number) => {
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          await fetchAccounts()
        } else {
          alert('Failed to delete account')
        }
      } catch (error) {
        console.error('Error deleting account:', error)
        alert('Failed to delete account')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Instagram Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your connected Instagram accounts</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchAccounts} variant="outline" className="text-sm">
            <span className="mr-2">🔄</span>
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <span className="mr-2">➕</span>
            Add Account
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-gray-900">{accounts.length}</p>
                <p className="text-sm text-gray-600">Total Accounts</p>
              </div>
              <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                👤
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-green-700">{accounts.filter(a => a.status === 'active').length}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
              <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center text-green-600">
                🟢
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-orange-700">{accounts.filter(a => a.status === 'warming').length}</p>
                <p className="text-sm text-gray-600">Warming</p>
              </div>
              <div className="h-8 w-8 rounded bg-orange-100 flex items-center justify-center text-orange-600">
                🔥
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-purple-700">{accounts.reduce((sum, acc) => sum + acc.daily_msg_count, 0)}</p>
                <p className="text-sm text-gray-600">Messages Today</p>
              </div>
              <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center text-purple-600">
                💬
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        {loading && (
          <Card className="border border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-3 text-2xl">⏳</div>
              <h3 className="text-base font-medium text-gray-900 mb-2">Loading accounts...</h3>
            </CardContent>
          </Card>
        )}
        {!loading && accounts.map((account) => (
          <Card key={account.id} className="border border-gray-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {account.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-medium text-gray-900">@{account.username}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(account.status)}`}>
                        <span className="mr-1">{getStatusIcon(account.status)}</span>
                        {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Last login: {account.last_login_at ? new Date(account.last_login_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Warmup Progress */}
                  {account.status === 'warming' && (
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">Warmup Progress</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${account.warmup_progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">{account.warmup_progress || 0}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Risk Score */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">Risk Score</div>
                    <div className={`text-base font-semibold mt-1 ${
                      account.risk_score < 20 ? 'text-green-600' :
                      account.risk_score < 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {account.risk_score}
                    </div>
                  </div>
                  
                  {/* Message Usage */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">Messages</div>
                    <div className="text-base font-semibold text-gray-900 mt-1">
                      {account.daily_msg_count}/{account.daily_msg_limit}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!loading && accounts.length === 0 && (
          <Card className="border border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-3 text-3xl">👤</div>
              <h3 className="text-base font-medium text-gray-900 mb-2">No accounts yet</h3>
              <p className="text-sm text-gray-500 mb-4">Add your first Instagram account to start automating</p>
              <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 border border-gray-200">
            <CardHeader>
              <CardTitle>Add Instagram Account</CardTitle>
              <CardDescription>Connect a new Instagram account for automation</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="instagram_username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Method</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="auth_method"
                        value="password"
                        checked={formData.auth_method === 'password'}
                        onChange={(e) => setFormData({...formData, auth_method: e.target.value as 'password' | 'cookies'})}
                        className="mr-2"
                      />
                      <span className="text-sm">Password Login (Recommended for new accounts)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="auth_method"
                        value="cookies"
                        checked={formData.auth_method === 'cookies'}
                        onChange={(e) => setFormData({...formData, auth_method: e.target.value as 'password' | 'cookies'})}
                        className="mr-2"
                      />
                      <span className="text-sm">Session Cookies (For existing sessions like Apify)</span>
                    </label>
                  </div>
                </div>

                {formData.auth_method === 'password' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Your password is encrypted and stored securely</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2FA Secret Key (Optional)</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter 2FA secret if enabled"
                        value={formData.secretKey}
                        onChange={(e) => setFormData({...formData, secretKey: e.target.value})}
                      />
                      <p className="text-xs text-gray-500 mt-1">Only needed if you have 2FA enabled on your account</p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Cookies (JSON)</label>
                    <textarea
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder='[{"name": "sessionid", "value": "abc123...", "domain": ".instagram.com"}]'
                      rows={4}
                      value={formData.session_cookies}
                      onChange={(e) => setFormData({...formData, session_cookies: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste your Instagram session cookies in JSON format. You can export these from your browser or get them from Apify actors.
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="use_location"
                      checked={formData.use_location}
                      onChange={(e) => setFormData({...formData, use_location: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="use_location" className="text-sm font-medium text-gray-700">
                      Use location-based proxy (Recommended)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    This helps avoid detection by using proxies from your account's location. 
                    Your location data is encrypted and only used for proxy selection.
                  </p>
                </div>

                {formData.use_location && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Home Country</label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.home_country}
                        onChange={(e) => setFormData({...formData, home_country: e.target.value})}
                      >
                        <option value="PK">Pakistan</option>
                        <option value="US">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Home City</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Karachi"
                        value={formData.home_city}
                        onChange={(e) => setFormData({...formData, home_city: e.target.value})}
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Message Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.daily_msg_limit}
                    onChange={(e) => setFormData({...formData, daily_msg_limit: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum messages to send per day (1-200)</p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add Account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}