import { NextRequest, NextResponse } from "next/server"
import { HfInference } from "@huggingface/inference"

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

interface ChartAnalysisRequest {
  symbol: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  priceHistory: Array<{ time: string; price: number; volume: number }>
  timeframe: string
  technicalIndicators?: {
    rsi?: number
    macd?: { value: number; signal: number; histogram: number }
    movingAverages?: { sma20?: number; sma50?: number; sma200?: number }
    supportLevels?: number[]
    resistanceLevels?: number[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: ChartAnalysisRequest = await request.json()
    
    console.log(`🤖 AI Chart Analysis requested for ${data.symbol}`)

    // Try Hugging Face AI first
    try {
      const analysisPrompt = buildAnalysisPrompt(data)

      const aiResponse = await hf.textGeneration({
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        inputs: analysisPrompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false,
        },
      })

      const analysis = aiResponse.generated_text
      const structuredAnalysis = parseAIResponse(analysis, data)

      console.log(`✅ AI Analysis complete for ${data.symbol}`)

      return NextResponse.json({
        success: true,
        symbol: data.symbol,
        analysis: structuredAnalysis,
        rawAnalysis: analysis,
        timestamp: new Date().toISOString(),
      })
    } catch (aiError: any) {
      console.warn("⚠️ Hugging Face AI unavailable, using fallback analysis:", aiError.message)
      
      // Fallback to rule-based analysis
      const fallbackAnalysis = generateFallbackAnalysis(data)
      
      return NextResponse.json({
        success: true,
        symbol: data.symbol,
        analysis: fallbackAnalysis,
        isFallback: true,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error: any) {
    console.error("❌ AI Chart Analysis failed:", error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Analysis failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}

function buildAnalysisPrompt(data: ChartAnalysisRequest): string {
  const trend = data.change > 0 ? "upward" : "downward"
  const strength = Math.abs(data.changePercent) > 2 ? "strong" : Math.abs(data.changePercent) > 1 ? "moderate" : "weak"
  
  const priceRange = ((data.high - data.low) / data.low * 100).toFixed(2)
  const pricePosition = ((data.currentPrice - data.low) / (data.high - data.low) * 100).toFixed(0)

  let prompt = `You are an expert stock market analyst. Analyze the following chart data for ${data.symbol} and provide actionable trading insights.

CURRENT DATA:
- Current Price: ₹${data.currentPrice.toFixed(2)}
- Change: ${data.change > 0 ? '+' : ''}₹${data.change.toFixed(2)} (${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%)
- Day Range: ₹${data.low.toFixed(2)} - ₹${data.high.toFixed(2)} (${priceRange}% range)
- Price Position: ${pricePosition}% of daily range
- Volume: ${(data.volume / 1000000).toFixed(2)}M shares
- Timeframe: ${data.timeframe}
- Trend: ${strength} ${trend} movement`

  if (data.technicalIndicators) {
    prompt += `\n\nTECHNICAL INDICATORS:`
    if (data.technicalIndicators.rsi) {
      prompt += `\n- RSI: ${data.technicalIndicators.rsi.toFixed(2)}`
    }
    if (data.technicalIndicators.movingAverages) {
      const ma = data.technicalIndicators.movingAverages
      if (ma.sma20) prompt += `\n- 20-day SMA: ₹${ma.sma20.toFixed(2)}`
      if (ma.sma50) prompt += `\n- 50-day SMA: ₹${ma.sma50.toFixed(2)}`
    }
    if (data.technicalIndicators.supportLevels?.length) {
      prompt += `\n- Support Levels: ${data.technicalIndicators.supportLevels.map(s => `₹${s.toFixed(2)}`).join(', ')}`
    }
    if (data.technicalIndicators.resistanceLevels?.length) {
      prompt += `\n- Resistance Levels: ${data.technicalIndicators.resistanceLevels.map(r => `₹${r.toFixed(2)}`).join(', ')}`
    }
  }

  prompt += `\n\nProvide a concise analysis covering:
1. MARKET SENTIMENT: Current market mood (Bullish/Bearish/Neutral)
2. KEY SIGNALS: Important technical signals from the chart
3. TRADING DECISION: Clear BUY/SELL/HOLD recommendation
4. ENTRY/EXIT POINTS: Specific price levels for action
5. RISK LEVEL: High/Medium/Low risk assessment
6. TIME HORIZON: Short-term (1-3 days) or Medium-term (1-2 weeks) outlook

Keep it professional, actionable, and under 200 words.`

  return prompt
}

function parseAIResponse(aiText: string, data: ChartAnalysisRequest) {
  // Extract key information from AI response
  const lines = aiText.split('\n').filter(l => l.trim())
  
  // Determine sentiment
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  const lowerText = aiText.toLowerCase()
  if (lowerText.includes('bullish') || lowerText.includes('buy') || lowerText.includes('positive')) {
    sentiment = 'bullish'
  } else if (lowerText.includes('bearish') || lowerText.includes('sell') || lowerText.includes('negative')) {
    sentiment = 'bearish'
  }

  // Determine action
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  if (lowerText.includes('buy') && !lowerText.includes('don\'t buy')) {
    action = 'BUY'
  } else if (lowerText.includes('sell')) {
    action = 'SELL'
  }

  // Extract confidence (if mentioned)
  let confidence = 70 // default
  const confMatch = aiText.match(/(\d+)%?\s*(confidence|certain)/i)
  if (confMatch) {
    confidence = parseInt(confMatch[1])
  }

  // Calculate suggested entry/exit based on current data
  const entryPrice = action === 'BUY' 
    ? data.currentPrice * 0.995 // 0.5% below current
    : data.currentPrice * 1.005 // 0.5% above current
    
  const targetPrice = action === 'BUY'
    ? data.currentPrice * 1.03 // 3% profit target
    : data.currentPrice * 0.97 // 3% profit target for short
    
  const stopLoss = action === 'BUY'
    ? data.currentPrice * 0.98 // 2% stop loss
    : data.currentPrice * 1.02 // 2% stop loss for short

  return {
    sentiment,
    action,
    confidence,
    summary: aiText,
    keyPoints: extractKeyPoints(aiText),
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    riskLevel: calculateRiskLevel(data),
    timeHorizon: extractTimeHorizon(aiText),
  }
}

function extractKeyPoints(text: string): string[] {
  const points: string[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.match(/^[•\-\*\d\.]/)) {
      points.push(trimmed.replace(/^[•\-\*\d\.]\s*/, ''))
    }
  }
  
  return points.slice(0, 5) // Top 5 points
}

function extractTimeHorizon(text: string): string {
  const lowerText = text.toLowerCase()
  if (lowerText.includes('short-term') || lowerText.includes('1-3 days')) {
    return 'Short-term (1-3 days)'
  } else if (lowerText.includes('medium-term') || lowerText.includes('1-2 weeks')) {
    return 'Medium-term (1-2 weeks)'
  } else if (lowerText.includes('long-term')) {
    return 'Long-term (1+ months)'
  }
  return 'Short-term (1-3 days)'
}

function calculateRiskLevel(data: ChartAnalysisRequest): 'Low' | 'Medium' | 'High' {
  const volatility = Math.abs(data.changePercent)
  const volumeRatio = data.volume / 1000000 // Simplified
  
  if (volatility > 3 || volumeRatio < 0.5) return 'High'
  if (volatility > 1.5 || volumeRatio < 1) return 'Medium'
  return 'Low'
}

function generateFallbackAnalysis(data: ChartAnalysisRequest) {
  const isPositive = data.change > 0
  const volatility = Math.abs(data.changePercent)
  
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  
  if (data.changePercent > 1.5) {
    action = 'BUY'
    sentiment = 'bullish'
  } else if (data.changePercent < -1.5) {
    action = 'SELL'
    sentiment = 'bearish'
  }
  
  const summary = `
${data.symbol} is currently trading at ₹${data.currentPrice.toFixed(2)}, showing a ${isPositive ? 'gain' : 'loss'} of ${Math.abs(data.changePercent).toFixed(2)}%. 

MARKET SENTIMENT: ${sentiment.toUpperCase()}
The stock is in a ${volatility > 2 ? 'high volatility' : volatility > 1 ? 'moderate' : 'low volatility'} phase with ${isPositive ? 'positive' : 'negative'} momentum.

RECOMMENDATION: ${action}
${action === 'BUY' ? 'Technical indicators suggest accumulation. Consider entry near support levels.' :
  action === 'SELL' ? 'Negative momentum detected. Consider booking profits or exiting positions.' :
  'Neutral signals. Wait for clearer trend confirmation before taking position.'}

KEY LEVELS:
- Support: ₹${data.low.toFixed(2)}
- Resistance: ₹${data.high.toFixed(2)}
- Volume: ${(data.volume / 1000000).toFixed(2)}M shares
  `.trim()

  return {
    sentiment,
    action,
    confidence: 65,
    summary,
    keyPoints: [
      `Current price: ₹${data.currentPrice.toFixed(2)}`,
      `${isPositive ? 'Upward' : 'Downward'} trend with ${volatility.toFixed(2)}% movement`,
      `Trading range: ₹${data.low.toFixed(2)} - ₹${data.high.toFixed(2)}`,
      `Volume: ${(data.volume / 1000000).toFixed(2)}M shares`,
      `${action} signal based on momentum`
    ],
    entryPrice: parseFloat((data.currentPrice * (action === 'BUY' ? 0.995 : 1.005)).toFixed(2)),
    targetPrice: parseFloat((data.currentPrice * (action === 'BUY' ? 1.03 : 0.97)).toFixed(2)),
    stopLoss: parseFloat((data.currentPrice * (action === 'BUY' ? 0.98 : 1.02)).toFixed(2)),
    riskLevel: calculateRiskLevel(data),
    timeHorizon: 'Short-term (1-3 days)',
  }
}
