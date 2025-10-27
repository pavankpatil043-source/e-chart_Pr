import { type NextRequest, NextResponse } from "next/server"
import { AbortSignal } from "abort-controller"

// Function to convert Indian stock symbols to proper Yahoo Finance format
function convertToYahooSymbol(symbol: string): string {
  // Remove any existing suffixes and prefixes
  const cleanSymbol = symbol
    .replace(/\.(NS|BO)$/i, "")
    .replace(/^(NSE|BSE):/i, "")
    .toUpperCase()

  // Yahoo Finance uses .NS for NSE stocks and .BO for BSE stocks
  return `${cleanSymbol}.NS`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    const yahooSymbol = convertToYahooSymbol(symbol)
    console.log(`Fetching data for symbol: ${symbol} -> Yahoo format: ${yahooSymbol}`)

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      },
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status} ${response.statusText}`)
      console.warn(`API error for ${yahooSymbol}, falling back to mock data`)
      return getMockIndianStockData(symbol)
    }

    const data = await response.json()
    console.log(`Received data for ${yahooSymbol}:`, data)

    const result = data?.chart?.result?.[0]
    if (!result || !result.meta) {
      console.error(`Invalid or empty response from Yahoo Finance API for ${yahooSymbol}:`, data)
      console.warn("Response validation failed, using mock data")
      return getMockIndianStockData(symbol)
    }

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.previousClose || currentPrice
    const dayHigh = meta.regularMarketDayHigh || currentPrice
    const dayLow = meta.regularMarketDayLow || currentPrice
    const volume = meta.regularMarketVolume || 0

    // Return live stock data in Yahoo Finance format
    return NextResponse.json({
      c: currentPrice, // Current price
      h: dayHigh, // High price of the day
      l: dayLow, // Low price of the day
      o: meta.regularMarketOpen || currentPrice, // Open price of the day
      pc: previousClose, // Previous close price
      v: volume, // Volume
      t: Math.floor(Date.now() / 1000), // Current timestamp
      symbol: symbol, // Original symbol
      yahooSymbol: yahooSymbol, // Yahoo format symbol
      marketCap: meta.marketCap || null,
      currency: meta.currency || "INR",
    })
  } catch (error) {
    console.error("Error fetching stock data:", error)
    console.warn(`Error fetching ${symbol}, using mock data`)
    return getMockIndianStockData(symbol)
  }
}

function getMockIndianStockData(symbol: string) {
  const cleanSymbol = symbol
    .replace(/\.(NS|BO)$/i, "")
    .replace(/^(NSE|BSE):/i, "")
    .toUpperCase()

  const priceRanges: { [key: string]: { min: number; max: number } } = {
    RELIANCE: { min: 2800, max: 3200 },
    TCS: { min: 3800, max: 4200 },
    HDFCBANK: { min: 1600, max: 1800 },
    INFY: { min: 1700, max: 1900 },
    HINDUNILVR: { min: 2600, max: 2800 },
    ICICIBANK: { min: 1100, max: 1300 },
    BHARTIARTL: { min: 1500, max: 1700 },
    ITC: { min: 450, max: 500 },
    SBIN: { min: 750, max: 850 },
    LT: { min: 3400, max: 3800 },
  }

  const range = priceRanges[cleanSymbol] || { min: 100, max: 500 }
  const mockPrice = range.min + Math.random() * (range.max - range.min)
  const mockOpen = mockPrice * (0.98 + Math.random() * 0.04) // ±2% from current
  const mockHigh = Math.max(mockPrice, mockOpen) * (1 + Math.random() * 0.02) // Up to 2% higher
  const mockLow = Math.min(mockPrice, mockOpen) * (0.98 + Math.random() * 0.02) // Up to 2% lower
  const mockPrevClose = mockOpen * (0.99 + Math.random() * 0.02) // ±1% from open

  return NextResponse.json({
    c: Number.parseFloat(mockPrice.toFixed(2)), // Current price
    h: Number.parseFloat(mockHigh.toFixed(2)), // High price of the day
    l: Number.parseFloat(mockLow.toFixed(2)), // Low price of the day
    o: Number.parseFloat(mockOpen.toFixed(2)), // Open price of the day
    pc: Number.parseFloat(mockPrevClose.toFixed(2)), // Previous close price
    t: Math.floor(Date.now() / 1000), // Current timestamp
    mock: true, // Indicate this is mock data
    symbol: symbol, // Original symbol
  })
}
