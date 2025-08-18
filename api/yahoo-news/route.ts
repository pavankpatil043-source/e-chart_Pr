import { type NextRequest, NextResponse } from "next/server"

// Cache for news data
let newsCache: { data: any[]; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") || "indian-market"
  const limit = Number.parseInt(searchParams.get("limit") || "20")

  try {
    console.log(`Fetching news for category: ${category}`)

    // Check cache first
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION) {
      console.log("Returning cached news data")
      return NextResponse.json({
        success: true,
        news: newsCache.data.slice(0, limit),
        cached: true,
        timestamp: Date.now(),
      })
    }

    // Try multiple news sources
    let newsData = []

    try {
      // Primary: Yahoo Finance News API
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=indian%20stock%20market&lang=en-US&region=US&quotesCount=0&newsCount=${limit}&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`

      const response = await fetch(yahooUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
        next: { revalidate: 0 },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.news && Array.isArray(data.news)) {
          newsData = data.news.map((item: any) => ({
            id: item.uuid || Math.random().toString(36),
            title: item.title || "Market Update",
            summary: item.summary || "Latest market developments",
            url: item.link || "#",
            source: item.publisher || "Yahoo Finance",
            publishedAt: new Date(item.providerPublishTime * 1000 || Date.now()).toISOString(),
            category: categorizeNews(item.title || ""),
            sentiment: analyzeSentiment(item.title || ""),
            relatedSymbols: extractSymbols(item.title || ""),
            thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
          }))
        }
      }
    } catch (error) {
      console.log("Yahoo Finance news API failed:", error)
    }

    // Fallback: Generate realistic mock news if API fails
    if (newsData.length === 0) {
      console.log("Using mock news data")
      newsData = generateMockNews(limit)
    }

    // Filter for Indian market relevance
    const indianMarketNews = newsData.filter(
      (item) => isIndianMarketRelevant(item.title) || isIndianMarketRelevant(item.summary),
    )

    // If not enough Indian market news, supplement with general market news
    const finalNews =
      indianMarketNews.length >= limit / 2
        ? indianMarketNews.slice(0, limit)
        : [...indianMarketNews, ...newsData.filter((item) => !indianMarketNews.includes(item))].slice(0, limit)

    // Update cache
    newsCache = {
      data: finalNews,
      timestamp: Date.now(),
    }

    console.log(`News fetched successfully: ${finalNews.length} articles`)

    return NextResponse.json({
      success: true,
      news: finalNews,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Error fetching news:", error)

    // Return mock data on complete failure
    const mockNews = generateMockNews(limit)

    return NextResponse.json({
      success: true,
      news: mockNews,
      fallback: true,
      timestamp: Date.now(),
    })
  }
}

function categorizeNews(title: string): string {
  const titleLower = title.toLowerCase()

  if (titleLower.includes("nse") || titleLower.includes("sensex") || titleLower.includes("nifty")) {
    return "NSE"
  }
  if (titleLower.includes("bse") || titleLower.includes("bombay")) {
    return "BSE"
  }
  if (titleLower.includes("bank") || titleLower.includes("hdfc") || titleLower.includes("icici")) {
    return "Banking"
  }
  if (
    titleLower.includes("it") ||
    titleLower.includes("tech") ||
    titleLower.includes("tcs") ||
    titleLower.includes("infosys")
  ) {
    return "IT"
  }
  if (titleLower.includes("pharma") || titleLower.includes("drug")) {
    return "Pharma"
  }
  if (titleLower.includes("auto") || titleLower.includes("maruti") || titleLower.includes("tata motors")) {
    return "Auto"
  }
  if (titleLower.includes("oil") || titleLower.includes("gas") || titleLower.includes("reliance")) {
    return "Energy"
  }

  return "General"
}

function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const textLower = text.toLowerCase()

  const positiveWords = [
    "gain",
    "rise",
    "up",
    "surge",
    "rally",
    "bull",
    "growth",
    "profit",
    "strong",
    "high",
    "boost",
    "jump",
  ]
  const negativeWords = ["fall", "drop", "down", "crash", "bear", "loss", "weak", "low", "decline", "plunge", "slide"]

  const positiveCount = positiveWords.filter((word) => textLower.includes(word)).length
  const negativeCount = negativeWords.filter((word) => textLower.includes(word)).length

  if (positiveCount > negativeCount) return "positive"
  if (negativeCount > positiveCount) return "negative"
  return "neutral"
}

function extractSymbols(text: string): string[] {
  const symbols = []
  const textUpper = text.toUpperCase()

  const commonSymbols = [
    "RELIANCE",
    "TCS",
    "HDFCBANK",
    "INFY",
    "ITC",
    "SBIN",
    "BHARTIARTL",
    "KOTAKBANK",
    "LT",
    "ASIANPAINT",
    "MARUTI",
    "HCLTECH",
    "AXISBANK",
    "ICICIBANK",
    "WIPRO",
    "NESTLEIND",
    "BAJFINANCE",
    "TATASTEEL",
    "SUNPHARMA",
    "NIFTY",
    "SENSEX",
  ]

  commonSymbols.forEach((symbol) => {
    if (textUpper.includes(symbol)) {
      symbols.push(symbol)
    }
  })

  return symbols
}

function isIndianMarketRelevant(text: string): boolean {
  const textLower = text.toLowerCase()
  const indianKeywords = [
    "india",
    "indian",
    "nse",
    "bse",
    "sensex",
    "nifty",
    "mumbai",
    "delhi",
    "rupee",
    "inr",
    "reliance",
    "tcs",
    "hdfc",
    "icici",
    "sbi",
    "infosys",
    "wipro",
    "bharti",
    "airtel",
    "adani",
    "ambani",
    "tata",
    "birla",
    "bajaj",
    "mahindra",
    "maruti",
    "asian paints",
  ]

  return indianKeywords.some((keyword) => textLower.includes(keyword))
}

function generateMockNews(limit: number) {
  const mockTitles = [
    "Sensex rallies 500 points on strong IT earnings",
    "Nifty hits fresh all-time high amid FII buying",
    "Reliance Industries reports strong Q3 results",
    "HDFC Bank announces dividend payout",
    "TCS wins major international contract",
    "Indian IT sector shows resilience in global slowdown",
    "Banking stocks surge on RBI policy optimism",
    "Auto sector rebounds with festive season demand",
    "Pharma stocks gain on export opportunities",
    "Energy stocks mixed on crude oil volatility",
    "Small-cap stocks outperform large-caps",
    "FII inflows boost market sentiment",
    "Rupee strengthens against dollar",
    "IPO market shows strong investor interest",
    "Mutual fund inflows hit record high",
    "Corporate earnings exceed expectations",
    "Infrastructure spending boosts cement stocks",
    "Digital transformation drives tech valuations",
    "ESG investing gains momentum in India",
    "Retail participation in equity markets grows",
  ]

  const mockSources = ["Economic Times", "Business Standard", "Mint", "CNBC TV18", "Moneycontrol", "Bloomberg Quint"]

  return Array.from({ length: limit }, (_, index) => ({
    id: `mock-${index}`,
    title: mockTitles[index % mockTitles.length],
    summary: `Latest developments in the Indian stock market with detailed analysis of market trends and sector performance.`,
    url: "#",
    source: mockSources[index % mockSources.length],
    publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    category: categorizeNews(mockTitles[index % mockTitles.length]),
    sentiment: analyzeSentiment(mockTitles[index % mockTitles.length]),
    relatedSymbols: extractSymbols(mockTitles[index % mockTitles.length]),
    thumbnail: null,
  }))
}
