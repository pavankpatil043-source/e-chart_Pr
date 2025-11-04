import { type NextRequest, NextResponse } from "next/server"

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
const cacheMap = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 8000 // 8 second cache - balances freshness with rate limits (10s polling)

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
function checkRateLimit(ip: string, maxRequests = 15, windowMs = 120000): boolean {
  const now = Date.now()
  const key = `indices-${ip}`

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

// Enhanced simulation with realistic Indian market data
function generateSimulatedIndices() {
  const baseIndices = [
    { symbol: "NIFTY", name: "Nifty 50", basePrice: 24781.1, baseChange: 125.5 },
    { symbol: "BANKNIFTY", name: "Bank Nifty", basePrice: 51667.75, baseChange: -245.3 },
    { symbol: "FINNIFTY", name: "Fin Nifty", basePrice: 23456.8, baseChange: 89.75 },
    { symbol: "SENSEX", name: "Sensex", basePrice: 82365.77, baseChange: 156.8 },
    { symbol: "MIDCPNIFTY", name: "Midcap Nifty", basePrice: 12456.32, baseChange: 45.2 },
    { symbol: "SMLCPNIFTY", name: "Smallcap Nifty", basePrice: 8765.43, baseChange: -23.1 },
  ]

  return baseIndices.map((index) => {
    // Add realistic volatility
    const volatility = Math.random() * 0.02 - 0.01 // -1% to +1%
    const price = index.basePrice * (1 + volatility)
    const change = index.baseChange + (Math.random() - 0.5) * 50
    const pChange = (change / (price - change)) * 100

    return {
      symbol: index.symbol,
      name: index.name,
      price: Number.parseFloat(price.toFixed(2)),
      change: Number.parseFloat(change.toFixed(2)),
      pChange: Number.parseFloat(pChange.toFixed(2)),
      isPositive: change >= 0,
      lastUpdate: Date.now(),
      source: "Enhanced Simulation",
    }
  })
}

// Fetch real data with enhanced error handling
async function fetchRealIndicesData(): Promise<any[]> {
  const symbols = ["^NSEI", "^NSEBANK", "^CNXFIN", "^BSESN"]
  const results = []

  for (let i = 0; i < symbols.length; i++) {
    try {
      // Add delay between requests to avoid rate limiting
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbols[i]}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if response is ok and content-type is JSON
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
        const meta = result.meta
        const quote = result.indicators?.quote?.[0]

        if (meta && quote) {
          const current = meta.regularMarketPrice || quote.close?.[quote.close.length - 1]
          const previous = meta.previousClose || meta.chartPreviousClose
          const change = current - previous
          const changePercent = (change / previous) * 100

          results.push({
            symbol: symbols[i].replace("^", ""),
            name: getIndexName(symbols[i]),
            price: Number.parseFloat(current.toFixed(2)),
            change: Number.parseFloat(change.toFixed(2)),
            pChange: Number.parseFloat(changePercent.toFixed(2)),
            isPositive: change >= 0,
            lastUpdate: Date.now(),
            source: "Yahoo Finance API",
          })
        }
      }
    } catch (error) {
      console.error(`Error fetching ${symbols[i]}:`, error)
      // Continue with next symbol instead of failing completely
    }
  }

  return results
}

function getIndexName(symbol: string): string {
  const names: { [key: string]: string } = {
    "^NSEI": "Nifty 50",
    "^NSEBANK": "Bank Nifty",
    "^CNXFIN": "Fin Nifty",
    "^BSESN": "Sensex",
  }
  return names[symbol] || symbol
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          indices: generateSimulatedIndices(), // Provide fallback data
        },
        { status: 429 },
      )
    }

    // Check cache first (8-second cache for 10s polling)
    const cacheKey = "indian-indices"
    const cachedData = getCachedData(cacheKey, 8000) // 8 second cache

    if (cachedData) {
      return NextResponse.json({
        success: true,
        indices: cachedData,
        cached: true,
        timestamp: Date.now(),
      })
    }

    // Try to fetch real data
    const realData = await fetchRealIndicesData()

    if (realData.length > 0) {
      // Cache the successful response
      setCachedData(cacheKey, realData)

      return NextResponse.json({
        success: true,
        indices: realData,
        cached: false,
        timestamp: Date.now(),
      })
    } else {
      // Fallback to simulation if no real data
      const simulatedData = generateSimulatedIndices()
      setCachedData(cacheKey, simulatedData)

      return NextResponse.json({
        success: true,
        indices: simulatedData,
        cached: false,
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    console.error("Error in indian-indices API:", error)

    // Always provide fallback data
    const fallbackData = generateSimulatedIndices()

    return NextResponse.json({
      success: true,
      indices: fallbackData,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    })
  }
}
