import { NextRequest, NextResponse } from 'next/server'
import { breezeAPI, convertToNSESymbol } from '@/lib/breeze-api'
import { format, subDays } from 'date-fns'

// Cache for storing chart data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for chart data

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Generate fallback chart data
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
  const basePrice = Math.random() * 3000 + 1000 // Random base price
  const data = []

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const variation = (Math.random() - 0.5) * 0.1 // ±5% variation
    const open = basePrice * (1 + variation)
    const close = open * (1 + (Math.random() - 0.5) * 0.05)
    const high = Math.max(open, close) * (1 + Math.random() * 0.03)
    const low = Math.min(open, close) * (1 - Math.random() * 0.03)
    const volume = Math.floor(Math.random() * 10000000)

    data.push({
      datetime: format(date, "yyyy-MM-dd'T'HH:mm:ss"),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume
    })
  }

  return {
    symbol,
    data,
    meta: {
      symbol,
      interval,
      range,
      dataGranularity: interval,
      instrumentType: 'EQUITY',
      firstTradeDate: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      currency: 'INR',
      exchangeName: 'NSE',
      fullExchangeName: 'National Stock Exchange of India',
      instrumentName: `${symbol} Stock`,
      exchangeTimezoneName: 'Asia/Kolkata',
      regularMarketTime: Math.floor(Date.now() / 1000),
      gmtoffset: 19800,
      timezone: 'IST',
      exchangeTimezoneShortName: 'IST'
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const range = searchParams.get('range') || '1mo'
    const interval = searchParams.get('interval') || '1d'

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // Convert symbol format
    const nseSymbol = convertToNSESymbol(symbol)
    
    // Check cache first
    const cacheKey = `chart-${nseSymbol}-${range}-${interval}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        ...cachedData,
        cached: true,
        source: 'Breeze API (Cached)',
        timestamp: new Date().toISOString()
      })
    }

    // Calculate date range
    const toDate = format(new Date(), 'yyyy-MM-dd')
    let fromDate: string
    
    switch (range) {
      case '1d':
        fromDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')
        break
      case '5d':
        fromDate = format(subDays(new Date(), 5), 'yyyy-MM-dd')
        break
      case '1mo':
        fromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
        break
      case '3mo':
        fromDate = format(subDays(new Date(), 90), 'yyyy-MM-dd')
        break
      case '6mo':
        fromDate = format(subDays(new Date(), 180), 'yyyy-MM-dd')
        break
      case '1y':
        fromDate = format(subDays(new Date(), 365), 'yyyy-MM-dd')
        break
      default:
        fromDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
    }

    try {
      // Try Breeze API first
      const historicalData = await breezeAPI.getHistoricalData(
        nseSymbol,
        fromDate,
        toDate,
        interval === '5m' ? '5minute' : interval === '1h' ? '1hour' : '1day'
      )

      if (historicalData && historicalData.length > 0) {
        const chartData = {
          symbol: nseSymbol,
          data: historicalData,
          meta: {
            symbol: nseSymbol,
            interval,
            range,
            dataGranularity: interval,
            instrumentType: 'EQUITY',
            firstTradeDate: fromDate,
            currency: 'INR',
            exchangeName: 'NSE',
            fullExchangeName: 'National Stock Exchange of India',
            instrumentName: `${nseSymbol} Stock`,
            exchangeTimezoneName: 'Asia/Kolkata',
            regularMarketTime: Math.floor(Date.now() / 1000),
            gmtoffset: 19800,
            timezone: 'IST',
            exchangeTimezoneShortName: 'IST'
          }
        }

        // Cache the result
        setCachedData(cacheKey, chartData)

        return NextResponse.json({
          success: true,
          ...chartData,
          cached: false,
          source: 'Breeze API (Live)',
          timestamp: new Date().toISOString()
        })
      }
    } catch (breezeError) {
      console.warn('Breeze historical data error, using fallback:', breezeError)
    }

    // Fallback to generated data
    console.log(`Using fallback chart data for ${nseSymbol}`)
    const fallbackData = generateFallbackChart(nseSymbol, range, interval)
    
    // Cache fallback data
    setCachedData(cacheKey, fallbackData)

    return NextResponse.json({
      success: true,
      ...fallbackData,
      cached: false,
      source: 'Fallback Data (Simulated)',
      timestamp: new Date().toISOString(),
      warning: 'Using simulated data - Breeze API unavailable'
    })

  } catch (error) {
    console.error('Chart API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chart data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}