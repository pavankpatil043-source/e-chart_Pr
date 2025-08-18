import type { NextRequest } from "next/server"

// Store for WebSocket connections
const connections = new Map<string, WebSocket>()
const subscriptions = new Map<string, Set<string>>() // connectionId -> symbols

// Base prices for realistic simulation
const BASE_PRICES: { [key: string]: number } = {
  "RELIANCE.NS": 2450.75,
  "TCS.NS": 3890.2,
  "HDFCBANK.NS": 1685.3,
  "INFY.NS": 1456.85,
  "ITC.NS": 462.15,
  "SBIN.NS": 598.4,
  "BHARTIARTL.NS": 912.65,
  "KOTAKBANK.NS": 1798.9,
  "LT.NS": 2856.75,
  "ASIANPAINT.NS": 3124.5,
  "MARUTI.NS": 9500.25,
  "HCLTECH.NS": 1234.6,
  "AXISBANK.NS": 1098.45,
  "ICICIBANK.NS": 945.8,
  "WIPRO.NS": 398.75,
  "NESTLEIND.NS": 2234.5,
  "HINDUNILVR.NS": 2567.3,
  "BAJFINANCE.NS": 6789.4,
  "TATASTEEL.NS": 134.6,
  "SUNPHARMA.NS": 1123.8,
}

// Price storage for continuity
const priceStorage = new Map<string, { price: number; lastUpdate: number; trend: number }>()

function generateRealtimePrice(symbol: string) {
  const basePrice = BASE_PRICES[symbol] || 1000

  if (!priceStorage.has(symbol)) {
    priceStorage.set(symbol, {
      price: basePrice,
      lastUpdate: Date.now(),
      trend: Math.random() > 0.5 ? 1 : -1,
    })
  }

  const stored = priceStorage.get(symbol)!
  const now = Date.now()
  const timeDiff = now - stored.lastUpdate

  // Generate realistic price movement
  const volatility = 0.0005 // 0.05% volatility per update
  const randomFactor = (Math.random() - 0.5) * 2
  const trendFactor = stored.trend * 0.3
  const timeDecay = Math.min(timeDiff / (1000 * 2), 1) // Max 2 second effect

  const priceChange = stored.price * volatility * (randomFactor + trendFactor) * timeDecay
  const newPrice = Math.max(stored.price + priceChange, basePrice * 0.95)

  // Update trend occasionally
  const newTrend = Math.random() < 0.05 ? (Math.random() > 0.5 ? 1 : -1) : stored.trend * 0.99

  const change = newPrice - basePrice
  const changePercent = (change / basePrice) * 100

  priceStorage.set(symbol, {
    price: newPrice,
    lastUpdate: now,
    trend: newTrend,
  })

  return {
    type: "price_update",
    symbol,
    price: Math.round(newPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 10000) / 100,
    volume: Math.floor(Math.random() * 1000000) + 500000,
    timestamp: now,
  }
}

// Broadcast price updates
function broadcastPriceUpdates() {
  const allSymbols = new Set<string>()

  // Collect all subscribed symbols
  subscriptions.forEach((symbols) => {
    symbols.forEach((symbol) => allSymbols.add(symbol))
  })

  // Generate updates for all symbols
  allSymbols.forEach((symbol) => {
    const priceUpdate = generateRealtimePrice(symbol)

    // Send to all connections subscribed to this symbol
    connections.forEach((ws, connectionId) => {
      const subscribedSymbols = subscriptions.get(connectionId)
      if (subscribedSymbols?.has(symbol) && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(priceUpdate))
        } catch (error) {
          console.error("Error sending price update:", error)
          // Clean up dead connection
          connections.delete(connectionId)
          subscriptions.delete(connectionId)
        }
      }
    })
  })
}

// Start price update interval
let priceUpdateInterval: NodeJS.Timeout | null = null

function startPriceUpdates() {
  if (!priceUpdateInterval) {
    priceUpdateInterval = setInterval(broadcastPriceUpdates, 2000) // Update every 2 seconds
  }
}

function stopPriceUpdates() {
  if (priceUpdateInterval && connections.size === 0) {
    clearInterval(priceUpdateInterval)
    priceUpdateInterval = null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get("connectionId") || Math.random().toString(36).substring(7)

  // Check if the request is for WebSocket upgrade
  const upgrade = request.headers.get("upgrade")
  if (upgrade !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 })
  }

  try {
    // Create WebSocket connection (simulated for this example)
    // In a real implementation, you would use a WebSocket library like 'ws'

    return new Response(
      JSON.stringify({
        message: "WebSocket endpoint ready",
        connectionId,
        supportedSymbols: Object.keys(BASE_PRICES),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("WebSocket connection error:", error)
    return new Response("WebSocket connection failed", { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, symbols, connectionId } = await request.json()

    if (!connectionId) {
      return new Response("Connection ID required", { status: 400 })
    }

    switch (action) {
      case "subscribe":
        if (!subscriptions.has(connectionId)) {
          subscriptions.set(connectionId, new Set())
        }
        const currentSubs = subscriptions.get(connectionId)!
        symbols.forEach((symbol: string) => currentSubs.add(symbol))

        startPriceUpdates()

        return new Response(
          JSON.stringify({
            success: true,
            message: `Subscribed to ${symbols.length} symbols`,
            symbols,
          }),
          { status: 200 },
        )

      case "unsubscribe":
        const subs = subscriptions.get(connectionId)
        if (subs) {
          symbols.forEach((symbol: string) => subs.delete(symbol))
          if (subs.size === 0) {
            subscriptions.delete(connectionId)
          }
        }

        stopPriceUpdates()

        return new Response(
          JSON.stringify({
            success: true,
            message: `Unsubscribed from ${symbols.length} symbols`,
          }),
          { status: 200 },
        )

      default:
        return new Response("Invalid action", { status: 400 })
    }
  } catch (error) {
    console.error("WebSocket API error:", error)
    return new Response("Internal server error", { status: 500 })
  }
}
