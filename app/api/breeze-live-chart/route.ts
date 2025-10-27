import { NextRequest, NextResponse } from 'next/server'
import { BreezeAPIService } from '@/lib/breeze-api'
import { format, subDays, subMonths, subYears } from 'date-fns'

// Initialize Breeze API
const breezeConfig = {
  apiKey: process.env.BREEZE_API_KEY || '',
  apiSecret: process.env.BREEZE_API_SECRET || '',
  sessionToken: process.env.BREEZE_SESSION_TOKEN || '',
  baseUrl: process.env.BREEZE_BASE_URL || 'https://api.icicidirect.com/breezeapi/api/v1'
}

const breezeAPI = new BreezeAPIService(breezeConfig)

// Cache for storing chart data
const cache = new Map<string, { data: any; timestamp: number }>()

function getCacheDuration(interval: string): number {
  switch (interval) {
    case '1m':
    case '2m':
    case '5m':
      return 30000 // 30 seconds for short intervals
    case '15m':
    case '30m':
      return 120000 // 2 minutes for medium intervals
    case '1h':
      return 300000 // 5 minutes for hourly
    case '1d':
    default:
      return 600000 // 10 minutes for daily data
  }
}

function getCachedData(key: string, maxAge: number): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Convert symbol format
function convertSymbolForBreeze(symbol: string): string {
  return symbol.replace('.NS', '').toUpperCase()
}

// Convert range and interval to Breeze API format
function getBreezeTimeParams(range: string, interval: string) {
  const now = new Date()
  let fromDate: Date
  let toDate = now
  let breezeInterval = 'day'

  // Determine date range
  switch (range) {
    case '1d':
      fromDate = subDays(now, 1)
      breezeInterval = interval.includes('m') ? 'minute' : 'day'
      break
    case '5d':
      fromDate = subDays(now, 5)
      breezeInterval = interval.includes('m') || interval === '1h' ? 'minute' : 'day'
      break
    case '1mo':
      fromDate = subMonths(now, 1)
      breezeInterval = interval === '1d' ? 'day' : 'minute'
      break
    case '3mo':
      fromDate = subMonths(now, 3)
      breezeInterval = 'day'
      break
    case '6mo':
      fromDate = subMonths(now, 6)
      breezeInterval = 'day'
      break
    case '1y':
      fromDate = subYears(now, 1)
      breezeInterval = 'day'
      break
    case '2y':
      fromDate = subYears(now, 2)
      breezeInterval = 'week'
      break
    case '5y':
      fromDate = subYears(now, 5)
      breezeInterval = 'month'
      break
    default:
      fromDate = subMonths(now, 1)
      breezeInterval = 'day'
  }

  return {
    fromDate: format(fromDate, 'yyyy-MM-dd'),
    toDate: format(toDate, 'yyyy-MM-dd'),
    interval: breezeInterval
  }
}

// Generate fallback chart data when Breeze API is unavailable
function generateFallbackChart(symbol: string, range: string, interval: string) {
  const periods = {
    '1d': 1,
    '5d': 5,
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825
  }

  const days = periods[range as keyof typeof periods] || 30
  const basePrice = 1000 + Math.random() * 2000 // Random base price
  const data = []
  let currentPrice = basePrice

  // Generate data points based on interval
  const pointsPerDay = interval.includes('m') ? (interval === '1m' ? 375 : interval === '5m' ? 75 : 25) : 1
  const totalPoints = Math.min(days * pointsPerDay, 1000) // Limit to 1000 points

  for (let i = totalPoints; i >= 0; i--) {
    const minutesBack = interval.includes('m') ? 
      i * parseInt(interval.replace('m', '')) : 
      i * 24 * 60 // Daily intervals
      
    const date = new Date(Date.now() - minutesBack * 60 * 1000)
    
    // Create realistic price movements
    const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
    currentPrice *= (1 + variation)
    
    const open = currentPrice
    const close = open * (1 + (Math.random() - 0.5) * 0.01) // ±0.5% from open
    const high = Math.max(open, close) * (1 + Math.random() * 0.005)
    const low = Math.min(open, close) * (1 - Math.random() * 0.005)
    const volume = Math.floor(Math.random() * 10000000)

    data.push({
      timestamp: date.getTime(),
      datetime: date.toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume
    })
  }

  return data.reverse() // Chronological order
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const range = searchParams.get('range') || '1d'
    const interval = searchParams.get('interval') || '5m'
    const exchange = searchParams.get('exchange') || 'NSE'

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    console.log(`📊 Fetching chart data for ${symbol} (${range}, ${interval}) from Breeze API`)

    const cleanSymbol = convertSymbolForBreeze(symbol)
    const cacheKey = `breeze-chart-${cleanSymbol}-${range}-${interval}`
    const cacheDuration = getCacheDuration(interval)
    
    // Check cache first
    const cachedData = getCachedData(cacheKey, cacheDuration)
    if (cachedData) {
      console.log(`📦 Returning cached chart data for ${cleanSymbol}`)
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        symbol: cachedData.symbol,
        interval: cachedData.interval,
        source: `${cachedData.source} (Cached)`,
        cached: true,
        cacheAge: Date.now() - cache.get(cacheKey)!.timestamp,
        timestamp: new Date().toISOString()
      })
    }

    // Check if Breeze API is configured
    if (!breezeConfig.apiKey || !breezeConfig.apiSecret || !breezeConfig.sessionToken) {
      console.warn('⚠️ Breeze API not configured, generating fallback chart data')
      const fallbackData = generateFallbackChart(cleanSymbol, range, interval)
      
      const chartResponse = {
        symbol: cleanSymbol,
        data: fallbackData,
        interval,
        source: 'Fallback Data (Breeze Not Configured)',
        dataPoints: fallbackData.length
      }
      
      setCachedData(cacheKey, chartResponse)
      
      return NextResponse.json({
        success: true,
        data: fallbackData,
        symbol: cleanSymbol,
        interval,
        source: 'Fallback Data (Breeze Not Configured)',
        fallback: true,
        dataPoints: fallbackData.length,
        timestamp: new Date().toISOString()
      })
    }

    try {
      // Authenticate with Breeze API
      const isAuthenticated = await breezeAPI.authenticate()
      if (!isAuthenticated) {
        console.error('❌ Breeze API authentication failed for chart data')
        const fallbackData = generateFallbackChart(cleanSymbol, range, interval)
        
        const chartResponse = {
          symbol: cleanSymbol,
          data: fallbackData,
          interval,
          source: 'Fallback Data (Auth Failed)',
          dataPoints: fallbackData.length
        }
        
        setCachedData(cacheKey, chartResponse)
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          symbol: cleanSymbol,
          interval,
          source: 'Fallback Data (Auth Failed)',
          fallback: true,
          reason: 'Authentication failed',
          dataPoints: fallbackData.length,
          timestamp: new Date().toISOString()
        })
      }

      console.log(`✅ Breeze API authenticated, fetching historical data for ${cleanSymbol}`)

      // Get time parameters for Breeze API
      const { fromDate, toDate, interval: breezeInterval } = getBreezeTimeParams(range, interval)
      
      console.log(`📈 Fetching Breeze historical data: ${cleanSymbol} from ${fromDate} to ${toDate} (${breezeInterval})`)

      // Fetch historical data from Breeze API
      const historicalData = await breezeAPI.getHistoricalData({
        stock_code: cleanSymbol,
        exchange_code: exchange,
        product_type: 'cash',
        expiry_date: '',
        right: 'others',
        strike_price: '0',
        from_date: fromDate,
        to_date: toDate,
        interval: breezeInterval
      })

      if (historicalData && historicalData.Success && Array.isArray(historicalData.Success)) {
        console.log(`✅ Received ${historicalData.Success.length} data points from Breeze API`)
        
        const chartData = historicalData.Success.map((item: any) => ({
          timestamp: new Date(item.datetime).getTime(),
          datetime: item.datetime,
          open: parseFloat(item.open) || 0,
          high: parseFloat(item.high) || 0,
          low: parseFloat(item.low) || 0,
          close: parseFloat(item.close) || 0,
          volume: parseInt(item.volume) || 0
        }))

        const chartResponse = {
          symbol: cleanSymbol,
          data: chartData,
          interval,
          source: 'ICICIDirect Breeze API (Live)',
          dataPoints: chartData.length
        }

        // Cache the result
        setCachedData(cacheKey, chartResponse)

        return NextResponse.json({
          success: true,
          data: chartData,
          symbol: cleanSymbol,
          interval,
          source: 'ICICIDirect Breeze API (Live)',
          cached: false,
          dataPoints: chartData.length,
          dateRange: { from: fromDate, to: toDate },
          timestamp: new Date().toISOString()
        })

      } else {
        console.warn(`⚠️ No historical data received from Breeze API for ${cleanSymbol}`)
        const fallbackData = generateFallbackChart(cleanSymbol, range, interval)
        
        const chartResponse = {
          symbol: cleanSymbol,
          data: fallbackData,
          interval,
          source: 'Fallback Data (No Breeze Data)',
          dataPoints: fallbackData.length
        }
        
        setCachedData(cacheKey, chartResponse)
        
        return NextResponse.json({
          success: true,
          data: fallbackData,
          symbol: cleanSymbol,
          interval,
          source: 'Fallback Data (No Breeze Data)',
          fallback: true,
          reason: 'No data from Breeze API',
          dataPoints: fallbackData.length,
          timestamp: new Date().toISOString()
        })
      }

    } catch (breezeError) {
      console.error(`❌ Breeze API error for chart ${cleanSymbol}:`, breezeError)
      const fallbackData = generateFallbackChart(cleanSymbol, range, interval)
      
      const chartResponse = {
        symbol: cleanSymbol,
        data: fallbackData,
        interval,
        source: 'Fallback Data (API Error)',
        dataPoints: fallbackData.length
      }
      
      setCachedData(cacheKey, chartResponse)
      
      return NextResponse.json({
        success: true,
        data: fallbackData,
        symbol: cleanSymbol,
        interval,
        source: 'Fallback Data (API Error)',
        fallback: true,
        reason: `Breeze API error: ${breezeError instanceof Error ? breezeError.message : 'Unknown error'}`,
        dataPoints: fallbackData.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Chart API error:', error)
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