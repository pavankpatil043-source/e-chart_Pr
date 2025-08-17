import { NextResponse } from "next/server"

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

// Persistent price storage with realistic movement
const priceStorage = new Map<string, { basePrice: number; lastUpdate: number; trend: number }>()

// Initialize base prices
const initializePrices = () => {
  if (priceStorage.size === 0) {
    priceStorage.set("NIFTY", { basePrice: 24781.1, lastUpdate: Date.now(), trend: 0.5 })
    priceStorage.set("BANKNIFTY", { basePrice: 51667.75, lastUpdate: Date.now(), trend: -0.3 })
    priceStorage.set("FINNIFTY", { basePrice: 23456.8, lastUpdate: Date.now(), trend: 0.4 })
    priceStorage.set("SENSEX", { basePrice: 82365.77, lastUpdate: Date.now(), trend: 0.2 })
  }
}

const generateRealisticPrice = (symbol: string): { price: number; change: number; pChange: number } => {
  initializePrices()

  const stored = priceStorage.get(symbol)
  if (!stored) {
    return { price: 0, change: 0, pChange: 0 }
  }

  const now = Date.now()
  const timeDiff = now - stored.lastUpdate

  // Generate realistic price movement
  const volatility = symbol === "BANKNIFTY" ? 0.002 : 0.001 // Bank Nifty more volatile
  const randomFactor = (Math.random() - 0.5) * 2 // -1 to 1
  const trendFactor = stored.trend * 0.3 // Trend influence
  const timeDecay = Math.min(timeDiff / (1000 * 60 * 60), 1) // Max 1 hour effect

  const priceChange = stored.basePrice * volatility * (randomFactor + trendFactor) * timeDecay
  const newPrice = stored.basePrice + priceChange

  // Update stored values
  const change = newPrice - stored.basePrice
  const pChange = (change / stored.basePrice) * 100

  // Update trend based on recent movement
  const newTrend = stored.trend * 0.9 + (change > 0 ? 0.1 : -0.1)
  priceStorage.set(symbol, {
    basePrice: newPrice,
    lastUpdate: now,
    trend: Math.max(-1, Math.min(1, newTrend)),
  })

  return {
    price: Math.round(newPrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    pChange: Math.round(pChange * 100) / 100,
  }
}

export async function GET() {
  try {
    const indices: MarketIndex[] = [
      {
        symbol: "NIFTY",
        name: "Nifty 50",
        ...generateRealisticPrice("NIFTY"),
        isPositive: true,
        lastUpdate: Date.now(),
        source: "NSE Live Simulation",
      },
      {
        symbol: "BANKNIFTY",
        name: "Bank Nifty",
        ...generateRealisticPrice("BANKNIFTY"),
        isPositive: false,
        lastUpdate: Date.now(),
        source: "NSE Live Simulation",
      },
      {
        symbol: "FINNIFTY",
        name: "Fin Nifty",
        ...generateRealisticPrice("FINNIFTY"),
        isPositive: true,
        lastUpdate: Date.now(),
        source: "NSE Live Simulation",
      },
      {
        symbol: "SENSEX",
        name: "Sensex",
        ...generateRealisticPrice("SENSEX"),
        isPositive: true,
        lastUpdate: Date.now(),
        source: "NSE Live Simulation",
      },
    ]

    // Update isPositive based on actual change
    indices.forEach((index) => {
      index.isPositive = index.change >= 0
    })

    return NextResponse.json({
      success: true,
      indices,
      timestamp: Date.now(),
      source: "NSE Live Simulation Engine",
    })
  } catch (error) {
    console.error("Error generating market indices:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate market data",
        indices: [],
      },
      { status: 500 },
    )
  }
}
