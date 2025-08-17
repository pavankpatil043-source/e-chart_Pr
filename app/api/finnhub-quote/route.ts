import { type NextRequest, NextResponse } from "next/server"

// Finnhub API configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "demo"
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

// Rate limiting and caching
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const cacheMap = new Map<string, { data: any; timestamp: number }>()

function checkRateLimit(ip: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `finnhub-${ip}`

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

function getCachedData(key: string, maxAge = 30000): any | null {
  const cached = cacheMap.get(key)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() })
}

async function fetchFinnhubQuote(symbol: string): Promise<any> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      },
    )

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.c && data.c > 0) {
      return {
        symbol: symbol.replace(".NS", "").replace(".BO", ""),
        price: data.c, // Current price
        change: data.d, // Change
        changePercent: data.dp, // Change percent
        high: data.h, // High price of the day
        low: data.l, // Low price of the day
        open: data.o, // Open price of the day
        previousClose: data.pc, // Previous close price
        timestamp: Date.now(),
        source: "Finnhub API",
      }
    }

    throw new Error("Invalid data from Finnhub")
  } catch (error) {
    console.error(`Finnhub API error for ${symbol}:`, error)
    throw error
  }
}

// Enhanced fallback data for Indian stocks
function generateRealisticQuote(symbol: string) {
  const indianStocks: { [key: string]: any } = {
    "RELIANCE.NS": { price: 2456.75, name: "Reliance Industries Limited", sector: "Oil & Gas" },
    "TCS.NS": { price: 3789.2, name: "Tata Consultancy Services Limited", sector: "IT Services" },
    "HDFCBANK.NS": { price: 1678.9, name: "HDFC Bank Limited", sector: "Banking" },
    "INFY.NS": { price: 1456.3, name: "Infosys Limited", sector: "IT Services" },
    "ICICIBANK.NS": { price: 1234.5, name: "ICICI Bank Limited", sector: "Banking" },
    "BHARTIARTL.NS": { price: 987.65, name: "Bharti Airtel Limited", sector: "Telecom" },
    "ITC.NS": { price: 456.78, name: "ITC Limited", sector: "FMCG" },
    "SBIN.NS": { price: 678.9, name: "State Bank of India", sector: "Banking" },
    "LT.NS": { price: 3456.78, name: "Larsen & Toubro Limited", sector: "Construction" },
    "HCLTECH.NS": { price: 1567.89, name: "HCL Technologies Limited", sector: "IT Services" },
    "ASIANPAINT.NS": { price: 3234.56, name: "Asian Paints Limited", sector: "Paints" },
    "MARUTI.NS": { price: 9876.54, name: "Maruti Suzuki India Limited", sector: "Automobile" },
    "KOTAKBANK.NS": { price: 1789.23, name: "Kotak Mahindra Bank Limited", sector: "Banking" },
    "AXISBANK.NS": { price: 1098.76, name: "Axis Bank Limited", sector: "Banking" },
    "WIPRO.NS": { price: 567.89, name: "Wipro Limited", sector: "IT Services" },
    "NESTLEIND.NS": { price: 2345.67, name: "Nestle India Limited", sector: "FMCG" },
    "HINDUNILVR.NS": { price: 2678.9, name: "Hindustan Unilever Limited", sector: "FMCG" },
    "BAJFINANCE.NS": { price: 7890.12, name: "Bajaj Finance Limited", sector: "NBFC" },
    "TATASTEEL.NS": { price: 134.56, name: "Tata Steel Limited", sector: "Steel" },
    "SUNPHARMA.NS": { price: 1123.45, name: "Sun Pharmaceutical Industries Limited", sector: "Pharma" },
  }

  const base = indianStocks[symbol] || {
    price: 1000 + Math.random() * 2000,
    name: "Unknown Company",
    sector: "Unknown",
  }

  const volatility = (Math.random() - 0.5) * 0.06 // -3% to +3%
  const price = base.price * (1 + volatility)
  const change = base.price * volatility
  const changePercent = volatility * 100

  return {
    symbol: symbol.replace(".NS", "").replace(".BO", ""),
    price: Number.parseFloat(price.toFixed(2)),
    change: Number.parseFloat(change.toFixed(2)),
    changePercent: Number.parseFloat(changePercent.toFixed(2)),
    high: Number.parseFloat((price * 1.025).toFixed(2)),
    low: Number.parseFloat((price * 0.975).toFixed(2)),
    open: Number.parseFloat((price * 0.998).toFixed(2)),
    previousClose: Number.parseFloat((price - change).toFixed(2)),
    companyName: base.name,
    sector: base.sector,
    volume: Math.floor(Math.random() * 10000000) + 100000,
    marketCap: Math.floor(Math.random() * 500000000000) + 50000000000,
    timestamp: Date.now(),
    source: "Enhanced Simulation",
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol parameter is required",
        },
        { status: 400 },
      )
    }

    // Check rate limit
    if (!checkRateLimit(ip)) {
      const fallbackData = generateRealisticQuote(symbol)
      return NextResponse.json({
        success: true,
        data: fallbackData,
        rateLimited: true,
        message: "Rate limited - using simulation",
        timestamp: Date.now(),
      })
    }

    // Check cache first
    const cacheKey = `quote-${symbol}`
    const cachedData = getCachedData(cacheKey, 30000) // 30 second cache

    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: Date.now(),
      })
    }

    try {
      // Try Finnhub API first
      const finnhubData = await fetchFinnhubQuote(symbol)

      // Cache successful response
      setCachedData(cacheKey, finnhubData)

      return NextResponse.json({
        success: true,
        data: finnhubData,
        cached: false,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`Finnhub API failed for ${symbol}:`, error)

      // Fallback to realistic simulation
      const fallbackData = generateRealisticQuote(symbol)
      setCachedData(cacheKey, fallbackData)

      return NextResponse.json({
        success: true,
        data: fallbackData,
        fallback: true,
        error: error instanceof Error ? error.message : "API unavailable",
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    console.error("Error in finnhub-quote API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
