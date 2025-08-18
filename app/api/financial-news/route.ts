import { type NextRequest, NextResponse } from "next/server"

interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: "positive" | "negative" | "neutral"
  category: string
  imageUrl?: string
  author?: string
}

const NEWS_API_KEY = process.env.NEWS_API_KEY || "demo"
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "demo"

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userRequests = requestCounts.get(ip)

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (userRequests.count >= RATE_LIMIT) {
    return false
  }

  userRequests.count++
  return true
}

// Cache for news data
const cache = new Map<string, { data: NewsArticle[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedNews(key: string): NewsArticle[] | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedNews(key: string, data: NewsArticle[]) {
  cache.set(key, { data, timestamp: Date.now() })
}

// Simple sentiment analysis
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const positiveWords = [
    "gain",
    "gains",
    "up",
    "rise",
    "rises",
    "bull",
    "bullish",
    "growth",
    "profit",
    "profits",
    "surge",
    "soar",
    "rally",
    "boost",
    "strong",
    "positive",
    "good",
    "excellent",
    "success",
    "breakthrough",
    "milestone",
    "achievement",
    "record",
    "high",
    "peak",
    "outperform",
  ]

  const negativeWords = [
    "fall",
    "falls",
    "down",
    "drop",
    "drops",
    "bear",
    "bearish",
    "loss",
    "losses",
    "decline",
    "crash",
    "plunge",
    "slump",
    "weak",
    "negative",
    "bad",
    "poor",
    "concern",
    "worry",
    "risk",
    "threat",
    "crisis",
    "problem",
    "issue",
    "low",
    "bottom",
    "underperform",
  ]

  const lowerText = text.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveScore++
  })

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeScore++
  })

  if (positiveScore > negativeScore) return "positive"
  if (negativeScore > positiveScore) return "negative"
  return "neutral"
}

// Categorize news
function categorizeNews(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  if (text.includes("bank") || text.includes("finance") || text.includes("loan") || text.includes("credit")) {
    return "Banking"
  }
  if (text.includes("tech") || text.includes("it") || text.includes("software") || text.includes("digital")) {
    return "Technology"
  }
  if (text.includes("pharma") || text.includes("drug") || text.includes("medicine") || text.includes("health")) {
    return "Healthcare"
  }
  if (text.includes("auto") || text.includes("car") || text.includes("vehicle") || text.includes("motor")) {
    return "Automobile"
  }
  if (text.includes("oil") || text.includes("gas") || text.includes("energy") || text.includes("power")) {
    return "Energy"
  }
  if (text.includes("rbi") || text.includes("policy") || text.includes("government") || text.includes("regulation")) {
    return "Policy"
  }
  if (text.includes("market") || text.includes("stock") || text.includes("share") || text.includes("trading")) {
    return "Market"
  }
  return "General"
}

async function fetchNewsAPI(): Promise<NewsArticle[]> {
  try {
    const queries = [
      "NSE India stock market",
      "BSE India financial",
      "Indian economy business",
      "RBI monetary policy",
      "Indian banking sector",
    ]

    const randomQuery = queries[Math.floor(Math.random() * queries.length)]

    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(randomQuery)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
      {
        headers: {
          "User-Agent": "EChart-Pro/1.0",
        },
        next: { revalidate: 300 }, // 5 minutes
      },
    )

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.articles || !Array.isArray(data.articles)) {
      return []
    }

    return data.articles
      .filter((article: any) => article.title && article.description && article.url)
      .slice(0, 15)
      .map((article: any, index: number) => ({
        id: `newsapi-${Date.now()}-${index}`,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source?.name || "NewsAPI",
        publishedAt: article.publishedAt,
        sentiment: analyzeSentiment(`${article.title} ${article.description}`),
        category: categorizeNews(article.title, article.description),
        imageUrl: article.urlToImage,
        author: article.author,
      }))
  } catch (error) {
    console.error("Error fetching NewsAPI:", error)
    return []
  }
}

async function fetchFinnhubNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      throw new Error(`Finnhub News API error: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data
      .filter((article: any) => article.headline && article.summary && article.url)
      .slice(0, 10)
      .map((article: any, index: number) => ({
        id: `finnhub-${Date.now()}-${index}`,
        title: article.headline,
        description: article.summary,
        url: article.url,
        source: article.source || "Finnhub",
        publishedAt: new Date(article.datetime * 1000).toISOString(),
        sentiment: analyzeSentiment(`${article.headline} ${article.summary}`),
        category: categorizeNews(article.headline, article.summary),
        imageUrl: article.image,
      }))
  } catch (error) {
    console.error("Error fetching Finnhub news:", error)
    return []
  }
}

// Generate fallback news when APIs fail
function generateFallbackNews(): NewsArticle[] {
  const fallbackArticles = [
    {
      id: "fallback-1",
      title: "NSE Nifty 50 Shows Strong Performance Amid Market Volatility",
      description:
        "The benchmark Nifty 50 index demonstrated resilience today with banking and IT sectors leading the gains. Market experts suggest continued optimism despite global uncertainties.",
      url: "#",
      source: "Market Simulation",
      publishedAt: new Date().toISOString(),
      sentiment: "positive" as const,
      category: "Market",
    },
    {
      id: "fallback-2",
      title: "RBI Monetary Policy Committee Meeting Scheduled Next Week",
      description:
        "The Reserve Bank of India is expected to announce key policy decisions that could impact interest rates and market liquidity. Analysts are closely watching for inflation targets.",
      url: "#",
      source: "Economic Times Simulation",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      sentiment: "neutral" as const,
      category: "Policy",
    },
    {
      id: "fallback-3",
      title: "Indian IT Sector Sees Increased Demand for Digital Services",
      description:
        "Major IT companies report strong quarterly results driven by digital transformation projects. The sector continues to benefit from global technology adoption trends.",
      url: "#",
      source: "Business Standard Simulation",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      sentiment: "positive" as const,
      category: "Technology",
    },
    {
      id: "fallback-4",
      title: "Banking Sector Faces Headwinds from Rising NPAs",
      description:
        "Several public sector banks report concerns over non-performing assets as economic recovery remains uneven across sectors. Credit growth shows mixed signals.",
      url: "#",
      source: "Financial Express Simulation",
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      sentiment: "negative" as const,
      category: "Banking",
    },
    {
      id: "fallback-5",
      title: "Pharmaceutical Companies Boost R&D Investment",
      description:
        "Indian pharma giants announce increased spending on research and development, focusing on innovative drug discovery and biosimilar development for global markets.",
      url: "#",
      source: "Mint Simulation",
      publishedAt: new Date(Date.now() - 14400000).toISOString(),
      sentiment: "positive" as const,
      category: "Healthcare",
    },
  ]

  return fallbackArticles
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || "all"
    const sentiment = searchParams.get("sentiment") || "all"

    // Rate limiting check
    const clientIP = request.headers.get("x-forwarded-for") || "unknown"
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        { status: 429 },
      )
    }

    // Check cache first
    const cacheKey = `news-${category}-${sentiment}`
    const cachedNews = getCachedNews(cacheKey)
    if (cachedNews) {
      return NextResponse.json({
        success: true,
        data: cachedNews,
        cached: true,
        count: cachedNews.length,
        timestamp: new Date().toISOString(),
      })
    }

    // Fetch from multiple sources
    const [newsApiArticles, finnhubArticles] = await Promise.all([fetchNewsAPI(), fetchFinnhubNews()])

    // Combine and deduplicate articles
    let allArticles = [...newsApiArticles, ...finnhubArticles]

    // If no articles from APIs, use fallback
    if (allArticles.length === 0) {
      allArticles = generateFallbackNews()
    }

    // Remove duplicates based on title similarity
    const uniqueArticles = allArticles.filter(
      (article, index, self) =>
        index ===
        self.findIndex((a) => a.title.toLowerCase().substring(0, 50) === article.title.toLowerCase().substring(0, 50)),
    )

    // Apply filters
    let filteredArticles = uniqueArticles

    if (category !== "all") {
      filteredArticles = filteredArticles.filter((article) => article.category.toLowerCase() === category.toLowerCase())
    }

    if (sentiment !== "all") {
      filteredArticles = filteredArticles.filter((article) => article.sentiment === sentiment)
    }

    // Sort by published date (newest first)
    filteredArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    // Limit to 20 articles
    filteredArticles = filteredArticles.slice(0, 20)

    // Cache the results
    setCachedNews(cacheKey, filteredArticles)

    // Get metadata for filtering
    const categories = [...new Set(uniqueArticles.map((article) => article.category))].sort()
    const sentiments = [...new Set(uniqueArticles.map((article) => article.sentiment))].sort()

    return NextResponse.json({
      success: true,
      data: filteredArticles,
      metadata: {
        totalArticles: filteredArticles.length,
        categories,
        sentiments,
        sources: [...new Set(filteredArticles.map((article) => article.source))],
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching financial news:", error)

    // Return fallback news on error
    const fallbackNews = generateFallbackNews()

    return NextResponse.json({
      success: true,
      data: fallbackNews,
      fallback: true,
      error: "News APIs temporarily unavailable",
      count: fallbackNews.length,
      timestamp: new Date().toISOString(),
    })
  }
}
