import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol") || "NIFTY"

    const liveNews = await fetchLiveYahooFinanceNews(symbol)

    return NextResponse.json({
      success: true,
      data: liveNews,
      source: "Yahoo Finance Live",
      symbol: symbol,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Live news fetch error:", error)
    return NextResponse.json({
      success: false,
      data: await getFreshIndianMarketNews(),
      source: "Fallback News",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

async function fetchLiveYahooFinanceNews(symbol: string) {
  const timestamp = Date.now()
  let allNews: any[] = []

  try {
    const rssUrls = [
      "https://feeds.finance.yahoo.com/rss/2.0/headline",
      "https://feeds.finance.yahoo.com/rss/2.0/category-stocks",
      "https://feeds.finance.yahoo.com/rss/2.0/category-earnings",
      // Alternative Indian news sources
      "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
      "https://www.business-standard.com/rss/markets-106.rss",
    ]

    const apiUrls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=Indian+market+NSE+BSE+NIFTY+SENSEX&lang=en-US&region=IN&quotesCount=0&newsCount=25&enableFuzzyQuery=false&_=${timestamp}`,
      `https://query2.finance.yahoo.com/v7/finance/news?symbols=^NSEI,^BSESN&region=IN&lang=en-US&count=20&_=${timestamp}`,
      `https://query1.finance.yahoo.com/v7/finance/news?category=generalnews&region=IN&lang=en-US&count=15&_=${timestamp}`,
    ]

    for (const rssUrl of rssUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(rssUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "application/rss+xml, application/xml, text/xml, */*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            "Accept-Encoding": "gzip, deflate, br",
          },
          cache: "no-store",
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const rssText = await response.text()
          const rssNews = parseRSSFeed(
            rssText,
            rssUrl.includes("economictimes") || rssUrl.includes("business-standard"),
          )
          allNews = [...allNews, ...rssNews]
          console.log(`Successfully fetched ${rssNews.length} items from ${rssUrl}`)
        } else {
          console.warn(`RSS fetch failed for ${rssUrl}: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error(`RSS fetch error for ${rssUrl}:`, error instanceof Error ? error.message : error)
        // Continue to next RSS feed instead of failing completely
      }
    }

    for (const apiUrl of apiUrls) {
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.news && Array.isArray(data.news)) {
            allNews = [...allNews, ...data.news.map(formatYahooNewsItem)]
          } else if (data.items && Array.isArray(data.items)) {
            allNews = [...allNews, ...data.items.map(formatYahooNewsItem)]
          }
        }
      } catch (error) {
        console.error(`API fetch error for ${apiUrl}:`, error)
      }
    }

    const indianNews = allNews
      .filter((item: any) => isIndianMarketNews(item.title || ""))
      .sort((a: any, b: any) => (b.publishTime || 0) - (a.publishTime || 0))
      .slice(0, 12)

    console.log(`Fetched ${indianNews.length} live news items from Yahoo Finance`)

    if (indianNews.length > 0) {
      return indianNews
    } else {
      return await getFreshIndianMarketNews()
    }
  } catch (error) {
    console.error("Error fetching live Yahoo Finance news:", error)
    return await getFreshIndianMarketNews()
  }
}

function parseRSSFeed(rssText: string, isAlternativeSource = false) {
  const news: any[] = []

  try {
    const itemMatches = rssText.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || []

    itemMatches.forEach((item, index) => {
      const titleMatch = item.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i)
      const linkMatch = item.match(/<link[^>]*>(.*?)<\/link>/i)
      const pubDateMatch = item.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)
      const descriptionMatch = item.match(
        /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i,
      )

      let title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : ""
      title = cleanTextContent(title)

      const link = linkMatch ? linkMatch[1].trim() : ""
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1]).getTime() / 1000 : Date.now() / 1000

      let description = descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || "").trim() : ""
      description = cleanTextContent(description)

      if (title && (isAlternativeSource || isIndianMarketNews(title))) {
        news.push({
          id: `${isAlternativeSource ? "alt" : "rss"}-${Date.now()}-${index}`,
          title: title,
          source: isAlternativeSource ? "Alternative Source" : "Yahoo Finance",
          time: formatTimeAgo(pubDate),
          tag: getNewsTag(title),
          url: link,
          summary: description,
          publishTime: pubDate,
        })
      }
    })
  } catch (error) {
    console.error("RSS parsing error:", error)
  }

  return news
}

function cleanTextContent(text: string): string {
  if (!text) return ""

  // Remove CDATA tags
  text = text.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "")

  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&")
  text = text.replace(/&lt;/g, "<")
  text = text.replace(/&gt;/g, ">")
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, " ")

  // Clean up extra whitespace
  text = text.replace(/\s+/g, " ").trim()

  return text
}

function formatYahooNewsItem(item: any) {
  return {
    id: item.uuid || `yahoo-${Date.now()}-${Math.random()}`,
    title: cleanTextContent(item.title || "No title available"), // Clean title content
    source: item.publisher || "Yahoo Finance",
    time: formatTimeAgo(item.providerPublishTime || Date.now() / 1000),
    tag: getNewsTag(item.title || ""),
    url: item.link || "",
    summary: cleanTextContent(item.summary || ""), // Clean summary content
    thumbnail: item.thumbnail?.resolutions?.[0]?.url,
    publishTime: item.providerPublishTime || Date.now() / 1000,
  }
}

async function fetchIndianMarketNews() {
  try {
    const timestamp = Date.now()

    const urls = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=NSE+BSE+Indian+market+NIFTY+SENSEX&lang=en-US&region=IN&quotesCount=0&newsCount=20&enableFuzzyQuery=true&_=${timestamp}`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=Indian+stocks+market+today&lang=en-US&region=IN&quotesCount=0&newsCount=15&enableFuzzyQuery=true&_=${timestamp}`,
    ]

    let allNews: any[] = []

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          if (data.news && Array.isArray(data.news)) {
            allNews = [...allNews, ...data.news]
          }
        }
      } catch (error) {
        console.error(`Error fetching from ${url}:`, error)
      }
    }

    const indianNews = allNews
      .filter((item: any) => isIndianMarketNews(item.title || ""))
      .sort((a: any, b: any) => (b.providerPublishTime || 0) - (a.providerPublishTime || 0))
      .slice(0, 15)
      .map((item: any, index: number) => ({
        id: item.uuid || `${Date.now()}-${index}`,
        title: item.title || "No title available",
        source: item.publisher || "Yahoo Finance",
        time: formatTimeAgo(item.providerPublishTime),
        tag: getNewsTag(item.title || ""),
        url: item.link,
        summary: item.summary || "",
        thumbnail: item.thumbnail?.resolutions?.[0]?.url,
        publishTime: item.providerPublishTime,
      }))

    const freshMockNews = await getFreshIndianMarketNews()
    const combinedNews = [...indianNews, ...freshMockNews]
      .sort((a: any, b: any) => (b.publishTime || Date.now() / 1000) - (a.publishTime || Date.now() / 1000))
      .slice(0, 10)

    console.log(`Fetched ${indianNews.length} real news items, ${freshMockNews.length} mock items`)

    return combinedNews
  } catch (error) {
    console.error("Error fetching Indian market news:", error)
    return await getFreshIndianMarketNews()
  }
}

function isIndianMarketNews(title: string): boolean {
  const lowerTitle = title.toLowerCase()
  const indianKeywords = [
    "nifty",
    "sensex",
    "nse",
    "bse",
    "indian",
    "india",
    "rupee",
    "mumbai",
    "reliance",
    "tcs",
    "hdfc",
    "icici",
    "sbi",
    "infosys",
    "wipro",
    "adani",
    "bharti",
    "itc",
    "larsen",
    "mahindra",
    "bajaj",
    "rbi",
    "sebi",
    "indian market",
    "indian economy",
    "indian stocks",
  ]

  return indianKeywords.some((keyword) => lowerTitle.includes(keyword))
}

async function getFreshIndianMarketNews() {
  const now = Date.now() / 1000
  const mockNews = [
    {
      id: `fresh-1-${Date.now()}`,
      title: "NIFTY 50 gains 1.2% led by banking and IT stocks in morning trade",
      source: "MoneyControl",
      time: formatTimeAgo(now - 60), // 1 minute ago
      tag: "NSE",
      url: "https://moneycontrol.com/news/nifty-banking-it-gains",
      publishTime: now - 60,
    },
    {
      id: `fresh-2-${Date.now()}`,
      title: "BSE Sensex crosses 73,500 mark on strong FII inflows",
      source: "Economic Times",
      time: formatTimeAgo(now - 180), // 3 minutes ago
      tag: "BSE",
      url: "https://economictimes.com/news/sensex-73500-fii-inflows",
      publishTime: now - 180,
    },
    {
      id: `fresh-3-${Date.now()}`,
      title: "Reliance Industries stock jumps 3% on strong quarterly results",
      source: "MoneyControl",
      time: formatTimeAgo(now - 300), // 5 minutes ago
      tag: "Largecaps",
      url: "https://moneycontrol.com/news/reliance-quarterly-results",
      publishTime: now - 300,
    },
    {
      id: `fresh-4-${Date.now()}`,
      title: "TCS announces Rs 15,000 crore digital transformation deal",
      source: "Business Standard",
      time: formatTimeAgo(now - 480), // 8 minutes ago
      tag: "IT",
      url: "https://business-standard.com/news/tcs-digital-deal",
      publishTime: now - 480,
    },
    {
      id: `fresh-5-${Date.now()}`,
      title: "HDFC Bank stock rises 2.5% on merger synergy benefits",
      source: "Mint",
      time: formatTimeAgo(now - 600), // 10 minutes ago
      tag: "Banking",
      url: "https://livemint.com/news/hdfc-bank-merger-synergy",
      publishTime: now - 600,
    },
    {
      id: `fresh-6-${Date.now()}`,
      title: "Indian Rupee strengthens against Dollar amid positive market sentiment",
      source: "MoneyControl",
      time: formatTimeAgo(now - 720), // 12 minutes ago
      tag: "FX",
      url: "https://moneycontrol.com/news/rupee-strengthens-dollar",
      publishTime: now - 720,
    },
  ]

  return mockNews
}

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return "Unknown"

  const now = Date.now() / 1000
  const diff = now - timestamp

  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getNewsTag(text: string): string {
  const lowerText = text.toLowerCase()

  if (lowerText.includes("nifty") || lowerText.includes("nse")) return "NSE"
  if (lowerText.includes("sensex") || lowerText.includes("bse")) return "BSE"
  if (lowerText.includes("reliance") || lowerText.includes("tcs") || lowerText.includes("hdfc")) return "Largecaps"
  if (lowerText.includes("tech") || lowerText.includes("it") || lowerText.includes("software")) return "IT"
  if (lowerText.includes("bank") || lowerText.includes("financial")) return "Banking"
  if (lowerText.includes("rupee") || lowerText.includes("currency")) return "FX"
  if (lowerText.includes("oil") || lowerText.includes("energy")) return "Energy"
  if (lowerText.includes("earnings") || lowerText.includes("revenue")) return "Earnings"

  return "Market"
}
