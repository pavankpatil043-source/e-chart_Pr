import { type NextRequest, NextResponse } from "next/server"

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SupportResistanceLevel {
  price: number
  type: 'support' | 'resistance'
  strength: 'strong' | 'moderate' | 'weak'
  touches: number
  firstTouch: string
  lastTouch: string
  description: string
  confidence: number
}

interface TrendLine {
  type: 'support-trendline' | 'resistance-trendline'
  points: Array<{ x: number; y: number; date: string }>
  slope: number
  strength: 'strong' | 'moderate' | 'weak'
  description: string
}

interface SupportResistanceResult {
  symbol: string
  timeframe: string
  currentPrice: number
  levels: SupportResistanceLevel[]
  trendlines: TrendLine[]
  nearestSupport: SupportResistanceLevel | null
  nearestResistance: SupportResistanceLevel | null
  tradingRange: {
    upper: number
    lower: number
    width: number
    widthPercent: number
  }
  recommendation: string
  analysisDate: string
}

// Cache
const srCache = new Map<string, { data: SupportResistanceResult; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes

async function fetchCandleData(symbol: string, timeframe: string, requestUrl: string): Promise<CandleData[]> {
  try {
    const nsSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
    
    let range = '1mo'
    let interval = '1d'
    let days = 30
    
    switch (timeframe) {
      case '1D':
        range = '5d'
        interval = '1d'
        days = 5
        break
      case '5D':
        range = '1mo'
        interval = '1d'
        days = 20
        break
      case '1W':
        range = '3mo'
        interval = '1d'
        days = 60
        break
      case '1M':
        range = '6mo'
        interval = '1d'
        days = 120
        break
      case '1Y':
        range = '1y'
        interval = '1d'
        days = 250
        break
    }
    
    // Extract origin from the request URL to call the correct host/port
    const url = new URL(requestUrl)
    const origin = url.origin
    const apiUrl = `${origin}/api/yahoo-chart`
    
    console.log(`📊 Fetching chart data from: ${apiUrl}`)
    
    const response = await fetch(
      `${apiUrl}?symbol=${nsSymbol}&interval=${interval}&range=${range}`,
      { 
        signal: AbortSignal.timeout(25000),
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (!response.ok) throw new Error('Failed to fetch chart data')
    
    const result = await response.json()
    
    if (result.success && result.data && Array.isArray(result.data)) {
      return result.data.slice(-days)
    }
    
    throw new Error('Invalid chart data')
  } catch (error) {
    console.error('Error fetching candle data:', error)
    throw error
  }
}

// Find support and resistance levels using pivot points and clustering
function findSupportResistanceLevels(candles: CandleData[]): SupportResistanceLevel[] {
  const levels: SupportResistanceLevel[] = []
  const pricePoints: number[] = []
  
  // Collect all significant price points (highs and lows)
  candles.forEach(candle => {
    pricePoints.push(candle.high)
    pricePoints.push(candle.low)
  })
  
  // Find pivot points (local maxima and minima)
  const pivots: Array<{ price: number; timestamp: number; type: 'high' | 'low' }> = []
  
  for (let i = 2; i < candles.length - 2; i++) {
    const candle = candles[i]
    
    // Check if it's a local maximum (resistance)
    if (
      candle.high > candles[i - 1].high &&
      candle.high > candles[i - 2].high &&
      candle.high > candles[i + 1].high &&
      candle.high > candles[i + 2].high
    ) {
      pivots.push({ price: candle.high, timestamp: candle.timestamp, type: 'high' })
    }
    
    // Check if it's a local minimum (support)
    if (
      candle.low < candles[i - 1].low &&
      candle.low < candles[i - 2].low &&
      candle.low < candles[i + 1].low &&
      candle.low < candles[i + 2].low
    ) {
      pivots.push({ price: candle.low, timestamp: candle.timestamp, type: 'low' })
    }
  }
  
  // Cluster nearby prices (within 1.5% of each other)
  const tolerance = 0.015
  const clusters = new Map<number, typeof pivots>()
  
  pivots.forEach(pivot => {
    let found = false
    
    for (const [clusterPrice, points] of clusters.entries()) {
      if (Math.abs(pivot.price - clusterPrice) / clusterPrice < tolerance) {
        points.push(pivot)
        found = true
        break
      }
    }
    
    if (!found) {
      clusters.set(pivot.price, [pivot])
    }
  })
  
  // Convert clusters to support/resistance levels
  clusters.forEach((points, clusterPrice) => {
    if (points.length < 2) return // Need at least 2 touches
    
    const avgPrice = points.reduce((sum, p) => sum + p.price, 0) / points.length
    const touches = points.length
    const isSupport = points.filter(p => p.type === 'low').length > points.filter(p => p.type === 'high').length
    
    // Determine strength based on number of touches
    let strength: 'strong' | 'moderate' | 'weak'
    if (touches >= 4) strength = 'strong'
    else if (touches >= 3) strength = 'moderate'
    else strength = 'weak'
    
    // Calculate confidence
    const confidence = Math.min(95, 50 + (touches * 10))
    
    const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp)
    const firstTouch = new Date(sortedPoints[0].timestamp).toISOString().split('T')[0]
    const lastTouch = new Date(sortedPoints[sortedPoints.length - 1].timestamp).toISOString().split('T')[0]
    
    const description = `${isSupport ? 'Support' : 'Resistance'} at ₹${avgPrice.toFixed(2)} tested ${touches} times (${strength} level)`
    
    levels.push({
      price: Number(avgPrice.toFixed(2)),
      type: isSupport ? 'support' : 'resistance',
      strength,
      touches,
      firstTouch,
      lastTouch,
      description,
      confidence,
    })
  })
  
  // Sort by price
  return levels.sort((a, b) => b.price - a.price)
}

// Find trend lines (ascending/descending support/resistance)
function findTrendLines(candles: CandleData[]): TrendLine[] {
  const trendlines: TrendLine[] = []
  
  if (candles.length < 10) return trendlines
  
  // Find support trendline (ascending lows)
  const lows: Array<{ x: number; y: number; date: string }> = []
  
  for (let i = 2; i < candles.length - 2; i++) {
    const candle = candles[i]
    if (
      candle.low < candles[i - 1].low &&
      candle.low < candles[i - 2].low &&
      candle.low < candles[i + 1].low &&
      candle.low < candles[i + 2].low
    ) {
      lows.push({
        x: i,
        y: candle.low,
        date: new Date(candle.timestamp).toISOString().split('T')[0],
      })
    }
  }
  
  // Find best fit line for support
  if (lows.length >= 2) {
    const supportLine = calculateLinearRegression(lows)
    if (supportLine.slope > 0 && supportLine.rSquared > 0.7) { // Ascending support
      const recentLows = lows.slice(-3)
      trendlines.push({
        type: 'support-trendline',
        points: recentLows,
        slope: supportLine.slope,
        strength: supportLine.rSquared > 0.9 ? 'strong' : supportLine.rSquared > 0.8 ? 'moderate' : 'weak',
        description: `Ascending support trendline - bullish trend intact`,
      })
    }
  }
  
  // Find resistance trendline (descending highs)
  const highs: Array<{ x: number; y: number; date: string }> = []
  
  for (let i = 2; i < candles.length - 2; i++) {
    const candle = candles[i]
    if (
      candle.high > candles[i - 1].high &&
      candle.high > candles[i - 2].high &&
      candle.high > candles[i + 1].high &&
      candle.high > candles[i + 2].high
    ) {
      highs.push({
        x: i,
        y: candle.high,
        date: new Date(candle.timestamp).toISOString().split('T')[0],
      })
    }
  }
  
  // Find best fit line for resistance
  if (highs.length >= 2) {
    const resistanceLine = calculateLinearRegression(highs)
    if (resistanceLine.slope < 0 && resistanceLine.rSquared > 0.7) { // Descending resistance
      const recentHighs = highs.slice(-3)
      trendlines.push({
        type: 'resistance-trendline',
        points: recentHighs,
        slope: resistanceLine.slope,
        strength: resistanceLine.rSquared > 0.9 ? 'strong' : resistanceLine.rSquared > 0.8 ? 'moderate' : 'weak',
        description: `Descending resistance trendline - bearish pressure`,
      })
    }
  }
  
  return trendlines
}

function calculateLinearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  
  points.forEach(p => {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumX2 += p.x * p.x
  })
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R-squared
  const yMean = sumY / n
  let ssTotal = 0, ssResidual = 0
  
  points.forEach(p => {
    const yPred = slope * p.x + intercept
    ssTotal += Math.pow(p.y - yMean, 2)
    ssResidual += Math.pow(p.y - yPred, 2)
  })
  
  const rSquared = 1 - (ssResidual / ssTotal)
  
  return { slope, intercept, rSquared }
}

function generateRecommendation(
  currentPrice: number,
  nearestSupport: SupportResistanceLevel | null,
  nearestResistance: SupportResistanceLevel | null,
  tradingRange: SupportResistanceResult['tradingRange']
): string {
  if (!nearestSupport || !nearestResistance) {
    return '⚠️ HOLD: Insufficient support/resistance data. Wait for clearer levels.'
  }
  
  const distToSupport = ((currentPrice - nearestSupport.price) / currentPrice) * 100
  const distToResistance = ((nearestResistance.price - currentPrice) / currentPrice) * 100
  
  // Near support
  if (distToSupport < 1) {
    return `📈 BUY ZONE: Price near ${nearestSupport.strength} support at ₹${nearestSupport.price.toFixed(2)} (${distToSupport.toFixed(1)}% away). Good risk/reward.`
  }
  
  // Near resistance
  if (distToResistance < 1) {
    return `📉 SELL ZONE: Price near ${nearestResistance.strength} resistance at ₹${nearestResistance.price.toFixed(2)} (${distToResistance.toFixed(1)}% away). Consider booking profits.`
  }
  
  // In the middle of range
  if (distToSupport > 2 && distToResistance > 2) {
    if (distToSupport < distToResistance) {
      return `➡️ HOLD: Price in upper range, closer to resistance. Wait for dip to support at ₹${nearestSupport.price.toFixed(2)}.`
    } else {
      return `➡️ HOLD: Price in lower range, closer to support. Watch for bounce or breakdown.`
    }
  }
  
  return `➡️ HOLD: Monitor key levels - Support: ₹${nearestSupport.price.toFixed(2)}, Resistance: ₹${nearestResistance.price.toFixed(2)}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe') || '1M'
    
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required',
      }, { status: 400 })
    }
    
    const cacheKey = `sr-${symbol}-${timeframe}`
    const cached = srCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: Date.now(),
      })
    }
    
    console.log(`📏 Calculating support/resistance for ${symbol} (${timeframe})...`)
    
    const candles = await fetchCandleData(symbol, timeframe, request.url)
    
    if (candles.length === 0) {
      throw new Error('No candle data available')
    }
    
    const levels = findSupportResistanceLevels(candles)
    const trendlines = findTrendLines(candles)
    
    const currentPrice = candles[candles.length - 1].close
    
    // Find nearest support and resistance
    const resistanceLevels = levels.filter(l => l.price > currentPrice).sort((a, b) => a.price - b.price)
    const supportLevels = levels.filter(l => l.price < currentPrice).sort((a, b) => b.price - a.price)
    
    const nearestResistance = resistanceLevels[0] || null
    const nearestSupport = supportLevels[0] || null
    
    // Calculate trading range
    const upperRange = nearestResistance?.price || currentPrice * 1.05
    const lowerRange = nearestSupport?.price || currentPrice * 0.95
    const rangeWidth = upperRange - lowerRange
    const rangeWidthPercent = (rangeWidth / currentPrice) * 100
    
    const tradingRange = {
      upper: Number(upperRange.toFixed(2)),
      lower: Number(lowerRange.toFixed(2)),
      width: Number(rangeWidth.toFixed(2)),
      widthPercent: Number(rangeWidthPercent.toFixed(2)),
    }
    
    const recommendation = generateRecommendation(currentPrice, nearestSupport, nearestResistance, tradingRange)
    
    const result: SupportResistanceResult = {
      symbol,
      timeframe,
      currentPrice: Number(currentPrice.toFixed(2)),
      levels,
      trendlines,
      nearestSupport,
      nearestResistance,
      tradingRange,
      recommendation,
      analysisDate: new Date().toISOString(),
    }
    
    srCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    console.log(`✅ S/R analysis complete: ${levels.length} levels, ${trendlines.length} trendlines`)
    
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('Error in S/R analysis:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
