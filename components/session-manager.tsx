'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, CheckCircle, XCircle, Clock, Settings } from 'lucide-react'

interface SessionStatus {
  session: {
    active: boolean
    valid: boolean
    expiresIn: number | null
    expiresAt: string | null
    timeToExpiry: string | null
  }
  configuration: {
    api_key: boolean
    api_secret: boolean
    user_id: boolean
    password: boolean
    session_token: boolean
  }
  status: string
  lastChecked: string
}

export default function SessionManager() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [newSessionToken, setNewSessionToken] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const fetchSessionStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/session-manager')
      const data = await response.json()
      setSessionStatus(data)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch session status' })
    }
    setLoading(false)
  }

  const refreshSession = async () => {
    setRefreshing(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/session-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Session refreshed successfully!' })
        await fetchSessionStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Session refresh failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error during session refresh' })
    }
    
    setRefreshing(false)
  }

  const updateSessionToken = async () => {
    if (!newSessionToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter a session token' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/session-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update', 
          sessionToken: newSessionToken.trim() 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Session token updated successfully!' })
        setNewSessionToken('')
        await fetchSessionStatus()
      } else {
        setMessage({ type: 'error', text: data.message || 'Session update failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error during session update' })
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchSessionStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSessionStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'needs_refresh': return 'bg-red-500'
      default: return 'bg-yellow-500'
    }
  }

  const getConfigStatus = (hasConfig: boolean) => {
    return hasConfig ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    )
  }

  if (loading && !sessionStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Breeze Session Manager</h1>
        <Button 
          onClick={fetchSessionStatus} 
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {sessionStatus && (
        <>
          {/* Session Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Session Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge className={getStatusColor(sessionStatus.status)}>
                      {sessionStatus.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Active:</span>
                    {sessionStatus.session.active ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{sessionStatus.session.active ? 'Yes' : 'No'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Valid:</span>
                    {sessionStatus.session.valid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span>{sessionStatus.session.valid ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {sessionStatus.session.timeToExpiry && (
                    <div>
                      <span className="font-medium">Expires in:</span>
                      <span className="ml-2">{sessionStatus.session.timeToExpiry}</span>
                    </div>
                  )}
                  
                  {sessionStatus.session.expiresAt && (
                    <div>
                      <span className="font-medium">Expires at:</span>
                      <span className="ml-2 text-sm">
                        {new Date(sessionStatus.session.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  <div>
                    <span className="font-medium">Last checked:</span>
                    <span className="ml-2 text-sm">
                      {new Date(sessionStatus.lastChecked).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={refreshSession} 
                disabled={refreshing}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing Session...' : 'Refresh Session'}
              </Button>
            </CardContent>
          </Card>

          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  {getConfigStatus(sessionStatus.configuration.api_key)}
                  <span>API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  {getConfigStatus(sessionStatus.configuration.api_secret)}
                  <span>API Secret</span>
                </div>
                <div className="flex items-center gap-2">
                  {getConfigStatus(sessionStatus.configuration.user_id)}
                  <span>User ID</span>
                </div>
                <div className="flex items-center gap-2">
                  {getConfigStatus(sessionStatus.configuration.password)}
                  <span>Password</span>
                </div>
                <div className="flex items-center gap-2">
                  {getConfigStatus(sessionStatus.configuration.session_token)}
                  <span>Session Token</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Session Update Card */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Session Update</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sessionToken">New Session Token</Label>
                <Input
                  id="sessionToken"
                  type="password"
                  placeholder="Enter new session token..."
                  value={newSessionToken}
                  onChange={(e) => setNewSessionToken(e.target.value)}
                />
              </div>
              <Button 
                onClick={updateSessionToken}
                disabled={loading || !newSessionToken.trim()}
                className="w-full"
              >
                Update Session Token
              </Button>
              <p className="text-sm text-muted-foreground">
                Use this to manually update the session token if automatic refresh fails.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}