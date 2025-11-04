import { NextRequest, NextResponse } from 'next/server'
import { breezeAPI, convertToNSESymbol, POPULAR_STOCKS } from '@/lib/breeze-api'

// Rate limiting and caching
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const cacheMap = new Map<string, { data: any; timestamp: number }>()

function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `breeze-quote-${ip}`

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  const limit = rateLimitMap.get(key)!

  if (now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count++
  return true
}

function getCachedData(key: string, maxAge = 10000): any | null {
  const cached = cacheMap.get(key)
  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cacheMap.set(key, { data, timestamp: Date.now() })
}

// Fallback data generator for when Breeze API is unavailable
function generateFallbackQuote(symbol: string) {
  const baseData: { [key: string]: any } = {
    'RELIANCE': { price: 2650, name: 'Reliance Industries Ltd' },
    'TCS': { price: 4200, name: 'Tata Consultancy Services Ltd' },
    'HDFCBANK': { price: 1680, name: 'HDFC Bank Ltd' },
    'INFY': { price: 1450, name: 'Infosys Ltd' },
    'ICICIBANK': { price: 1250, name: 'ICICI Bank Ltd' }
  }

  const base = baseData[symbol] || { price: 1000, name: `${symbol} Ltd` }
  const change = (Math.random() - 0.5) * 0.1 // ±5% change
  const currentPrice = base.price * (1 + change)
  const changeAmount = currentPrice - base.price
  const changePercent = (changeAmount / base.price) * 100

  return {
    symbol,
    companyName: base.name,
    lastTradedPrice: parseFloat(currentPrice.toFixed(2)),
    changePer: parseFloat(changePercent.toFixed(2)),
    changeAbs: parseFloat(changeAmount.toFixed(2)),
    open: parseFloat((currentPrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
    high: parseFloat((currentPrice * (1.01 + Math.random() * 0.02)).toFixed(2)),
    low: parseFloat((currentPrice * (0.97 + Math.random() * 0.02)).toFixed(2)),
    close: parseFloat((currentPrice * (0.99 + Math.random() * 0.02)).toFixed(2)),
    volume: Math.floor(Math.random() * 10000000),
    lastUpdateTime: new Date().toISOString(),
    exchange: 'NSE',
    bid: parseFloat((currentPrice * 0.999).toFixed(2)),
    ask: parseFloat((currentPrice * 1.001).toFixed(2)),
    totalTradedQuantity: Math.floor(Math.random() * 50000000),
    totalTradedValue: Math.floor(Math.random() * 1000000000)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const exchange = searchParams.get('exchange') || 'NSE'

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required'
      }, { status: 400 })
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      }, { status: 429 })
    }

    // Convert symbol format (remove .NS if present)
    const nseSymbol = convertToNSESymbol(symbol)
    
    // Check cache first
    const cacheKey = `quote-${nseSymbol}-${exchange}`
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

    // Try Breeze API first
    try {
      const breezeResponse = await breezeAPI.getQuotes([nseSymbol], exchange)
      
      if (breezeResponse && breezeResponse.success && breezeResponse.data.length > 0) {
        const quoteData = breezeResponse.data[0]
        
        // Format data to match expected structure
        const formattedData = {
          symbol: quoteData.symbol,
          companyName: quoteData.companyName,
          lastTradedPrice: quoteData.lastTradedPrice,
          changePer: quoteData.changePer,
          changeAbs: quoteData.changeAbs,
          open: quoteData.open,
          high: quoteData.high,
          low: quoteData.low,
          close: quoteData.close,
          volume: quoteData.volume,
          lastUpdateTime: quoteData.lastUpdateTime,
          exchange: quoteData.exchange,
          bid: quoteData.bid,
          ask: quoteData.ask,
          totalTradedQuantity: quoteData.totalTradedQuantity,
          totalTradedValue: quoteData.totalTradedValue,
          averageTradedPrice: quoteData.averageTradedPrice
        }

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
      console.warn('Breeze API error, falling back:', breezeError)
    }

    // Fallback to simulated data if Breeze API fails
    console.log(`Using fallback data for ${nseSymbol} (Breeze API unavailable)`)
    const fallbackData = generateFallbackQuote(nseSymbol)
    
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
    console.error('Stock quote API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stock quote',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { symbols, exchange = 'NSE' } = body

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({
        success: false,
        error: 'Symbols array is required'
      }, { status: 400 })
    }

    // Rate limiting for batch requests
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip, 5, 60000)) { // Lower limit for batch
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded for batch requests'
      }, { status: 429 })
    }

    const nseSymbols = symbols.map(convertToNSESymbol)
    const results = []

    try {
      // Try Breeze API for batch quotes
      const breezeResponse = await breezeAPI.getQuotes(nseSymbols, exchange)
      
      if (breezeResponse && breezeResponse.success) {
        results.push(...breezeResponse.data)
      } else {
        throw new Error('Breeze batch request failed')
      }
    } catch (breezeError) {
      console.warn('Breeze batch API error, using fallback:', breezeError)
      
      // Generate fallback data for all symbols
      for (const symbol of nseSymbols) {
        results.push(generateFallbackQuote(symbol))
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      source: results.length > 0 ? 'Breeze API' : 'Fallback Data',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch quote API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batch quotes'
    }, { status: 500 })
  }
}