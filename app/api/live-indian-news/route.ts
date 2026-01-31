import { type NextRequest, NextResponse } from "next/server"

// Force dynamic rendering (disable Next.js route caching in production)
export const dynamic = 'force-dynamic'
export const revalidate = 0 // Disable caching

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
}

// Cache for news data
const cache = new Map<string, { data: NewsArticle[]; timestamp: number }>()
const CACHE_DURATION = 1 * 60 * 1000 // 1 minute (was 5 minutes)

/**
 * Clean text by removing HTML tags, entities, and URLs
 */
function cleanText(text: string): string {
  if (!text) return ""
  
  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, " ")
    // Remove HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "...")
    .replace(/&[a-zA-Z]+;/g, "") // Remove any other HTML entities
    .replace(/&#\d+;/g, "") // Remove numeric entities
    // Remove href attributes
    .replace(/href="[^"]*"/gi, "")
    .replace(/href='[^']*'/gi, "")
    // Remove standalone URLs
    .replace(/https?:\/\/[^\s]+/g, "")
    // Remove target="_blank" and similar attributes
    .replace(/target="[^"]*"/gi, "")
    .replace(/rel="[^"]*"/gi, "")
    // Remove extra spaces and newlines
    .replace(/\s+/g, " ")
    .trim()
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
    "surge",
    "rally",
    "boost",
    "strong",
    "positive",
    "good",
    "excellent",
    "success",
    "high",
    "record",
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
    "weak",
    "negative",
    "poor",
    "concern",
    "worry",
    "crisis",
    "fail",
  ]

  const lowerText = text.toLowerCase()
  let score = 0

  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) score += 1
  })

  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) score -= 1
  })

  if (score > 0) return "positive"
  if (score < 0) return "negative"
  return "neutral"
}

function categorizeNews(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  // FII/DII specific keywords (highest priority - check first)
  if (
    text.includes("fii") || 
    text.includes("dii") || 
    text.includes("foreign institutional") ||
    text.includes("domestic institutional") ||
    text.includes("foreign investor") ||
    text.includes("foreign inflow") ||
    text.includes("foreign outflow") ||
    text.includes("institutional investor") ||
    text.includes("fpi")
  ) {
    return "FII/DII"
  }
  
  // Economy-specific keywords (check first for priority)
  if (
    text.includes("gdp") || 
    text.includes("inflation") || 
    text.includes("fiscal") || 
    text.includes("monetary") ||
    text.includes("economy") ||
    text.includes("economic growth") ||
    text.includes("budget") ||
    text.includes("tax") ||
    text.includes("deficit") ||
    text.includes("trade deficit") ||
    text.includes("export") ||
    text.includes("import")
  ) {
    return "Economy"
  }
  if (text.includes("bank") || text.includes("hdfc") || text.includes("icici") || text.includes("sbi")) {
    return "Banking"
  }
  if (text.includes("tech") || text.includes("it") || text.includes("software") || text.includes("digital")) {
    return "Technology"
  }
  if (text.includes("pharma") || text.includes("health") || text.includes("medical") || text.includes("drug")) {
    return "Healthcare"
  }
  if (text.includes("auto") || text.includes("car") || text.includes("vehicle") || text.includes("mahindra")) {
    return "Automobile"
  }
  if (text.includes("oil") || text.includes("gas") || text.includes("energy") || text.includes("power")) {
    return "Energy"
  }
  if (text.includes("rbi") || text.includes("policy") || text.includes("government") || text.includes("regulation")) {
    return "Policy"
  }
  if (text.includes("nifty") || text.includes("sensex") || text.includes("market") || text.includes("stock")) {
    return "Market"
  }
  return "General"
}

/**
 * Fetch Indian Business News from RSS Feeds (NO API KEY REQUIRED!)
 * Using free RSS feeds from major Indian news sources
 */
async function fetchIndianBusinessNews(): Promise<NewsArticle[]> {
  try {
    // Using Google News RSS (works reliably without API keys)
    // Simple broad query that includes business, economy, and finance news
    const query = "India business"
    
    const response = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 300 }, // 5 minutes cache
      },
    )

    if (!response.ok) {
      throw new Error(`Google News RSS error: ${response.status}`)
    }

    const xmlText = await response.text()
    console.log(`📄 Google News RSS length: ${xmlText.length} characters`)
    
    // Parse XML manually (simple approach)
    const articles: NewsArticle[] = []
    // Using RegExp constructor to avoid compile error
    const itemRegex = new RegExp("<item>(.*?)</item>", "gs")
    const items = xmlText.match(itemRegex) || []
    console.log(`📰 Found ${items.length} items in Google News RSS`)
    
    // Increase to 200 articles to cover 30 days of historical data (was 50 for 4 days)
    items.slice(0, 200).forEach((item, index) => {
      // More flexible regex patterns that handle both CDATA and plain text
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/)
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)
      const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
      
      if (titleMatch && linkMatch) {
        const title = cleanText(titleMatch[1])
        const rawDescription = descMatch ? descMatch[1] : title
        const description = cleanText(rawDescription).substring(0, 200)
        
        articles.push({
          id: `googlenews-${Date.now()}-${index}`,
          title: title,
          description: description || title, // Fallback to title if description is empty
          url: linkMatch[1].trim(),
          source: "Google News India",
          publishedAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
          sentiment: analyzeSentiment(`${title} ${description}`),
          category: categorizeNews(title, description),
        })
      }
    })

    console.log(`✅ Parsed ${articles.length} articles from Google News`)
    return articles
  } catch (error) {
    console.error("Error fetching Google News RSS:", error)
    return []
  }
}

/**
 * Fetch from The News API (Free tier - 100 requests/day)
 */
async function fetchTheNewsAPI(): Promise<NewsArticle[]> {
  try {
    // The News API - Free tier
    const response = await fetch(
      "https://api.thenewsapi.com/v1/news/all?api_token=demo&categories=business&language=en&limit=10",
      {
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      console.log(`⚠️ TheNewsAPI failed: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      console.log(`⚠️ TheNewsAPI: No data array found`)
      return []
    }

    const articles = data.data
      .filter((item: any) => item.title)
      .slice(0, 10)
      .map((item: any, index: number) => ({
        id: `thenews-${Date.now()}-${index}`,
        title: cleanText(item.title),
        description: cleanText(item.description || item.snippet || item.title),
        url: item.url || "#",
        source: item.source || "Business News",
        publishedAt: item.published_at || new Date().toISOString(),
        sentiment: analyzeSentiment(`${item.title} ${item.description || ""}`),
        category: "Market",
        imageUrl: item.image_url,
      }))
    
    console.log(`✅ Parsed ${articles.length} articles from TheNewsAPI`)
    return articles
  } catch (error) {
    console.error("Error fetching TheNewsAPI:", error)
    return []
  }
}

/**
 * Fetch from MediaStack (Free tier available)
 */
async function fetchMediaStackNews(): Promise<NewsArticle[]> {
  try {
    // Using free tier - can get your own key at https://mediastack.com/
    const response = await fetch(
      `http://api.mediastack.com/v1/news?access_key=free&countries=in&categories=business&limit=15`,
      {
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data
      .filter((item: any) => item.title && item.description)
      .map((item: any, index: number) => ({
        id: `mediastack-${Date.now()}-${index}`,
        title: cleanText(item.title),
        description: cleanText(item.description).substring(0, 200),
        url: item.url || "#",
        source: item.source || "Indian Business",
        publishedAt: item.published_at || new Date().toISOString(),
        sentiment: analyzeSentiment(`${item.title} ${item.description}`),
        category: categorizeNews(item.title, item.description),
        imageUrl: item.image,
      }))
  } catch (error) {
    console.error("Error fetching MediaStack news:", error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || "all"
    const sentiment = searchParams.get("sentiment") || "all"
    const days = parseInt(searchParams.get("days") || "30", 10) // Default to 30 days (was 4)
    
    // Calculate date range (system date to last N days)
    const toDate = new Date() // Current system date
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days) // Go back N days
    
    console.log(`📅 Fetching news from ${fromDate.toISOString()} to ${toDate.toISOString()} (${days} days)`)

    // Check cache first (include days in cache key)
    const cacheKey = `live-news-${category}-${sentiment}-${days}days`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
        count: cached.data.length,
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          days: days,
        },
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      })
    }

    console.log("🔄 Fetching live Indian business news...")

    // Fetch from multiple free sources
    const [googleNews, theNewsAPI, mediaNews] = await Promise.all([
      fetchIndianBusinessNews(),
      fetchTheNewsAPI(),
      fetchMediaStackNews(),
    ])

    console.log(`📊 Google News: ${googleNews.length} articles`)
    console.log(`📊 TheNewsAPI: ${theNewsAPI.length} articles`)
    console.log(`📊 MediaStack: ${mediaNews.length} articles`)

    // Combine all articles
    let allArticles = [...googleNews, ...theNewsAPI, ...mediaNews]

    console.log(`✅ Fetched ${allArticles.length} articles from multiple sources`)

    // Remove duplicates based on title
    const uniqueArticles = allArticles.filter(
      (article, index, self) =>
        index ===
        self.findIndex((a) => a.title.toLowerCase().substring(0, 50) === article.title.toLowerCase().substring(0, 50)),
    )

    // Apply filters
    let filteredArticles = uniqueArticles
    
    // Filter by date range (last N days)
    filteredArticles = filteredArticles.filter((article) => {
      const articleDate = new Date(article.publishedAt)
      return articleDate >= fromDate && articleDate <= toDate
    })
    
    console.log(`📅 After date filtering (${days} days): ${filteredArticles.length} articles`)

    if (category !== "all") {
      filteredArticles = filteredArticles.filter((article) => article.category.toLowerCase() === category.toLowerCase())
    }

    if (sentiment !== "all") {
      filteredArticles = filteredArticles.filter((article) => article.sentiment === sentiment)
    }

    // Sort by published date (newest first)
    filteredArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    // Limit to 100 articles (was 20)
    filteredArticles = filteredArticles.slice(0, 100)

    // Cache the results
    cache.set(cacheKey, { data: filteredArticles, timestamp: Date.now() })

    // Get metadata
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
        dateRange: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          days: days,
        },
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error("❌ Error fetching live Indian news:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch news",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
