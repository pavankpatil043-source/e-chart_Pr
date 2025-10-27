import { type NextRequest, NextResponse } from "next/server"

interface IntradayData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

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

function generateIntradayData(symbol: string, interval: number): IntradayData[] {
  const data: IntradayData[] = []
  const basePrice = BASE_PRICES[symbol] || 1000
  let currentPrice = basePrice

  // Generate data for market hours (9:15 AM to 3:30 PM)
  const now = new Date()
  const marketStart = new Date(now)
  marketStart.setHours(9, 15, 0, 0)
  const marketEnd = new Date(now)
  marketEnd.setHours(15, 30, 0, 0)

  // If current time is before market start, use previous day
  if (now < marketStart) {
    marketStart.setDate(marketStart.getDate() - 1)
    marketEnd.setDate(marketEnd.getDate() - 1)
  }

  const totalMinutes = (marketEnd.getTime() - marketStart.getTime()) / (1000 * 60)
  const dataPoints = Math.floor(totalMinutes / interval)

  for (let i = 0; i < dataPoints; i++) {
    const time = new Date(marketStart.getTime() + i * interval * 60 * 1000)

    // Generate realistic price movement
    const volatility = 0.002 // 0.2% volatility per interval
    const randomFactor = (Math.random() - 0.5) * volatility
    const trendFactor = Math.sin(i / 20) * 0.0005 // Small trend component

    const open = currentPrice
    const change = open * (randomFactor + trendFactor)
    const close = open + change

    const high = Math.max(open, close) * (1 + Math.random() * 0.003)
    const low = Math.min(open, close) * (1 - Math.random() * 0.003)

    const volume = Math.floor(Math.random() * 100000) + 10000

    data.push({
      timestamp: Math.floor(time.getTime() / 1000),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    })

    currentPrice = close
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")?.toUpperCase()
    const interval = Number.parseInt(searchParams.get("interval") || "5") // minutes

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
    await new Promise((resolve) => setTimeout(resolve, 200))

    const intradayData = generateIntradayData(symbol, interval)

    return NextResponse.json({
      success: true,
      data: intradayData,
      symbol,
      interval,
      count: intradayData.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching intraday data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch intraday data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
