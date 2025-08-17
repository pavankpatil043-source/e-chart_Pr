import { type NextRequest, NextResponse } from "next/server"

interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
}

// Static pages configuration
const staticPages: Omit<SitemapUrl, "lastmod">[] = [
  {
    loc: "",
    changefreq: "daily",
    priority: 1.0,
  },
  {
    loc: "/about",
    changefreq: "monthly",
    priority: 0.8,
  },
  {
    loc: "/contact",
    changefreq: "monthly",
    priority: 0.7,
  },
  {
    loc: "/privacy",
    changefreq: "yearly",
    priority: 0.5,
  },
  {
    loc: "/terms",
    changefreq: "yearly",
    priority: 0.5,
  },
  {
    loc: "/help",
    changefreq: "monthly",
    priority: 0.6,
  },
]

// Trading related pages
const tradingPages: Omit<SitemapUrl, "lastmod">[] = [
  {
    loc: "/markets",
    changefreq: "hourly",
    priority: 0.9,
  },
  {
    loc: "/markets/nse",
    changefreq: "hourly",
    priority: 0.9,
  },
  {
    loc: "/markets/bse",
    changefreq: "hourly",
    priority: 0.8,
  },
  {
    loc: "/analysis",
    changefreq: "daily",
    priority: 0.8,
  },
  {
    loc: "/portfolio",
    changefreq: "daily",
    priority: 0.7,
  },
  {
    loc: "/watchlist",
    changefreq: "daily",
    priority: 0.7,
  },
  {
    loc: "/news",
    changefreq: "hourly",
    priority: 0.8,
  },
  {
    loc: "/screener",
    changefreq: "daily",
    priority: 0.8,
  },
]

// Popular Indian stocks
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
  "ONGC",
  "POWERGRID",
  "NTPC",
  "TECHM",
  "SUNPHARMA",
  "COALINDIA",
]

// Market sectors
const sectors = ["banking", "it", "pharma", "auto", "fmcg", "energy", "metals", "realty", "telecom", "infrastructure"]

// Market indices
const indices = [
  "nifty50",
  "sensex",
  "niftybank",
  "niftynext50",
  "niftyit",
  "niftypharma",
  "niftyauto",
  "niftyfmcg",
  "niftyenergy",
  "niftymetal",
]

function generateSitemapXML(urls: SitemapUrl[]): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

  const urlElements = urls
    .map(
      (url) => `
  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlElements}
</urlset>`
}

export async function GET(request: NextRequest) {
  try {
    const currentDate = new Date().toISOString()
    const urls: SitemapUrl[] = []

    // Add static pages
    staticPages.forEach((page) => {
      urls.push({
        ...page,
        lastmod: currentDate,
      })
    })

    // Add trading pages
    tradingPages.forEach((page) => {
      urls.push({
        ...page,
        lastmod: currentDate,
      })
    })

    // Add stock pages
    popularStocks.forEach((stock) => {
      urls.push({
        loc: `/stocks/${stock.toLowerCase()}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      })

      // Add stock analysis pages
      urls.push({
        loc: `/stocks/${stock.toLowerCase()}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })

      // Add stock news pages
      urls.push({
        loc: `/stocks/${stock.toLowerCase()}/news`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.6,
      })
    })

    // Add sector pages
    sectors.forEach((sector) => {
      urls.push({
        loc: `/sectors/${sector}`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })

      // Add sector analysis pages
      urls.push({
        loc: `/sectors/${sector}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      })
    })

    // Add index pages
    indices.forEach((index) => {
      urls.push({
        loc: `/indices/${index}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      })

      // Add index analysis pages
      urls.push({
        loc: `/indices/${index}/analysis`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      })
    })

    // Add educational content pages
    const educationalTopics = [
      "technical-analysis",
      "fundamental-analysis",
      "options-trading",
      "derivatives",
      "mutual-funds",
      "ipo",
      "dividend-investing",
      "risk-management",
      "portfolio-management",
      "market-psychology",
    ]

    educationalTopics.forEach((topic) => {
      urls.push({
        loc: `/learn/${topic}`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      })
    })

    // Add tools pages
    const tools = [
      "calculator",
      "screener",
      "compare",
      "alerts",
      "portfolio-tracker",
      "sip-calculator",
      "tax-calculator",
    ]

    tools.forEach((tool) => {
      urls.push({
        loc: `/tools/${tool}`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.7,
      })
    })

    // Generate XML
    const sitemapXML = generateSitemapXML(urls)

    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)

    return NextResponse.json({ error: "Failed to generate sitemap" }, { status: 500 })
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
