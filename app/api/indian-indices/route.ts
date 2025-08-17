import { NextResponse } from "next/server"

interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  pChange: number
  isPositive: boolean
  lastUpdate: number
  source: string
}

// Cache for API responses to avoid rate limiting
const indicesCache = new Map<string, { data: MarketIndex[]; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 minute cache for indices

// Rate limiting for indices API
const indicesRateLimitMap = new Map<string, { count: number; resetTime: number }>()
const INDICES_RATE_LIMIT_WINDOW = 120000 // 2 minutes
const MAX_INDICES_REQUESTS_PER_WINDOW = 5

function isIndicesRateLimited(ip: string): boolean {
  const now = Date.now()
  const rateLimitData = indicesRateLimitMap.get(ip)

  if (!rateLimitData || now > rateLimitData.resetTime) {
    indicesRateLimitMap.set(ip, { count: 1, resetTime: now + INDICES_RATE_LIMIT_WINDOW })
    return false
  }

  if (rateLimitData.count >= MAX_INDICES_REQUESTS_PER_WINDOW) {
    return true
  }

  rateLimitData.count++
  return false
}

// Enhanced NSE indices data fetching with comprehensive error handling
async function fetchRealIndicesData(): Promise<MarketIndex[]> {
  try {
    // Check cache first
    const cached = indicesCache.get("indices")
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }

    const indices = [
      { symbol: "NIFTY", yahooSymbol: "^NSEI", name: "Nifty 50" },
      { symbol: "BANKNIFTY", yahooSymbol: "^NSEBANK", name: "Bank Nifty" },
      { symbol: "FINNIFTY", yahooSymbol: "^CNXFIN", name: "Fin Nifty" },
      { symbol: "SENSEX", yahooSymbol: "^BSESN", name: "Sensex" },
    ]

    const results: MarketIndex[] = []
    const fetchPromises: Promise<MarketIndex | null>[] = []

    // Create promises for all indices with staggered delays
    indices.forEach((index, i) => {
      const promise = new Promise<MarketIndex | null>((resolve) => {
        setTimeout(async () => {
          try {
            const result = await fetchSingleIndex(index.symbol, index.yahooSymbol, index.name)
            resolve(result)
          } catch (error) {
            console.warn(`Failed to fetch ${index.symbol}:`, error)
            resolve(null)
          }
        }, i * 500) // 500ms delay between requests
      })
      fetchPromises.push(promise)
    })

    // Wait for all promises with timeout
    const timeoutPromise = new Promise<(MarketIndex | null)[]>((_, reject) =>
      setTimeout(() => reject(new Error("Indices fetch timeout")), 15000),
    )

    try {
      const indexResults = await Promise.race([Promise.all(fetchPromises), timeoutPromise])

      // Filter out null results
      const validResults = indexResults.filter((result): result is MarketIndex => result !== null)

      if (validResults.length > 0) {
        // Cache successful results
        indicesCache.set("indices", { data: validResults, timestamp: Date.now() })
        return validResults
      }
    } catch (error) {
      console.error("Error fetching indices with timeout:", error)
    }

    return []
  } catch (error) {
    console.error("Error in fetchRealIndicesData:", error)
    return []
  }
}

async function fetchSingleIndex(symbol: string, yahooSymbol: string, name: string): Promise<MarketIndex | null> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbol}`,
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
        signal: AbortSignal.timeout(8000), // 8 second timeout
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limited by Yahoo Finance")
        }
        if (response.status === 404) {
          throw new Error(`Index ${symbol} not found`)
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

      // Parse the response based on endpoint type
      if (url.includes("/chart/")) {
        return parseChartData(data, symbol, name)
      } else if (url.includes("/quote")) {
        return parseQuoteData(data, symbol, name)
      }

      return null
    } catch (error) {
      lastError = error as Error
      console.warn(`Failed to fetch ${symbol} from ${url}:`, error)

      // If rate limited, wait before trying next endpoint
      if (error instanceof Error && error.message.includes("Rate limit")) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }

      continue
    }
  }

  throw lastError || new Error(`All endpoints failed for ${symbol}`)
}

function parseChartData(data: any, symbol: string, name: string): MarketIndex | null {
  try {
    const result = data.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0

    return {
      symbol,
      name,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      isPositive: change >= 0,
      lastUpdate: Date.now(),
      source: "Yahoo Finance API",
    }
  } catch (error) {
    console.error(`Error parsing chart data for ${symbol}:`, error)
    return null
  }
}

function parseQuoteData(data: any, symbol: string, name: string): MarketIndex | null {
  try {
    const quote = data.quoteResponse?.result?.[0]
    if (!quote) return null

    const currentPrice = quote.regularMarketPrice || quote.previousClose || 0
    const previousClose = quote.previousClose || currentPrice
    const change = quote.regularMarketChange || currentPrice - previousClose
    const changePercent = quote.regularMarketChangePercent || (change / previousClose) * 100

    return {
      symbol,
      name,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      isPositive: change >= 0,
      lastUpdate: Date.now(),
      source: "Yahoo Finance API",
    }
  } catch (error) {
    console.error(`Error parsing quote data for ${symbol}:`, error)
    return null
  }
}

// Enhanced simulation with realistic Indian market data
const INDIAN_INDICES_BASE_DATA = {
  NIFTY: { basePrice: 24781.1, volatility: 0.008, trend: 0.2 },
  BANKNIFTY: { basePrice: 51667.75, volatility: 0.012, trend: -0.1 },
  FINNIFTY: { basePrice: 23456.8, volatility: 0.01, trend: 0.3 },
  SENSEX: { basePrice: 82365.77, volatility: 0.007, trend: 0.15 },
}

const indicesSimulationStorage = new Map<
  string,
  {
    price: number
    lastUpdate: number
    trend: number
    volatility: number
    dayChange: number
  }
>()

function generateEnhancedIndicesData(): MarketIndex[] {
  const indices = [
    { symbol: "NIFTY", name: "Nifty 50" },
    { symbol: "BANKNIFTY", name: "Bank Nifty" },
    { symbol: "FINNIFTY", name: "Fin Nifty" },
    { symbol: "SENSEX", name: "Sensex" },
  ]

  return indices.map((index) => {
    const baseData = INDIAN_INDICES_BASE_DATA[index.symbol as keyof typeof INDIAN_INDICES_BASE_DATA]

    if (!indicesSimulationStorage.has(index.symbol)) {
      indicesSimulationStorage.set(index.symbol, {
        price: baseData.basePrice,
        lastUpdate: Date.now(),
        trend: baseData.trend,
        volatility: baseData.volatility,
        dayChange: 0,
      })
    }

    const stored = indicesSimulationStorage.get(index.symbol)!
    const now = Date.now()
    const timeDiff = now - stored.lastUpdate

    // Enhanced market simulation
    const marketHours = new Date().getHours()
    const isMarketOpen = marketHours >= 9 && marketHours <= 15 // Indian market hours
    const marketFactor = isMarketOpen ? 1 : 0.2

    // More sophisticated price movement
    const randomFactor = (Math.random() - 0.5) * 2
    const trendFactor = stored.trend * 0.6
    const meanReversion = stored.dayChange * -0.1 // Tendency to revert
    const timeDecay = Math.min(timeDiff / (1000 * 60), 1) // Max 1 minute effect

    const priceChange =
      stored.price * stored.volatility * (randomFactor + trendFactor + meanReversion) * timeDecay * marketFactor

    const newPrice = Math.max(stored.price + priceChange, baseData.basePrice * 0.95)
    const newDayChange = stored.dayChange + priceChange
    const changePercent = (newDayChange / baseData.basePrice) * 100

    // Update trend occasionally
    if (Math.random() < 0.03) {
      stored.trend = stored.trend * 0.8 + (Math.random() - 0.5) * 0.4
      stored.trend = Math.max(-1, Math.min(1, stored.trend))
    }

    // Update volatility based on market conditions
    const newVolatility = Math.max(0.003, Math.min(0.02, stored.volatility + (Math.random() - 0.5) * 0.001))

    // Update storage
    indicesSimulationStorage.set(index.symbol, {
      price: newPrice,
      lastUpdate: now,
      trend: stored.trend,
      volatility: newVolatility,
      dayChange: newDayChange,
    })

    return {
      symbol: index.symbol,
      name: index.name,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(newDayChange * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      isPositive: newDayChange >= 0,
      lastUpdate: now,
      source: "Enhanced Simulation",
    }
  })
}

export async function GET(request: Request) {
  try {
    // Check rate limiting
    const clientIP = request.headers.get("x-forwarded-for") || "unknown"
    if (isIndicesRateLimited(clientIP)) {
      // Return simulated data when rate limited
      const simulatedData = generateEnhancedIndicesData()
      return NextResponse.json({
        success: true,
        indices: simulatedData,
        timestamp: Date.now(),
        source: "Enhanced Simulation (Rate Limited)",
        count: simulatedData.length,
        rateLimited: true,
      })
    }

    // Try to fetch real data with comprehensive error handling
    try {
      const realData = await fetchRealIndicesData()

      if (realData.length > 0) {
        return NextResponse.json({
          success: true,
          indices: realData,
          timestamp: Date.now(),
          source: "Yahoo Finance API",
          count: realData.length,
        })
      }
    } catch (error) {
      console.warn("Yahoo Finance API failed for indices:", error)
    }

    // Fallback to enhanced simulation
    const simulatedData = generateEnhancedIndicesData()

    return NextResponse.json({
      success: true,
      indices: simulatedData,
      timestamp: Date.now(),
      source: "Enhanced Simulation (API Unavailable)",
      count: simulatedData.length,
    })
  } catch (error) {
    console.error("Error in indian-indices route:", error)

    // Always return some data, even on complete failure
    const simulatedData = generateEnhancedIndicesData()

    return NextResponse.json({
      success: true,
      indices: simulatedData,
      timestamp: Date.now(),
      source: "Fallback Simulation (Error)",
      count: simulatedData.length,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
