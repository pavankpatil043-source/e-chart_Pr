import { NextResponse } from "next/server"

interface StockQuote {
  symbol: string
  companyName: string
  price: number
  lastPrice: number
  change: number
  pChange: number
  volume: number
  marketCap: number
  peRatio: number
  dayHigh: number
  dayLow: number
  open: number
  previousClose: number
  lastUpdateTime: string
}

// Real Yahoo Finance API integration
async function fetchRealYahooData(symbol: string): Promise<StockQuote | null> {
  try {
    // Use Yahoo Finance API v8 (free tier)
    const yahooSymbol = symbol.includes(".NS") ? symbol : `${symbol}.NS`
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`

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
      throw new Error("No data returned from Yahoo Finance")
    }

    const meta = result.meta
    const quote = result.indicators?.quote?.[0]
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = (change / previousClose) * 100

    return {
      symbol: symbol.replace(".NS", ""),
      companyName: meta.longName || meta.shortName || symbol,
      price: Math.round(currentPrice * 100) / 100,
      lastPrice: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      pChange: Math.round(changePercent * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || 0,
      peRatio: meta.trailingPE || 0,
      dayHigh: meta.regularMarketDayHigh || currentPrice,
      dayLow: meta.regularMarketDayLow || currentPrice,
      open: meta.regularMarketOpen || currentPrice,
      previousClose: previousClose,
      lastUpdateTime: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`Error fetching real data for ${symbol}:`, error)
    return null
  }
}

// Fallback simulated data with realistic movement
const stockStorage = new Map<
  string,
  {
    baseData: StockQuote
    lastUpdate: number
    trend: number
  }
>()

const initializeStock = (symbol: string): StockQuote => {
  const stockData: Record<string, Partial<StockQuote>> = {
    "RELIANCE.NS": {
      companyName: "Reliance Industries Ltd",
      price: 2387.5,
      volume: 2500000,
      marketCap: 1612000000000,
      peRatio: 24.5,
      open: 2380.0,
      previousClose: 2375.25,
    },
    "TCS.NS": {
      companyName: "Tata Consultancy Services Ltd",
      price: 3456.75,
      volume: 1800000,
      marketCap: 1256000000000,
      peRatio: 28.3,
      open: 3450.0,
      previousClose: 3445.5,
    },
    "HDFCBANK.NS": {
      companyName: "HDFC Bank Ltd",
      price: 1678.9,
      volume: 3200000,
      marketCap: 1278000000000,
      peRatio: 19.8,
      open: 1675.0,
      previousClose: 1672.3,
    },
    "INFY.NS": {
      companyName: "Infosys Ltd",
      price: 1456.25,
      volume: 2100000,
      marketCap: 612000000000,
      peRatio: 26.7,
      open: 1452.0,
      previousClose: 1448.75,
    },
    "ICICIBANK.NS": {
      companyName: "ICICI Bank Ltd",
      price: 1089.6,
      volume: 2800000,
      marketCap: 765000000000,
      peRatio: 17.2,
      open: 1085.0,
      previousClose: 1082.45,
    },
    "BHARTIARTL.NS": {
      companyName: "Bharti Airtel Ltd",
      price: 1234.8,
      volume: 1900000,
      marketCap: 678000000000,
      peRatio: 22.1,
      open: 1230.0,
      previousClose: 1228.9,
    },
    "ITC.NS": {
      companyName: "ITC Ltd",
      price: 456.75,
      volume: 4500000,
      marketCap: 567000000000,
      peRatio: 31.5,
      open: 455.0,
      previousClose: 454.2,
    },
    "SBIN.NS": {
      companyName: "State Bank of India",
      price: 678.9,
      volume: 3500000,
      marketCap: 605000000000,
      peRatio: 12.8,
      open: 675.0,
      previousClose: 673.45,
    },
    "LT.NS": {
      companyName: "Larsen & Toubro Ltd",
      price: 3234.5,
      volume: 1200000,
      marketCap: 456000000000,
      peRatio: 35.2,
      open: 3230.0,
      previousClose: 3225.75,
    },
    "HCLTECH.NS": {
      companyName: "HCL Technologies Ltd",
      price: 1567.25,
      volume: 1600000,
      marketCap: 425000000000,
      peRatio: 24.8,
      open: 1565.0,
      previousClose: 1562.8,
    },
  }

  const baseStock = stockData[symbol] || {
    companyName: "Unknown Company",
    price: 1000,
    volume: 1000000,
    marketCap: 100000000000,
    peRatio: 20,
    open: 1000,
    previousClose: 995,
  }

  return {
    symbol,
    companyName: baseStock.companyName!,
    price: baseStock.price!,
    lastPrice: baseStock.price!,
    change: baseStock.price! - baseStock.previousClose!,
    pChange: ((baseStock.price! - baseStock.previousClose!) / baseStock.previousClose!) * 100,
    volume: baseStock.volume!,
    marketCap: baseStock.marketCap!,
    peRatio: baseStock.peRatio!,
    dayHigh: baseStock.price! * 1.02,
    dayLow: baseStock.price! * 0.98,
    open: baseStock.open!,
    previousClose: baseStock.previousClose!,
    lastUpdateTime: new Date().toISOString(),
  }
}

const generateLivePrice = (symbol: string): StockQuote => {
  if (!stockStorage.has(symbol)) {
    const initialStock = initializeStock(symbol)
    stockStorage.set(symbol, {
      baseData: initialStock,
      lastUpdate: Date.now(),
      trend: Math.random() > 0.5 ? 1 : -1,
    })
  }

  const stored = stockStorage.get(symbol)!
  const now = Date.now()
  const timeDiff = now - stored.lastUpdate

  // Generate realistic price movement
  const volatility = 0.001 // 0.1% volatility
  const randomFactor = (Math.random() - 0.5) * 2
  const trendFactor = stored.trend * 0.3
  const timeDecay = Math.min(timeDiff / (1000 * 60), 1) // Max 1 minute effect

  const priceChange = stored.baseData.price * volatility * (randomFactor + trendFactor) * timeDecay
  const newPrice = Math.max(stored.baseData.price + priceChange, stored.baseData.price * 0.95)

  // Update high/low
  const dayHigh = Math.max(stored.baseData.dayHigh, newPrice)
  const dayLow = Math.min(stored.baseData.dayLow, newPrice)

  const updatedStock: StockQuote = {
    ...stored.baseData,
    price: Math.round(newPrice * 100) / 100,
    lastPrice: Math.round(newPrice * 100) / 100,
    change: Math.round((newPrice - stored.baseData.previousClose) * 100) / 100,
    pChange: Math.round(((newPrice - stored.baseData.previousClose) / stored.baseData.previousClose) * 10000) / 100,
    dayHigh: Math.round(dayHigh * 100) / 100,
    dayLow: Math.round(dayLow * 100) / 100,
    volume: stored.baseData.volume + Math.floor(Math.random() * 10000),
    lastUpdateTime: new Date().toISOString(),
  }

  // Update trend
  const newTrend = stored.trend * 0.95 + (priceChange > 0 ? 0.05 : -0.05)

  stockStorage.set(symbol, {
    baseData: updatedStock,
    lastUpdate: now,
    trend: Math.max(-1, Math.min(1, newTrend)),
  })

  return updatedStock
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol")

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
    const realData = await fetchRealYahooData(symbol)

    if (realData) {
      return NextResponse.json({
        success: true,
        quote: realData,
        timestamp: Date.now(),
        source: "Yahoo Finance API",
        marketStatus: "OPEN",
      })
    }

    // Fallback to simulated data
    const quote = generateLivePrice(symbol)

    return NextResponse.json({
      success: true,
      quote,
      timestamp: Date.now(),
      source: "Simulated Data (Yahoo API unavailable)",
      marketStatus: "OPEN",
    })
  } catch (error) {
    console.error("Error fetching stock quote:", error)

    // Return simulated data on error
    const symbol = new URL(request.url).searchParams.get("symbol") || "RELIANCE.NS"
    const quote = generateLivePrice(symbol)

    return NextResponse.json({
      success: true,
      quote,
      timestamp: Date.now(),
      source: "Simulated Data (Error fallback)",
      marketStatus: "OPEN",
    })
  }
}
