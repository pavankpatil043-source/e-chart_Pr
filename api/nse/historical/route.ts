import { type NextRequest, NextResponse } from "next/server"

interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover: number
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

function generateHistoricalData(symbol: string, days: number): HistoricalData[] {
  const data: HistoricalData[] = []
  const basePrice = BASE_PRICES[symbol] || 1000
  let currentPrice = basePrice

  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days)

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }

    // Generate realistic daily price movement
    const volatility = 0.02 // 2% daily volatility
    const randomChange = (Math.random() - 0.5) * volatility
    const trendFactor = Math.sin(i / 30) * 0.005 // Monthly trend cycle

    const open = currentPrice
    const change = open * (randomChange + trendFactor)
    const close = open + change

    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)

    const volume = Math.floor(Math.random() * 5000000) + 1000000
    const turnover = volume * ((open + close) / 2)

    data.push({
      date: date.toISOString().split("T")[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      turnover: Number(turnover.toFixed(2)),
    })

    currentPrice = close
  }

  return data.reverse() // Most recent first
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")?.toUpperCase()
    const days = Number.parseInt(searchParams.get("days") || "30")

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
    await new Promise((resolve) => setTimeout(resolve, 300))

    const historicalData = generateHistoricalData(symbol, days)

    return NextResponse.json({
      success: true,
      data: historicalData,
      symbol,
      days,
      count: historicalData.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch historical data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
