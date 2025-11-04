import { type NextRequest, NextResponse } from "next/server"

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface VolumeAnomaly {
  date: string
  volume: number
  percentageChange: number
  type: 'spike' | 'drop'
  significance: 'high' | 'medium' | 'low'
  priceChange: number
  interpretation: string
}

interface VolumePattern {
  pattern: string
  description: string
  confidence: number
  bullish: boolean
  significance: 'high' | 'medium' | 'low'
}

interface VolumeAnalysisResult {
  symbol: string
  period: string
  averageVolume: number
  currentVolume: number
  volumeTrend: 'increasing' | 'decreasing' | 'stable'
  anomalies: VolumeAnomaly[]
  patterns: VolumePattern[]
  accumulationDistribution: {
    score: number // -10 to +10
    trend: 'accumulation' | 'distribution' | 'neutral'
    strength: 'strong' | 'moderate' | 'weak'
    interpretation: string
  }
  recommendation: string
  analysisDate: string
}

// Cache
const volumeCache = new Map<string, { data: VolumeAnalysisResult; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes

// Fetch historical candle data
async function fetchCandleData(symbol: string, days: number = 30, requestUrl: string): Promise<CandleData[]> {
  try {
    const nsSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`
    
    // Calculate range parameter
    let range = '1mo'
    let interval = '1d'
    
    if (days <= 7) {
      range = '5d'
      interval = '1d'
    } else if (days <= 30) {
      range = '1mo'
      interval = '1d'
    } else if (days <= 90) {
      range = '3mo'
      interval = '1d'
    }
    
    // Use full URL for server-side fetch (relative URLs don't work in Next.js API routes)
    const url = new URL(requestUrl)
    const origin = url.origin
    const apiUrl = `${origin}/api/yahoo-chart`
    
    console.log(`📊 Volume Analysis: Fetching chart data from ${apiUrl}`)
    
    const response = await fetch(
      `${apiUrl}?symbol=${nsSymbol}&interval=${interval}&range=${range}`,
      { signal: AbortSignal.timeout(25000) }
    )
    
    if (!response.ok) throw new Error(`Failed to fetch chart data: ${response.status}`)
    
    const result = await response.json()
    
    if (result.success && result.data && Array.isArray(result.data)) {
      return result.data.slice(-days) // Get last N days
    }
    
    throw new Error('Invalid chart data structure')
  } catch (error) {
    console.error('Error fetching candle data:', error)
    throw error
  }
}

// Calculate volume statistics
function calculateVolumeStats(candles: CandleData[]) {
  if (candles.length === 0) {
    return { average: 0, stdDev: 0, median: 0 }
  }
  
  const volumes = candles.map(c => c.volume)
  const average = volumes.reduce((sum, v) => sum + v, 0) / volumes.length
  
  // Standard deviation
  const squaredDiffs = volumes.map(v => Math.pow(v - average, 2))
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / volumes.length
  const stdDev = Math.sqrt(variance)
  
  // Median
  const sorted = [...volumes].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  
  return { average, stdDev, median }
}

// Detect volume anomalies (spikes and drops)
function detectVolumeAnomalies(candles: CandleData[], stats: ReturnType<typeof calculateVolumeStats>): VolumeAnomaly[] {
  const anomalies: VolumeAnomaly[] = []
  const threshold = 1.5 // 1.5 standard deviations
  
  candles.forEach((candle, index) => {
    const deviation = (candle.volume - stats.average) / stats.stdDev
    
    // Skip if not significant
    if (Math.abs(deviation) < threshold) return
    
    const percentageChange = ((candle.volume - stats.average) / stats.average) * 100
    const type: 'spike' | 'drop' = deviation > 0 ? 'spike' : 'drop'
    
    // Determine significance
    let significance: 'high' | 'medium' | 'low'
    if (Math.abs(deviation) > 3) {
      significance = 'high'
    } else if (Math.abs(deviation) > 2) {
      significance = 'medium'
    } else {
      significance = 'low'
    }
    
    // Calculate price change on that day
    const priceChange = ((candle.close - candle.open) / candle.open) * 100
    
    // Generate interpretation
    const interpretation = generateAnomalyInterpretation(type, significance, priceChange, percentageChange)
    
    anomalies.push({
      date: new Date(candle.timestamp).toISOString().split('T')[0],
      volume: candle.volume,
      percentageChange: Math.round(percentageChange),
      type,
      significance,
      priceChange: Number(priceChange.toFixed(2)),
      interpretation,
    })
  })
  
  return anomalies.slice(-10) // Return last 10 anomalies
}

function generateAnomalyInterpretation(
  type: 'spike' | 'drop',
  significance: string,
  priceChange: number,
  volumeChange: number
): string {
  if (type === 'spike') {
    if (priceChange > 2) {
      return `${significance.toUpperCase()}: Volume spike (+${Math.round(volumeChange)}%) with price up ${priceChange.toFixed(1)}% - Strong buying pressure`
    } else if (priceChange < -2) {
      return `${significance.toUpperCase()}: Volume spike (+${Math.round(volumeChange)}%) with price down ${Math.abs(priceChange).toFixed(1)}% - Possible distribution/selling`
    } else {
      return `${significance.toUpperCase()}: Volume spike (+${Math.round(volumeChange)}%) with minimal price change - Potential accumulation`
    }
  } else {
    if (Math.abs(priceChange) > 2) {
      return `Volume drop (${Math.round(volumeChange)}%) with ${priceChange > 0 ? 'price up' : 'price down'} - Low conviction move`
    } else {
      return `Volume drop (${Math.round(volumeChange)}%) - Reduced interest or consolidation phase`
    }
  }
}

// Detect volume patterns
function detectVolumePatterns(candles: CandleData[], stats: ReturnType<typeof calculateVolumeStats>): VolumePattern[] {
  const patterns: VolumePattern[] = []
  
  if (candles.length < 5) return patterns
  
  const recent5 = candles.slice(-5)
  const recent10 = candles.slice(-10)
  
  // Pattern 1: Climax Volume (Very high volume with price reversal)
  const lastCandle = recent5[recent5.length - 1]
  if (lastCandle.volume > stats.average * 2.5) {
    const priceChange = ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100
    const bullish = priceChange > 1
    
    patterns.push({
      pattern: 'Climax Volume',
      description: `Extreme volume detected (${Math.round((lastCandle.volume / stats.average) * 100)}% of avg). ${bullish ? 'Possible buying climax - watch for reversal' : 'Possible selling climax - watch for bounce'}`,
      confidence: 85,
      bullish: !bullish, // Climax often precedes reversal
      significance: 'high',
    })
  }
  
  // Pattern 2: On-Balance Volume Rising with Price
  const obvTrend = calculateOBVTrend(recent10)
  if (obvTrend.rising && obvTrend.priceRising) {
    patterns.push({
      pattern: 'Strong Accumulation',
      description: 'Volume and price both trending up - healthy uptrend with institutional buying',
      confidence: 80,
      bullish: true,
      significance: 'high',
    })
  } else if (obvTrend.falling && obvTrend.priceFalling) {
    patterns.push({
      pattern: 'Strong Distribution',
      description: 'Volume and price both trending down - bearish pressure with institutional selling',
      confidence: 80,
      bullish: false,
      significance: 'high',
    })
  } else if (obvTrend.rising && obvTrend.priceFalling) {
    patterns.push({
      pattern: 'Bullish Divergence',
      description: 'Volume rising while price falling - possible accumulation before reversal up',
      confidence: 70,
      bullish: true,
      significance: 'medium',
    })
  } else if (obvTrend.falling && obvTrend.priceRising) {
    patterns.push({
      pattern: 'Bearish Divergence',
      description: 'Volume falling while price rising - weak uptrend, possible reversal down',
      confidence: 70,
      bullish: false,
      significance: 'medium',
    })
  }
  
  // Pattern 3: Volume Contraction/Expansion
  const volumeTrend = analyzeVolumeTrend(recent10)
  if (volumeTrend === 'contracting') {
    patterns.push({
      pattern: 'Volume Contraction',
      description: 'Decreasing volume - consolidation phase, potential breakout coming',
      confidence: 65,
      bullish: null as any, // Direction unclear
      significance: 'medium',
    })
  } else if (volumeTrend === 'expanding') {
    patterns.push({
      pattern: 'Volume Expansion',
      description: 'Increasing volume - growing interest, trend strengthening',
      confidence: 70,
      bullish: recent10[recent10.length - 1].close > recent10[0].close,
      significance: 'medium',
    })
  }
  
  return patterns
}

function calculateOBVTrend(candles: CandleData[]) {
  if (candles.length < 2) return { rising: false, falling: false, priceRising: false, priceFalling: false }
  
  let obv = 0
  const obvValues: number[] = [0]
  
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv += candles[i].volume
    } else if (candles[i].close < candles[i - 1].close) {
      obv -= candles[i].volume
    }
    obvValues.push(obv)
  }
  
  const obvSlope = (obvValues[obvValues.length - 1] - obvValues[0]) / obvValues.length
  const priceSlope = (candles[candles.length - 1].close - candles[0].close) / candles.length
  
  return {
    rising: obvSlope > 0,
    falling: obvSlope < 0,
    priceRising: priceSlope > 0,
    priceFalling: priceSlope < 0,
  }
}

function analyzeVolumeTrend(candles: CandleData[]): 'contracting' | 'expanding' | 'stable' {
  if (candles.length < 5) return 'stable'
  
  const firstHalf = candles.slice(0, Math.floor(candles.length / 2))
  const secondHalf = candles.slice(Math.floor(candles.length / 2))
  
  const firstAvg = firstHalf.reduce((sum, c) => sum + c.volume, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, c) => sum + c.volume, 0) / secondHalf.length
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100
  
  if (change > 20) return 'expanding'
  if (change < -20) return 'contracting'
  return 'stable'
}

// Calculate Accumulation/Distribution score
function calculateAccumulationDistribution(candles: CandleData[]): VolumeAnalysisResult['accumulationDistribution'] {
  if (candles.length < 5) {
    return {
      score: 0,
      trend: 'neutral',
      strength: 'weak',
      interpretation: 'Insufficient data for A/D analysis',
    }
  }
  
  let adScore = 0
  let strongSignals = 0
  
  candles.slice(-10).forEach((candle) => {
    const priceChange = candle.close - candle.open
    const range = candle.high - candle.low
    const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5
    
    // Volume-weighted score
    const volumeMultiplier = candle.volume / (candles.reduce((sum, c) => sum + c.volume, 0) / candles.length)
    
    // If closing near high with volume - accumulation
    if (closePosition > 0.7 && priceChange > 0) {
      adScore += closePosition * volumeMultiplier
      if (volumeMultiplier > 1.5) strongSignals++
    }
    // If closing near low with volume - distribution
    else if (closePosition < 0.3 && priceChange < 0) {
      adScore -= (1 - closePosition) * volumeMultiplier
      if (volumeMultiplier > 1.5) strongSignals++
    }
  })
  
  // Normalize score to -10 to +10 range
  const normalizedScore = Math.max(-10, Math.min(10, adScore))
  
  // Determine trend
  let trend: 'accumulation' | 'distribution' | 'neutral'
  if (normalizedScore > 2) trend = 'accumulation'
  else if (normalizedScore < -2) trend = 'distribution'
  else trend = 'neutral'
  
  // Determine strength
  let strength: 'strong' | 'moderate' | 'weak'
  if (Math.abs(normalizedScore) > 5 || strongSignals >= 3) strength = 'strong'
  else if (Math.abs(normalizedScore) > 2 || strongSignals >= 2) strength = 'moderate'
  else strength = 'weak'
  
  // Generate interpretation
  let interpretation: string
  if (trend === 'accumulation') {
    interpretation = `${strength.toUpperCase()} ACCUMULATION: Institutional buying detected - ${strongSignals} strong volume signals. Bullish outlook.`
  } else if (trend === 'distribution') {
    interpretation = `${strength.toUpperCase()} DISTRIBUTION: Institutional selling detected - ${strongSignals} strong volume signals. Bearish outlook.`
  } else {
    interpretation = `NEUTRAL: Balanced buying and selling pressure. No clear institutional activity.`
  }
  
  return {
    score: Number(normalizedScore.toFixed(2)),
    trend,
    strength,
    interpretation,
  }
}

// Generate final recommendation
function generateRecommendation(analysis: Omit<VolumeAnalysisResult, 'recommendation' | 'analysisDate'>): string {
  const { volumeTrend, accumulationDistribution, patterns, anomalies } = analysis
  
  const bullishScore = patterns.filter(p => p.bullish).reduce((sum, p) => sum + p.confidence, 0)
  const bearishScore = patterns.filter(p => !p.bullish).reduce((sum, p) => sum + p.confidence, 0)
  
  const adScore = accumulationDistribution.score
  const highAnomalies = anomalies.filter(a => a.significance === 'high').length
  
  // Calculate total score
  let score = 0
  score += adScore * 2 // A/D score weighted heavily
  score += (bullishScore - bearishScore) / 20
  score += volumeTrend === 'increasing' ? 1 : volumeTrend === 'decreasing' ? -1 : 0
  
  if (score > 4) {
    return `🚀 STRONG BUY: Strong accumulation pattern detected with ${volumeTrend} volume. High probability of upward move.`
  } else if (score > 2) {
    return `📈 BUY: Positive volume indicators suggest accumulation. Consider entry positions.`
  } else if (score > -2) {
    return `➡️ HOLD: Mixed volume signals. ${volumeTrend} volume trend with neutral A/D. Wait for clarity.`
  } else if (score > -4) {
    return `📉 SELL: Negative volume indicators suggest distribution. Consider reducing exposure.`
  } else {
    return `🛑 STRONG SELL: Strong distribution pattern detected. ${highAnomalies} high-impact anomalies. High risk.`
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const days = parseInt(searchParams.get('days') || '30')
    
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required',
      }, { status: 400 })
    }
    
    // Check cache
    const cacheKey = `volume-analysis-${symbol}-${days}`
    const cached = volumeCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: Date.now(),
      })
    }
    
    console.log(`📊 Starting volume analysis for ${symbol} (${days} days)...`)
    
    // Fetch candle data
    const candles = await fetchCandleData(symbol, days, request.url)
    
    if (candles.length === 0) {
      throw new Error('No candle data available for analysis')
    }
    
    // Calculate statistics
    const stats = calculateVolumeStats(candles)
    
    // Detect anomalies
    const anomalies = detectVolumeAnomalies(candles, stats)
    
    // Detect patterns
    const patterns = detectVolumePatterns(candles, stats)
    
    // Calculate A/D
    const ad = calculateAccumulationDistribution(candles)
    
    // Determine volume trend
    const recentVolumes = candles.slice(-5).map(c => c.volume)
    const avgRecentVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length
    let volumeTrend: 'increasing' | 'decreasing' | 'stable'
    
    if (avgRecentVolume > stats.average * 1.2) {
      volumeTrend = 'increasing'
    } else if (avgRecentVolume < stats.average * 0.8) {
      volumeTrend = 'decreasing'
    } else {
      volumeTrend = 'stable'
    }
    
    const currentVolume = candles[candles.length - 1]?.volume || 0
    
    const result: Omit<VolumeAnalysisResult, 'recommendation' | 'analysisDate'> = {
      symbol,
      period: `${days} days`,
      averageVolume: Math.round(stats.average),
      currentVolume,
      volumeTrend,
      anomalies,
      patterns,
      accumulationDistribution: ad,
    }
    
    const recommendation = generateRecommendation(result)
    
    const finalResult: VolumeAnalysisResult = {
      ...result,
      recommendation,
      analysisDate: new Date().toISOString(),
    }
    
    // Cache result
    volumeCache.set(cacheKey, { data: finalResult, timestamp: Date.now() })
    
    console.log(`✅ Volume analysis complete: ${ad.trend} (${ad.score})`)
    
    return NextResponse.json({
      success: true,
      data: finalResult,
      cached: false,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('Error in volume analysis:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
