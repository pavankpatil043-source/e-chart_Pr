import { NextRequest, NextResponse } from "next/server"
import { getLatestFIIDIIData, fiidiiDataFetcher } from "@/lib/fii-dii-fetcher"
import { fiidiiScheduler } from "@/lib/fii-dii-scheduler"
import { format, subDays } from "date-fns"

interface FIIDIIData {
  date: string
  fii: {
    buy: number
    sell: number
    net: number
  }
  dii: {
    buy: number
    sell: number
    net: number
  }
}

// Cache for storing FII DII data
const cache = new Map<string, { data: FIIDIIData[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Generate realistic sample data based on actual market patterns
const generateSampleFIIDIIData = (days: number): FIIDIIData[] => {
  const data: FIIDIIData[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue
    }
    
    // Generate realistic FII data (in crores)
    // FIIs tend to be more volatile, larger amounts
    const fiiBaseBuy = 3000 + Math.random() * 4000 // 3000-7000 crores
    const fiiBuySell = 3000 + Math.random() * 4000 // 3000-7000 crores
    
    // Add some correlation - if market is up, FIIs tend to buy more
    const marketSentiment = Math.random() - 0.3 // Slightly bearish bias for realism
    const fiiAdjustment = marketSentiment * 1000
    
    const fiiBuy = Math.max(500, fiiBaseBuy + fiiAdjustment)
    const fiiSell = Math.max(500, fiiBuySell - fiiAdjustment)
    
    // Generate realistic DII data (in crores)
    // DIIs tend to be counter-cyclical to FIIs
    const diiBaseBuy = 2000 + Math.random() * 2500 // 2000-4500 crores
    const diiBaseSell = 2000 + Math.random() * 2500 // 2000-4500 crores
    
    // DIIs often buy when FIIs sell (counter-cyclical behavior)
    const diiCounterAdjustment = -(fiiBuy - fiiSell) * 0.3 // 30% counter-cyclical
    
    const diiBuy = Math.max(500, diiBaseBuy + diiCounterAdjustment)
    const diiSell = Math.max(500, diiBaseSell - diiCounterAdjustment)
    
    data.push({
      date: date.toISOString().split('T')[0],
      fii: {
        buy: Math.round(fiiBuy),
        sell: Math.round(fiiSell),
        net: Math.round(fiiBuy - fiiSell)
      },
      dii: {
        buy: Math.round(diiBuy),
        sell: Math.round(diiSell),
        net: Math.round(diiBuy - diiSell)
      }
    })
  }
  
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Fetch real FII DII data from database or external sources
const fetchFIIDIIData = async (period: string): Promise<FIIDIIData[]> => {
  const days = getDaysFromPeriod(period)
  
  try {
    // Fetch real data from database
    const dbData = await getLatestFIIDIIData(days)
    
    if (dbData && dbData.length > 0) {
      // Convert database records to API format
      return dbData.map(record => ({
        date: record.date,
        fii: {
          buy: record.fiiBuyAmount,
          sell: record.fiiSellAmount,
          net: record.fiiNetAmount
        },
        dii: {
          buy: record.diiBuyAmount,
          sell: record.diiSellAmount,
          net: record.diiNetAmount
        }
      }))
    }
    
    // If no real data available, fall back to sample data
    console.log('No real FII DII data available, using sample data')
    return generateSampleFIIDIIData(days)
    
  } catch (error) {
    console.error('Error fetching real FII DII data:', error)
    // Fall back to sample data on error
    return generateSampleFIIDIIData(days)
  }
}

const getDaysFromPeriod = (period: string): number => {
  switch (period) {
    case "7d": return 10 // Include weekends to filter out
    case "30d": return 42
    case "3mo": return 120
    case "6mo": return 240
    default: return 10
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"
    
    // Check cache first
    const cacheKey = `fii-dii-${period}`
    const cachedData = cache.get(cacheKey)
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cachedData.data,
        cached: true,
        source: "Cache",
        timestamp: new Date().toISOString(),
      })
    }
    
    // Fetch fresh data
    const fiiDiiData = await fetchFIIDIIData(period)
    
    // Cache the data
    cache.set(cacheKey, {
      data: fiiDiiData,
      timestamp: Date.now()
    })
    
    // Calculate summary statistics
    const totalFII = fiiDiiData.reduce((sum: number, item: FIIDIIData) => sum + item.fii.net, 0)
    const totalDII = fiiDiiData.reduce((sum: number, item: FIIDIIData) => sum + item.dii.net, 0)
    const avgDailyFII = fiiDiiData.length > 0 ? totalFII / fiiDiiData.length : 0
    const avgDailyDII = fiiDiiData.length > 0 ? totalDII / fiiDiiData.length : 0
    
    // Calculate volatility (standard deviation of net flows)
    const fiiFlows = fiiDiiData.map((item: FIIDIIData) => item.fii.net)
    const diiFlows = fiiDiiData.map((item: FIIDIIData) => item.dii.net)
    
    const fiiVolatility = calculateStandardDeviation(fiiFlows)
    const diiVolatility = calculateStandardDeviation(diiFlows)
    
    return NextResponse.json({
      success: true,
      data: fiiDiiData,
      summary: {
        period,
        totalDays: fiiDiiData.length,
        fii: {
          totalNet: totalFII,
          avgDaily: avgDailyFII,
          volatility: fiiVolatility
        },
        dii: {
          totalNet: totalDII,
          avgDaily: avgDailyDII,
          volatility: diiVolatility
        },
        combined: {
          totalNet: totalFII + totalDII,
          avgDaily: avgDailyFII + avgDailyDII
        }
      },
      cached: false,
      source: "Live Data Simulation", // Change to actual source when integrated
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error("Error in FII DII data API:", error)
    
    return NextResponse.json({
      success: false,
      error: "Failed to fetch FII DII data",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// Utility function to calculate standard deviation
const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2))
  const avgSquaredDiff = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length
  
  return Math.sqrt(avgSquaredDiff)
}

// Additional endpoint for historical trends analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, analysisType } = body
    
    // This would implement more advanced analysis like:
    // - Correlation analysis between FII/DII flows and market movements
    // - Trend analysis
    // - Seasonal patterns
    // - Impact analysis on specific sectors
    
    return NextResponse.json({
      success: true,
      message: "Advanced analysis endpoint - to be implemented",
      analysisType,
      dateRange: { startDate, endDate },
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Failed to process analysis request",
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}