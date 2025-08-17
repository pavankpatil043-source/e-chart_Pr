import { type NextRequest, NextResponse } from "next/server"

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Cache storage
const cacheMap = new Map<string, { data: any; timestamp: number }>()

// Rate limiting function
function checkRateLimit(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `quote-${ip}`

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
function getCachedData(key: string, maxAge = 30000): any | null {
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

// Generate realistic simulation data
function generateSimulatedQuote(symbol: string) {
  const baseData: { [key: string]: any } = {
    "RELIANCE.NS": { price: 2456.75, name: "Reliance Industries Limited" },
    "TCS.NS": { price: 3789.2, name: "Tata Consultancy Services Limited" },
    "HDFCBANK.NS": { price: 1678.9, name: "HDFC Bank Limited" },
    "INFY.NS": { price: 1456.3, name: "Infosys Limited" },
    "ICICIBANK.NS": { price: 1234.5, name: "ICICI Bank Limited" },
    "BHARTIARTL.NS": { price: 987.65, name: "Bharti Airtel Limited" },
    "ITC.NS": { price: 456.78, name: "ITC Limited" },
    "SBIN.NS": { price: 678.9, name: "State Bank of India" },
    "LT.NS": { price: 3456.78, name: "Larsen & Toubro Limited" },
    "HCLTECH.NS": { price: 1567.89, name: "HCL Technologies Limited" },
  }

  const base = baseData[symbol] || { price: 1000 + Math.random() * 2000, name: "Unknown Company" }
  const volatility = (Math.random() - 0.5) * 0.04 // -2% to +2%
  const price = base.price * (1 + volatility)
  const change = base.price * volatility
  const changePercent = volatility * 100

  return {
    symbol: symbol.replace(".NS", ""),
    companyName: base.name,
    price: Number.parseFloat(price.toFixed(2)),
    change: Number.parseFloat(change.toFixed(2)),
    changePercent: Number.parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 10000000) + 100000,
    high: Number.parseFloat((price * 1.02).toFixed(2)),
    low: Number.parseFloat((price * 0.98).toFixed(2)),
    open: Number.parseFloat((price * 0.999).toFixed(2)),
    previousClose: Number.parseFloat((price - change).toFixed(2)),
    source: "Enhanced Simulation",
  }
}

// Fetch real Yahoo Finance data with multiple endpoints
async function fetchRealYahooData(symbol: string): Promise<any> {
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`,
    `https://finance.yahoo.com/quote/${symbol}/history`,
  ]

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Check content type
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        if (text.includes("Too Many Requests") || text.includes("Rate limit")) {
          throw new Error("Rate limited by Yahoo Finance")
        }
        throw new Error(`Invalid response format from ${endpoint}`)
      }

      const data = await response.json()

      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0]
        const meta = result.meta
        const quote = result.indicators?.quote?.[0]

        if (meta) {
          const current = meta.regularMarketPrice || meta.previousClose
          const previous = meta.previousClose || meta.chartPreviousClose
          const change = current - previous
          const changePercent = (change / previous) * 100

          return {
            symbol: symbol.replace(".NS", ""),
            companyName: meta.longName || meta.shortName || "Unknown Company",
            price: Number.parseFloat(current.toFixed(2)),
            change: Number.parseFloat(change.toFixed(2)),
            changePercent: Number.parseFloat(changePercent.toFixed(2)),
            volume: meta.regularMarketVolume || 0,
            high: meta.regularMarketDayHigh || current,
            low: meta.regularMarketDayLow || current,
            open: meta.regularMarketOpen || current,
            previousClose: previous,
            source: "Yahoo Finance API",
          }
        }
      }

      throw new Error("Invalid data structure from Yahoo Finance")
    } catch (error) {
      console.error(`Error with endpoint ${endpoint}:`, error)
      continue
    }
  }

  throw new Error("All Yahoo Finance endpoints failed")
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    if (!symbol) {
      return NextResponse.json({ success: false, error: "Symbol parameter is required" }, { status: 400 })
    }

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: true,
        data: generateSimulatedQuote(symbol),
        rateLimited: true,
        timestamp: Date.now(),
      })
    }

    // Check cache first
    const cacheKey = `quote-${symbol}`
    const cachedData = getCachedData(cacheKey)

    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: Date.now(),
      })
    }

    try {
      // Try to fetch real data
      const realData = await fetchRealYahooData(symbol)

      // Cache successful response
      setCachedData(cacheKey, realData)

      return NextResponse.json({
        success: true,
        data: realData,
        cached: false,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`Error fetching real data for ${symbol}:`, error)

      // Fallback to simulation
      const simulatedData = generateSimulatedQuote(symbol)
      setCachedData(cacheKey, simulatedData)

      return NextResponse.json({
        success: true,
        data: simulatedData,
        fallback: true,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    console.error("Error in yahoo-quote API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
