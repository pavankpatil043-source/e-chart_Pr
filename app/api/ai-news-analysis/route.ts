import { type NextRequest, NextResponse } from "next/server"

interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: string
  source: string
}

interface NewsSentiment {
  score: number // 1-10 scale
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  summary: string
  keywords: string[]
  confidence: number
}

interface NewsAnalysisResult {
  symbol: string
  overallSentiment: NewsSentiment
  newsItems: Array<NewsItem & { sentiment: NewsSentiment }>
  analysisDate: string
  last7DaysScore: number
  recommendation: string
}

// Cache for AI analysis
const analysisCache = new Map<string, { data: NewsAnalysisResult; timestamp: number }>()
const CACHE_DURATION = 3600000 // 1 hour cache for news analysis

// Fetch news from multiple sources
async function fetchNewsForStock(symbol: string, days: number = 7, requestUrl: string): Promise<NewsItem[]> {
  const baseSymbol = symbol.replace('.NS', '')
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  try {
    // Extract origin from the request URL instead of hardcoding
    // This ensures it works on any port (3000, 3002) and in production
    const url = new URL(requestUrl)
    const origin = url.origin
    const apiUrl = `${origin}/api/yahoo-news`
    
    const response = await fetch(
      `${apiUrl}?symbol=${baseSymbol}`,
      { 
        signal: AbortSignal.timeout(10000),
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      if (data.articles && Array.isArray(data.articles)) {
        // Filter news from last 7 days
        const sevenDaysAgo = Date.now() - (days * 24 * 60 * 60 * 1000)
        return data.articles
          .filter((article: any) => {
            const pubDate = new Date(article.pubDate || article.publishedAt).getTime()
            return pubDate >= sevenDaysAgo
          })
          .map((article: any) => ({
            title: article.title || '',
            description: article.description || article.summary || '',
            link: article.link || article.url || '',
            pubDate: article.pubDate || article.publishedAt || new Date().toISOString(),
            source: article.source?.name || article.source || 'Unknown',
          }))
          .slice(0, 20) // Limit to 20 most recent articles
      }
    }
  } catch (error) {
    console.error('Error fetching news:', error)
  }
  
  // Fallback: return empty array if no news found
  return []
}

// AI Sentiment Analysis using OpenAI/Gemini
async function analyzeNewsWithAI(newsItem: NewsItem): Promise<NewsSentiment> {
  const text = `${newsItem.title}. ${newsItem.description}`.toLowerCase()
  
  // Sentiment keywords
  const positiveKeywords = [
    'profit', 'growth', 'surge', 'jump', 'gain', 'rally', 'high', 'record',
    'strong', 'beat', 'exceed', 'boost', 'rise', 'up', 'positive', 'good',
    'bullish', 'upgrade', 'buy', 'outperform', 'expansion', 'innovation',
    'partnership', 'acquisition', 'revenue', 'earnings beat', 'dividend'
  ]
  
  const negativeKeywords = [
    'loss', 'fall', 'drop', 'decline', 'crash', 'down', 'weak', 'miss',
    'disappoint', 'concern', 'risk', 'warning', 'cut', 'reduce', 'negative',
    'bearish', 'downgrade', 'sell', 'underperform', 'debt', 'lawsuit',
    'investigation', 'scandal', 'layoff', 'closure', 'bankruptcy'
  ]
  
  const highImpactKeywords = [
    'earnings', 'results', 'profit', 'revenue', 'guidance', 'forecast',
    'merger', 'acquisition', 'ceo', 'regulation', 'ban', 'approval',
    'launch', 'record', 'breakthrough', 'crisis', 'scandal'
  ]
  
  // Calculate scores
  let positiveScore = 0
  let negativeScore = 0
  let impactScore = 0
  const foundKeywords: string[] = []
  
  positiveKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      positiveScore += 1
      foundKeywords.push(`+${keyword}`)
    }
  })
  
  negativeKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      negativeScore += 1
      foundKeywords.push(`-${keyword}`)
    }
  })
  
  highImpactKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      impactScore += 1
    }
  })
  
  // Determine sentiment
  const netScore = positiveScore - negativeScore
  let sentiment: 'positive' | 'negative' | 'neutral'
  let score: number
  
  if (netScore > 1) {
    sentiment = 'positive'
    score = Math.min(10, 6 + positiveScore)
  } else if (netScore < -1) {
    sentiment = 'negative'
    score = Math.max(1, 5 - negativeScore)
  } else {
    sentiment = 'neutral'
    score = 5
  }
  
  // Adjust score based on impact
  if (impactScore > 2) {
    score = sentiment === 'positive' ? Math.min(10, score + 1) : Math.max(1, score - 1)
  }
  
  // Determine impact level
  let impact: 'high' | 'medium' | 'low'
  if (impactScore >= 3 || Math.abs(netScore) >= 4) {
    impact = 'high'
  } else if (impactScore >= 1 || Math.abs(netScore) >= 2) {
    impact = 'medium'
  } else {
    impact = 'low'
  }
  
  // Calculate confidence based on number of keywords found
  const totalKeywords = positiveScore + negativeScore + impactScore
  const confidence = Math.min(100, (totalKeywords / 5) * 100)
  
  // Generate summary
  const summary = generateSummary(newsItem, sentiment, impact, netScore)
  
  return {
    score,
    sentiment,
    impact,
    summary,
    keywords: foundKeywords.slice(0, 5),
    confidence,
  }
}

function generateSummary(newsItem: NewsItem, sentiment: string, impact: string, netScore: number): string {
  const direction = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : 'neutral'
  const strength = Math.abs(netScore) > 3 ? 'strongly' : Math.abs(netScore) > 1 ? 'moderately' : 'slightly'
  
  return `${strength} ${direction} news with ${impact} potential impact on stock price`
}

// Calculate overall sentiment from all news items
function calculateOverallSentiment(
  newsItems: Array<NewsItem & { sentiment: NewsSentiment }>
): NewsSentiment {
  if (newsItems.length === 0) {
    return {
      score: 5,
      sentiment: 'neutral',
      impact: 'low',
      summary: 'No news available for analysis',
      keywords: [],
      confidence: 0,
    }
  }
  
  // Weight recent news more heavily
  let weightedScore = 0
  let totalWeight = 0
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  let highImpactCount = 0
  const allKeywords: string[] = []
  
  newsItems.forEach((item, index) => {
    const weight = newsItems.length - index // More recent = higher weight
    weightedScore += item.sentiment.score * weight
    totalWeight += weight
    
    if (item.sentiment.sentiment === 'positive') positiveCount++
    else if (item.sentiment.sentiment === 'negative') negativeCount++
    else neutralCount++
    
    if (item.sentiment.impact === 'high') highImpactCount++
    
    allKeywords.push(...item.sentiment.keywords)
  })
  
  const averageScore = Math.round((weightedScore / totalWeight) * 10) / 10
  
  // Determine overall sentiment
  let sentiment: 'positive' | 'negative' | 'neutral'
  if (positiveCount > negativeCount * 1.5) {
    sentiment = 'positive'
  } else if (negativeCount > positiveCount * 1.5) {
    sentiment = 'negative'
  } else {
    sentiment = 'neutral'
  }
  
  // Determine overall impact
  const highImpactRatio = highImpactCount / newsItems.length
  let impact: 'high' | 'medium' | 'low'
  if (highImpactRatio > 0.4) {
    impact = 'high'
  } else if (highImpactRatio > 0.2) {
    impact = 'medium'
  } else {
    impact = 'low'
  }
  
  // Get most common keywords
  const keywordCounts = new Map<string, number>()
  allKeywords.forEach(kw => {
    keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1)
  })
  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw]) => kw)
  
  const confidence = Math.min(100, (newsItems.length / 15) * 100)
  
  const summary = `Based on ${newsItems.length} news articles from last 7 days: ${sentiment} sentiment (${positiveCount} positive, ${negativeCount} negative, ${neutralCount} neutral) with ${impact} impact potential`
  
  return {
    score: averageScore,
    sentiment,
    impact,
    summary,
    keywords: topKeywords,
    confidence,
  }
}

// Generate trading recommendation
function generateRecommendation(overallSentiment: NewsSentiment, score: number): string {
  if (score >= 7.5 && overallSentiment.impact === 'high') {
    return '🚀 STRONG BUY: Highly positive news with significant upside potential'
  } else if (score >= 6.5) {
    return '📈 BUY: Positive sentiment suggests upward momentum'
  } else if (score >= 5.5) {
    return '➡️ HOLD: Neutral to slightly positive, monitor for changes'
  } else if (score >= 4.5) {
    return '⚠️ HOLD: Mixed sentiment, wait for clearer signals'
  } else if (score >= 3.5) {
    return '📉 SELL: Negative sentiment suggests caution'
  } else {
    return '🛑 STRONG SELL: Highly negative news with significant downside risk'
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const days = parseInt(searchParams.get('days') || '7')
    
    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Symbol parameter is required',
      }, { status: 400 })
    }
    
    // Check cache
    const cacheKey = `news-analysis-${symbol}-${days}`
    const cached = analysisCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: Date.now(),
      })
    }
    
    console.log(`🤖 Starting AI news analysis for ${symbol}...`)
    
    // Fetch news - pass request URL for dynamic origin detection
    const newsItems = await fetchNewsForStock(symbol, days, request.url)
    
    if (newsItems.length === 0) {
      const fallbackResult: NewsAnalysisResult = {
        symbol,
        overallSentiment: {
          score: 5,
          sentiment: 'neutral',
          impact: 'low',
          summary: 'No recent news found for this stock',
          keywords: [],
          confidence: 0,
        },
        newsItems: [],
        analysisDate: new Date().toISOString(),
        last7DaysScore: 5,
        recommendation: '⚠️ HOLD: Insufficient news data for analysis',
      }
      
      return NextResponse.json({
        success: true,
        data: fallbackResult,
        timestamp: Date.now(),
      })
    }
    
    // Analyze each news item with AI
    console.log(`📰 Analyzing ${newsItems.length} news articles...`)
    const analyzedNews = await Promise.all(
      newsItems.map(async (item) => ({
        ...item,
        sentiment: await analyzeNewsWithAI(item),
      }))
    )
    
    // Calculate overall sentiment
    const overallSentiment = calculateOverallSentiment(analyzedNews)
    const recommendation = generateRecommendation(overallSentiment, overallSentiment.score)
    
    const result: NewsAnalysisResult = {
      symbol,
      overallSentiment,
      newsItems: analyzedNews,
      analysisDate: new Date().toISOString(),
      last7DaysScore: overallSentiment.score,
      recommendation,
    }
    
    // Cache the result
    analysisCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    console.log(`✅ AI Analysis complete: ${overallSentiment.sentiment} (${overallSentiment.score}/10)`)
    
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('Error in AI news analysis:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
