import { NextResponse } from "next/server"

interface StockQuote {
  symbol: string
  companyName: string
  price: number
  lastPrice: number
  change: number
  pChange: number
  volume: number
  marketCap: number
  peRatio: number
  dayHigh: number
  dayLow: number
  open: number
  previousClose: number
  lastUpdateTime: string
}

// Cache for API responses to avoid rate limiting
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds cache

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10

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

// Enhanced Yahoo Finance API integration with better error handling
async function fetchRealYahooData(symbol: string): Promise<StockQuote | null> {
  try {
    const cacheKey = `yahoo-${symbol}`
    const cached = apiCache.get(cacheKey)

    // Return cached data if available and fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return parseYahooData(cached.data, symbol)
    }

    const yahooSymbol = symbol.includes(".NS") ? symbol : `${symbol}.NS`

    // Try multiple Yahoo Finance endpoints
    const endpoints = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
      `https://finance.yahoo.com/quote/${yahooSymbol}/history`,
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
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Rate limited by Yahoo Finance")
          }
          if (response.status === 404) {
            throw new Error(`Symbol ${symbol} not found`)
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
          throw new Error("No data returned from Yahoo Finance")
        }

        // Cache successful response
        apiCache.set(cacheKey, { data, timestamp: Date.now() })

        return parseYahooData(data, symbol)
      } catch (error) {
        lastError = error as Error
        console.warn(`Failed to fetch from ${url}:`, error)

        // If rate limited, wait before trying next endpoint
        if (error instanceof Error && error.message.includes("Rate limit")) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        continue
      }
    }

    throw lastError || new Error("All Yahoo Finance endpoints failed")
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error)
    return null
  }
}

function parseYahooData(data: any, symbol: string): StockQuote | null {
  try {
    const result = data.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0

    return {
      symbol: symbol.replace(".NS", ""),
      companyName: meta.longName || meta.shortName || symbol.replace(".NS", ""),
      price: Math.round(currentPrice * 100) / 100,
      lastPrice: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      peRatio: meta.trailingPE || 0,
      dayHigh: meta.regularMarketDayHigh || currentPrice,
      dayLow: meta.regularMarketDayLow || currentPrice,
      open: meta.regularMarketOpen || currentPrice,
      previousClose: previousClose,
      lastUpdateTime: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error parsing Yahoo data:", error)
    return null
  }
}

// Enhanced fallback with realistic Indian stock data
const INDIAN_STOCK_DATA: Record<string, Partial<StockQuote>> = {
  "RELIANCE.NS": {
    companyName: "Reliance Industries Ltd",
    price: 2387.5,
    volume: 2500000,
    marketCap: 1612000000000,
    peRatio: 24.5,
    open: 2380.0,
    previousClose: 2375.25,
  },
  "TCS.NS": {
    companyName: "Tata Consultancy Services Ltd",
    price: 3456.75,
    volume: 1800000,
    marketCap: 1256000000000,
    peRatio: 28.3,
    open: 3450.0,
    previousClose: 3445.5,
  },
  "HDFCBANK.NS": {
    companyName: "HDFC Bank Ltd",
    price: 1678.9,
    volume: 3200000,
    marketCap: 1278000000000,
    peRatio: 19.8,
    open: 1675.0,
    previousClose: 1672.3,
  },
  "INFY.NS": {
    companyName: "Infosys Ltd",
    price: 1456.25,
    volume: 2100000,
    marketCap: 612000000000,
    peRatio: 26.7,
    open: 1452.0,
    previousClose: 1448.75,
  },
  "ICICIBANK.NS": {
    companyName: "ICICI Bank Ltd",
    price: 1089.6,
    volume: 2800000,
    marketCap: 765000000000,
    peRatio: 17.2,
    open: 1085.0,
    previousClose: 1082.45,
  },
  "BHARTIARTL.NS": {
    companyName: "Bharti Airtel Ltd",
    price: 1234.8,
    volume: 1900000,
    marketCap: 678000000000,
    peRatio: 22.1,
    open: 1230.0,
    previousClose: 1228.9,
  },
  "ITC.NS": {
    companyName: "ITC Ltd",
    price: 456.75,
    volume: 4500000,
    marketCap: 567000000000,
    peRatio: 31.5,
    open: 455.0,
    previousClose: 454.2,
  },
  "SBIN.NS": {
    companyName: "State Bank of India",
    price: 678.9,
    volume: 3500000,
    marketCap: 605000000000,
    peRatio: 12.8,
    open: 675.0,
    previousClose: 673.45,
  },
  "LT.NS": {
    companyName: "Larsen & Toubro Ltd",
    price: 3234.5,
    volume: 1200000,
    marketCap: 456000000000,
    peRatio: 35.2,
    open: 3230.0,
    previousClose: 3225.75,
  },
  "HCLTECH.NS": {
    companyName: "HCL Technologies Ltd",
    price: 1567.25,
    volume: 1600000,
    marketCap: 425000000000,
    peRatio: 24.8,
    open: 1565.0,
    previousClose: 1562.8,
  },
}

// Enhanced simulation with persistence
const stockStorage = new Map<
  string,
  {
    baseData: StockQuote
    lastUpdate: number
    trend: number
    volatility: number
  }
>()

function generateEnhancedLivePrice(symbol: string): StockQuote {
  if (!stockStorage.has(symbol)) {
    const baseStock = INDIAN_STOCK_DATA[symbol] || {
      companyName: "Unknown Company",
      price: 1000,
      volume: 1000000,
      marketCap: 100000000000,
      peRatio: 20,
      open: 1000,
      previousClose: 995,
    }

    const initialStock: StockQuote = {
      symbol: symbol.replace(".NS", ""),
      companyName: baseStock.companyName!,
      price: baseStock.price!,
      lastPrice: baseStock.price!,
      change: baseStock.price! - baseStock.previousClose!,
      pChange: ((baseStock.price! - baseStock.previousClose!) / baseStock.previousClose!) * 100,
      volume: baseStock.volume!,
      marketCap: baseStock.marketCap!,
      peRatio: baseStock.peRatio!,
      dayHigh: baseStock.price! * 1.02,
      dayLow: baseStock.price! * 0.98,
      open: baseStock.open!,
      previousClose: baseStock.previousClose!,
      lastUpdateTime: new Date().toISOString(),
    }

    stockStorage.set(symbol, {
      baseData: initialStock,
      lastUpdate: Date.now(),
      trend: Math.random() > 0.5 ? 1 : -1,
      volatility: 0.001 + Math.random() * 0.002, // 0.1% to 0.3% volatility
    })
  }

  const stored = stockStorage.get(symbol)!
  const now = Date.now()
  const timeDiff = now - stored.lastUpdate

  // Enhanced price movement simulation
  const marketHours = new Date().getHours()
  const isMarketOpen = marketHours >= 9 && marketHours <= 15 // Indian market hours
  const marketFactor = isMarketOpen ? 1 : 0.3 // Reduced movement after hours

  const randomFactor = (Math.random() - 0.5) * 2
  const trendFactor = stored.trend * 0.4
  const timeDecay = Math.min(timeDiff / (1000 * 30), 1) // Max 30 second effect

  const priceChange =
    stored.baseData.price * stored.volatility * (randomFactor + trendFactor) * timeDecay * marketFactor

  const newPrice = Math.max(
    stored.baseData.price + priceChange,
    stored.baseData.previousClose * 0.95, // 5% circuit breaker
  )

  // Update high/low for the day
  const dayHigh = Math.max(stored.baseData.dayHigh, newPrice)
  const dayLow = Math.min(stored.baseData.dayLow, newPrice)

  // Volume simulation with realistic patterns
  const volumeIncrease = Math.floor(Math.random() * 50000) + 1000
  const newVolume = stored.baseData.volume + volumeIncrease

  const updatedStock: StockQuote = {
    ...stored.baseData,
    price: Math.round(newPrice * 100) / 100,
    lastPrice: Math.round(newPrice * 100) / 100,
    change: Math.round((newPrice - stored.baseData.previousClose) * 100) / 100,
    pChange: Math.round(((newPrice - stored.baseData.previousClose) / stored.baseData.previousClose) * 10000) / 100,
    dayHigh: Math.round(dayHigh * 100) / 100,
    dayLow: Math.round(dayLow * 100) / 100,
    volume: newVolume,
    lastUpdateTime: new Date().toISOString(),
  }

  // Update trend and volatility
  const newTrend = stored.trend * 0.9 + (priceChange > 0 ? 0.1 : -0.1)
  const newVolatility = Math.max(0.0005, Math.min(0.005, stored.volatility + (Math.random() - 0.5) * 0.0001))

  stockStorage.set(symbol, {
    baseData: updatedStock,
    lastUpdate: now,
    trend: Math.max(-1, Math.min(1, newTrend)),
    volatility: newVolatility,
  })

  return updatedStock
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")

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
    if (isRateLimited(clientIP)) {
      // Return cached/simulated data when rate limited
      const quote = generateEnhancedLivePrice(symbol)
      return NextResponse.json({
        success: true,
        quote,
        timestamp: Date.now(),
        source: "Simulated Data (Rate Limited)",
        marketStatus: "OPEN",
        rateLimited: true,
      })
    }

    // Try to fetch real data with timeout
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 8000),
    )

    const dataPromise = fetchRealYahooData(symbol)

    try {
      const realData = await Promise.race([dataPromise, timeoutPromise])

      if (realData) {
        return NextResponse.json({
          success: true,
          quote: realData,
          timestamp: Date.now(),
          source: "Yahoo Finance API",
          marketStatus: "OPEN",
        })
      }
    } catch (error) {
      console.warn(`Yahoo Finance API failed for ${symbol}:`, error)
    }

    // Fallback to enhanced simulation
    const quote = generateEnhancedLivePrice(symbol)

    return NextResponse.json({
      success: true,
      quote,
      timestamp: Date.now(),
      source: "Enhanced Simulation (API Unavailable)",
      marketStatus: "OPEN",
    })
  } catch (error) {
    console.error("Error in yahoo-quote route:", error)

    // Always return some data, even on complete failure
    const symbol = new URL(request.url).searchParams.get("symbol") || "RELIANCE.NS"
    const quote = generateEnhancedLivePrice(symbol)

    return NextResponse.json({
      success: true,
      quote,
      timestamp: Date.now(),
      source: "Fallback Simulation (Error)",
      marketStatus: "OPEN",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
