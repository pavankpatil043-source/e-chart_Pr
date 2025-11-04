// Production-grade Breeze Session Manager with Auto-refresh
// Handles session expiration, automatic renewal, and failover strategies

import { format } from 'date-fns'
import crypto from 'crypto'

export interface BreezeCredentials {
  apiKey: string
  apiSecret: string
  userId: string
  password: string
  baseUrl: string
}

export interface SessionInfo {
  token: string
  expiresAt: number
  issuedAt: number
  isValid: boolean
}

export class ProductionBreezeManager {
  private credentials: BreezeCredentials
  private session: SessionInfo | null = null
  private refreshPromise: Promise<boolean> | null = null
  private refreshInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null

  // Session management settings
  private readonly SESSION_BUFFER_MINUTES = 15 // Refresh 15 min before expiry
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly SESSION_VALIDITY_HOURS = 8 // Typical trading session

  constructor(credentials: BreezeCredentials) {
    this.credentials = credentials
    this.startHealthCheck()
  }

  // Main method to get a valid session token
  async getValidSession(): Promise<string | null> {
    try {
      // If we have a valid session, return it
      if (this.isSessionValid()) {
        return this.session!.token
      }

      // If no credentials configured for auto-refresh, use manual token from env
      const hasAutoRefreshCredentials = process.env.BREEZE_USER_ID && process.env.BREEZE_PASSWORD
      
      if (!hasAutoRefreshCredentials) {
        console.log('📝 Using manual session token from environment')
        const envToken = process.env.BREEZE_SESSION_TOKEN
        if (envToken) {
          // Update session with manual token
          const now = Date.now()
          this.session = {
            token: envToken,
            issuedAt: now,
            expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours
            isValid: true
          }
          return envToken
        }
        return null
      }

      // If refresh is already in progress, wait for it
      if (this.refreshPromise) {
        console.log('⏳ Session refresh in progress, waiting...')
        const success = await this.refreshPromise
        return success && this.session ? this.session.token : null
      }

      // Start new session refresh (only if auto-refresh is configured)
      console.log('🔄 Starting automatic session refresh...')
      this.refreshPromise = this.refreshSession()
      
      const success = await this.refreshPromise
      this.refreshPromise = null

      return success && this.session ? this.session.token : null

    } catch (error) {
      console.error('❌ Error getting valid session:', error)
      this.refreshPromise = null
      
      // Fallback to environment token
      const envToken = process.env.BREEZE_SESSION_TOKEN
      if (envToken) {
        console.log('📝 Falling back to manual token from environment')
        return envToken
      }
      
      return null
    }
  }

  // Check if current session is still valid
  private isSessionValid(): boolean {
    if (!this.session) return false
    
    const now = Date.now()
    const bufferTime = this.SESSION_BUFFER_MINUTES * 60 * 1000
    
    return this.session.isValid && 
           now < (this.session.expiresAt - bufferTime)
  }

  // Refresh session with retry logic
  private async refreshSession(): Promise<boolean> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔐 Session refresh attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}`)
        
        const newSession = await this.authenticateWithBreeze()
        
        if (newSession) {
          this.session = newSession
          this.scheduleNextRefresh()
          console.log(`✅ Session refreshed successfully, expires at: ${new Date(newSession.expiresAt).toLocaleString()}`)
          return true
        }

      } catch (error) {
        lastError = error as Error
        console.warn(`⚠️ Session refresh attempt ${attempt} failed:`, error)
        
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error('❌ All session refresh attempts failed:', lastError)
    this.session = null
    return false
  }

  // Authenticate with Breeze API using credentials
  private async authenticateWithBreeze(): Promise<SessionInfo | null> {
    try {
      // Method 1: Try login API (if available)
      const loginSession = await this.tryLoginAPI()
      if (loginSession) return loginSession

      // Method 2: Try stored session validation
      const storedSession = await this.tryStoredSession()
      if (storedSession) return storedSession

      // Method 3: Manual intervention needed
      throw new Error('No automatic login method available. Manual session required.')

    } catch (error) {
      console.error('🔐 Authentication failed:', error)
      return null
    }
  }

  // Try programmatic login (if Breeze supports it)
  private async tryLoginAPI(): Promise<SessionInfo | null> {
    try {
      console.log('🔐 Attempting programmatic login...')
      
      // Note: This is hypothetical - Breeze may not support programmatic login
      // You'd need to implement based on their actual API
      const response = await fetch(`${this.credentials.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.credentials.apiKey,
          user_id: this.credentials.userId,
          password: this.credentials.password
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.session_token) {
          return this.createSessionInfo(data.session_token)
        }
      }

      return null
    } catch (error) {
      console.log('⚠️ Programmatic login not available')
      return null
    }
  }

  // Try to validate stored session token
  private async tryStoredSession(): Promise<SessionInfo | null> {
    try {
      const storedToken = process.env.BREEZE_SESSION_TOKEN
      if (!storedToken) return null

      console.log('🔍 Validating stored session token...')
      
      const isValid = await this.validateSessionToken(storedToken)
      if (isValid) {
        return this.createSessionInfo(storedToken)
      }

      return null
    } catch (error) {
      console.log('⚠️ Stored session validation failed')
      return null
    }
  }

  // Validate session token with Breeze API
  private async validateSessionToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.credentials.baseUrl}/customerdetails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-SessionToken': token,
          'X-AppKey': this.credentials.apiKey
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.Success !== null && data.Status === 200
      }

      return false
    } catch (error) {
      console.error('❌ Session validation error:', error)
      return false
    }
  }

  // Create session info object
  private createSessionInfo(token: string): SessionInfo {
    const now = Date.now()
    const expiresAt = now + (this.SESSION_VALIDITY_HOURS * 60 * 60 * 1000)

    return {
      token,
      issuedAt: now,
      expiresAt,
      isValid: true
    }
  }

  // Schedule next automatic refresh
  private scheduleNextRefresh(): void {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval)
    }

    if (!this.session) return

    const now = Date.now()
    const bufferTime = this.SESSION_BUFFER_MINUTES * 60 * 1000
    const refreshTime = this.session.expiresAt - bufferTime - now

    if (refreshTime > 0) {
      console.log(`⏰ Next session refresh scheduled in ${Math.round(refreshTime / 60000)} minutes`)
      
      this.refreshInterval = setTimeout(() => {
        this.getValidSession().catch(console.error)
      }, refreshTime)
    }
  }

  // Start health check monitoring
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(console.error)
    }, this.HEALTH_CHECK_INTERVAL)
  }

  // Perform periodic health check
  private async performHealthCheck(): Promise<void> {
    if (!this.session) {
      console.log('🏥 Health check: No active session, attempting refresh...')
      await this.getValidSession()
      return
    }

    try {
      const isValid = await this.validateSessionToken(this.session.token)
      
      if (!isValid) {
        console.log('🏥 Health check: Session invalid, refreshing...')
        this.session.isValid = false
        await this.getValidSession()
      } else {
        console.log('🏥 Health check: Session is healthy')
      }
    } catch (error) {
      console.error('🏥 Health check failed:', error)
    }
  }

  // Get session status for monitoring
  getSessionStatus(): {
    hasSession: boolean
    isValid: boolean
    expiresIn: number | null
    expiresAt: string | null
  } {
    if (!this.session) {
      return {
        hasSession: false,
        isValid: false,
        expiresIn: null,
        expiresAt: null
      }
    }

    const expiresIn = this.session.expiresAt - Date.now()
    
    return {
      hasSession: true,
      isValid: this.session.isValid && expiresIn > 0,
      expiresIn: Math.max(0, expiresIn),
      expiresAt: new Date(this.session.expiresAt).toISOString()
    }
  }

  // Manual session update (for when user provides new token)
  updateSessionToken(newToken: string): void {
    console.log('🔄 Manually updating session token')
    this.session = this.createSessionInfo(newToken)
    this.scheduleNextRefresh()
  }

  // Cleanup
  destroy(): void {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval)
      this.refreshInterval = null
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }
}

// Singleton instance for production use
let productionBreezeManager: ProductionBreezeManager | null = null

export function getProductionBreezeManager(): ProductionBreezeManager {
  if (!productionBreezeManager) {
    const credentials: BreezeCredentials = {
      apiKey: process.env.BREEZE_API_KEY || '',
      apiSecret: process.env.BREEZE_API_SECRET || '',
      userId: process.env.BREEZE_USER_ID || '',
      password: process.env.BREEZE_PASSWORD || '',
      baseUrl: process.env.BREEZE_BASE_URL || 'https://api.icicidirect.com/breezeapi/api/v1'
    }
    
    productionBreezeManager = new ProductionBreezeManager(credentials)
  }
  
  return productionBreezeManager
}