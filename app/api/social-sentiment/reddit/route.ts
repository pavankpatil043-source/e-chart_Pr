import { NextRequest, NextResponse } from "next/server"

/**
 * Reddit Sentiment Scraper API
 * Fetches stock mentions from Reddit without requiring API key
 * Sources: r/IndiaInvestments, r/stocks, r/wallstreetbets
 */

interface RedditPost {
  title: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
  url: string
}

interface RedditSentiment {
  symbol: string
  mentions: number
  score: number // -100 to 100
  sentiment: 'bullish' | 'bearish' | 'neutral'
  posts: Array<{
    title: string
    score: number
    sentiment: string
  }>
  subreddits: {
    indiaInvestments: number
    stocks: number
    wallstreetbets: number
  }
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

  console.log(`📱 Fetching Reddit sentiment for ${symbol}...`)

  try {
    // Clean symbol (remove .NS suffix for search)
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '')
    
    // Search multiple subreddits
    const subreddits = ['IndiaInvestments', 'stocks', 'wallstreetbets']
    const allPosts: RedditPost[] = []
    const subredditCounts = {
      indiaInvestments: 0,
      stocks: 0,
      wallstreetbets: 0
    }

    // Fetch from each subreddit (Reddit's JSON API is free!)
    for (const subreddit of subreddits) {
      try {
        const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${cleanSymbol}&limit=25&sort=relevance&t=week`
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          const posts = data?.data?.children || []
          
          // Count posts per subreddit
          const subredditKey = subreddit === 'IndiaInvestments' ? 'indiaInvestments' : 
                              subreddit === 'stocks' ? 'stocks' : 'wallstreetbets'
          subredditCounts[subredditKey] = posts.length

          allPosts.push(...posts.map((p: any) => p.data))
          console.log(`✅ Found ${posts.length} posts in r/${subreddit}`)
        }
      } catch (error) {
        console.log(`⚠️ Failed to fetch from r/${subreddit}:`, error)
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Analyze sentiment
    const sentiment = analyzeSentiment(allPosts, cleanSymbol)

    const result: RedditSentiment = {
      symbol: cleanSymbol,
      mentions: allPosts.length,
      score: sentiment.score,
      sentiment: sentiment.sentiment,
      posts: sentiment.topPosts,
      subreddits: subredditCounts
    }

    console.log(`✅ Reddit sentiment for ${symbol}: ${sentiment.sentiment} (${sentiment.score})`)

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Reddit scraper error:', error)
    
    // Return fallback data instead of error
    return NextResponse.json({
      success: true,
      data: {
        symbol: symbol.replace('.NS', '').replace('.BO', ''),
        mentions: 0,
        score: 50, // Neutral
        sentiment: 'neutral' as const,
        posts: [],
        subreddits: {
          indiaInvestments: 0,
          stocks: 0,
          wallstreetbets: 0
        }
      },
      fallback: true,
      timestamp: new Date().toISOString()
    })
  }
}

/**
 * Analyze sentiment from Reddit posts
 */
function analyzeSentiment(posts: RedditPost[], symbol: string) {
  if (posts.length === 0) {
    return {
      score: 50,
      sentiment: 'neutral' as const,
      topPosts: []
    }
  }

  // Filter posts that actually mention the stock symbol
  const relevantPosts = posts.filter(post => {
    const text = `${post.title} ${post.selftext}`.toLowerCase()
    const symbolLower = symbol.toLowerCase()
    // Must contain stock symbol or company name
    return text.includes(symbolLower)
  })

  if (relevantPosts.length === 0) {
    return {
      score: 50,
      sentiment: 'neutral' as const,
      topPosts: []
    }
  }

  // Sentiment keywords (more strict)
  const bullishKeywords = [
    'buy', 'buying', 'bullish', 'moon', 'rocket', 'gain', 'profit', 'up', 'long',
    'growth', 'invest', 'holding', 'strong buy', 'good buy', 'great opportunity',
    'undervalued', 'breakout', 'rally', 'surge', 'beat expectations', 'positive'
  ]

  const bearishKeywords = [
    'sell', 'selling', 'bearish', 'crash', 'loss', 'down', 'short', 'weak', 'bad',
    'overvalued', 'dump', 'fall', 'decline', 'drop', 'correction', 'bubble', 'avoid',
    'risk', 'danger', 'stay away', 'miss expectations', 'negative', 'disappointing'
  ]

  let totalSentiment = 0
  const analyzedPosts = relevantPosts.map(post => {
    const text = `${post.title} ${post.selftext}`.toLowerCase()
    
    let bullishCount = 0
    let bearishCount = 0

    // Count keyword occurrences
    bullishKeywords.forEach(keyword => {
      if (text.includes(keyword)) bullishCount++
    })

    bearishKeywords.forEach(keyword => {
      if (text.includes(keyword)) bearishCount++
    })

    // Calculate post sentiment (-1 to 1)
    const postSentiment = bullishCount > bearishCount ? 1 : 
                         bearishCount > bullishCount ? -1 : 0
    
    // Weight by post score (upvotes) - use logarithmic scale
    const weight = Math.max(1, Math.log(post.score + 2))
    totalSentiment += postSentiment * weight

    return {
      title: post.title,
      score: post.score,
      sentiment: postSentiment > 0 ? 'bullish' : postSentiment < 0 ? 'bearish' : 'neutral'
    }
  })

  // Normalize to 0-100 scale (more conservative)
  const avgSentiment = totalSentiment / relevantPosts.length
  const normalizedScore = 50 + (avgSentiment * 25) // Less extreme swings
  const finalScore = Math.max(0, Math.min(100, Math.round(normalizedScore)))

  const sentimentLabel: 'bullish' | 'bearish' | 'neutral' = 
    finalScore >= 65 ? 'bullish' :
    finalScore <= 35 ? 'bearish' : 'neutral'

  // Get top 5 relevant posts by score
  const topPosts = analyzedPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return {
    score: finalScore,
    sentiment: sentimentLabel,
    topPosts
  }
}
