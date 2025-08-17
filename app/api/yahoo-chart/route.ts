import { NextResponse } from "next/server"

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
async function fetchRealChartData(symbol: string, interval = "1d", range = "1mo"): Promise<ChartResponse | null> {
  try {
    const cacheKey = `chart-${symbol}-${interval}-${range}`
    const cached = chartCache.get(cacheKey)

    // Return cached data if available and fresh
    if (cached && Date.now() - cached.timestamp < CHART_CACHE_DURATION) {
      return cached.data
    }

    const yahooSymbol = symbol.includes(".NS") ? symbol : `${symbol}.NS`

    // Multiple endpoints for better reliability
    const endpoints = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`,
    ]

    let lastError: Error | null = null

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(15000), // 15 second timeout for charts
        })

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limited by Yahoo Finance")
          }
          if (response.status === 404) {
            throw new Error(`Chart data for ${symbol} not found`)
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Validate content type
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text()
          if (text.includes("Too Many Requests") || text.includes("Rate limit") || text.includes("Too Many R")) {
            throw new Error("Rate limited by Yahoo Finance")
          }
          throw new Error("Invalid response format from Yahoo Finance")
        }

        const data = await response.json()

        if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error("No chart data returned from Yahoo Finance")
        }

        const chartResponse = parseChartData(data, symbol, interval)

        if (chartResponse) {
          // Cache successful response
          chartCache.set(cacheKey, { data: chartResponse, timestamp: Date.now() })
          return chartResponse
        }

        throw new Error("Failed to parse chart data")
      } catch (error) {
        lastError = error as Error
        console.warn(`Failed to fetch chart from ${url}:`, error)

        // If rate limited, wait before trying next endpoint
        if (error instanceof Error && error.message.includes("Rate limit")) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        continue
      }
    }

    throw lastError || new Error("All chart endpoints failed")
  } catch (error) {
    console.error(`Error fetching chart data for ${symbol}:`, error)
    return null
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

// Enhanced simulation for chart data
function generateSimulatedChartData(symbol: string, interval = "1d", range = "1mo"): ChartResponse {
  const now = Date.now()
  const dataPoints = getDataPointsForRange(range)
  const intervalMs = getIntervalMs(interval)

  // Base prices for different stocks
  const basePrices: { [key: string]: number } = {
    RELIANCE: 2387.5,
    TCS: 3456.75,
    HDFCBANK: 1678.9,
    INFY: 1456.25,
    ICICIBANK: 1089.6,
    BHARTIARTL: 1234.8,
    ITC: 456.75,
    SBIN: 678.9,
    LT: 3234.5,
    HCLTECH: 1567.25,
  }

  const basePrice = basePrices[symbol.replace(".NS", "")] || 1000
  const volatility = 0.02 // 2% daily volatility

  const chartData: ChartData[] = []
  let currentPrice = basePrice

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i - 1) * intervalMs

    // Generate realistic OHLC data
    const change = (Math.random() - 0.5) * volatility * currentPrice
    const open = currentPrice
    const close = Math.max(open + change, open * 0.95) // Prevent extreme drops

    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)

    const volume = Math.floor(Math.random() * 1000000) + 100000

    chartData.push({
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })

    currentPrice = close
  }

  return {
    symbol: symbol.replace(".NS", ""),
    data: chartData,
    interval,
    source: "Enhanced Simulation",
  }
}

function getDataPointsForRange(range: string): number {
  switch (range) {
    case "1d":
      return 24
    case "5d":
      return 120
    case "1mo":
      return 30
    case "3mo":
      return 90
    case "6mo":
      return 180
    case "1y":
      return 365
    case "2y":
      return 730
    case "5y":
      return 1825
    case "10y":
      return 3650
    default:
      return 30
  }
}

function getIntervalMs(interval: string): number {
  switch (interval) {
    case "1m":
      return 60 * 1000
    case "2m":
      return 2 * 60 * 1000
    case "5m":
      return 5 * 60 * 1000
    case "15m":
      return 15 * 60 * 1000
    case "30m":
      return 30 * 60 * 1000
    case "60m":
      return 60 * 60 * 1000
    case "90m":
      return 90 * 60 * 1000
    case "1h":
      return 60 * 60 * 1000
    case "1d":
      return 24 * 60 * 60 * 1000
    case "5d":
      return 5 * 24 * 60 * 60 * 1000
    case "1wk":
      return 7 * 24 * 60 * 60 * 1000
    case "1mo":
      return 30 * 24 * 60 * 60 * 1000
    case "3mo":
      return 90 * 24 * 60 * 60 * 1000
    default:
      return 24 * 60 * 60 * 1000
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const interval = searchParams.get("interval") || "1d"
    const range = searchParams.get("range") || "1mo"

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol parameter is required",
        },
        { status: 400 },
      )
    }

    // Check rate limiting
    const clientIP = request.headers.get("x-forwarded-for") || "unknown"
    if (isChartRateLimited(clientIP)) {
      // Return simulated data when rate limited
      const chartData = generateSimulatedChartData(symbol, interval, range)
      return NextResponse.json({
        success: true,
        chart: chartData,
        timestamp: Date.now(),
        source: "Enhanced Simulation (Rate Limited)",
        rateLimited: true,
      })
    }

    // Try to fetch real data with timeout
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Chart request timeout")), 12000),
    )

    const dataPromise = fetchRealChartData(symbol, interval, range)

    try {
      const realData = await Promise.race([dataPromise, timeoutPromise])

      if (realData) {
        return NextResponse.json({
          success: true,
          chart: realData,
          timestamp: Date.now(),
          source: "Yahoo Finance API",
        })
      }
    } catch (error) {
      console.warn(`Yahoo Finance chart API failed for ${symbol}:`, error)
    }

    // Fallback to enhanced simulation
    const chartData = generateSimulatedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      chart: chartData,
      timestamp: Date.now(),
      source: "Enhanced Simulation (API Unavailable)",
    })
  } catch (error) {
    console.error("Error in yahoo-chart route:", error)

    // Always return some data, even on complete failure
    const symbol = new URL(request.url).searchParams.get("symbol") || "RELIANCE.NS"
    const interval = new URL(request.url).searchParams.get("interval") || "1d"
    const range = new URL(request.url).searchParams.get("range") || "1mo"

    const chartData = generateSimulatedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      chart: chartData,
      timestamp: Date.now(),
      source: "Fallback Simulation (Error)",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
