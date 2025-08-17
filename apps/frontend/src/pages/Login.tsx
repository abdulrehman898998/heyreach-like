import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    try {
      if (isRegistering) {
        await register(email, password)
      } else {
        await login(email, password)
      }
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Auth error:', error)
      setError(error.response?.data?.error || error.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const useDemoAccount = () => {
    setEmail('test@heyreach.com')
    setPassword('password123')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-primary-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xl">
              H
            </div>
            <span className="text-3xl font-bold">HeyReach</span>
          </div>
          <p className="text-muted-foreground">Instagram DM Automation Platform</p>
        </div>

        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>{isRegistering ? 'Create Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isRegistering 
                ? 'Get started with your Instagram automation' 
                : 'Sign in to continue to your dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : (isRegistering ? 'Create Account' : 'Sign In')}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={useDemoAccount}
              >
                <span className="mr-2">🚀</span>
                Use Demo Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-primary-600 transition-colors"
                onClick={() => setIsRegistering(!isRegistering)}
              >
                {isRegistering 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Create one"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}