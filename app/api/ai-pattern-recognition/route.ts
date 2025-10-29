import { type NextRequest, NextResponse } from "next/server"

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface PatternMatch {
  pattern: string
  type: 'bullish' | 'bearish' | 'neutral' | 'reversal'
  confidence: number // 0-100
  startIndex: number
  endIndex: number
  description: string
  targetPrice?: number
  stopLoss?: number
  significance: 'high' | 'medium' | 'low'
}

interface OpeningAnalysis {
  time: string // 9:15 AM
  openPrice: number
  gapType: 'gap-up' | 'gap-down' | 'no-gap'
  gapPercentage: number
  volumeAtOpen: number
  prediction: string
  confidence: number
}

interface PatternRecognitionResult {
  symbol: string
  timeframe: string
  detectedPatterns: PatternMatch[]
  openingAnalysis: OpeningAnalysis | null
  overallSignal: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell'
  recommendation: string
  priceTarget?: number
  stopLoss?: number
  analysisDate: string
}

// Cache
const patternCache = new Map<string, { data: PatternRecognitionResult; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes

// Fetch candle data based on the actual timeframe
async function fetchCandleData(symbol: string, timeframe: string, requestUrl: string): Promise<CandleData[]> {
  try {
    const nsSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
    
    // Map timeframe to appropriate range and interval for pattern analysis
    let range = '3mo'
    let interval = '1d'
    
    // Determine range and interval based on selected timeframe
    if (timeframe === '1d-5m') {
      range = '1d'
      interval = '5m'
    } else if (timeframe === '1d-15m') {
      range = '1d'
      interval = '15m'
    } else if (timeframe === '1d-30m') {
      range = '1d'
      interval = '30m'
    } else if (timeframe === '1d-1h') {
      range = '1d'
      interval = '1h'
    } else if (timeframe === '5d' || timeframe === '5D') {
      range = '5d'
      interval = '15m'
    } else if (timeframe === '1mo' || timeframe === '1M') {
      range = '1mo'
      interval = '1h'
    } else if (timeframe === '3mo' || timeframe === '3M') {
      range = '3mo'
      interval = '1d'
    } else if (timeframe === '6mo' || timeframe === '6M') {
      range = '6mo'
      interval = '1d'
    } else if (timeframe === '1y' || timeframe === '1Y') {
      range = '1y'
      interval = '1wk'
    }
    
    // Extract origin from the request URL to call the correct host/port
    const url = new URL(requestUrl)
    const origin = url.origin
    const apiUrl = `${origin}/api/reliable-yahoo-chart`
    
    console.log(`📊 Pattern Recognition: Fetching ${timeframe} chart data (${range} / ${interval}) from ${apiUrl}`)
    
    const response = await fetch(
      `${apiUrl}?symbol=${nsSymbol}&interval=${interval}&range=${range}`,
      { signal: AbortSignal.timeout(25000) }
    )
    
    if (!response.ok) throw new Error(`Failed to fetch chart data`)
    
    const result = await response.json()
    
    if (result.success && result.data && Array.isArray(result.data)) {
      console.log(`✅ Fetched ${result.data.length} candles for pattern analysis`)
      return result.data
    }
    
    throw new Error('Invalid chart data')
  } catch (error) {
    console.error('Error fetching candle data:', error)
    throw error
  }
}

// Pattern Detection Functions

// 1. Head and Shoulders Pattern
function detectHeadAndShoulders(candles: CandleData[]): PatternMatch | null {
  if (candles.length < 20) return null
  
  const recent = candles.slice(-20)
  const highs = recent.map(c => c.high)
  
  // Find three peaks
  const peaks: number[] = []
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      peaks.push(i)
    }
  }
  
  if (peaks.length >= 3) {
    const [leftShoulder, head, rightShoulder] = peaks.slice(-3)
    
    // Check if head is highest
    if (highs[head] > highs[leftShoulder] && highs[head] > highs[rightShoulder]) {
      // Check if shoulders are roughly equal
      const shoulderDiff = Math.abs(highs[leftShoulder] - highs[rightShoulder]) / highs[leftShoulder]
      
      if (shoulderDiff < 0.05) { // Within 5%
        const neckline = Math.min(recent[leftShoulder].low, recent[rightShoulder].low)
        const currentPrice = recent[recent.length - 1].close
        
        return {
          pattern: 'Head and Shoulders',
          type: 'bearish',
          confidence: 75,
          startIndex: candles.length - 20 + leftShoulder,
          endIndex: candles.length - 1,
          description: 'Classic bearish reversal pattern - Head and shoulders formation detected',
          targetPrice: neckline - (highs[head] - neckline),
          stopLoss: highs[head],
          significance: 'high',
        }
      }
    }
  }
  
  return null
}

// 2. Double Top/Bottom
function detectDoubleTopBottom(candles: CandleData[]): PatternMatch | null {
  if (candles.length < 15) return null
  
  const recent = candles.slice(-15)
  const highs = recent.map(c => c.high)
  const lows = recent.map(c => c.low)
  
  // Find two peaks for double top
  const peaks: number[] = []
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      peaks.push(i)
    }
  }
  
  if (peaks.length >= 2) {
    const [peak1, peak2] = peaks.slice(-2)
    const diff = Math.abs(highs[peak1] - highs[peak2]) / highs[peak1]
    
    if (diff < 0.03 && (peak2 - peak1) >= 5) { // Within 3% and at least 5 candles apart
      return {
        pattern: 'Double Top',
        type: 'bearish',
        confidence: 70,
        startIndex: candles.length - 15 + peak1,
        endIndex: candles.length - 1,
        description: 'Double top pattern - resistance level confirmed twice, bearish reversal likely',
        targetPrice: recent[peak1].close - (highs[peak1] - lows[peak1]),
        stopLoss: highs[peak2] * 1.02,
        significance: 'high',
      }
    }
  }
  
  // Find two troughs for double bottom
  const troughs: number[] = []
  for (let i = 1; i < lows.length - 1; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      troughs.push(i)
    }
  }
  
  if (troughs.length >= 2) {
    const [trough1, trough2] = troughs.slice(-2)
    const diff = Math.abs(lows[trough1] - lows[trough2]) / lows[trough1]
    
    if (diff < 0.03 && (trough2 - trough1) >= 5) {
      return {
        pattern: 'Double Bottom',
        type: 'bullish',
        confidence: 70,
        startIndex: candles.length - 15 + trough1,
        endIndex: candles.length - 1,
        description: 'Double bottom pattern - support level confirmed twice, bullish reversal likely',
        targetPrice: recent[trough1].close + (highs[trough1] - lows[trough1]),
        stopLoss: lows[trough2] * 0.98,
        significance: 'high',
      }
    }
  }
  
  return null
}

// 3. Triangle Pattern (Ascending/Descending/Symmetrical)
function detectTriangle(candles: CandleData[]): PatternMatch | null {
  if (candles.length < 12) return null
  
  const recent = candles.slice(-12)
  const highs = recent.map(c => c.high)
  const lows = recent.map(c => c.low)
  
  // Calculate trend lines
  const highTrend = calculateTrendSlope(highs)
  const lowTrend = calculateTrendSlope(lows)
  
  // Ascending Triangle: flat top, rising bottom
  if (Math.abs(highTrend) < 0.01 && lowTrend > 0.02) {
    return {
      pattern: 'Ascending Triangle',
      type: 'bullish',
      confidence: 65,
      startIndex: candles.length - 12,
      endIndex: candles.length - 1,
      description: 'Ascending triangle - bullish continuation pattern, breakout above resistance expected',
      targetPrice: recent[recent.length - 1].close * 1.05,
      stopLoss: Math.min(...lows.slice(-5)),
      significance: 'medium',
    }
  }
  
  // Descending Triangle: falling top, flat bottom
  if (highTrend < -0.02 && Math.abs(lowTrend) < 0.01) {
    return {
      pattern: 'Descending Triangle',
      type: 'bearish',
      confidence: 65,
      startIndex: candles.length - 12,
      endIndex: candles.length - 1,
      description: 'Descending triangle - bearish continuation pattern, breakdown below support expected',
      targetPrice: recent[recent.length - 1].close * 0.95,
      stopLoss: Math.max(...highs.slice(-5)),
      significance: 'medium',
    }
  }
  
  // Symmetrical Triangle: converging lines
  if (highTrend < -0.01 && lowTrend > 0.01) {
    return {
      pattern: 'Symmetrical Triangle',
      type: 'neutral',
      confidence: 60,
      startIndex: candles.length - 12,
      endIndex: candles.length - 1,
      description: 'Symmetrical triangle - consolidation pattern, breakout direction will determine trend',
      significance: 'medium',
    }
  }
  
  return null
}

function calculateTrendSlope(values: number[]): number {
  const n = values.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumX2 += i * i
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return slope / (sumY / n) // Normalize by average value
}

// 4. Flag and Pennant Patterns
function detectFlagPennant(candles: CandleData[]): PatternMatch | null {
  if (candles.length < 15) return null
  
  const recent = candles.slice(-15)
  
  // Check for strong move (flagpole)
  const firstHalf = recent.slice(0, 5)
  const secondHalf = recent.slice(5)
  
  const poleChange = (firstHalf[firstHalf.length - 1].close - firstHalf[0].close) / firstHalf[0].close
  
  if (Math.abs(poleChange) > 0.05) { // At least 5% move
    // Check for consolidation (flag)
    const consolidationRange = (Math.max(...secondHalf.map(c => c.high)) - Math.min(...secondHalf.map(c => c.low))) / recent[0].close
    
    if (consolidationRange < 0.03) { // Tight consolidation
      const type = poleChange > 0 ? 'bullish' : 'bearish'
      
      return {
        pattern: poleChange > 0 ? 'Bull Flag' : 'Bear Flag',
        type,
        confidence: 70,
        startIndex: candles.length - 15,
        endIndex: candles.length - 1,
        description: `${type === 'bullish' ? 'Bullish' : 'Bearish'} flag pattern - continuation pattern after strong move`,
        targetPrice: recent[recent.length - 1].close * (1 + poleChange),
        significance: 'high',
      }
    }
  }
  
  return null
}

// 5. Candlestick Patterns (Doji, Hammer, Engulfing)
function detectCandlestickPatterns(candles: CandleData[]): PatternMatch[] {
  const patterns: PatternMatch[] = []
  
  if (candles.length < 3) return patterns
  
  const recent = candles.slice(-3)
  const lastCandle = recent[recent.length - 1]
  const prevCandle = recent[recent.length - 2]
  
  const bodySize = Math.abs(lastCandle.close - lastCandle.open)
  const totalRange = lastCandle.high - lastCandle.low
  
  // Doji (indecision)
  if (bodySize / totalRange < 0.1 && totalRange > 0) {
    patterns.push({
      pattern: 'Doji',
      type: 'reversal',
      confidence: 60,
      startIndex: candles.length - 1,
      endIndex: candles.length - 1,
      description: 'Doji candle - indecision, potential reversal signal',
      significance: 'medium',
    })
  }
  
  // Hammer (bullish reversal)
  const lowerShadow = lastCandle.open > lastCandle.close ? 
    lastCandle.close - lastCandle.low : 
    lastCandle.open - lastCandle.low
  const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close)
  
  if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
    patterns.push({
      pattern: 'Hammer',
      type: 'bullish',
      confidence: 65,
      startIndex: candles.length - 1,
      endIndex: candles.length - 1,
      description: 'Hammer pattern - bullish reversal after downtrend',
      significance: 'medium',
    })
  }
  
  // Bullish Engulfing
  const prevBody = Math.abs(prevCandle.close - prevCandle.open)
  const currBody = Math.abs(lastCandle.close - lastCandle.open)
  
  if (prevCandle.close < prevCandle.open && // Previous red
      lastCandle.close > lastCandle.open && // Current green
      lastCandle.close > prevCandle.open &&
      lastCandle.open < prevCandle.close &&
      currBody > prevBody) {
    patterns.push({
      pattern: 'Bullish Engulfing',
      type: 'bullish',
      confidence: 75,
      startIndex: candles.length - 2,
      endIndex: candles.length - 1,
      description: 'Bullish engulfing pattern - strong reversal signal',
      targetPrice: lastCandle.close * 1.03,
      significance: 'high',
    })
  }
  
  // Bearish Engulfing
  if (prevCandle.close > prevCandle.open && // Previous green
      lastCandle.close < lastCandle.open && // Current red
      lastCandle.open > prevCandle.close &&
      lastCandle.close < prevCandle.open &&
      currBody > prevBody) {
    patterns.push({
      pattern: 'Bearish Engulfing',
      type: 'bearish',
      confidence: 75,
      startIndex: candles.length - 2,
      endIndex: candles.length - 1,
      description: 'Bearish engulfing pattern - strong reversal signal',
      targetPrice: lastCandle.close * 0.97,
      significance: 'high',
    })
  }
  
  return patterns
}

// Analyze 9:15 AM opening
function analyzeOpening(candles: CandleData[]): OpeningAnalysis | null {
  if (candles.length < 2) return null
  
  const todayCandle = candles[candles.length - 1]
  const yesterdayCandle = candles[candles.length - 2]
  
  const gapPercentage = ((todayCandle.open - yesterdayCandle.close) / yesterdayCandle.close) * 100
  
  let gapType: 'gap-up' | 'gap-down' | 'no-gap'
  if (gapPercentage > 0.5) gapType = 'gap-up'
  else if (gapPercentage < -0.5) gapType = 'gap-down'
  else gapType = 'no-gap'
  
  let prediction = ''
  let confidence = 50
  
  if (gapType === 'gap-up') {
    if (gapPercentage > 2) {
      prediction = 'Strong gap up (>2%) - Likely continuation if volume confirms. Watch for gap fill if volume weak.'
      confidence = 70
    } else {
      prediction = 'Moderate gap up - Can go either way. Volume and first 15-min candle will decide direction.'
      confidence = 55
    }
  } else if (gapType === 'gap-down') {
    if (gapPercentage < -2) {
      prediction = 'Strong gap down (<-2%) - Likely downward pressure. Watch for bounce if oversold.'
      confidence = 70
    } else {
      prediction = 'Moderate gap down - Possible recovery if support holds. Monitor volume.'
      confidence = 55
    }
  } else {
    prediction = 'No significant gap - Regular price action expected. Follow trend.'
    confidence = 50
  }
  
  return {
    time: '9:15 AM',
    openPrice: todayCandle.open,
    gapType,
    gapPercentage: Number(gapPercentage.toFixed(2)),
    volumeAtOpen: todayCandle.volume,
    prediction,
    confidence,
  }
}

// Generate overall signal
function generateOverallSignal(patterns: PatternMatch[]): PatternRecognitionResult['overallSignal'] {
  if (patterns.length === 0) return 'hold'
  
  let bullishScore = 0
  let bearishScore = 0
  
  patterns.forEach(p => {
    const weight = p.significance === 'high' ? 1.5 : p.significance === 'medium' ? 1 : 0.5
    const confidenceFactor = p.confidence / 100
    
    if (p.type === 'bullish') {
      bullishScore += weight * confidenceFactor
    } else if (p.type === 'bearish') {
      bearishScore += weight * confidenceFactor
    }
  })
  
  const netScore = bullishScore - bearishScore
  
  if (netScore > 1.5) return 'strong-buy'
  if (netScore > 0.5) return 'buy'
  if (netScore < -1.5) return 'strong-sell'
  if (netScore < -0.5) return 'sell'
  return 'hold'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe') || '1D'
    
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required',
      }, { status: 400 })
    }
    
    const cacheKey = `pattern-${symbol}-${timeframe}`
    const cached = patternCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: Date.now(),
      })
    }
    
    console.log(`🔍 Detecting patterns for ${symbol} on ${timeframe} timeframe...`)
    
    const candles = await fetchCandleData(symbol, timeframe, request.url)
    
    if (candles.length === 0) {
      throw new Error('No candle data available')
    }
    
    console.log(`📊 Analyzing ${candles.length} candles for pattern detection on ${timeframe}`)
    
    const patterns: PatternMatch[] = []
    
    // Detect all patterns
    const headShoulders = detectHeadAndShoulders(candles)
    if (headShoulders) patterns.push(headShoulders)
    
    const doublePattern = detectDoubleTopBottom(candles)
    if (doublePattern) patterns.push(doublePattern)
    
    const triangle = detectTriangle(candles)
    if (triangle) patterns.push(triangle)
    
    const flag = detectFlagPennant(candles)
    if (flag) patterns.push(flag)
    
    patterns.push(...detectCandlestickPatterns(candles))
    
    // Opening analysis
    const openingAnalysis = analyzeOpening(candles)
    
    // Generate signal
    const overallSignal = generateOverallSignal(patterns)
    
    // Calculate targets
    const priceTarget = patterns.find(p => p.targetPrice)?.targetPrice
    const stopLoss = patterns.find(p => p.stopLoss)?.stopLoss
    
    let recommendation = ''
    switch (overallSignal) {
      case 'strong-buy':
        recommendation = `🚀 STRONG BUY: ${patterns.length} bullish patterns detected with high confidence`
        break
      case 'buy':
        recommendation = `📈 BUY: Multiple bullish signals present`
        break
      case 'hold':
        recommendation = `➡️ HOLD: Mixed signals or no clear pattern`
        break
      case 'sell':
        recommendation = `📉 SELL: Bearish patterns forming`
        break
      case 'strong-sell':
        recommendation = `🛑 STRONG SELL: Strong bearish signals detected`
        break
    }
    
    const result: PatternRecognitionResult = {
      symbol,
      timeframe,
      detectedPatterns: patterns,
      openingAnalysis,
      overallSignal,
      recommendation,
      priceTarget,
      stopLoss,
      analysisDate: new Date().toISOString(),
    }
    
    patternCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    console.log(`✅ Pattern detection complete: ${patterns.length} patterns found`)
    
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('Error in pattern recognition:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
