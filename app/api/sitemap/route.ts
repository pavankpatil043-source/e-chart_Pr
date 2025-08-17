import { NextResponse } from "next/server"

interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
}

// Popular Indian stocks for sitemap
const popularStocks = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "HINDUNILVR",
  "ICICIBANK",
  "KOTAKBANK",
  "BHARTIARTL",
  "ITC",
  "SBIN",
  "BAJFINANCE",
  "ASIANPAINT",
  "MARUTI",
  "AXISBANK",
  "LT",
  "TITAN",
  "NESTLEIND",
  "ULTRACEMCO",
  "WIPRO",
  "SUNPHARMA",
  "POWERGRID",
  "NTPC",
  "TECHM",
  "HCLTECH",
  "COALINDIA",
  "INDUSINDBK",
  "BAJAJFINSV",
  "GRASIM",
  "CIPLA",
  "DRREDDY",
  "EICHERMOT",
  "ADANIPORTS",
  "JSWSTEEL",
  "TATAMOTORS",
  "BRITANNIA",
  "DIVISLAB",
  "APOLLOHOSP",
  "HEROMOTOCO",
  "BAJAJ-AUTO",
]

// Indian market sectors
const sectors = [
  "banking",
  "information-technology",
  "pharmaceuticals",
  "automobiles",
  "fmcg",
  "energy",
  "metals",
  "infrastructure",
  "telecom",
  "chemicals",
  "textiles",
  "cement",
  "real-estate",
  "media",
  "fertilizers",
  "sugar",
  "paper",
]

// Indian market indices
const indices = [
  "nifty-50",
  "sensex",
  "nifty-next-50",
  "nifty-100",
  "nifty-200",
  "nifty-500",
  "nifty-midcap-50",
  "nifty-midcap-100",
  "nifty-smallcap-50",
  "nifty-smallcap-100",
  "nifty-bank",
  "nifty-it",
  "nifty-pharma",
  "nifty-auto",
  "nifty-fmcg",
  "nifty-metal",
  "nifty-energy",
  "nifty-infra",
  "nifty-realty",
  "nifty-media",
]

// Educational content pages
const educationalPages = [
  "learn/technical-analysis",
  "learn/fundamental-analysis",
  "learn/options-trading",
  "learn/futures-trading",
  "learn/risk-management",
  "learn/portfolio-management",
  "learn/market-psychology",
  "learn/trading-strategies",
  "learn/chart-patterns",
  "learn/indicators",
  "learn/candlestick-patterns",
  "learn/support-resistance",
]

function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlsXml = urls
    .map(
      (url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlsXml}
</urlset>`
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
    const currentDate = new Date().toISOString().split("T")[0]

    const urls: SitemapUrl[] = []

    // Main pages
    urls.push(
      {
        loc: baseUrl,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 1.0,
      },
      {
        loc: `${baseUrl}/dashboard`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.9,
      },
      {
        loc: `${baseUrl}/markets`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.9,
      },
      {
        loc: `${baseUrl}/portfolio`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.8,
      },
      {
        loc: `${baseUrl}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.8,
      },
      {
        loc: `${baseUrl}/news`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/screener`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/watchlist`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/alerts`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      },
      {
        loc: `${baseUrl}/settings`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.5,
      },
    )

    // Stock pages
    popularStocks.forEach((stock) => {
      urls.push({
        loc: `${baseUrl}/stock/${stock}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      })

      // Stock analysis pages
      urls.push({
        loc: `${baseUrl}/stock/${stock}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })

      // Stock news pages
      urls.push({
        loc: `${baseUrl}/stock/${stock}/news`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.6,
      })

      // Stock financials pages
      urls.push({
        loc: `${baseUrl}/stock/${stock}/financials`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.6,
      })
    })

    // Sector pages
    sectors.forEach((sector) => {
      urls.push({
        loc: `${baseUrl}/sector/${sector}`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })

      urls.push({
        loc: `${baseUrl}/sector/${sector}/stocks`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      })

      urls.push({
        loc: `${baseUrl}/sector/${sector}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      })
    })

    // Index pages
    indices.forEach((index) => {
      urls.push({
        loc: `${baseUrl}/index/${index}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      })

      urls.push({
        loc: `${baseUrl}/index/${index}/constituents`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })

      urls.push({
        loc: `${baseUrl}/index/${index}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      })
    })

    // Educational content pages
    educationalPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}/${page}`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.6,
      })
    })

    // Trading tools pages
    const tradingTools = [
      "tools/calculator",
      "tools/screener",
      "tools/backtester",
      "tools/scanner",
      "tools/heatmap",
      "tools/correlation",
      "tools/volatility",
      "tools/momentum",
    ]

    tradingTools.forEach((tool) => {
      urls.push({
        loc: `${baseUrl}/${tool}`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.5,
      })
    })

    // Market data pages
    const marketDataPages = [
      "market-data/live-prices",
      "market-data/gainers-losers",
      "market-data/most-active",
      "market-data/52-week-high-low",
      "market-data/dividend-calendar",
      "market-data/earnings-calendar",
      "market-data/ipo-calendar",
      "market-data/corporate-actions",
      "market-data/bulk-deals",
      "market-data/block-deals",
      "market-data/insider-trading",
    ]

    marketDataPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}/${page}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.6,
      })
    })

    // API documentation pages
    const apiPages = [
      "api/docs",
      "api/authentication",
      "api/rate-limits",
      "api/endpoints",
      "api/websocket",
      "api/examples",
      "api/sdks",
      "api/changelog",
    ]

    apiPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}/${page}`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.4,
      })
    })

    // Legal and company pages
    const legalPages = [
      "about",
      "contact",
      "privacy-policy",
      "terms-of-service",
      "disclaimer",
      "risk-disclosure",
      "refund-policy",
      "careers",
    ]

    legalPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}/${page}`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.3,
      })
    })

    // Generate XML
    const sitemapXml = generateSitemapXml(urls)

    return new NextResponse(sitemapXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // Cache for 1 hour, stale for 1 day
        "X-Robots-Tag": "noindex", // Don't index the sitemap itself
      },
    })
  } catch (error) {
    console.error("Sitemap generation error:", error)

    // Return a minimal sitemap on error
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
    const currentDate = new Date().toISOString().split("T")[0]

    const minimalSitemap = generateSitemapXml([
      {
        loc: baseUrl,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 1.0,
      },
    ])

    return new NextResponse(minimalSitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes on error
      },
    })
  }
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
