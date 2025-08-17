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
    loc: "/",
    changefreq: "hourly",
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
    priority: 0.3,
  },
  {
    loc: "/terms",
    changefreq: "yearly",
    priority: 0.3,
  },
  {
    loc: "/help",
    changefreq: "weekly",
    priority: 0.6,
  },
]

// Popular Indian stocks for dynamic content
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
  "ULTRACEMCO",
  "WIPRO",
  "NESTLEIND",
  "POWERGRID",
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
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

    // Add stock pages
    popularStocks.forEach((stock) => {
      urls.push({
        loc: `/stocks/${stock.toLowerCase()}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.9,
      })
    })

    // Add sector pages
    sectors.forEach((sector) => {
      urls.push({
        loc: `/sectors/${sector}`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.8,
      })
    })

    // Add index pages
    indices.forEach((index) => {
      urls.push({
        loc: `/indices/${index}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.9,
      })
    })

    // Add trading tools pages
    const tradingTools = [
      "portfolio",
      "watchlist",
      "screener",
      "calculator",
      "technical-analysis",
      "fundamental-analysis",
      "news",
      "alerts",
    ]

    tradingTools.forEach((tool) => {
      urls.push({
        loc: `/tools/${tool}`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.7,
      })
    })

    // Add educational content pages
    const educationalPages = [
      "learn/basics",
      "learn/technical-analysis",
      "learn/fundamental-analysis",
      "learn/options",
      "learn/derivatives",
      "learn/mutual-funds",
      "learn/ipo",
      "learn/bonds",
      "learn/commodities",
    ]

    educationalPages.forEach((page) => {
      urls.push({
        loc: `/${page}`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      })
    })

    // Generate XML
    const sitemapXML = generateSitemapXML(urls)

    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
        "X-Robots-Tag": "noindex", // Don't index the sitemap itself
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)

    // Return minimal sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new NextResponse(fallbackSitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=300, s-maxage=300", // Shorter cache on error
      },
    })
  }
}

// Handle HEAD requests
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
