import { NextRequest, NextResponse } from "next/server"

interface ChartAnalysisRequest {
  symbol: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  timeframe: string
  chartData?: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>
}

interface TechnicalIndicators {
  rsi?: number
  bollingerBands?: {
    upper: number
    middle: number
    lower: number
    percentB: number // %B indicator (position within bands)
    bandwidth: number // Band width (volatility measure)
  }
  fibonacci?: {
    level_0: number
    level_236: number
    level_382: number
    level_500: number
    level_618: number
    level_786: number
    level_100: number
  }
  volume?: {
    current: number
    average: number
    ratio: number // Current / Average
    trend: 'surge' | 'above-average' | 'normal' | 'below-average' | 'declining'
  }
  macd?: {
    value: number
    signal: number
    histogram: number
    trend: 'bullish' | 'bearish' | 'neutral'
  }
  atr?: {
    value: number
    volatility: 'low' | 'medium' | 'high' | 'extreme'
  }
  stochastic?: {
    k: number
    d: number
    signal: 'overbought' | 'oversold' | 'neutral'
  }
}

interface MarketCondition {
  state: 'trending' | 'ranging' | 'volatile' | 'consolidating'
  trend: 'strong-bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong-bearish'
  volatility: 'low' | 'medium' | 'high' | 'extreme'
  momentum: number
  atr: number
  reasoning: string
}

interface NewsSentiment {
  sentiment: 'very-positive' | 'positive' | 'neutral' | 'negative' | 'very-negative' | 'unavailable'
  score: number // -1 to +1
  articlesCount: number
  keyTopics: string[]
  impact: 'high' | 'medium' | 'low' | 'none'
  reasoning: string
}

interface IndicatorSelection {
  chosen: string[]
  reasoning: string
  weights: { [key: string]: number }
}

export async function POST(request: NextRequest) {
  try {
    const data: ChartAnalysisRequest = await request.json()
    
    console.log(`🤖 AI Analysis requested for ${data.symbol}`)

    // STEP 1: Analyze market condition from OHLC data
    const marketCondition = analyzeMarketCondition(data)
    console.log(`📊 Market Condition: ${marketCondition.state} | Trend: ${marketCondition.trend} | Volatility: ${marketCondition.volatility}`)

    // STEP 2: Fetch news sentiment for the stock (if available)
    const newsSentiment = await fetchNewsSentiment(data.symbol, request.url)
    console.log(`📰 News Sentiment: ${newsSentiment.sentiment} (${newsSentiment.articlesCount} articles)`)

    // STEP 3: AI decides which indicators to use based on market condition
    const selectedIndicators = selectIndicatorsBasedOnCondition(marketCondition, newsSentiment)
    console.log(`🎯 AI Selected Indicators: ${selectedIndicators.chosen.join(', ')}`)

    // STEP 4: Calculate only the selected indicators
    const indicators = calculateTechnicalIndicators(data, selectedIndicators.chosen)
    
    // STEP 5: Generate AI-driven analysis with reasoning
    const analysis = generateAIAnalysis(data, indicators, marketCondition, newsSentiment, selectedIndicators)

    console.log(`✅ AI Analysis complete for ${data.symbol}`)
    console.log(`🤖 AI Decision: ${analysis.action} with ${analysis.confidence}% confidence`)
    console.log(`💡 AI Reasoning: ${selectedIndicators.reasoning}`)

    return NextResponse.json({
      success: true,
      symbol: data.symbol,
      analysis,
      indicators,
      marketCondition,
      newsSentiment,
      aiReasoning: selectedIndicators.reasoning,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ AI Analysis failed:", error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Analysis failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

// ===== AI MARKET CONDITION ANALYZER =====
function analyzeMarketCondition(data: ChartAnalysisRequest): MarketCondition {
  const priceRange = data.high - data.low
  const priceChange = data.change
  const changePercent = Math.abs(data.changePercent)
  
  // Calculate ATR (Average True Range) - volatility measure
  const atr = priceRange / data.currentPrice * 100
  
  // Calculate momentum
  const momentum = (data.currentPrice - data.previousClose) / data.previousClose * 100
  
  // Determine volatility level
  let volatility: 'low' | 'medium' | 'high' | 'extreme'
  if (atr < 1) volatility = 'low'
  else if (atr < 2) volatility = 'medium'
  else if (atr < 4) volatility = 'high'
  else volatility = 'extreme'
  
  // Determine trend strength
  let trend: 'strong-bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong-bearish'
  if (changePercent > 3) {
    trend = priceChange > 0 ? 'strong-bullish' : 'strong-bearish'
  } else if (changePercent > 1.5) {
    trend = priceChange > 0 ? 'bullish' : 'bearish'
  } else {
    trend = 'neutral'
  }
  
  // Determine market state
  let state: 'trending' | 'ranging' | 'volatile' | 'consolidating'
  const pricePosition = ((data.currentPrice - data.low) / priceRange) * 100
  
  if (volatility === 'extreme') {
    state = 'volatile'
  } else if (changePercent > 2) {
    state = 'trending'
  } else if (pricePosition > 40 && pricePosition < 60 && changePercent < 1) {
    state = 'ranging'
  } else {
    state = 'consolidating'
  }
  
  // Generate reasoning
  const reasoning = `Market is ${state} with ${trend} trend. ATR at ${atr.toFixed(2)}% indicates ${volatility} volatility. Price moved ${changePercent.toFixed(2)}% ${priceChange > 0 ? 'upward' : 'downward'} within ${priceRange.toFixed(2)} range. ${
    state === 'trending' ? 'Strong directional movement detected.' :
    state === 'ranging' ? 'Price oscillating in a defined range.' :
    state === 'volatile' ? 'High volatility creating uncertainty.' :
    'Price consolidating, waiting for breakout.'
  }`
  
  return {
    state,
    trend,
    volatility,
    momentum,
    atr,
    reasoning
  }
}

// ===== NEWS SENTIMENT FETCHER =====
async function fetchNewsSentiment(symbol: string, requestUrl: string): Promise<NewsSentiment> {
  try {
    // Extract origin from the request URL instead of hardcoding
    // This ensures it works on any port (3000, 3002) and in production
    const url = new URL(requestUrl)
    const origin = url.origin
    const response = await fetch(`${origin}/api/ai-news-analysis?symbol=${symbol}`, {
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) throw new Error('News API unavailable')
    
    const newsData = await response.json()
    
    if (newsData.success && newsData.analysis) {
      // Extract sentiment from AI news analysis
      const sentiment = newsData.analysis.overallSentiment?.toLowerCase() || 'neutral'
      const score = newsData.analysis.sentimentScore || 0
      
      return {
        sentiment: sentiment as any,
        score,
        articlesCount: newsData.analysis.newsCount || 0,
        keyTopics: newsData.analysis.keyTopics || [],
        impact: score > 0.5 ? 'high' : score > 0.2 ? 'medium' : 'low',
        reasoning: newsData.analysis.summary || 'News sentiment analyzed from recent articles.'
      }
    }
  } catch (error) {
    console.log('📰 News unavailable, proceeding with technical-only analysis')
  }
  
  return {
    sentiment: 'unavailable',
    score: 0,
    articlesCount: 0,
    keyTopics: [],
    impact: 'none',
    reasoning: 'No recent news available. Analysis based purely on technical indicators.'
  }
}

// ===== AI INDICATOR SELECTOR =====
function selectIndicatorsBasedOnCondition(
  marketCondition: MarketCondition,
  newsSentiment: NewsSentiment
): IndicatorSelection {
  const chosen: string[] = []
  const weights: { [key: string]: number } = {}
  let reasoning = ''
  
  // ALWAYS use Volume for confirmation
  chosen.push('volume')
  weights['volume'] = 1.0
  
  // ALWAYS use Fibonacci for support/resistance
  chosen.push('fibonacci')
  weights['fibonacci'] = 1.0
  
  // Select based on MARKET CONDITION
  if (marketCondition.state === 'trending') {
    // Trending markets: RSI + MACD are best
    chosen.push('rsi', 'macd')
    weights['rsi'] = 1.5  // High weight
    weights['macd'] = 1.5
    reasoning = `Market is ${marketCondition.trend} trending. RSI and MACD excel at confirming trend strength and momentum shifts. `
  }
  else if (marketCondition.state === 'ranging') {
    // Ranging markets: Bollinger Bands + Stochastic
    chosen.push('bollingerBands', 'stochastic')
    weights['bollingerBands'] = 1.5
    weights['stochastic'] = 1.2
    reasoning = `Market is ranging/sideways. Bollinger Bands and Stochastic identify overbought/oversold bounces within the range. `
  }
  else if (marketCondition.state === 'volatile') {
    // Volatile markets: ATR + Bollinger Bands
    chosen.push('atr', 'bollingerBands', 'rsi')
    weights['atr'] = 1.8  // Very high weight
    weights['bollingerBands'] = 1.3
    weights['rsi'] = 1.0
    reasoning = `Market is highly volatile (ATR: ${marketCondition.atr.toFixed(2)}%). ATR measures risk, Bollinger Bands show volatility extremes, RSI confirms oversold/overbought. `
  }
  else {
    // Consolidating: Wait for breakout signals
    chosen.push('bollingerBands', 'rsi')
    weights['bollingerBands'] = 1.2
    weights['rsi'] = 1.0
    reasoning = `Market is consolidating. Watching for Bollinger Band squeeze breakout and RSI directional confirmation. `
  }
  
  // Adjust based on NEWS SENTIMENT
  if (newsSentiment.impact === 'high') {
    // Strong news: Weight fundamentals over technicals
    Object.keys(weights).forEach(key => weights[key] *= 0.7)
    reasoning += `⚠️ HIGH NEWS IMPACT detected (${newsSentiment.sentiment}). Technical indicators weighted down 30% due to news-driven price action. ${newsSentiment.reasoning}`
  } else if (newsSentiment.impact === 'medium') {
    reasoning += `📰 Moderate news impact (${newsSentiment.sentiment}). Combining technical signals with news sentiment. `
  } else {
    reasoning += `📊 No significant news impact. Pure technical analysis. `
  }
  
  // Adjust based on VOLATILITY
  if (marketCondition.volatility === 'extreme') {
    reasoning += `🔥 EXTREME volatility warning! Widen stop losses and reduce position size.`
  }
  
  return {
    chosen,
    reasoning,
    weights
  }
}

// ===== MODIFIED INDICATOR CALCULATOR (Dynamic) =====
function calculateTechnicalIndicators(data: ChartAnalysisRequest, selectedIndicators: string[]): TechnicalIndicators {
  const indicators: TechnicalIndicators = {}
  
  selectedIndicators.forEach(indicator => {
    switch (indicator) {
      case 'rsi':
        indicators.rsi = calculateRSI(data)
        break
      case 'bollingerBands':
        indicators.bollingerBands = calculateBollingerBands(data)
        break
      case 'fibonacci':
        indicators.fibonacci = calculateFibonacci(data)
        break
      case 'volume':
        indicators.volume = calculateVolumeAnalysis(data)
        break
      case 'macd':
        indicators.macd = calculateMACD(data)
        break
      case 'atr':
        indicators.atr = calculateATR(data)
        break
      case 'stochastic':
        indicators.stochastic = calculateStochastic(data)
        break
    }
  })
  
  return indicators
}

// ===== AI ANALYSIS GENERATOR =====
function generateAIAnalysis(
  data: ChartAnalysisRequest,
  indicators: TechnicalIndicators,
  marketCondition: MarketCondition,
  newsSentiment: NewsSentiment,
  selectedIndicators: IndicatorSelection
) {
  // Use the original generateVisualAnalysis but with AI context
  const baseAnalysis = generateVisualAnalysis(data, indicators)
  
  // Enhance with AI reasoning
  const aiEnhancedAnalysis = {
    ...baseAnalysis,
    aiReasoning: {
      marketCondition: marketCondition.reasoning,
      indicatorSelection: selectedIndicators.reasoning,
      newsSentiment: newsSentiment.reasoning,
      finalDecision: `AI analyzed ${selectedIndicators.chosen.length} indicators (${selectedIndicators.chosen.join(', ')}) based on ${marketCondition.state} market condition. ${newsSentiment.impact !== 'none' ? `News sentiment (${newsSentiment.sentiment}) influenced decision.` : ''} Confidence: ${baseAnalysis.confidence}%`
    }
  }
  
  return aiEnhancedAnalysis
}

// Calculate RSI (Relative Strength Index) - 14 period
function calculateRSI(data: ChartAnalysisRequest): number {
  // For real-time calculation with limited data, we'll use a simplified approach
  // In production, you'd want historical close prices for accurate RSI
  
  const priceChange = data.change
  const changePercent = Math.abs(data.changePercent)
  
  // Estimate RSI based on current momentum and price position
  const priceRange = data.high - data.low
  const pricePosition = ((data.currentPrice - data.low) / priceRange) * 100
  
  // Strong upward momentum
  if (priceChange > 0 && changePercent > 2) {
    return Math.min(70 + (changePercent * 3), 95)
  }
  // Strong downward momentum
  else if (priceChange < 0 && changePercent > 2) {
    return Math.max(30 - (changePercent * 3), 5)
  }
  // Moderate position-based RSI
  else {
    // Map price position (0-100) to RSI (30-70)
    return 30 + (pricePosition * 0.4)
  }
}

// Calculate Bollinger Bands (20-period, 2 standard deviations)
function calculateBollingerBands(data: ChartAnalysisRequest) {
  // Middle band = 20-period SMA (we'll use high/low/close average as proxy)
  const typicalPrice = (data.high + data.low + data.currentPrice) / 3
  const middle = typicalPrice
  
  // Estimate standard deviation from price range
  const priceRange = data.high - data.low
  const volatility = Math.abs(data.changePercent) / 100
  const estimatedStdDev = priceRange * 0.5 * (1 + volatility)
  
  const upper = middle + (2 * estimatedStdDev)
  const lower = middle - (2 * estimatedStdDev)
  
  // %B = (Price - Lower) / (Upper - Lower)
  const percentB = (data.currentPrice - lower) / (upper - lower)
  
  // Bandwidth = (Upper - Lower) / Middle
  const bandwidth = (upper - lower) / middle
  
  return {
    upper: parseFloat(upper.toFixed(2)),
    middle: parseFloat(middle.toFixed(2)),
    lower: parseFloat(lower.toFixed(2)),
    percentB: parseFloat(percentB.toFixed(3)),
    bandwidth: parseFloat(bandwidth.toFixed(3))
  }
}

// Calculate Fibonacci Retracement Levels
function calculateFibonacci(data: ChartAnalysisRequest) {
  const high = data.high
  const low = data.low
  const range = high - low
  
  return {
    level_0: parseFloat(low.toFixed(2)),
    level_236: parseFloat((low + range * 0.236).toFixed(2)),
    level_382: parseFloat((low + range * 0.382).toFixed(2)),
    level_500: parseFloat((low + range * 0.500).toFixed(2)),
    level_618: parseFloat((low + range * 0.618).toFixed(2)),
    level_786: parseFloat((low + range * 0.786).toFixed(2)),
    level_100: parseFloat(high.toFixed(2))
  }
}

// Calculate Volume Analysis
function calculateVolumeAnalysis(data: ChartAnalysisRequest) {
  const currentVolume = data.volume
  
  // Estimate average volume (in production, use 20-day historical average)
  // For now, use previous close as proxy for typical trading
  const estimatedAvgVolume = currentVolume * 0.8 // Assume current is slightly above average
  
  const ratio = currentVolume / estimatedAvgVolume
  
  let trend: 'surge' | 'above-average' | 'normal' | 'below-average' | 'declining'
  if (ratio > 2) {
    trend = 'surge'
  } else if (ratio > 1.2) {
    trend = 'above-average'
  } else if (ratio > 0.8) {
    trend = 'normal'
  } else if (ratio > 0.5) {
    trend = 'below-average'
  } else {
    trend = 'declining'
  }
  
  return {
    current: currentVolume,
    average: estimatedAvgVolume,
    ratio: parseFloat(ratio.toFixed(2)),
    trend
  }
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(data: ChartAnalysisRequest) {
  // Simplified MACD based on current momentum
  const changePercent = data.changePercent
  const pricePosition = ((data.currentPrice - data.low) / (data.high - data.low)) * 100
  
  // Estimate MACD line (12-26 EMA difference)
  const macdValue = changePercent * (pricePosition / 50)
  
  // Estimate signal line (9-period EMA of MACD)
  const signal = macdValue * 0.8
  
  // Histogram = MACD - Signal
  const histogram = macdValue - signal
  
  let trend: 'bullish' | 'bearish' | 'neutral'
  if (histogram > 0.5) trend = 'bullish'
  else if (histogram < -0.5) trend = 'bearish'
  else trend = 'neutral'
  
  return {
    value: parseFloat(macdValue.toFixed(3)),
    signal: parseFloat(signal.toFixed(3)),
    histogram: parseFloat(histogram.toFixed(3)),
    trend
  }
}

// Calculate ATR (Average True Range)
function calculateATR(data: ChartAnalysisRequest) {
  const trueRange = data.high - data.low
  const atrValue = (trueRange / data.currentPrice) * 100
  
  let volatility: 'low' | 'medium' | 'high' | 'extreme'
  if (atrValue < 1) volatility = 'low'
  else if (atrValue < 2) volatility = 'medium'
  else if (atrValue < 4) volatility = 'high'
  else volatility = 'extreme'
  
  return {
    value: parseFloat(atrValue.toFixed(2)),
    volatility
  }
}

// Calculate Stochastic Oscillator
function calculateStochastic(data: ChartAnalysisRequest) {
  // %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
  const k = ((data.currentPrice - data.low) / (data.high - data.low)) * 100
  
  // %D = 3-period SMA of %K (approximated)
  const d = k * 0.9
  
  let signal: 'overbought' | 'oversold' | 'neutral'
  if (k > 80) signal = 'overbought'
  else if (k < 20) signal = 'oversold'
  else signal = 'neutral'
  
  return {
    k: parseFloat(k.toFixed(1)),
    d: parseFloat(d.toFixed(1)),
    signal
  }
}

function generateVisualAnalysis(data: ChartAnalysisRequest, indicators: TechnicalIndicators) {
  const isPositive = data.change > 0
  const volatility = Math.abs(data.changePercent)
  const priceRange = data.high - data.low
  const pricePosition = ((data.currentPrice - data.low) / priceRange) * 100

  // Calculate support and resistance levels using Fibonacci
  const supportLevels = calculateSupportLevels(data, indicators)
  const resistanceLevels = calculateResistanceLevels(data, indicators)

  // Advanced sentiment and action based on indicator confluence
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let confidence = 50
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium'
  
  // Score each indicator (0-25 points each, max 100)
  let bullishScore = 0
  let bearishScore = 0
  
  // 1. RSI Analysis (25 points)
  if (indicators.rsi !== undefined) {
    if (indicators.rsi < 30) {
      bullishScore += 25 // Oversold - bullish signal
    } else if (indicators.rsi > 70) {
      bearishScore += 25 // Overbought - bearish signal
    } else if (indicators.rsi > 50) {
      bullishScore += (indicators.rsi - 50) * 0.5 // Mildly bullish
    } else {
      bearishScore += (50 - indicators.rsi) * 0.5 // Mildly bearish
    }
  }
  
  // 2. Bollinger Bands Analysis (25 points)
  if (indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined) {
    if (indicators.bollingerBands.percentB < 0.2) {
      bullishScore += 20 // Near lower band - oversold
    } else if (indicators.bollingerBands.percentB > 0.8) {
      bearishScore += 20 // Near upper band - overbought
    }
    
    // Band squeeze = low volatility (potential breakout)
    if (indicators.bollingerBands.bandwidth !== undefined && indicators.bollingerBands.bandwidth < 0.1) {
      bullishScore += 5 // Add to both for potential breakout
      bearishScore += 5
    }
  }
  
  // 3. Volume Confirmation (25 points)
  if (indicators.volume && indicators.volume.trend) {
    if (indicators.volume.trend === 'surge') {
      if (isPositive) bullishScore += 25 // High volume on up day = strong buying
      else bearishScore += 25 // High volume on down day = strong selling
    } else if (indicators.volume.trend === 'above-average') {
      if (isPositive) bullishScore += 15
      else bearishScore += 15
    } else if (indicators.volume.trend === 'declining') {
      // Low volume = weak signal, reduce confidence
      confidence -= 10
    }
  }
  
  // 4. Fibonacci Level Analysis (25 points)
  if (indicators.fibonacci) {
    const fibLevels = [
      indicators.fibonacci.level_236,
      indicators.fibonacci.level_382,
      indicators.fibonacci.level_500,
      indicators.fibonacci.level_618,
      indicators.fibonacci.level_786
    ]
    
    // Check proximity to key Fibonacci levels (within 1%)
    const nearFibLevel = fibLevels.find(level => 
      Math.abs(data.currentPrice - level) / data.currentPrice < 0.01
    )
    
    if (nearFibLevel) {
      if (data.currentPrice < indicators.fibonacci.level_500) {
        bullishScore += 15 // Near support Fib level
      } else {
        bearishScore += 15 // Near resistance Fib level
      }
    }
  }
  
  // 5. MACD Analysis (if selected)
  if (indicators.macd) {
    if (indicators.macd.trend === 'bullish') {
      bullishScore += 20
    } else if (indicators.macd.trend === 'bearish') {
      bearishScore += 20
    }
  }
  
  // 6. Stochastic Analysis (if selected)
  if (indicators.stochastic) {
    if (indicators.stochastic.signal === 'oversold') {
      bullishScore += 15
    } else if (indicators.stochastic.signal === 'overbought') {
      bearishScore += 15
    }
  }
  
  // Price momentum alignment
  if (isPositive && pricePosition > 60) {
    bullishScore += 10
  } else if (!isPositive && pricePosition < 40) {
    bearishScore += 10
  }
  
  // Determine action based on scores
  const scoreDifference = Math.abs(bullishScore - bearishScore)
  
  if (bullishScore > bearishScore && scoreDifference > 20) {
    action = 'BUY'
    sentiment = 'bullish'
    confidence = Math.min(60 + scoreDifference, 95)
  } else if (bearishScore > bullishScore && scoreDifference > 20) {
    action = 'SELL'
    sentiment = 'bearish'
    confidence = Math.min(60 + scoreDifference, 95)
  } else {
    action = 'HOLD'
    sentiment = 'neutral'
    confidence = Math.max(50, 70 - scoreDifference)
  }
  
  // Risk assessment based on multiple factors
  let riskFactors = 0
  
  if (indicators.rsi !== undefined && (indicators.rsi > 70 || indicators.rsi < 30)) riskFactors++
  if (indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined && (indicators.bollingerBands.percentB > 1 || indicators.bollingerBands.percentB < 0)) riskFactors++
  if (volatility > 3) riskFactors++
  if (indicators.volume && indicators.volume.trend === 'surge') riskFactors++
  
  if (riskFactors >= 3) {
    riskLevel = 'High'
  } else if (riskFactors >= 2) {
    riskLevel = 'Medium'
  } else {
    riskLevel = 'Low'
  }

  // Generate technical reasons based on all indicators
  const technicalReasons = generateTechnicalReasons(data, indicators, {
    action,
    sentiment,
    supportLevels,
    resistanceLevels,
    pricePosition,
    volatility,
    bullishScore,
    bearishScore
  })

  // Calculate risk zones
  const riskZones = calculateRiskZones(data, supportLevels, resistanceLevels, riskLevel, indicators)

  // Calculate price targets
  const entryPrice = action === 'BUY' 
    ? data.currentPrice * 0.995 
    : action === 'SELL'
    ? data.currentPrice * 1.005
    : data.currentPrice

  const targetPrice = action === 'BUY'
    ? resistanceLevels[0] || data.currentPrice * 1.03
    : action === 'SELL'
    ? supportLevels[supportLevels.length - 1] || data.currentPrice * 0.97
    : data.currentPrice * 1.01

  const stopLoss = action === 'BUY'
    ? supportLevels[supportLevels.length - 1] || data.currentPrice * 0.98
    : action === 'SELL'
    ? resistanceLevels[0] || data.currentPrice * 1.02
    : data.currentPrice * 0.99

  return {
    sentiment,
    action,
    confidence,
    summary: generateSummary(data, action, sentiment, riskLevel, indicators),
    keyPoints: generateKeyPoints(data, action, supportLevels, resistanceLevels, indicators),
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    riskLevel,
    timeHorizon: volatility > 2 ? 'Short-term (1-3 days)' : 'Medium-term (1-2 weeks)',
    technicalReasons,
    supportLevels,
    resistanceLevels,
    riskZones,
    indicators // Include indicators in response
  }
}

function calculateSupportLevels(data: ChartAnalysisRequest, indicators: TechnicalIndicators): number[] {
  const levels: number[] = []
  
  // Use Fibonacci retracement levels as primary support
  if (indicators.fibonacci) {
    levels.push(indicators.fibonacci.level_236)
    levels.push(indicators.fibonacci.level_382)
    levels.push(indicators.fibonacci.level_618)
  }
  
  // Add recent low if not already included
  if (!levels.includes(data.low)) {
    levels.push(parseFloat(data.low.toFixed(2)))
  }
  
  // Add Bollinger Band lower as dynamic support
  if (indicators.bollingerBands && indicators.bollingerBands.lower < data.currentPrice) {
    levels.push(indicators.bollingerBands.lower)
  }
  
  // Psychological level (rounded down to nearest 10)
  const psychLevel = Math.floor(data.currentPrice / 10) * 10
  if (psychLevel < data.currentPrice && !levels.includes(psychLevel)) {
    levels.push(psychLevel)
  }
  
  // Filter only levels below current price and sort
  return levels
    .filter(level => level < data.currentPrice)
    .sort((a, b) => b - a)
    .slice(0, 3) // Top 3 support levels
}

function calculateResistanceLevels(data: ChartAnalysisRequest, indicators: TechnicalIndicators): number[] {
  const levels: number[] = []
  
  // Use Fibonacci extension levels as primary resistance
  if (indicators.fibonacci) {
    levels.push(indicators.fibonacci.level_618)
    levels.push(indicators.fibonacci.level_786)
    levels.push(indicators.fibonacci.level_100)
  }
  
  // Add recent high if not already included
  if (!levels.includes(data.high)) {
    levels.push(parseFloat(data.high.toFixed(2)))
  }
  
  // Add Bollinger Band upper as dynamic resistance
  if (indicators.bollingerBands && indicators.bollingerBands.upper > data.currentPrice) {
    levels.push(indicators.bollingerBands.upper)
  }
  
  // Psychological level (rounded up to nearest 10)
  const psychLevel = Math.ceil(data.currentPrice / 10) * 10
  if (psychLevel > data.currentPrice && !levels.includes(psychLevel)) {
    levels.push(psychLevel)
  }
  
  // Filter only levels above current price and sort
  return levels
    .filter(level => level > data.currentPrice)
    .sort((a, b) => a - b)
    .slice(0, 3) // Top 3 resistance levels
}

function generateTechnicalReasons(
  data: ChartAnalysisRequest,
  indicators: TechnicalIndicators,
  analysis: {
    action: string
    sentiment: string
    supportLevels: number[]
    resistanceLevels: number[]
    pricePosition: number
    volatility: number
    bullishScore: number
    bearishScore: number
  }
) {
  const reasons: Array<{
    title: string
    description: string
    type: 'support' | 'resistance' | 'risk' | 'opportunity'
  }> = []

  // 1. RSI Analysis - Most important indicator
  if (indicators.rsi !== undefined) {
    if (indicators.rsi < 30) {
      reasons.push({
        title: `RSI Oversold: ${indicators.rsi.toFixed(1)}`,
        description: `RSI at ${indicators.rsi.toFixed(1)} indicates oversold conditions (below 30 threshold). This suggests price may have fallen too far too fast. Historically, oversold RSI often precedes a bounce. Consider this a potential buying opportunity, but wait for confirmation.`,
        type: 'opportunity'
      })
    } else if (indicators.rsi > 70) {
      reasons.push({
        title: `RSI Overbought: ${indicators.rsi.toFixed(1)}`,
        description: `RSI at ${indicators.rsi.toFixed(1)} signals overbought conditions (above 70 threshold). Price may be extended and due for a pullback. Exercise caution with new long positions. Consider taking profits or waiting for a dip.`,
        type: 'risk'
      })
    } else if (indicators.rsi > 50) {
      reasons.push({
        title: `RSI Bullish: ${indicators.rsi.toFixed(1)}`,
        description: `RSI at ${indicators.rsi.toFixed(1)} (above 50 midpoint) indicates bullish momentum. Buyers are in control but not yet overbought. This is a healthy uptrend signal with room to run higher.`,
        type: 'opportunity'
      })
    } else {
      reasons.push({
        title: `RSI Bearish: ${indicators.rsi.toFixed(1)}`,
        description: `RSI at ${indicators.rsi.toFixed(1)} (below 50 midpoint) shows bearish momentum. Sellers have the upper hand but not yet oversold. Price may continue lower until RSI reaches support level.`,
        type: 'risk'
      })
    }
  }

  // 2. Bollinger Bands Analysis
  if (indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined) {
    if (indicators.bollingerBands.percentB < 0) {
      reasons.push({
        title: `Below Bollinger Band (${(indicators.bollingerBands.percentB * 100).toFixed(0)}%)`,
        description: `Price is ${Math.abs(indicators.bollingerBands.percentB * 100).toFixed(0)}% below the lower Bollinger Band (₹${indicators.bollingerBands.lower.toFixed(2)}). This extreme condition often leads to a bounce back toward the middle band. Strong oversold signal.`,
        type: 'opportunity'
      })
    } else if (indicators.bollingerBands.percentB > 1) {
      reasons.push({
        title: `Above Bollinger Band (${(indicators.bollingerBands.percentB * 100).toFixed(0)}%)`,
        description: `Price is ${((indicators.bollingerBands.percentB - 1) * 100).toFixed(0)}% above the upper Bollinger Band (₹${indicators.bollingerBands.upper.toFixed(2)}). This suggests overextension and likely pullback toward the middle band at ₹${indicators.bollingerBands.middle.toFixed(2)}.`,
        type: 'risk'
      })
    } else if (indicators.bollingerBands.percentB < 0.2) {
      reasons.push({
        title: `Near Lower Bollinger Band`,
        description: `Price at ${(indicators.bollingerBands.percentB * 100).toFixed(0)}% position within Bollinger Bands, very close to lower band (₹${indicators.bollingerBands.lower.toFixed(2)}). Potential bounce zone. Upper band at ₹${indicators.bollingerBands.upper.toFixed(2)} is the resistance target.`,
        type: 'opportunity'
      })
    } else if (indicators.bollingerBands.percentB > 0.8) {
      reasons.push({
        title: `Near Upper Bollinger Band`,
        description: `Price at ${(indicators.bollingerBands.percentB * 100).toFixed(0)}% position within bands, approaching upper band (₹${indicators.bollingerBands.upper.toFixed(2)}). Overbought zone. Lower band at ₹${indicators.bollingerBands.lower.toFixed(2)} may act as support on pullback.`,
        type: 'risk'
      })
    }

    // Bollinger Band Squeeze
    if (indicators.bollingerBands.bandwidth !== undefined && indicators.bollingerBands.bandwidth < 0.1) {
      reasons.push({
        title: 'Bollinger Band Squeeze',
        description: `Band width at ${(indicators.bollingerBands.bandwidth * 100).toFixed(1)}% indicates very low volatility. This squeeze pattern often precedes a significant breakout move. Watch for direction confirmation - breakout above ₹${indicators.bollingerBands.upper.toFixed(2)} is bullish, below ₹${indicators.bollingerBands.lower.toFixed(2)} is bearish.`,
        type: 'opportunity'
      })
    }
  }

  // 3. Volume Analysis
  if (indicators.volume && indicators.volume.trend && indicators.volume.ratio !== undefined) {
    if (indicators.volume.trend === 'surge') {
      const direction = data.change > 0 ? 'up' : 'down'
      reasons.push({
        title: `Volume Surge (${indicators.volume.ratio.toFixed(1)}x Average)`,
        description: `Exceptional volume at ${indicators.volume.ratio.toFixed(1)}x the average confirms strong ${direction}ward momentum. This ${indicators.volume.ratio.toFixed(0)}× volume surge validates the price move. High conviction from market participants. ${data.change > 0 ? 'Strong buying pressure.' : 'Strong selling pressure.'}`,
        type: data.change > 0 ? 'opportunity' : 'risk'
      })
    } else if (indicators.volume.trend === 'above-average') {
      reasons.push({
        title: `Strong Volume (${indicators.volume.ratio.toFixed(1)}x Average)`,
        description: `Volume ${indicators.volume.ratio.toFixed(1)}x above average indicates good market participation. This ${data.change > 0 ? 'buying' : 'selling'} activity supports the price movement. Legitimate ${data.change > 0 ? 'upward' : 'downward'} trend with proper confirmation.`,
        type: data.change > 0 ? 'opportunity' : 'risk'
      })
    } else if (indicators.volume.trend === 'declining' || indicators.volume.trend === 'below-average') {
      reasons.push({
        title: `Low Volume Warning (${indicators.volume.ratio.toFixed(1)}x Average)`,
        description: `Volume at only ${indicators.volume.ratio.toFixed(1)}x average is concerning. Low volume ${data.change > 0 ? 'rallies' : 'declines'} lack conviction and often reverse. Wait for volume confirmation (>1.2x average) before trusting this move. Weak hands in control.`,
        type: 'risk'
      })
    }
  }

  // 4. Fibonacci Level Analysis
  if (indicators.fibonacci) {
    const fibLevels = [
      { level: indicators.fibonacci.level_236, name: '23.6%', type: 'support' },
      { level: indicators.fibonacci.level_382, name: '38.2%', type: 'support' },
      { level: indicators.fibonacci.level_500, name: '50%', type: 'key' },
      { level: indicators.fibonacci.level_618, name: '61.8%', type: 'resistance' },
      { level: indicators.fibonacci.level_786, name: '78.6%', type: 'resistance' }
    ]
    
    // Find closest Fibonacci level (within 1.5%)
    const closestFib = fibLevels.reduce((closest, fib) => {
      const distance = Math.abs(data.currentPrice - fib.level) / data.currentPrice
      const closestDistance = Math.abs(data.currentPrice - closest.level) / data.currentPrice
      return distance < closestDistance ? fib : closest
    })
    
    const distanceToFib = Math.abs(data.currentPrice - closestFib.level) / data.currentPrice
    if (distanceToFib < 0.015) { // Within 1.5%
      const position = data.currentPrice < closestFib.level ? 'approaching' : 'just above'
      reasons.push({
        title: `At Fibonacci ${closestFib.name} Level`,
        description: `Price ${position} key Fibonacci ${closestFib.name} retracement at ₹${closestFib.level.toFixed(2)}. ${closestFib.type === 'support' ? 'This is a critical support zone where bounces often occur. Buyers typically step in here.' : closestFib.type === 'resistance' ? 'This is a major resistance level. Sellers often emerge here. Breakout above this is significant.' : 'This 50% midpoint is psychologically important. Often acts as pivot between bullish and bearish control.'}`,
        type: closestFib.type === 'support' || closestFib.type === 'key' ? 'opportunity' : 'resistance'
      })
    }
  }

  // 5. Support/Resistance with Fibonacci Context
  if (analysis.supportLevels.length > 0) {
    const nearestSupport = analysis.supportLevels[0]
    const distanceToSupport = ((data.currentPrice - nearestSupport) / data.currentPrice) * 100
    
    if (distanceToSupport < 2) {
      reasons.push({
        title: 'Price Near Strong Support',
        description: `Current price ₹${data.currentPrice.toFixed(2)} is very close to key support at ₹${nearestSupport.toFixed(2)}. This level has historically acted as a buying zone where price bounces back. Risk of breakdown exists if support breaks.`,
        type: 'support'
      })
    } else {
      reasons.push({
        title: `Support at ₹${nearestSupport.toFixed(2)}`,
        description: `Key support level identified at ₹${nearestSupport.toFixed(2)} (${distanceToSupport.toFixed(1)}% below current price). This provides downside protection. If price falls to this level, expect buying interest.`,
        type: 'support'
      })
    }
  }

  // Resistance analysis
  if (analysis.resistanceLevels.length > 0) {
    const nearestResistance = analysis.resistanceLevels[0]
    const distanceToResistance = ((nearestResistance - data.currentPrice) / data.currentPrice) * 100
    
    if (distanceToResistance < 2) {
      reasons.push({
        title: 'Approaching Key Resistance',
        description: `Price is testing resistance at ₹${nearestResistance.toFixed(2)}. This is a critical level where sellers typically emerge. Breakout above this level could trigger strong upward momentum. Failure to break may cause pullback.`,
        type: 'resistance'
      })
    } else {
      reasons.push({
        title: `Resistance at ₹${nearestResistance.toFixed(2)}`,
        description: `Major resistance identified at ₹${nearestResistance.toFixed(2)} (${distanceToResistance.toFixed(1)}% above current price). Price may face selling pressure at this level. A breakout above this could open doors for further upside.`,
        type: 'resistance'
      })
    }
  }

  // Volatility analysis
  if (analysis.volatility > 2) {
    reasons.push({
      title: 'High Volatility Alert',
      description: `Current volatility of ${analysis.volatility.toFixed(2)}% indicates increased price swings. This creates both opportunities and risks. Use tighter stop losses and consider reducing position size. Markets are in active mode.`,
      type: 'risk'
    })
  }

  // Price position analysis
  if (analysis.pricePosition > 80) {
    reasons.push({
      title: 'Price in Upper Range',
      description: `Stock is trading in the upper ${(100 - analysis.pricePosition).toFixed(0)}% of today's range. This suggests strong buying pressure but also indicates overbought conditions. Risk of profit booking exists. Watch for reversal signals.`,
      type: 'risk'
    })
  } else if (analysis.pricePosition < 20) {
    reasons.push({
      title: 'Price in Lower Range',
      description: `Stock is trading in the lower ${analysis.pricePosition.toFixed(0)}% of today's range. This suggests selling pressure but also indicates oversold conditions. Potential bounce opportunity if support holds. Watch for reversal signals.`,
      type: 'opportunity'
    })
  }

  // Momentum analysis
  if (Math.abs(data.changePercent) > 2) {
    const direction = data.changePercent > 0 ? 'upward' : 'downward'
    reasons.push({
      title: `Strong ${direction.charAt(0).toUpperCase() + direction.slice(1)} Momentum`,
      description: `Price moving ${direction} with ${Math.abs(data.changePercent).toFixed(2)}% change. Strong momentum indicates ${data.changePercent > 0 ? 'buying' : 'selling'} pressure. Trend followers may join, amplifying the move. Be cautious of momentum exhaustion.`,
      type: data.changePercent > 0 ? 'opportunity' : 'risk'
    })
  }

  // Action-specific reasoning
  if (analysis.action === 'HOLD') {
    reasons.push({
      title: 'Why HOLD? - Unclear Trend',
      description: `Current price action doesn't show a clear directional bias. Price is oscillating between support and resistance without a decisive breakout or breakdown. It's prudent to wait for a clearer signal before committing capital. Patience is key.`,
      type: 'risk'
    })
  }

  return reasons.slice(0, 5) // Top 5 reasons
}

function calculateRiskZones(
  data: ChartAnalysisRequest,
  supportLevels: number[],
  resistanceLevels: number[],
  riskLevel: string,
  indicators: TechnicalIndicators
) {
  const zones: Array<{ start: number; end: number; reason: string }> = []

  if (riskLevel === 'High' && indicators.bollingerBands) {
    // Zone above current price (resistance risk from BB upper band)
    if (indicators.bollingerBands.upper > data.currentPrice) {
      zones.push({
        start: indicators.bollingerBands.upper,
        end: indicators.bollingerBands.upper * 1.02,
        reason: `Bollinger Band resistance zone (₹${indicators.bollingerBands.upper.toFixed(2)}) - high probability of rejection. Overbought territory.`
      })
    }
    
    // Zone below current price (support risk from BB lower band)
    if (indicators.bollingerBands.lower < data.currentPrice) {
      zones.push({
        start: indicators.bollingerBands.lower * 0.98,
        end: indicators.bollingerBands.lower,
        reason: `Bollinger Band support zone (₹${indicators.bollingerBands.lower.toFixed(2)}) - breakdown below this signals oversold panic.`
      })
    }
  }

  return zones
}

function generateSummary(
  data: ChartAnalysisRequest,
  action: string,
  sentiment: string,
  riskLevel: string,
  indicators: TechnicalIndicators
): string {
  const direction = data.change > 0 ? 'gain' : 'loss'
  const rsiStatus = indicators.rsi !== undefined ? (indicators.rsi > 70 ? 'OVERBOUGHT' : indicators.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL') : 'N/A'
  const volumeStatus = indicators.volume?.trend ? indicators.volume.trend.toUpperCase() : 'N/A'
  
  const rsiLine = indicators.rsi !== undefined ? `• RSI: ${indicators.rsi.toFixed(1)} (${rsiStatus})` : ''
  const bbLine = indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined 
    ? `• Bollinger %B: ${(indicators.bollingerBands.percentB * 100).toFixed(0)}% ${indicators.bollingerBands.percentB > 1 ? 'above upper band' : indicators.bollingerBands.percentB < 0 ? 'below lower band' : 'within bands'}`
    : ''
  const volumeLine = indicators.volume?.ratio !== undefined ? `• Volume: ${indicators.volume.ratio.toFixed(1)}x average (${volumeStatus})` : ''
  const fibLine = indicators.fibonacci 
    ? `• Fibonacci: Price at ${((data.currentPrice - indicators.fibonacci.level_0) / (indicators.fibonacci.level_100 - indicators.fibonacci.level_0) * 100).toFixed(0)}% of range`
    : ''
  
  return `
${data.symbol} is currently trading at ₹${data.currentPrice.toFixed(2)}, showing a ${direction} of ${Math.abs(data.changePercent).toFixed(2)}%.

📊 TECHNICAL INDICATORS:
${rsiLine}
${bbLine}
${volumeLine}
${fibLine}

MARKET SENTIMENT: ${sentiment.toUpperCase()}
The stock is exhibiting ${sentiment} characteristics with ${action === 'BUY' ? 'multiple bullish indicators converging' : action === 'SELL' ? 'bearish technical signals aligning' : 'mixed signals from technical indicators'}.

RECOMMENDATION: ${action}
${action === 'BUY' ? `Technical confluence suggests accumulation opportunity. ${indicators.rsi !== undefined && indicators.rsi < 50 ? 'RSI shows room to run higher.' : ''} ${indicators.volume?.ratio && indicators.volume.ratio > 1.2 ? 'Volume confirms buying interest.' : ''}` : 
  action === 'SELL' ? `Multiple bearish signals warrant caution. ${indicators.rsi !== undefined && indicators.rsi > 70 ? 'RSI shows overbought conditions.' : ''} ${indicators.bollingerBands && indicators.bollingerBands.percentB && indicators.bollingerBands.percentB > 0.8 ? 'Price extended above mean.' : ''}` :
  `Wait for clearer trend confirmation. ${indicators.volume?.ratio && indicators.volume.ratio < 1 ? 'Low volume indicates indecision.' : ''} Patience recommended until directional bias emerges.`}

RISK LEVEL: ${riskLevel}
${riskLevel === 'High' ? 'Exercise caution. Use tight stops and reduced position size.' : 
  riskLevel === 'Medium' ? 'Normal market risk. Standard position sizing applicable.' :
  'Favorable risk/reward setup. Market showing stability.'}
  `.trim()
}


function generateKeyPoints(
  data: ChartAnalysisRequest,
  action: string,
  supportLevels: number[],
  resistanceLevels: number[],
  indicators: TechnicalIndicators
): string[] {
  const points: string[] = [
    `Current price: ₹${data.currentPrice.toFixed(2)} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)`
  ]
  
  if (indicators.rsi !== undefined) {
    points.push(`RSI: ${indicators.rsi.toFixed(1)} - ${indicators.rsi > 70 ? 'Overbought' : indicators.rsi < 30 ? 'Oversold' : indicators.rsi > 50 ? 'Bullish' : 'Bearish'} territory`)
  }
  
  if (indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined) {
    points.push(`Bollinger Band: ${(indicators.bollingerBands.percentB * 100).toFixed(0)}% position - ${indicators.bollingerBands.percentB > 1 ? 'Above upper band' : indicators.bollingerBands.percentB < 0 ? 'Below lower band' : 'Within normal range'}`)
  }
  
  if (indicators.volume && indicators.volume.ratio !== undefined && indicators.volume.trend) {
    points.push(`Volume: ${indicators.volume.ratio.toFixed(1)}x average - ${indicators.volume.trend === 'surge' ? 'Exceptional' : indicators.volume.trend === 'above-average' ? 'Strong' : indicators.volume.trend === 'declining' ? 'Weak' : 'Normal'} activity`)
  }
  
  if (indicators.fibonacci) {
    points.push(`Fibonacci: Key support at ₹${indicators.fibonacci.level_382.toFixed(2)} (38.2%), resistance at ₹${indicators.fibonacci.level_618.toFixed(2)} (61.8%)`)
  }
  
  const signalDetails: string[] = []
  if (indicators.rsi !== undefined && (indicators.rsi < 30 || indicators.rsi > 70)) signalDetails.push('extreme RSI')
  if (indicators.bollingerBands && indicators.bollingerBands.percentB !== undefined && (indicators.bollingerBands.percentB > 0.8 || indicators.bollingerBands.percentB < 0.2)) signalDetails.push('Bollinger extreme')
  if (indicators.volume && indicators.volume.ratio !== undefined && indicators.volume.ratio > 1.5) signalDetails.push('high volume')
  
  points.push(`${action} signal with ${signalDetails.length > 0 ? signalDetails.join(', ') : 'volume confirmation'}`)
  points.push(`Trading range: ₹${data.low.toFixed(2)} - ₹${data.high.toFixed(2)} with ${((data.high - data.low) / data.low * 100).toFixed(2)}% volatility`)
  
  return points
}
