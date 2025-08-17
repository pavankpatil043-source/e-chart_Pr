import { NextResponse } from "next/server"

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Cache for chart data
const chartCache = new Map<string, { data: ChartData[]; timestamp: number }>()
const CHART_CACHE_DURATION = 60000 // 1 minute cache for chart data

// Rate limiting for chart requests
const chartRateLimitMap = new Map<string, { count: number; resetTime: number }>()
const CHART_RATE_LIMIT_WINDOW = 60000 // 1 minute
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
async function fetchRealChartData(symbol: string, interval = "5m", range = "1d"): Promise<ChartData[]> {
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

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://finance.yahoo.com/",
            Origin: "https://finance.yahoo.com",
            "Cache-Control": "no-cache",
          },
          signal: AbortSignal.timeout(12000), // 12 second timeout for chart data
        })

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limited by Yahoo Finance")
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text()
          if (text.includes("Too Many Requests") || text.includes("Rate limit")) {
            throw new Error("Rate limited by Yahoo Finance")
          }
          throw new Error("Invalid response format from Yahoo Finance")
        }

        const data = await response.json()

        if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error("No chart data returned from Yahoo Finance")
        }

        const chartData = parseChartData(data)

        if (chartData.length > 0) {
          // Cache successful response
          chartCache.set(cacheKey, { data: chartData, timestamp: Date.now() })
          return chartData
        }
      } catch (error) {
        console.warn(`Failed to fetch chart from ${url}:`, error)

        // If rate limited, wait before trying next endpoint
        if (error instanceof Error && error.message.includes("Rate limit")) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }

        continue
      }
    }

    return []
  } catch (error) {
    console.error(`Error fetching real chart data for ${symbol}:`, error)
    return []
  }
}

function parseChartData(data: any): ChartData[] {
  try {
    const result = data.chart?.result?.[0]
    if (!result) return []

    const timestamps = result.timestamp || []
    const indicators = result.indicators?.quote?.[0] || {}
    const opens = indicators.open || []
    const highs = indicators.high || []
    const lows = indicators.low || []
    const closes = indicators.close || []
    const volumes = indicators.volume || []

    const chartData: ChartData[] = []

    for (let i = 0; i < timestamps.length; i++) {
      // Skip null/undefined values
      if (opens[i] != null && highs[i] != null && lows[i] != null && closes[i] != null) {
        chartData.push({
          timestamp: timestamps[i] * 1000, // Convert to milliseconds
          open: Math.round(opens[i] * 100) / 100,
          high: Math.round(highs[i] * 100) / 100,
          low: Math.round(lows[i] * 100) / 100,
          close: Math.round(closes[i] * 100) / 100,
          volume: volumes[i] || 0,
        })
      }
    }

    return chartData
  } catch (error) {
    console.error("Error parsing chart data:", error)
    return []
  }
}

// Enhanced simulation with realistic patterns
function generateEnhancedChartData(symbol: string, interval: string, range: string): ChartData[] {
  const data: ChartData[] = []

  // Base prices for different stocks
  const basePrices: { [key: string]: number } = {
    "RELIANCE.NS": 2387.5,
    "TCS.NS": 3456.75,
    "HDFCBANK.NS": 1678.9,
    "INFY.NS": 1456.25,
    "ICICIBANK.NS": 1089.6,
    "BHARTIARTL.NS": 1234.8,
    "ITC.NS": 456.75,
    "SBIN.NS": 678.9,
    "LT.NS": 3234.5,
    "HCLTECH.NS": 1567.25,
  }

  const basePrice = basePrices[symbol] || 1000
  let currentPrice = basePrice
  const now = Date.now()

  // Determine number of data points and time interval
  let dataPoints = 78 // Default for 1 day
  let timeStep = 5 * 60 * 1000 // 5 minutes

  switch (range) {
    case "1d":
      dataPoints = 78
      timeStep = 5 * 60 * 1000
      break
    case "5d":
      dataPoints = 390
      timeStep = 60 * 1000
      break
    case "1mo":
      dataPoints = 30
      timeStep = 24 * 60 * 60 * 1000
      break
    case "3mo":
      dataPoints = 90
      timeStep = 24 * 60 * 60 * 1000
      break
    case "6mo":
      dataPoints = 180
      timeStep = 24 * 60 * 60 * 1000
      break
    case "1y":
      dataPoints = 365
      timeStep = 24 * 60 * 60 * 1000
      break
  }

  // Generate realistic price movements
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i) * timeStep
    const volatility = basePrice * (0.001 + Math.random() * 0.002) // 0.1% to 0.3% volatility

    const open = currentPrice

    // Add some trend and mean reversion
    const trendFactor = Math.sin((i / dataPoints) * Math.PI * 2) * 0.3
    const randomFactor = (Math.random() - 0.5) * 2
    const meanReversionFactor = ((basePrice - currentPrice) / basePrice) * 0.1

    const totalFactor = trendFactor + randomFactor + meanReversionFactor
    const priceChange = volatility * totalFactor

    const close = Math.max(basePrice * 0.9, Math.min(basePrice * 1.1, open + priceChange))

    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5

    // Realistic volume patterns
    const baseVolume = 1000000
    const volumeVariation = Math.random() * 0.8 + 0.6 // 60% to 140% of base
    const volume = Math.floor(baseVolume * volumeVariation)

    data.push({
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    })

    currentPrice = close
  }

  return data
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const interval = searchParams.get("interval") || "5m"
    const range = searchParams.get("range") || "1d"

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
      const simulatedData = generateEnhancedChartData(symbol, interval, range)
      return NextResponse.json({
        success: true,
        data: simulatedData,
        symbol,
        interval,
        range,
        timestamp: Date.now(),
        source: "Enhanced Simulation (Rate Limited)",
        dataPoints: simulatedData.length,
        rateLimited: true,
      })
    }

    // Try to fetch real data with timeout
    const timeoutPromise = new Promise<ChartData[]>((_, reject) =>
      setTimeout(() => reject(new Error("Chart request timeout")), 10000),
    )

    const dataPromise = fetchRealChartData(symbol, interval, range)

    try {
      const realData = await Promise.race([dataPromise, timeoutPromise])

      if (realData.length > 0) {
        return NextResponse.json({
          success: true,
          data: realData,
          symbol,
          interval,
          range,
          timestamp: Date.now(),
          source: "Yahoo Finance API",
          dataPoints: realData.length,
        })
      }
    } catch (error) {
      console.warn(`Yahoo Finance chart API failed for ${symbol}:`, error)
    }

    // Fallback to enhanced simulation
    const simulatedData = generateEnhancedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      data: simulatedData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
      source: "Enhanced Simulation (API Unavailable)",
      dataPoints: simulatedData.length,
    })
  } catch (error) {
    console.error("Error in yahoo-chart route:", error)

    // Always return some data, even on complete failure
    const symbol = new URL(request.url).searchParams.get("symbol") || "RELIANCE.NS"
    const interval = new URL(request.url).searchParams.get("interval") || "5m"
    const range = new URL(request.url).searchParams.get("range") || "1d"

    const simulatedData = generateEnhancedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      data: simulatedData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
      source: "Fallback Simulation (Error)",
      dataPoints: simulatedData.length,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
