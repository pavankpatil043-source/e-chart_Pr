import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol") || "RELIANCE"
  const exchange = searchParams.get("exchange") || "NSE"
  const points = Number.parseInt(searchParams.get("points") || "100")

  try {
    // Generate mock OHLC data
    const data = []
    let basePrice = Math.random() * 1000 + 500 // Random base price between 500-1500
    const now = Date.now()

    for (let i = 0; i < points; i++) {
      const time = Math.floor((now - (points - i) * 60000) / 1000) // 1 minute intervals

      // Generate realistic price movement
      const volatility = 0.02 // 2% volatility
      const trend = (Math.random() - 0.5) * 0.001 // Small trend component
      const change = (Math.random() - 0.5) * volatility + trend

      const open = basePrice
      const close = open * (1 + change)
      const high = Math.max(open, close) * (1 + Math.random() * 0.01)
      const low = Math.min(open, close) * (1 - Math.random() * 0.01)
      const volume = Math.floor(Math.random() * 1000000) + 100000

      data.push({
        time,
        open: Number.parseFloat(open.toFixed(2)),
        high: Number.parseFloat(high.toFixed(2)),
        low: Number.parseFloat(low.toFixed(2)),
        close: Number.parseFloat(close.toFixed(2)),
        volume,
      })

      basePrice = close // Use close as next open
    }

    return NextResponse.json({
      success: true,
      data,
      symbol,
      exchange,
    })
  } catch (error) {
    console.error("Error generating OHLC data:", error)
    return NextResponse.json({ success: false, error: "Failed to generate OHLC data" }, { status: 500 })
  }
}
