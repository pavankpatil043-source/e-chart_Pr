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

// Real NSE indices data fetching
async function fetchRealIndicesData(): Promise<MarketIndex[]> {
  try {
    // Try multiple data sources for Indian indices
    const indices = ["NIFTY", "BANKNIFTY", "FINNIFTY", "SENSEX"]
    const results: MarketIndex[] = []

    for (const index of indices) {
      try {
        // Use Yahoo Finance for Indian indices
        const yahooSymbol = index === "SENSEX" ? "^BSESN" : `^${index}`
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`

        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        })

        if (response.ok) {
          const data = await response.json()
          const result = data.chart?.result?.[0]

          if (result) {
            const meta = result.meta
            const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
            const previousClose = meta.previousClose || currentPrice
            const change = currentPrice - previousClose
            const changePercent = (change / previousClose) * 100

            results.push({
              symbol: index,
              name: getIndexName(index),
              price: Math.round(currentPrice * 100) / 100,
              change: Math.round(change * 100) / 100,
              pChange: Math.round(changePercent * 100) / 100,
              isPositive: change >= 0,
              lastUpdate: Date.now(),
              source: "Yahoo Finance API",
            })
          }
        }
      } catch (error) {
        console.error(`Error fetching ${index}:`, error)
      }
    }

    return results
  } catch (error) {
    console.error("Error fetching real indices data:", error)
    return []
  }
}

function getIndexName(symbol: string): string {
  const names: { [key: string]: string } = {
    NIFTY: "Nifty 50",
    BANKNIFTY: "Bank Nifty",
    FINNIFTY: "Fin Nifty",
    SENSEX: "Sensex",
  }
  return names[symbol] || symbol
}

// Fallback simulated data with realistic movement
const indicesStorage = new Map<string, { basePrice: number; lastUpdate: number; trend: number }>()

function generateSimulatedIndices(): MarketIndex[] {
  const indices = [
    { symbol: "NIFTY", name: "Nifty 50", basePrice: 24781.1 },
    { symbol: "BANKNIFTY", name: "Bank Nifty", basePrice: 51667.75 },
    { symbol: "FINNIFTY", name: "Fin Nifty", basePrice: 23456.8 },
    { symbol: "SENSEX", name: "Sensex", basePrice: 82365.77 },
  ]

  return indices.map((index) => {
    if (!indicesStorage.has(index.symbol)) {
      indicesStorage.set(index.symbol, {
        basePrice: index.basePrice,
        lastUpdate: Date.now(),
        trend: Math.random() > 0.5 ? 1 : -1,
      })
    }

    const stored = indicesStorage.get(index.symbol)!
    const now = Date.now()
    const timeDiff = now - stored.lastUpdate

    // Generate realistic movement
    const volatility = 0.001 // 0.1% volatility
    const randomFactor = (Math.random() - 0.5) * 2
    const trendFactor = stored.trend * 0.3
    const timeDecay = Math.min(timeDiff / (1000 * 60), 1)

    const priceChange = stored.basePrice * volatility * (randomFactor + trendFactor) * timeDecay
    const newPrice = Math.max(stored.basePrice + priceChange, stored.basePrice * 0.98)
    const change = newPrice - stored.basePrice
    const changePercent = (change / stored.basePrice) * 100

    // Update trend occasionally
    if (Math.random() < 0.05) {
      stored.trend = Math.random() > 0.5 ? 1 : -1
    }

    // Update stored price
    stored.basePrice = newPrice
    stored.lastUpdate = now

    return {
      symbol: index.symbol,
      name: index.name,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      isPositive: change >= 0,
      lastUpdate: now,
      source: "Simulated Data",
    }
  })
}

export async function GET() {
  try {
    // Try to fetch real data first
    const realData = await fetchRealIndicesData()

    if (realData.length > 0) {
      return NextResponse.json({
        success: true,
        indices: realData,
        timestamp: Date.now(),
        source: "Yahoo Finance API",
        count: realData.length,
      })
    }

    // Fallback to simulated data
    const simulatedData = generateSimulatedIndices()

    return NextResponse.json({
      success: true,
      indices: simulatedData,
      timestamp: Date.now(),
      source: "Simulated Data (Yahoo API unavailable)",
      count: simulatedData.length,
    })
  } catch (error) {
    console.error("Error fetching market indices:", error)

    // Return simulated data on error
    const simulatedData = generateSimulatedIndices()

    return NextResponse.json({
      success: true,
      indices: simulatedData,
      timestamp: Date.now(),
      source: "Simulated Data (Error fallback)",
      count: simulatedData.length,
    })
  }
}
