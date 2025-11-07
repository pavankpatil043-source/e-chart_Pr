import { NextRequest, NextResponse } from "next/server"

/**
 * Social Sentiment Aggregator API
 * Combines Reddit, News, and Price Action to calculate overall sentiment score
 */

interface SentimentData {
  symbol: string
  score: number // 0-100
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  breakdown: {
    news: { score: number; weight: number }
    social: { score: number; weight: number }
    price: { score: number; weight: number }
  }
  summary: string
  trend: string
  lastUpdated: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    )
  }

  console.log(`🎯 Calculating social sentiment for ${symbol}...`)

  try {
    // Fetch from multiple sources in parallel
    const [redditData, newsData, priceData] = await Promise.allSettled([
      fetchRedditSentiment(symbol),
      fetchNewsSentiment(symbol),
      fetchPriceActionSentiment(symbol)
    ])

    // Extract scores and mention counts (with fallbacks)
    const redditScore = redditData.status === 'fulfilled' ? redditData.value.score : 50
    const redditMentions = redditData.status === 'fulfilled' ? redditData.value.mentions : 0
    const newsScore = newsData.status === 'fulfilled' ? newsData.value : 50
    const priceScore = priceData.status === 'fulfilled' ? priceData.value : 50

    // Weighted scoring (Price > News > Social)
    const weights = {
      price: 0.65,  // 65% - Price action is king
      news: 0.25,   // 25% - News sentiment
      social: 0.10  // 10% - Social media buzz
    }

    const finalScore = Math.round(
      priceScore * weights.price +
      newsScore * weights.news +
      redditScore * weights.social
    )

    const sentiment: 'bullish' | 'bearish' | 'neutral' = 
      finalScore >= 65 ? 'bullish' :
      finalScore <= 35 ? 'bearish' : 'neutral'

    // Calculate confidence (higher when sources agree)
    const variance = Math.sqrt(
      Math.pow(newsScore - finalScore, 2) +
      Math.pow(redditScore - finalScore, 2) +
      Math.pow(priceScore - finalScore, 2)
    ) / 3

    const confidence = Math.max(0, Math.min(100, 100 - variance))

    // Generate trend indicator with ACTUAL mention count
    const mentionText = redditMentions === 0 ? 'No mentions' :
                       redditMentions === 1 ? '1 mention' :
                       redditMentions < 10 ? `${redditMentions} mentions` :
                       redditMentions < 50 ? `${redditMentions} mentions` :
                       `${redditMentions} mentions`
    
    const trendIcon = finalScore >= 65 ? '⬆' :
                     finalScore >= 45 ? '→' : '⬇'
    
    const trend = `${mentionText} ${trendIcon}`

    const result: SentimentData = {
      symbol: symbol.replace('.NS', '').replace('.BO', ''),
      score: finalScore,
      sentiment,
      confidence: Math.round(confidence),
      breakdown: {
        news: { score: newsScore, weight: weights.news },
        social: { score: redditScore, weight: weights.social },
        price: { score: priceScore, weight: weights.price }
      },
      summary: generateSummary(sentiment, finalScore, newsScore, redditScore),
      trend,
      lastUpdated: new Date().toISOString()
    }

    console.log(`✅ Final sentiment for ${symbol}: ${sentiment} (${finalScore}/100)`)

    // Record sentiment for alert tracking (non-blocking)
    try {
      const priceChange = priceData.status === 'fulfilled' ? priceData.value - 50 : 0
      fetch(`http://localhost:3000/api/sentiment-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.replace('.NS', '').replace('.BO', ''),
          score: finalScore,
          priceChange,
          newsScore,
          socialScore: redditScore,
          volume: 0 // Will be added in volume correlation feature
        })
      }).catch(err => console.error('⚠️ Alert tracking failed:', err))
    } catch (err) {
      // Silent fail - alerts are optional
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('❌ Sentiment calculation error:', error)
    
    // Return neutral fallback
    return NextResponse.json({
      success: true,
      data: {
        symbol: symbol.replace('.NS', '').replace('.BO', ''),
        score: 50,
        sentiment: 'neutral' as const,
        confidence: 50,
        breakdown: {
          news: { score: 50, weight: 0.4 },
          social: { score: 50, weight: 0.35 },
          price: { score: 50, weight: 0.25 }
        },
        summary: 'Neutral market sentiment - limited data available',
        trend: '+0K mentions',
        lastUpdated: new Date().toISOString()
      },
      fallback: true
    })
  }
}

/**
 * Fetch Reddit sentiment
 */
async function fetchRedditSentiment(symbol: string): Promise<{ score: number; mentions: number }> {
  try {
    const response = await fetch(
      `http://localhost:3000/api/social-sentiment/reddit?symbol=${symbol}`,
      { cache: 'no-store' }
    )
    
    if (response.ok) {
      const data = await response.json()
      return {
        score: data.data?.score || 50,
        mentions: data.data?.mentions || 0
      }
    }
  } catch (error) {
    console.log('⚠️ Reddit sentiment fetch failed, using neutral')
  }
  return { score: 50, mentions: 0 }
}

/**
 * Fetch news sentiment (from existing AI news analysis)
 */
async function fetchNewsSentiment(symbol: string): Promise<number> {
  try {
    const response = await fetch(
      `http://localhost:3000/api/ai-news-analysis?symbol=${symbol}`,
      { cache: 'no-store' }
    )
    
    if (response.ok) {
      const data = await response.json()
      const sentimentScore = data.sentiment?.score || 5
      
      // Convert 0-10 scale to 0-100
      return sentimentScore * 10
    }
  } catch (error) {
    console.log('⚠️ News sentiment fetch failed, using neutral')
  }
  return 50
}

/**
 * Calculate price action sentiment
 */
async function fetchPriceActionSentiment(symbol: string): Promise<number> {
  try {
    // Fetch recent price data
    const response = await fetch(
      `http://localhost:3000/api/yahoo-chart?symbol=${symbol}&interval=1d&range=1mo`,
      { cache: 'no-store' }
    )
    
    if (!response.ok) return 50

    const data = await response.json()
    const candles = data.candles || []
    
    if (candles.length < 5) return 50

    const recent = candles.slice(-5)
    const firstClose = recent[0].close
    const lastClose = recent[recent.length - 1].close
    
    // Calculate momentum
    const priceChange = ((lastClose - firstClose) / firstClose) * 100
    
    // Calculate volume trend
    const avgVolume = recent.reduce((sum: number, c: any) => sum + c.volume, 0) / recent.length
    const recentVolume = recent[recent.length - 1].volume
    const volumeRatio = recentVolume / avgVolume

    // Score based on price momentum and volume
    let score = 50
    
    // Price momentum contribution (±40 points) - More sensitive for 65% weight
    score += Math.max(-40, Math.min(40, priceChange * 5))
    
    // Volume contribution (±20 points)
    if (volumeRatio > 1.5) score += 15 // High volume surge
    else if (volumeRatio > 1.2) score += 10
    else if (volumeRatio < 0.7) score -= 15 // Low volume concern
    
    return Math.max(0, Math.min(100, Math.round(score)))
    
  } catch (error) {
    console.log('⚠️ Price action analysis failed, using neutral')
    return 50
  }
}

/**
 * Generate AI-like summary
 */
function generateSummary(
  sentiment: string,
  finalScore: number,
  newsScore: number,
  socialScore: number
): string {
  const strength = finalScore >= 75 ? 'Strong' :
                  finalScore >= 60 ? 'Moderate' :
                  finalScore >= 40 ? 'Mixed' :
                  finalScore >= 25 ? 'Weak' : 'Very weak'

  const newsDriver = newsScore > 60 ? 'positive news coverage' :
                     newsScore < 40 ? 'negative news coverage' : 'neutral news'
  
  const socialDriver = socialScore > 60 ? 'high social engagement' :
                       socialScore < 40 ? 'bearish social sentiment' : 'moderate social activity'

  if (sentiment === 'bullish') {
    return `${strength} bullish sentiment driven by ${newsDriver} and ${socialDriver}. Community showing interest.`
  } else if (sentiment === 'bearish') {
    return `${strength} bearish sentiment with ${newsDriver} and ${socialDriver}. Market showing caution.`
  } else {
    return `Neutral market sentiment with ${newsDriver}. Mixed signals from social channels.`
  }
}
