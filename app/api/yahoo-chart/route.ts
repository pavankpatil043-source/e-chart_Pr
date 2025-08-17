import { NextResponse } from "next/server"

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Real Yahoo Finance chart data fetching
async function fetchRealChartData(symbol: string, interval = "5m", range = "1d"): Promise<ChartData[]> {
  try {
    const yahooSymbol = symbol.includes(".NS") ? symbol : `${symbol}.NS`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]

    if (!result) {
      throw new Error("No chart data returned from Yahoo Finance")
    }

    const timestamps = result.timestamp || []
    const indicators = result.indicators?.quote?.[0] || {}
    const opens = indicators.open || []
    const highs = indicators.high || []
    const lows = indicators.low || []
    const closes = indicators.close || []
    const volumes = indicators.volume || []

    const chartData: ChartData[] = []

    for (let i = 0; i < timestamps.length; i++) {
      if (opens[i] && highs[i] && lows[i] && closes[i]) {
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
    console.error(`Error fetching real chart data for ${symbol}:`, error)
    return []
  }
}

// Generate realistic simulated chart data
function generateSimulatedChartData(symbol: string, interval: string, range: string): ChartData[] {
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

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = now - (dataPoints - i) * timeStep
    const volatility = basePrice * 0.002 // 0.2% volatility

    const open = currentPrice
    const randomChange = (Math.random() - 0.5) * volatility * 2
    const close = Math.max(basePrice * 0.95, Math.min(basePrice * 1.05, open + randomChange))

    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * 0.5
    const volume = Math.floor(Math.random() * 2000000) + 500000

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

    // Try to fetch real data first
    const realData = await fetchRealChartData(symbol, interval, range)

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

    // Fallback to simulated data
    const simulatedData = generateSimulatedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      data: simulatedData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
      source: "Simulated Data (Yahoo API unavailable)",
      dataPoints: simulatedData.length,
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)

    // Return simulated data on error
    const symbol = new URL(request.url).searchParams.get("symbol") || "RELIANCE.NS"
    const interval = new URL(request.url).searchParams.get("interval") || "5m"
    const range = new URL(request.url).searchParams.get("range") || "1d"

    const simulatedData = generateSimulatedChartData(symbol, interval, range)

    return NextResponse.json({
      success: true,
      data: simulatedData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
      source: "Simulated Data (Error fallback)",
      dataPoints: simulatedData.length,
    })
  }
}
