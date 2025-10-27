import { type NextRequest, NextResponse } from "next/server"

interface NSEQuote {
  symbol: string
  companyName: string
  lastPrice: number
  change: number
  pChange: number
  previousClose: number
  open: number
  dayHigh: number
  dayLow: number
  totalTradedVolume: number
  totalTradedValue: number
  lastUpdateTime: string
  yearHigh: number
  yearLow: number
  perChange365d: number
  perChange30d: number
  marketCap: number
  pe: number
  pb: number
  dividend: number
}

// Base prices for realistic simulation
const BASE_PRICES: { [key: string]: number } = {
  RELIANCE: 2450.75,
  TCS: 3890.2,
  HDFCBANK: 1685.3,
  INFY: 1456.85,
  ITC: 462.15,
  SBIN: 598.4,
  BHARTIARTL: 912.65,
  KOTAKBANK: 1798.9,
  LT: 2856.75,
  ASIANPAINT: 3124.5,
  MARUTI: 9500.25,
  HCLTECH: 1234.6,
  AXISBANK: 1098.45,
  ICICIBANK: 945.8,
  WIPRO: 398.75,
  NESTLEIND: 2234.5,
  HINDUNILVR: 2567.3,
  BAJFINANCE: 6789.4,
  TATASTEEL: 134.6,
  SUNPHARMA: 1123.8,
}

const COMPANY_NAMES: { [key: string]: string } = {
  RELIANCE: "Reliance Industries Limited",
  TCS: "Tata Consultancy Services Limited",
  HDFCBANK: "HDFC Bank Limited",
  INFY: "Infosys Limited",
  ITC: "ITC Limited",
  SBIN: "State Bank of India",
  BHARTIARTL: "Bharti Airtel Limited",
  KOTAKBANK: "Kotak Mahindra Bank Limited",
  LT: "Larsen & Toubro Limited",
  ASIANPAINT: "Asian Paints Limited",
  MARUTI: "Maruti Suzuki India Limited",
  HCLTECH: "HCL Technologies Limited",
  AXISBANK: "Axis Bank Limited",
  ICICIBANK: "ICICI Bank Limited",
  WIPRO: "Wipro Limited",
  NESTLEIND: "Nestle India Limited",
  HINDUNILVR: "Hindustan Unilever Limited",
  BAJFINANCE: "Bajaj Finance Limited",
  TATASTEEL: "Tata Steel Limited",
  SUNPHARMA: "Sun Pharmaceutical Industries Limited",
}

// Store for maintaining price continuity
const priceStore = new Map<string, number>()

function generateRealtimeQuote(symbol: string): NSEQuote {
  const basePrice = BASE_PRICES[symbol] || 1000
  const companyName = COMPANY_NAMES[symbol] || `${symbol} Limited`

  // Get or initialize current price
  let currentPrice = priceStore.get(symbol)
  if (!currentPrice) {
    currentPrice = basePrice
    priceStore.set(symbol, currentPrice)
  }

  // Generate realistic price movement (smaller changes for continuity)
  const volatility = 0.005 // 0.5% max change per update
  const randomChange = (Math.random() - 0.5) * volatility
  const trendFactor = Math.sin(Date.now() / 100000) * 0.001 // Small trend component

  const newPrice = currentPrice * (1 + randomChange + trendFactor)
  priceStore.set(symbol, newPrice)

  const previousClose = basePrice
  const change = newPrice - previousClose
  const pChange = (change / previousClose) * 100

  // Generate other realistic values
  const open = previousClose * (1 + (Math.random() - 0.5) * 0.01)
  const dayHigh = Math.max(open, newPrice) * (1 + Math.random() * 0.015)
  const dayLow = Math.min(open, newPrice) * (1 - Math.random() * 0.015)

  const volume = Math.floor(Math.random() * 10000000) + 1000000
  const value = volume * newPrice

  const yearHigh = newPrice * (1.2 + Math.random() * 0.3)
  const yearLow = newPrice * (0.7 - Math.random() * 0.2)

  return {
    symbol,
    companyName,
    lastPrice: Number(newPrice.toFixed(2)),
    change: Number(change.toFixed(2)),
    pChange: Number(pChange.toFixed(2)),
    previousClose: Number(previousClose.toFixed(2)),
    open: Number(open.toFixed(2)),
    dayHigh: Number(dayHigh.toFixed(2)),
    dayLow: Number(dayLow.toFixed(2)),
    totalTradedVolume: volume,
    totalTradedValue: Number(value.toFixed(2)),
    lastUpdateTime: new Date().toISOString(),
    yearHigh: Number(yearHigh.toFixed(2)),
    yearLow: Number(yearLow.toFixed(2)),
    perChange365d: Number(((Math.random() - 0.3) * 50).toFixed(2)),
    perChange30d: Number(((Math.random() - 0.5) * 20).toFixed(2)),
    marketCap: Math.floor(newPrice * 100000000),
    pe: Number((15 + Math.random() * 20).toFixed(2)),
    pb: Number((1 + Math.random() * 4).toFixed(2)),
    dividend: Number((Math.random() * 5).toFixed(2)),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")?.toUpperCase()

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Symbol parameter is required",
        },
        { status: 400 },
      )
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 150))

    const quote = generateRealtimeQuote(symbol)

    return NextResponse.json({
      success: true,
      data: quote,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching NSE quote:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch NSE quote",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
