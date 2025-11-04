import { type NextRequest, NextResponse } from "next/server"

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartResponse {
  symbol: string
  data: ChartData[]
  interval: string
  source: string
  lastUpdate: number
}

// Longer cache duration for chart data (5 minutes for intraday, 30 minutes for daily)
const chartCache = new Map<string, { data: ChartResponse; timestamp: number }>()

// Relaxed rate limiting for better user experience
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20 // Allow 20 requests per minute per IP (increased from 2)

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const rateLimitData = rateLimitMap.get(ip)

  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (rateLimitData.count >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }

  rateLimitData.count++
  return false
}

// Primary Yahoo Finance fetcher with better error handling
async function fetchYahooChartData(symbol: string, range: string, interval: string): Promise<ChartResponse | null> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`,
  ]

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  }

  for (const endpoint of endpoints) {
    try {
      console.log(`📊 Fetching real chart data from: ${endpoint}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(endpoint, {
        headers,
        signal: controller.signal,
        cache: 'no-store'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`❌ Yahoo Finance endpoint ${endpoint} returned ${response.status}`)
        continue
      }

      const data = await response.json()
      console.log(`✅ Successfully fetched data from Yahoo Finance`)

      if (data?.chart?.result?.[0]) {
        const result = data.chart.result[0]
        const timestamps = result.timestamp || []
        const indicators = result.indicators?.quote?.[0] || {}

        if (timestamps.length === 0) {
          console.warn(`⚠️ No timestamps in Yahoo Finance data`)
          continue
        }

        const opens = indicators.open || []
        const highs = indicators.high || []
        const lows = indicators.low || []
        const closes = indicators.close || []
        const volumes = indicators.volume || []

        const chartData: ChartData[] = timestamps
          .map((timestamp: number, index: number) => {
            const open = opens[index]
            const high = highs[index]
            const low = lows[index]
            const close = closes[index]
            const volume = volumes[index] || 0

            // Only include valid data points
            if (!open || !high || !low || !close || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
              return null
            }

            return {
              timestamp: timestamp * 1000, // Convert to milliseconds
              open: Number(open.toFixed(2)),
              high: Number(high.toFixed(2)),
              low: Number(low.toFixed(2)),
              close: Number(close.toFixed(2)),
              volume: Math.round(volume)
            }
          })
          .filter((item): item is ChartData => item !== null)

        if (chartData.length === 0) {
          console.warn(`⚠️ No valid chart data points`)
          continue
        }

        console.log(`✅ Parsed ${chartData.length} valid data points`)

        return {
          symbol: symbol.replace(".NS", ""),
          data: chartData,
          interval,
          source: "Yahoo Finance (Live)",
          lastUpdate: Date.now()
        }
      } else {
        console.warn(`⚠️ Invalid response structure from Yahoo Finance`)
      }
    } catch (error) {
      console.error(`❌ Error with Yahoo endpoint ${endpoint}:`, error instanceof Error ? error.message : 'Unknown error')
      continue
    }
  }

  return null
}

// Alternative data source - Investing.com or other reliable source
async function fetchAlternativeChartData(symbol: string, range: string, interval: string): Promise<ChartResponse | null> {
  // For now, we'll skip alternative sources to avoid complexity
  // In production, you could add other sources like NSE API, Alpha Vantage, etc.
  console.log(`⚠️ Alternative data sources not implemented yet`)
  return null
}

// Get cache duration based on interval
function getCacheDuration(interval: string): number {
  switch (interval) {
    case '1m':
    case '2m':
    case '5m':
      return 60000 // 1 minute for short intervals
    case '15m':
    case '30m':
      return 300000 // 5 minutes for medium intervals
    case '1h':
      return 600000 // 10 minutes for hourly
    case '1d':
    default:
      return 1800000 // 30 minutes for daily data
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const range = searchParams.get("range") || "1d"
    const interval = searchParams.get("interval") || "5m"
    const ip = request.ip || request.headers.get("x-forwarded-for") || "127.0.0.1"

    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: "Symbol parameter is required" 
      }, { status: 400 })
    }

    console.log(`📈 Chart request: ${symbol} (${range}, ${interval}) from ${ip}`)

    // Check cache first
    const cacheKey = `chart-${symbol}-${range}-${interval}`
    const cached = chartCache.get(cacheKey)
    const cacheDuration = getCacheDuration(interval)

    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      console.log(`📦 Returning cached chart data for ${symbol}`)
      return NextResponse.json({
        success: true,
        data: cached.data.data,
        symbol: cached.data.symbol,
        interval: cached.data.interval,
        source: `${cached.data.source} (Cached)`,
        cached: true,
        cacheAge: Date.now() - cached.timestamp,
        timestamp: Date.now(),
      })
    }

    // Check rate limit for new requests
    if (isRateLimited(ip)) {
      console.log(`🚫 Rate limited: ${ip}`)
      
      // If we have old cached data, return it even if expired
      if (cached) {
        console.log(`📦 Returning stale cache due to rate limit`)
        return NextResponse.json({
          success: true,
          data: cached.data.data,
          symbol: cached.data.symbol,
          interval: cached.data.interval,
          source: `${cached.data.source} (Stale Cache)`,
          cached: true,
          rateLimited: true,
          cacheAge: Date.now() - cached.timestamp,
          timestamp: Date.now(),
        })
      }

      // No cached data and rate limited - return error
      return NextResponse.json({
        success: false,
        error: "Rate limited and no cached data available",
        rateLimited: true,
        retryAfter: RATE_LIMIT_WINDOW
      }, { status: 429 })
    }

    // Try to fetch fresh data
    let chartData: ChartResponse | null = null

    // Primary: Yahoo Finance
    try {
      chartData = await fetchYahooChartData(symbol, range, interval)
    } catch (error) {
      console.error(`❌ Yahoo Finance failed:`, error)
    }

    // Secondary: Alternative sources (if Yahoo fails)
    if (!chartData) {
      try {
        chartData = await fetchAlternativeChartData(symbol, range, interval)
      } catch (error) {
        console.error(`❌ Alternative sources failed:`, error)
      }
    }

    // If we got fresh data, cache it and return
    if (chartData) {
      chartCache.set(cacheKey, { data: chartData, timestamp: Date.now() })
      
      return NextResponse.json({
        success: true,
        data: chartData.data,
        symbol: chartData.symbol,
        interval: chartData.interval,
        source: chartData.source,
        cached: false,
        dataPoints: chartData.data.length,
        timestamp: Date.now(),
      })
    }

    // If all sources failed but we have old cached data, return it
    if (cached) {
      console.log(`⚠️ All sources failed, returning stale cache`)
      return NextResponse.json({
        success: true,
        data: cached.data.data,
        symbol: cached.data.symbol,
        interval: cached.data.interval,
        source: `${cached.data.source} (Stale - Sources Failed)`,
        cached: true,
        stale: true,
        cacheAge: Date.now() - cached.timestamp,
        timestamp: Date.now(),
      })
    }

    // Complete failure - no data available
    console.error(`❌ Complete failure: No data sources available and no cache for ${symbol}`)
    return NextResponse.json({
      success: false,
      error: "No chart data available from any source",
      symbol,
      timestamp: Date.now(),
    }, { status: 503 })

  } catch (error) {
    console.error("❌ Chart API Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }, { status: 500 })
  }
}