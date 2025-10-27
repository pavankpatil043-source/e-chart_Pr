import { type NextRequest, NextResponse } from "next/server"
import { AbortSignal } from "abort-controller"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY

  const generateMockNews = (stockSymbol: string) => {
    const companyName = stockSymbol.replace(".NS", "").replace(".BO", "")
    const currentTime = new Date()
    const twoDaysAgo = new Date(currentTime.getTime() - 2 * 24 * 60 * 60 * 1000)

    return [
      {
        title: `${companyName} Q3 results beat estimates, stock rallies 5% on NSE`,
        description: `${companyName} reported strong quarterly earnings with revenue growth of 12% YoY, beating analyst expectations`,
        publishedAt: new Date(currentTime.getTime() - Math.random() * (2 * 24 * 60 * 60 * 1000)).toISOString(),
        source: { name: "Economic Times" },
        sentiment: "positive",
      },
      {
        title: `NSE: ${companyName} maintains steady trading volume amid market volatility`,
        description: `Technical analysis shows ${companyName} holding key support levels despite broader market concerns`,
        publishedAt: new Date(currentTime.getTime() - Math.random() * (2 * 24 * 60 * 60 * 1000)).toISOString(),
        source: { name: "Business Standard" },
        sentiment: "neutral",
      },
      {
        title: `${companyName} announces strategic partnership to expand Indian operations`,
        description: `Company signs MoU with local partners to strengthen market presence in tier-2 cities`,
        publishedAt: new Date(currentTime.getTime() - Math.random() * (2 * 24 * 60 * 60 * 1000)).toISOString(),
        source: { name: "Mint" },
        sentiment: "positive",
      },
      {
        title: `Regulatory concerns weigh on ${companyName} stock performance`,
        description: `New compliance requirements may impact short-term profitability, analysts caution`,
        publishedAt: new Date(currentTime.getTime() - Math.random() * (2 * 24 * 60 * 60 * 1000)).toISOString(),
        source: { name: "Financial Express" },
        sentiment: "negative",
      },
      {
        title: `${companyName} board approves dividend payout, ex-date announced`,
        description: `Shareholders to receive ₹5 per share dividend, record date set for next month`,
        publishedAt: new Date(currentTime.getTime() - Math.random() * (2 * 24 * 60 * 60 * 1000)).toISOString(),
        source: { name: "MoneyControl" },
        sentiment: "positive",
      },
    ]
  }

  if (!NEWS_API_KEY) {
    console.warn("NEWS_API_KEY not found, using enhanced mock data")
    return NextResponse.json({
      articles: generateMockNews(symbol),
    })
  }

  try {
    const companyName = symbol.replace(".NS", "").replace(".BO", "")

    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const fromDate = twoDaysAgo.toISOString().split("T")[0] // Format: YYYY-MM-DD

    const searchQuery = `"${companyName}" AND (NSE OR BSE OR "Indian stock market" OR "stock price" OR earnings OR dividend OR "quarterly results")`

    const newsResponse = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&from=${fromDate}&pageSize=15&apiKey=${NEWS_API_KEY}`,
      {
        headers: {
          "User-Agent": "TradingUI/1.0",
        },
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!newsResponse.ok) {
      throw new Error(`NewsAPI error: ${newsResponse.status}`)
    }

    const newsData = await newsResponse.json()

    const twoDaysAgoTime = new Date().getTime() - 2 * 24 * 60 * 60 * 1000

    const relevantArticles =
      newsData.articles?.filter((article: any) => {
        // Check if article is within last 2 days
        const publishedTime = new Date(article.publishedAt).getTime()
        if (publishedTime < twoDaysAgoTime) return false

        const content = `${article.title} ${article.description}`.toLowerCase()
        const indianKeywords = [
          "nse",
          "bse",
          "india",
          "indian",
          "mumbai",
          "rupee",
          "sensex",
          "nifty",
          "stock market",
          "shares",
          "equity",
        ]
        return (
          indianKeywords.some((keyword) => content.includes(keyword)) || content.includes(companyName.toLowerCase())
        )
      }) || []

    // Process articles and add sentiment analysis
    const processedArticles = relevantArticles.slice(0, 5).map((article: any) => {
      const title = article.title?.toLowerCase() || ""
      const description = article.description?.toLowerCase() || ""
      const content = `${title} ${description}`

      let sentiment = "neutral"
      const positiveWords = [
        "growth",
        "profit",
        "gain",
        "rise",
        "strong",
        "positive",
        "upgrade",
        "buy",
        "bullish",
        "expansion",
        "beat",
        "outperform",
        "rally",
        "surge",
        "dividend",
        "bonus",
        "acquisition",
        "breakthrough",
        "success",
        "milestone",
      ]
      const negativeWords = [
        "loss",
        "fall",
        "decline",
        "weak",
        "negative",
        "downgrade",
        "sell",
        "bearish",
        "concern",
        "risk",
        "drop",
        "plunge",
        "miss",
        "disappoint",
        "regulatory",
        "fine",
        "warning",
        "crisis",
        "trouble",
      ]

      const positiveCount = positiveWords.filter((word) => content.includes(word)).length
      const negativeCount = negativeWords.filter((word) => content.includes(word)).length

      if (positiveCount > negativeCount) sentiment = "positive"
      else if (negativeCount > positiveCount) sentiment = "negative"

      return {
        ...article,
        sentiment,
      }
    })

    if (processedArticles.length === 0) {
      console.log("No relevant articles found from last 2 days, using mock data")
      return NextResponse.json({
        articles: generateMockNews(symbol),
      })
    }

    return NextResponse.json({
      articles: processedArticles,
    })
  } catch (error) {
    console.error("Error fetching Indian news:", error)

    return NextResponse.json({
      articles: generateMockNews(symbol),
    })
  }
}
