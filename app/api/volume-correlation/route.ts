import { NextResponse } from "next/server"

interface VolumeSignalStrength {
  symbol: string
  sentimentScore: number
  volumeRatio: number // Current vs 20-day average
  signalStrength: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'very-weak'
  signalStars: number // 1-5 stars
  volumeStatus: 'surge' | 'high' | 'normal' | 'low' | 'very-low'
  recommendation: string
  confidence: number
  metadata: {
    currentVolume: number
    avgVolume: number
    volumeChange: number
    priceChange: number
  }
}

// Calculate signal strength based on sentiment + volume correlation
function calculateSignalStrength(
  sentiment: number,
  volumeRatio: number,
  priceChange: number
): VolumeSignalStrength['signalStrength'] {
  
  // High sentiment + High volume = Very Strong
  if (sentiment >= 75 && volumeRatio >= 2.0) return 'very-strong'
  if (sentiment <= 25 && volumeRatio >= 2.0) return 'very-strong' // Strong bearish with volume
  
  // High sentiment + Moderate volume = Strong
  if (sentiment >= 70 && volumeRatio >= 1.5) return 'strong'
  if (sentiment <= 30 && volumeRatio >= 1.5) return 'strong'
  
  // Good sentiment + Normal volume = Moderate
  if (sentiment >= 60 && volumeRatio >= 1.0) return 'moderate'
  if (sentiment <= 40 && volumeRatio >= 1.0) return 'moderate'
  
  // Good sentiment + Low volume = Weak (could be fake move)
  if (sentiment >= 65 && volumeRatio < 1.0) return 'weak'
  if (sentiment <= 35 && volumeRatio < 1.0) return 'weak'
  
  // Extreme sentiment + Very low volume = Very Weak (likely fake)
  if ((sentiment >= 75 || sentiment <= 25) && volumeRatio < 0.5) return 'very-weak'
  
  // Default: moderate
  return 'moderate'
}

// Convert signal strength to star rating (1-5)
function getSignalStars(strength: VolumeSignalStrength['signalStrength']): number {
  switch (strength) {
    case 'very-strong': return 5
    case 'strong': return 4
    case 'moderate': return 3
    case 'weak': return 2
    case 'very-weak': return 1
  }
}

// Get volume status category
function getVolumeStatus(volumeRatio: number): VolumeSignalStrength['volumeStatus'] {
  if (volumeRatio >= 2.5) return 'surge'
  if (volumeRatio >= 1.5) return 'high'
  if (volumeRatio >= 0.8) return 'normal'
  if (volumeRatio >= 0.5) return 'low'
  return 'very-low'
}

// Generate trading recommendation
function generateRecommendation(
  sentiment: number,
  strength: VolumeSignalStrength['signalStrength'],
  volumeStatus: VolumeSignalStrength['volumeStatus'],
  priceChange: number
): string {
  // Very strong signals
  if (strength === 'very-strong') {
    if (sentiment >= 75) {
      return `🚀 STRONG BUY SIGNAL: High bullish sentiment (${sentiment}/100) confirmed by ${volumeStatus} volume. Institutional buying likely.`
    } else {
      return `⚠️ STRONG SELL SIGNAL: High bearish sentiment (${sentiment}/100) confirmed by ${volumeStatus} volume. Distribution in progress.`
    }
  }
  
  // Strong signals
  if (strength === 'strong') {
    if (sentiment >= 70) {
      return `✅ BUY SIGNAL: Bullish sentiment (${sentiment}/100) with ${volumeStatus} volume support. Good entry opportunity.`
    } else {
      return `❌ SELL SIGNAL: Bearish sentiment (${sentiment}/100) with ${volumeStatus} volume. Consider exit.`
    }
  }
  
  // Moderate signals
  if (strength === 'moderate') {
    if (sentiment >= 60) {
      return `📊 MODERATE BUY: Positive sentiment (${sentiment}/100) but volume is ${volumeStatus}. Watch for confirmation.`
    } else if (sentiment <= 40) {
      return `📊 MODERATE SELL: Negative sentiment (${sentiment}/100) but volume is ${volumeStatus}. Wait for clarity.`
    } else {
      return `➡️ NEUTRAL: Sentiment ${sentiment}/100 with ${volumeStatus} volume. No clear signal.`
    }
  }
  
  // Weak signals (low volume on strong sentiment = suspicious)
  if (strength === 'weak') {
    if (sentiment >= 65) {
      return `⚠️ WEAK SIGNAL: High sentiment (${sentiment}/100) but LOW volume (${volumeStatus}). Possible fake rally - be cautious.`
    } else {
      return `⚠️ WEAK SIGNAL: Low sentiment (${sentiment}/100) but LOW volume (${volumeStatus}). Possible fake drop - wait.`
    }
  }
  
  // Very weak (red flag)
  return `🚫 AVOID: Extreme sentiment (${sentiment}/100) with very low volume (${volumeStatus}). Likely manipulation or thin trading.`
}

// Calculate confidence (0-100) based on multiple factors
function calculateConfidence(
  sentiment: number,
  volumeRatio: number,
  signalStrength: VolumeSignalStrength['signalStrength']
): number {
  let confidence = 50 // Base
  
  // Boost for clear sentiment direction
  if (sentiment >= 75 || sentiment <= 25) confidence += 20
  else if (sentiment >= 65 || sentiment <= 35) confidence += 10
  
  // Boost for volume confirmation
  if (volumeRatio >= 2.0) confidence += 20
  else if (volumeRatio >= 1.5) confidence += 10
  else if (volumeRatio < 0.5) confidence -= 20
  
  // Boost for signal strength
  if (signalStrength === 'very-strong') confidence += 10
  else if (signalStrength === 'very-weak') confidence -= 20
  
  return Math.max(0, Math.min(100, confidence))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const sentimentScore = parseInt(searchParams.get('sentiment') || '50')
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }
    
    console.log(`📊 Calculating volume correlation for ${symbol} (sentiment: ${sentimentScore})...`)
    
    // Fetch volume data from Yahoo Finance
    const chartRes = await fetch(
      `http://localhost:3000/api/yahoo-chart?symbol=${symbol}&interval=1d&range=1mo`,
      { cache: 'no-store' }
    )
    
    if (!chartRes.ok) {
      throw new Error('Failed to fetch volume data')
    }
    
    const chartData = await chartRes.json()
    const candles = chartData.data || []
    
    if (candles.length < 20) {
      throw new Error('Insufficient data for volume analysis')
    }
    
    // Calculate 20-day average volume
    const volumes = candles.slice(-20).map((c: any) => c.volume)
    const avgVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length
    
    // Get current volume (latest candle)
    const currentVolume = candles[candles.length - 1].volume
    
    // Calculate volume ratio
    const volumeRatio = currentVolume / avgVolume
    
    // Get price change (current vs previous)
    const currentPrice = candles[candles.length - 1].close
    const previousPrice = candles[candles.length - 2].close
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100
    
    // Calculate signal strength
    const signalStrength = calculateSignalStrength(sentimentScore, volumeRatio, priceChange)
    const signalStars = getSignalStars(signalStrength)
    const volumeStatus = getVolumeStatus(volumeRatio)
    const recommendation = generateRecommendation(sentimentScore, signalStrength, volumeStatus, priceChange)
    const confidence = calculateConfidence(sentimentScore, volumeRatio, signalStrength)
    
    const result: VolumeSignalStrength = {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      sentimentScore,
      volumeRatio: parseFloat(volumeRatio.toFixed(2)),
      signalStrength,
      signalStars,
      volumeStatus,
      recommendation,
      confidence,
      metadata: {
        currentVolume: Math.round(currentVolume),
        avgVolume: Math.round(avgVolume),
        volumeChange: parseFloat(((volumeRatio - 1) * 100).toFixed(1)),
        priceChange: parseFloat(priceChange.toFixed(2))
      }
    }
    
    console.log(`✅ Signal strength for ${symbol}: ${signalStrength} (${signalStars}⭐)`)
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('❌ Volume correlation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate volume correlation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
