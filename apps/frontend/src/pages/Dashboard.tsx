import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">HeyReach</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900">Accounts</h3>
              <p className="text-3xl font-bold text-primary-600">2</p>
              <p className="text-sm text-gray-500">Active Instagram accounts</p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900">Campaigns</h3>
              <p className="text-3xl font-bold text-primary-600">1</p>
              <p className="text-sm text-gray-500">Active campaigns</p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900">Leads</h3>
              <p className="text-3xl font-bold text-primary-600">3</p>
              <p className="text-sm text-gray-500">Total leads</p>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900">Messages</h3>
              <p className="text-3xl font-bold text-primary-600">12</p>
              <p className="text-sm text-gray-500">Sent today</p>
            </div>
          </div>

          <div className="mt-8">
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to HeyReach!</h2>
              <p className="text-gray-600 mb-4">
                This is a demo dashboard for the HeyReach Instagram DM automation platform.
                The backend API is fully functional and ready for testing.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Test Credentials:</h3>
                <p className="text-sm text-blue-700">
                  Email: <code className="bg-blue-100 px-1 rounded">test@heyreach.com</code><br />
                  Password: <code className="bg-blue-100 px-1 rounded">password123</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
