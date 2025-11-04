import { NextRequest, NextResponse } from 'next/server'
import { breezeAPI } from '@/lib/breeze-api'

// Cache for indices data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 seconds for indices

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Fallback indices data
function generateFallbackIndices() {
  const baseData = [
    { symbol: 'NIFTY', name: 'Nifty 50', basePrice: 19500 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty', basePrice: 43500 },
    { symbol: 'FINNIFTY', name: 'Nifty Financial Services', basePrice: 20500 },
    { symbol: 'SENSEX', name: 'BSE Sensex', basePrice: 65000 }
  ]

  return baseData.map(index => {
    const change = (Math.random() - 0.5) * 0.02 // ±1% change
    const currentPrice = index.basePrice * (1 + change)
    const changeAmount = currentPrice - index.basePrice
    const changePercent = (changeAmount / index.basePrice) * 100

    return {
      symbol: index.symbol,
      name: index.name,
      lastPrice: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(changeAmount.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      open: parseFloat((currentPrice * (0.998 + Math.random() * 0.004)).toFixed(2)),
      high: parseFloat((currentPrice * (1.005 + Math.random() * 0.005)).toFixed(2)),
      low: parseFloat((currentPrice * (0.995 + Math.random() * 0.005)).toFixed(2)),
      volume: Math.floor(Math.random() * 1000000000),
      lastUpdateTime: new Date().toISOString(),
      exchange: index.symbol === 'SENSEX' ? 'BSE' : 'NSE'
    }
  })
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cacheKey = 'indian-indices'
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        source: 'Breeze API (Cached)',
        timestamp: new Date().toISOString()
      })
    }

    try {
      // Try Breeze API first
      const indicesData = await breezeAPI.getIndicesData()
      
      if (indicesData && indicesData.length > 0) {
        // Format data to match expected structure
        const formattedData = indicesData.map(index => ({
          symbol: index.symbol,
          name: index.companyName || index.symbol,
          lastPrice: index.lastTradedPrice,
          change: index.changeAbs,
          changePercent: index.changePer,
          open: index.open,
          high: index.high,
          low: index.low,
          volume: index.volume,
          lastUpdateTime: index.lastUpdateTime,
          exchange: index.exchange
        }))

        // Cache the result
        setCachedData(cacheKey, formattedData)

        return NextResponse.json({
          success: true,
          data: formattedData,
          cached: false,
          source: 'Breeze API (Live)',
          timestamp: new Date().toISOString()
        })
      }
    } catch (breezeError) {
      console.warn('Breeze indices API error, using fallback:', breezeError)
    }

    // Fallback to simulated data
    console.log('Using fallback indices data (Breeze API unavailable)')
    const fallbackData = generateFallbackIndices()
    
    // Cache fallback data
    setCachedData(cacheKey, fallbackData)

    return NextResponse.json({
      success: true,
      data: fallbackData,
      cached: false,
      source: 'Fallback Data (Simulated)',
      timestamp: new Date().toISOString(),
      warning: 'Using simulated data - Breeze API unavailable'
    })

  } catch (error) {
    console.error('Indices API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch indices data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}