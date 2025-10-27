import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")
  const interval = searchParams.get("interval") || "5m"
  const range = searchParams.get("range") || "1d"

  if (!symbol) {
    return NextResponse.json({ success: false, error: "Symbol is required" }, { status: 400 })
  }

  try {
    console.log(`Fetching chart data for ${symbol}, interval: ${interval}, range: ${range}`)

    // Primary Yahoo Finance API endpoint
    const primaryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`

    // Backup endpoint
    const backupUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`

    let response
    let data

    try {
      // Try primary endpoint first
      response = await fetch(primaryUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        throw new Error(`Primary API failed: ${response.status}`)
      }

      data = await response.json()
    } catch (primaryError) {
      console.log("Primary endpoint failed, trying backup...")

      // Try backup endpoint
      response = await fetch(backupUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        next: { revalidate: 0 },
      })

      if (!response.ok) {
        throw new Error(`Backup API also failed: ${response.status}`)
      }

      data = await response.json()
    }

    if (!data.chart?.result?.[0]) {
      throw new Error("Invalid response structure from Yahoo Finance")
    }

    const result = data.chart.result[0]
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0]

    if (!quote || !timestamps.length) {
      throw new Error("No chart data available")
    }

    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const closes = quote.close || []
    const volumes = quote.volume || []

    // Format chart data
    const chartData = timestamps
      .map((timestamp: number, index: number) => {
        const open = opens[index]
        const high = highs[index]
        const low = lows[index]
        const close = closes[index]
        const volume = volumes[index]

        // Skip invalid data points
        if (
          open == null ||
          high == null ||
          low == null ||
          close == null ||
          isNaN(open) ||
          isNaN(high) ||
          isNaN(low) ||
          isNaN(close) ||
          !isFinite(open) ||
          !isFinite(high) ||
          !isFinite(low) ||
          !isFinite(close)
        ) {
          return null
        }

        return {
          time: timestamp,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
          volume: Math.floor(volume || 0),
        }
      })
      .filter(Boolean) // Remove null entries

    if (chartData.length === 0) {
      throw new Error("No valid chart data points")
    }

    console.log(`Chart data fetched successfully for ${symbol}: ${chartData.length} candles`)

    return NextResponse.json({
      success: true,
      chart: chartData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error(`Error fetching chart data for ${symbol}:`, error)

    // Generate realistic mock data as fallback
    const mockData = []
    const basePrice = 1000 + Math.random() * 2000
    let currentPrice = basePrice
    const now = Date.now()

    // Generate data points based on interval
    const intervalMinutes =
      interval === "1m" ? 1 : interval === "5m" ? 5 : interval === "15m" ? 15 : interval === "1h" ? 60 : 1440
    const dataPoints = interval === "1d" ? 100 : Math.min(200, Math.floor((24 * 60) / intervalMinutes))

    for (let i = dataPoints; i >= 0; i--) {
      const time = Math.floor((now - i * intervalMinutes * 60 * 1000) / 1000)
      const open = currentPrice
      const volatility = 0.02
      const change = (Math.random() - 0.5) * volatility * currentPrice
      const close = open + change
      const high = Math.max(open, close) * (1 + Math.random() * 0.01)
      const low = Math.min(open, close) * (1 - Math.random() * 0.01)
      const volume = Math.floor(Math.random() * 1000000) + 100000

      mockData.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      })

      currentPrice = close
    }

    console.log(`Using mock chart data for ${symbol}: ${mockData.length} candles`)

    return NextResponse.json({
      success: true,
      chart: mockData,
      symbol,
      interval,
      range,
      timestamp: Date.now(),
      fallback: true,
    })
  }
}
