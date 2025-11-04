import { NextRequest, NextResponse } from 'next/server'
import { BreezeAPIService } from '@/lib/breeze-api'
import { getProductionBreezeManager } from '@/lib/production-breeze-manager'

// Initialize production Breeze manager
const breezeManager = getProductionBreezeManager()

// Initialize Breeze API with dynamic session management
function getBreezeAPIWithSession(sessionToken: string): BreezeAPIService {
  const breezeConfig = {
    apiKey: process.env.BREEZE_API_KEY || '',
    apiSecret: process.env.BREEZE_API_SECRET || '',
    sessionToken,
    baseUrl: process.env.BREEZE_BASE_URL || 'https://api.icicidirect.com/breezeapi/api/v1'
  }
  return new BreezeAPIService(breezeConfig)
}

// Rate limiting and caching
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const cacheMap = new Map<string, { data: any; timestamp: number }>()

function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `breeze-live-${ip}`

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  const limit = rateLimitMap.get(key)!

  if (now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count++
  return true
}

function getCachedData(key: string, maxAge = 5000): any | null {
  const cached = cacheMap.get(key)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() })
}

// Convert symbol format (remove .NS suffix for Breeze API)
function convertSymbolForBreeze(symbol: string): string {
  return symbol.replace('.NS', '').toUpperCase()
}

// Generate fallback data if Breeze API is unavailable
function generateFallbackQuote(symbol: string) {
  const baseData: { [key: string]: any } = {
    'RELIANCE': { price: 2650, name: 'Reliance Industries Ltd' },
    'TCS': { price: 4200, name: 'Tata Consultancy Services Ltd' },
    'HDFCBANK': { price: 1680, name: 'HDFC Bank Ltd' },
    'INFY': { price: 1450, name: 'Infosys Ltd' },
    'ICICIBANK': { price: 1250, name: 'ICICI Bank Ltd' },
    'BHARTIARTL': { price: 950, name: 'Bharti Airtel Ltd' },
    'ITC': { price: 480, name: 'ITC Ltd' },
    'KOTAKBANK': { price: 1850, name: 'Kotak Mahindra Bank Ltd' },
    'LT': { price: 3200, name: 'Larsen & Toubro Ltd' },
    'SBIN': { price: 780, name: 'State Bank of India' }
  }

  const base = baseData[symbol] || { price: 1000 + Math.random() * 2000, name: `${symbol} Ltd` }
  const change = (Math.random() - 0.5) * 0.08 // ±4% change
  const currentPrice = base.price * (1 + change)
  const changeAmount = currentPrice - base.price
  const changePercent = (changeAmount / base.price) * 100

  return {
    symbol,
    companyName: base.name,
    price: parseFloat(currentPrice.toFixed(2)),
    change: parseFloat(changeAmount.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    open: parseFloat((currentPrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
    high: parseFloat((currentPrice * (1.01 + Math.random() * 0.02)).toFixed(2)),
    low: parseFloat((currentPrice * (0.97 + Math.random() * 0.02)).toFixed(2)),
    volume: Math.floor(Math.random() * 10000000),
    lastUpdate: new Date().toISOString(),
    source: 'Fallback Data'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const exchange = searchParams.get('exchange') || 'NSE'

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    console.log(`💹 Fetching live price for ${symbol} from Breeze API`)

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      }, { status: 429 })
    }

    // Check cache first
    const cleanSymbol = convertSymbolForBreeze(symbol)
    const cacheKey = `live-${cleanSymbol}-${exchange}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      console.log(`📦 Returning cached data for ${cleanSymbol}`)
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      })
    }

    // Check if Breeze API is properly configured
    const apiKey = process.env.BREEZE_API_KEY
    const apiSecret = process.env.BREEZE_API_SECRET

    if (!apiKey || !apiSecret) {
      console.warn('⚠️ Breeze API credentials not configured, using fallback data')
      const fallbackData = generateFallbackQuote(cleanSymbol)
      setCachedData(cacheKey, fallbackData)
      
      return NextResponse.json({
        success: true,
        data: fallbackData,
        fallback: true,
        reason: 'Breeze API credentials not configured',
        timestamp: new Date().toISOString()
      })
    }

    try {
      // Get a valid session token from the production manager
      console.log('🔄 Getting valid session from production manager...')
      const sessionToken = await breezeManager.getValidSession()
      
      if (!sessionToken) {
        console.error('❌ Could not obtain valid session token')
        const fallbackData = generateFallbackQuote(cleanSymbol)
        setCachedData(cacheKey, fallbackData)
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          fallback: true,
          reason: 'Could not obtain valid session token',
          timestamp: new Date().toISOString()
        })
      }

      console.log(`✅ Got valid session token, fetching quote for ${cleanSymbol}`)

      // Create Breeze API instance with the valid session
      const breezeAPI = getBreezeAPIWithSession(sessionToken)

      // Fetch live quote from Breeze API
      const quoteResponse = await breezeAPI.getQuotes([cleanSymbol], exchange)

      if (quoteResponse && quoteResponse.Success && quoteResponse.Success.length > 0) {
        const quote = quoteResponse.Success[0]
        console.log(`✅ Received Breeze quote for ${cleanSymbol}: LTP=${quote.ltp}`)
        
        const liveData = {
          symbol: cleanSymbol,
          companyName: `${cleanSymbol} Ltd`, // Breeze doesn't return company name in quote
          price: quote.ltp || 0,
          change: quote.ltp_percent_change ? (quote.ltp * quote.ltp_percent_change / 100) : 0,
          changePercent: quote.ltp_percent_change || 0,
          open: quote.open || quote.ltp,
          high: quote.high || quote.ltp,
          low: quote.low || quote.ltp,
          volume: parseInt(quote.total_quantity_traded || '0'),
          previousClose: quote.previous_close || quote.ltp,
          bid: quote.best_bid_price || 0,
          ask: quote.best_offer_price || 0,
          bidQuantity: parseInt(quote.best_bid_quantity || '0'),
          askQuantity: parseInt(quote.best_offer_quantity || '0'),
          upperCircuit: quote.upper_circuit || 0,
          lowerCircuit: quote.lower_circuit || 0,
          lastUpdate: new Date().toISOString(),
          source: 'ICICIDirect Breeze API (Live)',
          exchange: exchange,
          lastTradeTime: quote.ltt || new Date().toISOString()
        }
        
        // Cache the result
        setCachedData(cacheKey, liveData)
        
        return NextResponse.json({
          success: true,
          data: liveData,
          cached: false,
          timestamp: new Date().toISOString()
        })
        
      } else {
        console.warn(`⚠️ No data received from Breeze API for ${cleanSymbol}`)
        const fallbackData = generateFallbackQuote(cleanSymbol)
        setCachedData(cacheKey, fallbackData)
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          fallback: true,
          reason: 'No data from Breeze API',
          timestamp: new Date().toISOString()
        })
      }
      
    } catch (breezeError) {
      console.error(`❌ Breeze API error for ${cleanSymbol}:`, breezeError)
      const fallbackData = generateFallbackQuote(cleanSymbol)
      setCachedData(cacheKey, fallbackData)
      
      return NextResponse.json({
        success: true,
        data: fallbackData,
        fallback: true,
        reason: `Breeze API error: ${breezeError instanceof Error ? breezeError.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Live price API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Allow POST requests as well
}