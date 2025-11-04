// ICICIDirect Breeze API Configuration and Service
// Official implementation based on https://api.icicidirect.com/breezeapi/documents/index.html

import { format, subDays } from 'date-fns'
import crypto from 'crypto'

export interface BreezeConfig {
  apiKey: string
  apiSecret: string
  sessionToken?: string
  baseUrl: string
}

export interface BreezeQuoteResponse {
  Success?: Array<{
    exchange_code: string
    product_type: string
    stock_code: string
    expiry_date?: string
    right?: string
    strike_price?: number
    ltp: number
    ltt: string
    best_bid_price: number
    best_bid_quantity: string
    best_offer_price: number
    best_offer_quantity: string
    open: number
    high: number
    low: number
    previous_close: number
    ltp_percent_change: number
    upper_circuit: number
    lower_circuit: number
    total_quantity_traded: string
    spot_price?: string
  }>
  Status: number
  Error?: string | null
}

export interface BreezeHistoricalData {
  datetime: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface BreezeFIIDIIData {
  date: string
  fii_buy: number
  fii_sell: number
  fii_net: number
  dii_buy: number
  dii_sell: number
  dii_net: number
}

export class BreezeAPIService {
  private config: BreezeConfig
  private sessionToken: string | null = null

  constructor(config: BreezeConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || 'https://api.icicidirect.com/breezeapi/api/v1'
    }
  }

  // Generate checksum as per official Breeze API documentation
  private generateChecksum(timestamp: string, jsonData: string = ''): string {
    // Checksum = SHA256(timestamp + jsonData + secretKey)
    const dataToHash = timestamp + jsonData + this.config.apiSecret
    return crypto.createHash('sha256').update(dataToHash).digest('hex')
  }

  // Generate ISO8601 timestamp with 0 milliseconds as required
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/\.\d{3}Z$/, '.000Z')
  }

  // Create proper headers as per official documentation
  private createHeaders(jsonData: string = ''): Record<string, string> {
    const timestamp = this.generateTimestamp()
    const checksum = this.generateChecksum(timestamp, jsonData)
    
    return {
      'Content-Type': 'application/json',
      'X-Checksum': checksum,
      'X-Timestamp': timestamp,
      'X-AppKey': this.config.apiKey,
      'X-SessionToken': this.sessionToken || ''
    }
  }

  // Get customer details and validate session (official Breeze API)
  async authenticate(): Promise<boolean> {
    try {
      // Use the session token from config (obtained from login flow)
      this.sessionToken = this.config.sessionToken || null

      if (!this.sessionToken) {
        console.error('❌ Session token is required. Please obtain it from:')
        console.error('🔗 https://api.icicidirect.com/apiuser/login?api_key=' + encodeURIComponent(this.config.apiKey))
        return false
      }

      // Customer details API to validate session (as per official documentation)
      // Breeze API expects session token and app key in headers, not body
      const response = await fetch(`${this.config.baseUrl}/customerdetails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-SessionToken': this.sessionToken!,
          'X-AppKey': this.config.apiKey
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.Success && data.Status === 200) {
          console.log('✅ Breeze API session validated successfully')
          console.log('📊 Customer details:', {
            userId: data.Success.idirect_userid,
            userName: data.Success.idirect_user_name,
            segments: data.Success.segments_allowed
          })
          return true
        } else {
          console.error('❌ Breeze API authentication failed:', data)
          return false
        }
      } else {
        console.error('❌ Breeze API authentication failed:', response.status)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
        return false
      }

    } catch (error) {
      console.error('❌ Breeze API authentication error:', error)
      return false
    }
  }

  // Get real-time quotes for multiple stocks (official Breeze API)
  async getQuotes(symbols: string[], exchange: string = 'NSE'): Promise<BreezeQuoteResponse | null> {
    if (!this.sessionToken) {
      const authSuccess = await this.authenticate()
      if (!authSuccess) return null
    }

    try {
      // Get quotes for each symbol individually (as per Breeze API documentation)
      const quotes: any[] = []
      
      for (const symbol of symbols) {
        // Build query parameters for GET request
        const params = new URLSearchParams({
          'stock_code': symbol,
          'exchange_code': exchange,
          'expiry_date': '',
          'product_type': 'cash',
          'right': '',
          'strike_price': ''
        })
        
        const response = await fetch(`${this.config.baseUrl}/quotes?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-SessionToken': this.sessionToken!,
            'X-AppKey': this.config.apiKey
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.Success && Array.isArray(data.Success)) {
            quotes.push(...data.Success)
          }
        } else {
          console.warn(`⚠️ Failed to get quotes for ${symbol}:`, response.status)
        }
      }
      
      return {
        Success: quotes,
        Status: 200,
        Error: null
      }
      
    } catch (error) {
      console.error('❌ Breeze quotes fetch failed:', error)
      return null
    }
  }

  // Get historical data for candlestick charts
  async getHistoricalData(
    symbol: string,
    fromDate: string,
    toDate: string,
    interval: string = '1day',
    exchange: string = 'NSE'
  ): Promise<BreezeHistoricalData[] | null> {
    if (!this.sessionToken) {
      const authSuccess = await this.authenticate()
      if (!authSuccess) return null
    }

    try {
      // Use correct Breeze historical data endpoint format
      const queryParams = new URLSearchParams({
        'interval': interval,
        'from_date': fromDate,
        'to_date': toDate,
        'stock_code': symbol,
        'exchange_code': exchange,
        'product_type': 'cash'
      })
      
      const response = await fetch(
        `${this.config.baseUrl}/historical?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-SessionToken': this.sessionToken!,
            'apikey': this.config.apiKey
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Breeze historical data API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.result) {
        return data.result.map((candle: any) => ({
          datetime: candle.datetime,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseInt(candle.volume)
        }))
      } else {
        throw new Error(`Breeze historical data error: ${data.error}`)
      }
      
    } catch (error) {
      console.error('❌ Breeze historical data fetch failed:', error)
      return null
    }
  }

  // Test basic connection with session token
  async testConnection(): Promise<boolean> {
    if (!this.sessionToken) {
      const authSuccess = await this.authenticate()
      if (!authSuccess) return false
    }

    try {
      // Test with a simple quotes endpoint using correct Breeze format
      const response = await fetch(
        `${this.config.baseUrl}/quotes?stock_code=RELIANCE&exchange_code=NSE&product_type=cash`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-SessionToken': this.sessionToken!,
            'appkey': this.config.apiKey
          }
        }
      )

      console.log(`✅ Breeze API test connection: ${response.status}`)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Breeze API is working! Sample response:', data.success ? 'Success' : 'Response received')
      }
      return response.ok
    } catch (error) {
      console.error('❌ Breeze API connection test failed:', error)
      return false
    }
  }

  // Get FII/DII institutional data
  async getFIIDIIData(date?: string): Promise<BreezeFIIDIIData | null> {
    if (!this.sessionToken) {
      const authSuccess = await this.authenticate()
      if (!authSuccess) return null
    }

    // First test basic connection
    const connectionOk = await this.testConnection()
    if (!connectionOk) {
      console.log('❌ Breeze API connection test failed, using sample data')
      return null
    }

    try {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd')
      
        // Try to get market quotes first to verify API is working
        const marketResponse = await fetch(
          `${this.config.baseUrl}/quotes?stock_code=NIFTY&exchange_code=NSE&product_type=cash`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-SessionToken': this.sessionToken!,
              'appkey': this.config.apiKey
            }
          }
        )

      if (marketResponse.ok) {
        console.log('✅ Breeze API market quotes working! Session token is valid.')
        const marketData = await marketResponse.json()
        console.log('✅ Breeze API response:', marketData.success ? 'Success' : 'Response received')
        
        // For now, return null to use sample data while we confirm the correct FII/DII endpoint
        return null
      } else {
        console.log('❌ Breeze API market quotes failed:', marketResponse.status)
        return null
      }
      
      // Try multiple Breeze API endpoints for FII/DII data
      const endpoints = [
        // Market data endpoint (standard format)
        `${this.config.baseUrl}/marketdata?exchange_code=NSE&date=${targetDate}&type=fii_dii`,
        // Historical data endpoint for institutional flows
        `${this.config.baseUrl}/historical?exchange_code=NSE&from_date=${targetDate}&to_date=${targetDate}&type=institutional`,
        // Market summary for institutional data
        `${this.config.baseUrl}/market/institutional?date=${targetDate}&exchange=NSE`
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'X-API-KEY': this.config.apiKey,
              'X-SESSION-TOKEN': this.sessionToken!,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            console.warn(`Breeze FII/DII endpoint ${endpoint} returned ${response.status}`)
            continue
          }

          const data = await response.json()
          
          if (data.success && data.result) {
            // Try to parse different response formats
            let fiiDiiData = null
            
            // Format 1: Direct institutional data
            if (data.result.fii || data.result.dii) {
              fiiDiiData = data.result
            }
            // Format 2: Array with institutional flows
            else if (Array.isArray(data.result)) {
              fiiDiiData = data.result.find((item: any) => 
                item.type === 'institutional_flows' || 
                item.category === 'FII_DII' ||
                item.fii_buy_value !== undefined
              )
            }
            // Format 3: Nested structure
            else if (data.result.institutional_data) {
              fiiDiiData = data.result.institutional_data
            }
            
            if (fiiDiiData) {
              return {
                date: targetDate,
                fii_buy: parseFloat(fiiDiiData.fii_buy_value || fiiDiiData.fii_buy || 0),
                fii_sell: parseFloat(fiiDiiData.fii_sell_value || fiiDiiData.fii_sell || 0),
                fii_net: parseFloat(fiiDiiData.fii_net_value || fiiDiiData.fii_net || 0),
                dii_buy: parseFloat(fiiDiiData.dii_buy_value || fiiDiiData.dii_buy || 0),
                dii_sell: parseFloat(fiiDiiData.dii_sell_value || fiiDiiData.dii_sell || 0),
                dii_net: parseFloat(fiiDiiData.dii_net_value || fiiDiiData.dii_net || 0)
              }
            }
          }
        } catch (endpointError) {
          console.warn(`Breeze FII/DII endpoint ${endpoint} failed:`, endpointError)
          continue
        }
      }
      
      // If all endpoints fail, try to fetch from NSE directly through Breeze
      return await this.getNSEInstitutionalData(targetDate)
      
    } catch (error) {
      console.error('❌ Breeze FII/DII data fetch failed:', error)
      return null
    }
  }

  // Fallback method to get NSE institutional data through Breeze
  private async getNSEInstitutionalData(date: string): Promise<BreezeFIIDIIData | null> {
    try {
      // Try to get market statistics which might include FII/DII data
      const response = await fetch(
        `${this.config.baseUrl}/market/statistics?exchange_code=NSE&date=${date}`,
        {
          method: 'GET',
          headers: {
            'X-API-KEY': this.config.apiKey,
            'X-SESSION-TOKEN': this.sessionToken!
          }
        }
      )

      if (!response.ok) {
        throw new Error(`NSE institutional data API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.result && data.result.institutional_activity) {
        const instData = data.result.institutional_activity
        return {
          date,
          fii_buy: parseFloat(instData.fii_gross_purchase || 0),
          fii_sell: parseFloat(instData.fii_gross_sale || 0),
          fii_net: parseFloat(instData.fii_net_investment || 0),
          dii_buy: parseFloat(instData.dii_gross_purchase || 0),
          dii_sell: parseFloat(instData.dii_gross_sale || 0),
          dii_net: parseFloat(instData.dii_net_investment || 0)
        }
      }
      
      return null
      
    } catch (error) {
      console.warn('NSE institutional data fallback failed:', error)
      return null
    }
  }

  // Get market indices data
  async getIndicesData(): Promise<any[] | null> {
    if (!this.sessionToken) {
      const authSuccess = await this.authenticate()
      if (!authSuccess) return null
    }

    try {
      const indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX']
      const response = await this.getQuotes(indices, 'NSE')
      
      return response?.Success || null
      
    } catch (error) {
      console.error('❌ Breeze indices data fetch failed:', error)
      return null
    }
  }

  // Check if session is valid
  isAuthenticated(): boolean {
    return this.sessionToken !== null
  }

  // Refresh session token
  async refreshSession(): Promise<boolean> {
    this.sessionToken = null
    return await this.authenticate()
  }
}

// Create singleton instance
const breezeConfig: BreezeConfig = {
  apiKey: process.env.BREEZE_API_KEY || '',
  apiSecret: process.env.BREEZE_API_SECRET || '',
  sessionToken: process.env.BREEZE_SESSION_TOKEN || '',
  baseUrl: 'https://api.icicidirect.com/breezeapi/api/v1'
}

export const breezeAPI = new BreezeAPIService(breezeConfig)

// Utility function to convert Yahoo symbol to Breeze format
export function convertToNSESymbol(yahooSymbol: string): string {
  // Remove .NS suffix and handle special cases
  return yahooSymbol.replace('.NS', '').replace('-', '_')
}

// Popular Indian stocks for quick access
export const POPULAR_STOCKS = {
  'RELIANCE': 'RELIANCE',
  'TCS': 'TCS',
  'HDFCBANK': 'HDFCBANK', 
  'INFY': 'INFY',
  'ICICIBANK': 'ICICIBANK',
  'KOTAKBANK': 'KOTAKBANK',
  'HINDUNILVR': 'HINDUNILVR',
  'LT': 'LT',
  'SBIN': 'SBIN',
  'BHARTIARTL': 'BHARTIARTL'
}