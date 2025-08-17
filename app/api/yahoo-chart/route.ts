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
}

// Cache for chart data
const chartCache = new Map<string, { data: ChartResponse; timestamp: number }>()
const CHART_CACHE_DURATION = 60000 // 1 minute cache

// Rate limiting for chart API
const chartRateLimitMap = new Map<string, { count: number; resetTime: number }>()
const CHART_RATE_LIMIT_WINDOW = 120000 // 2 minutes
const MAX_CHART_REQUESTS_PER_WINDOW = 5

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Cache storage
const cacheMap = new Map<string, { data: any; timestamp: number }>()

// Rate limiting function
function checkRateLimit(ip: string, maxRequests = 5, windowMs = 120000): boolean {
  const now = Date.now()
  const key = `chart-${ip}`

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

// Get cached data
function getCachedData(key: string, maxAge = 60000): any | null {
  const cached = cacheMap.get(key)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data
  }
  return null
}

// Set cached data
function setCachedData(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() })
}

function isChartRateLimited(ip: string): boolean {
  const now = Date.now()
  const rateLimitData = chartRateLimitMap.get(ip)

  if (!rateLimitData || now > rateLimitData.resetTime) {
    chartRateLimitMap.set(ip, { count: 1, resetTime: now + CHART_RATE_LIMIT_WINDOW })
    return false
  }

  if (rateLimitData.count >= MAX_CHART_REQUESTS_PER_WINDOW) {
    return true
  }

  rateLimitData.count++
  return false
}

// Enhanced Yahoo Finance chart data fetching
async function fetchRealChartData(symbol: string, interval = "1d", range = "1mo"): Promise<any> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        if (text.includes("Too Many Requests") || text.includes("Rate limit")) {
          throw new Error("Rate limited by Yahoo Finance")
        }
        throw new Error(`Invalid content type: ${contentType}`)
      }

      const data = await response.json()

      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0]
        const timestamps = result.timestamp
        const quote = result.indicators?.quote?.[0]

        if (timestamps && quote) {
          const chartData = timestamps
            .map((timestamp: number, index: number) => ({
              timestamp: timestamp * 1000,
              open: Number.parseFloat((quote.open[index] || 0).toFixed(2)),
              high: Number.parseFloat((quote.high[index] || 0).toFixed(2)),
              low: Number.parseFloat((quote.low[index] || 0).toFixed(2)),
              close: Number.parseFloat((quote.close[index] || 0).toFixed(2)),
              volume: quote.volume[index] || 0,
            }))
            .filter((item) => item.open > 0 && item.close > 0)

          return {
            symbol: symbol.replace(".NS", ""),
            data: chartData,
            interval,
            source: "Yahoo Finance API",
          }
        }
      }

      throw new Error("Invalid chart data structure")
    } catch (error) {
      console.error(`Error with chart endpoint ${endpoint}:`, error)
      continue
    }
  }

  throw new Error("All chart endpoints failed")
}

// Enhanced simulation for chart data
function generateSimulatedChart(symbol: string, range: string, interval: string) {
  const now = Date.now()
  const dataPoints = getDataPointsForRange(range)
  const intervalMs = getIntervalMs(interval)

  let basePrice = 1000 + Math.random() * 2000
  const data = []

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i - 1) * intervalMs

    // Add realistic price movement
    const volatility = (Math.random() - 0.5) * 0.02 // -1% to +1%
    const open = basePrice
    const change = basePrice * volatility
    const close = open + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = Math.floor(Math.random() * 1000000) + 10000

    data.push({
      timestamp,
      open: Number.parseFloat(open.toFixed(2)),
      high: Number.parseFloat(high.toFixed(2)),
      low: Number.parseFloat(low.toFixed(2)),
      close: Number.parseFloat(close.toFixed(2)),
      volume,
    })

    basePrice = close
  }

  return {
    symbol: symbol.replace(".NS", ""),
    data,
    interval,
    source: "Enhanced Simulation",
  }
}

function parseChartData(data: any, symbol: string, interval: string): ChartResponse | null {
  try {
    const result = data.chart.result[0]
    const timestamps = result.timestamp || []
    const indicators = result.indicators?.quote?.[0] || {}

    const opens = indicators.open || []
    const highs = indicators.high || []
    const lows = indicators.low || []
    const closes = indicators.close || []
    const volumes = indicators.volume || []

    const chartData: ChartData[] = timestamps
      .map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        open: opens[index] || 0,
        high: highs[index] || 0,
        low: lows[index] || 0,
        close: closes[index] || 0,
        volume: volumes[index] || 0,
      }))
      .filter((item: ChartData) => item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0)

    return {
      symbol: symbol.replace(".NS", ""),
      data: chartData,
      interval,
      source: "Yahoo Finance API",
    }
  } catch (error) {
    console.error("Error parsing chart data:", error)
    return null
  }
}

function getDataPointsForRange(range: string): number {
  switch (range) {
    case "1d":
      return 78 // 5-minute intervals in a trading day
    case "5d":
      return 390 // 5 days of 5-minute intervals
    case "1mo":
      return 22 // Daily data for a month
    case "3mo":
      return 66 // Daily data for 3 months
    case "6mo":
      return 132 // Daily data for 6 months
    case "1y":
      return 252 // Daily data for a year
    case "2y":
      return 504 // Daily data for 2 years
    default:
      return 78
  }
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60 * 1000
    case "5m":
      return 5 * 60 * 1000
    case "15m":
      return 15 * 60 * 1000
    case "30m":
      return 30 * 60 * 1000
    case "1h":
      return 60 * 60 * 1000
    case "1d":
      return 24 * 60 * 60 * 1000
    default:
      return 5 * 60 * 1000
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const range = searchParams.get("range") || "1mo"
    const interval = searchParams.get("interval") || "1d"
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol parameter is required" }, { status: 400 })
    }

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: true,
        data: generateSimulatedChart(symbol, range, interval).data,
        chart: generateSimulatedChart(symbol, range, interval),
        rateLimited: true,
        source: "Rate Limited - Simulation",
        timestamp: Date.now(),
      })
    }

    // Check cache first
    const cacheKey = `chart-${symbol}-${range}-${interval}`
    const cachedData = getCachedData(cacheKey)

    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        chart: cachedData,
        cached: true,
        source: cachedData.source,
        timestamp: Date.now(),
      })
    }

    try {
      // Try to fetch real data
      const realData = await fetchRealChartData(symbol, range, interval)

      // Cache successful response
      setCachedData(cacheKey, realData)

      return NextResponse.json({
        success: true,
        data: realData.data,
        chart: realData,
        cached: false,
        source: realData.source,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`Error fetching chart data for ${symbol}:`, error)

      // Fallback to simulation
      const simulatedData = generateSimulatedChart(symbol, range, interval)
      setCachedData(cacheKey, simulatedData)

      return NextResponse.json({
        success: true,
        data: simulatedData.data,
        chart: simulatedData,
        fallback: true,
        source: simulatedData.source,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    console.error("Error in yahoo-chart API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
