import { HfInference } from '@huggingface/inference'
import { type NextRequest, NextResponse } from 'next/server'

// Initialize Hugging Face with API key from environment
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY)

interface NewsItem {
  title: string
  description: string
  link: string
  pubDate: string
  source: string
}

interface HuggingFaceSentiment {
  label: string
  score: number
}

interface EnhancedSentiment {
  score: number // 1-10
  sentiment: 'positive' | 'negative' | 'neutral'
  impact: 'high' | 'medium' | 'low'
  summary: string
  confidence: number
  aiModel: string
  keywords: string[]
}

interface EnhancedNewsAnalysis {
  symbol: string
  overallSentiment: EnhancedSentiment
  newsItems: Array<NewsItem & { sentiment: EnhancedSentiment }>
  last7DaysScore: number
  recommendation: string
  marketImpact: string
  analysisDate: string
}

// Cache
const cache = new Map<string, { data: EnhancedNewsAnalysis; timestamp: number }>()
const CACHE_DURATION = 3600000 // 1 hour

// Fetch news using LangChain-style data retrieval
async function fetchNewsData(symbol: string, days: number = 7): Promise<NewsItem[]> {
  const baseSymbol = symbol.replace('.NS', '')
  
  try {
    // Try Yahoo News API first
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/yahoo-news?symbol=${baseSymbol}`,
      { signal: AbortSignal.timeout(10000) }
    )
    
    if (response.ok) {
      const data = await response.json()
      if (data.articles && Array.isArray(data.articles)) {
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
          .slice(0, 20)
      }
    }
  } catch (error) {
    console.error('Error fetching news:', error)
  }
  
  return []
}

// Analyze sentiment using Hugging Face FinBERT model
async function analyzeWithHuggingFace(text: string): Promise<EnhancedSentiment> {
  try {
    // Use FinBERT - financial sentiment analysis model
    const result = await hf.textClassification({
      model: 'ProsusAI/finbert',
      inputs: text,
    })
    
    if (result && Array.isArray(result)) {
      const topResult = result[0] as HuggingFaceSentiment
      
      // Map FinBERT labels to our sentiment
      let sentiment: 'positive' | 'negative' | 'neutral'
      let score: number
      
      if (topResult.label === 'positive') {
        sentiment = 'positive'
        score = 5 + (topResult.score * 5) // 5-10 range
      } else if (topResult.label === 'negative') {
        sentiment = 'negative'
        score = 5 - (topResult.score * 4) // 1-5 range
      } else {
        sentiment = 'neutral'
        score = 5
      }
      
      // Determine impact based on confidence
      let impact: 'high' | 'medium' | 'low'
      if (topResult.score > 0.8) impact = 'high'
      else if (topResult.score > 0.6) impact = 'medium'
      else impact = 'low'
      
      // Extract keywords
      const keywords = extractKeywords(text)
      
      return {
        score: Number(score.toFixed(2)),
        sentiment,
        impact,
        summary: `AI-analyzed: ${sentiment} sentiment with ${Math.round(topResult.score * 100)}% confidence`,
        confidence: Math.round(topResult.score * 100),
        aiModel: 'ProsusAI/finbert (FinBERT)',
        keywords,
      }
    }
  } catch (error) {
    console.error('Error with Hugging Face API:', error)
    // Fallback to keyword-based analysis
    return fallbackSentimentAnalysis(text)
  }
  
  return fallbackSentimentAnalysis(text)
}

// Fallback keyword-based analysis if Hugging Face fails
function fallbackSentimentAnalysis(text: string): EnhancedSentiment {
  const lowerText = text.toLowerCase()
  
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
  
  let positiveCount = 0
  let negativeCount = 0
  const foundKeywords: string[] = []
  
  positiveKeywords.forEach(kw => {
    if (lowerText.includes(kw)) {
      positiveCount++
      foundKeywords.push(`+${kw}`)
    }
  })
  
  negativeKeywords.forEach(kw => {
    if (lowerText.includes(kw)) {
      negativeCount++
      foundKeywords.push(`-${kw}`)
    }
  })
  
  const netScore = positiveCount - negativeCount
  let sentiment: 'positive' | 'negative' | 'neutral'
  let score: number
  
  if (netScore > 1) {
    sentiment = 'positive'
    score = Math.min(10, 6 + positiveCount)
  } else if (netScore < -1) {
    sentiment = 'negative'
    score = Math.max(1, 5 - negativeCount)
  } else {
    sentiment = 'neutral'
    score = 5
  }
  
  const confidence = Math.min(95, 50 + (Math.abs(netScore) * 10))
  const impact: 'high' | 'medium' | 'low' = Math.abs(netScore) > 3 ? 'high' : Math.abs(netScore) > 1 ? 'medium' : 'low'
  
  return {
    score: Number(score.toFixed(2)),
    sentiment,
    impact,
    summary: `Keyword analysis: ${sentiment} (${foundKeywords.length} signals)`,
    confidence,
    aiModel: 'Keyword-based fallback',
    keywords: foundKeywords.slice(0, 5),
  }
}

// Extract important keywords using simple NLP
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\W+/)
  const importantWords = words.filter(word => 
    word.length > 4 && 
    !['about', 'after', 'before', 'their', 'there', 'these', 'those', 'where', 'which', 'while'].includes(word)
  )
  
  // Count frequency
  const frequency = new Map<string, number>()
  importantWords.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1)
  })
  
  // Get top keywords
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

// Calculate overall sentiment from all news
function calculateOverallSentiment(
  analyzedNews: Array<NewsItem & { sentiment: EnhancedSentiment }>
): EnhancedSentiment {
  if (analyzedNews.length === 0) {
    return {
      score: 5,
      sentiment: 'neutral',
      impact: 'low',
      summary: 'No news available for analysis',
      confidence: 0,
      aiModel: 'N/A',
      keywords: [],
    }
  }
  
  // Weight recent news more heavily
  let weightedScore = 0
  let totalWeight = 0
  let totalConfidence = 0
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  let highImpactCount = 0
  const allKeywords: string[] = []
  
  analyzedNews.forEach((item, index) => {
    const weight = analyzedNews.length - index // Recent news has higher weight
    weightedScore += item.sentiment.score * weight
    totalWeight += weight
    totalConfidence += item.sentiment.confidence
    
    if (item.sentiment.sentiment === 'positive') positiveCount++
    else if (item.sentiment.sentiment === 'negative') negativeCount++
    else neutralCount++
    
    if (item.sentiment.impact === 'high') highImpactCount++
    
    allKeywords.push(...item.sentiment.keywords)
  })
  
  const averageScore = weightedScore / totalWeight
  const averageConfidence = totalConfidence / analyzedNews.length
  
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
  const highImpactRatio = highImpactCount / analyzedNews.length
  const impact: 'high' | 'medium' | 'low' = highImpactRatio > 0.4 ? 'high' : highImpactRatio > 0.2 ? 'medium' : 'low'
  
  // Get unique top keywords
  const keywordFreq = new Map<string, number>()
  allKeywords.forEach(kw => {
    keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1)
  })
  const topKeywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([kw]) => kw)
  
  return {
    score: Number(averageScore.toFixed(2)),
    sentiment,
    impact,
    summary: `AI-analyzed ${analyzedNews.length} articles: ${sentiment} sentiment (${positiveCount}+ / ${negativeCount}-)`,
    confidence: Math.round(averageConfidence),
    aiModel: 'ProsusAI/finbert + Keyword Analysis',
    keywords: topKeywords,
  }
}

// Generate market impact assessment
function generateMarketImpact(sentiment: EnhancedSentiment, score: number): string {
  if (score >= 8 && sentiment.impact === 'high') {
    return '🚀 VERY BULLISH: Strong positive catalysts. Expect significant upward pressure on stock price.'
  } else if (score >= 7) {
    return '📈 BULLISH: Positive news flow suggests upward momentum likely to continue.'
  } else if (score >= 6) {
    return '➕ SLIGHTLY BULLISH: Mild positive sentiment, moderate upside potential.'
  } else if (score >= 4.5 && score <= 5.5) {
    return '➡️ NEUTRAL: Balanced news flow, no clear directional bias in sentiment.'
  } else if (score >= 3) {
    return '➖ SLIGHTLY BEARISH: Mild negative sentiment, some downside risk.'
  } else if (score >= 2) {
    return '📉 BEARISH: Negative news flow suggests downward pressure likely.'
  } else {
    return '🛑 VERY BEARISH: Strong negative catalysts. Expect significant downward pressure on stock price.'
  }
}

// Generate trading recommendation
function generateRecommendation(sentiment: EnhancedSentiment, score: number): string {
  if (score >= 8 && sentiment.confidence > 70) {
    return '🚀 STRONG BUY: AI confidence ' + sentiment.confidence + '% - High probability upward move'
  } else if (score >= 6.5) {
    return '📈 BUY: Positive AI sentiment suggests accumulation opportunity'
  } else if (score >= 5.5) {
    return '➡️ HOLD/BUY: Neutral to slightly positive, watch for confirmation'
  } else if (score >= 4.5) {
    return '⚠️ HOLD: Mixed sentiment, wait for clearer signals'
  } else if (score >= 3.5) {
    return '📉 SELL: Negative AI sentiment suggests reducing exposure'
  } else {
    return '🛑 STRONG SELL: AI confidence ' + sentiment.confidence + '% - High probability downward move'
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
    const cacheKey = `hf-news-${symbol}-${days}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        timestamp: Date.now(),
      })
    }
    
    console.log(`🤖 Starting Hugging Face AI analysis for ${symbol}...`)
    
    // Fetch news
    const newsItems = await fetchNewsData(symbol, days)
    
    if (newsItems.length === 0) {
      const fallbackResult: EnhancedNewsAnalysis = {
        symbol,
        overallSentiment: {
          score: 5,
          sentiment: 'neutral',
          impact: 'low',
          summary: 'No recent news found for analysis',
          confidence: 0,
          aiModel: 'N/A',
          keywords: [],
        },
        newsItems: [],
        last7DaysScore: 5,
        recommendation: '⚠️ HOLD: Insufficient news data for AI analysis',
        marketImpact: '➡️ NEUTRAL: No significant news events detected',
        analysisDate: new Date().toISOString(),
      }
      
      return NextResponse.json({
        success: true,
        data: fallbackResult,
        timestamp: Date.now(),
      })
    }
    
    // Analyze each article with Hugging Face FinBERT
    console.log(`🧠 Analyzing ${newsItems.length} articles with FinBERT AI model...`)
    const analyzedNews = await Promise.all(
      newsItems.map(async (item) => {
        const text = `${item.title}. ${item.description}`
        const sentiment = await analyzeWithHuggingFace(text)
        return { ...item, sentiment }
      })
    )
    
    // Calculate overall sentiment
    const overallSentiment = calculateOverallSentiment(analyzedNews)
    const marketImpact = generateMarketImpact(overallSentiment, overallSentiment.score)
    const recommendation = generateRecommendation(overallSentiment, overallSentiment.score)
    
    const result: EnhancedNewsAnalysis = {
      symbol,
      overallSentiment,
      newsItems: analyzedNews,
      last7DaysScore: overallSentiment.score,
      recommendation,
      marketImpact,
      analysisDate: new Date().toISOString(),
    }
    
    // Cache result
    cache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    console.log(`✅ Hugging Face AI Analysis complete: ${overallSentiment.sentiment} (${overallSentiment.score}/10) - ${overallSentiment.confidence}% confidence`)
    
    return NextResponse.json({
      success: true,
      data: result,
      cached: false,
      timestamp: Date.now(),
    })
    
  } catch (error) {
    console.error('Error in Hugging Face AI analysis:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 })
  }
}
