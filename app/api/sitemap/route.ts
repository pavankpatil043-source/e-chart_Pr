import { NextResponse } from "next/server"

interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
}

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
    const currentDate = new Date().toISOString().split("T")[0]

    // Static pages
    const staticPages: SitemapUrl[] = [
      {
        loc: `${baseUrl}`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 1.0,
      },
      {
        loc: `${baseUrl}/about`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.8,
      },
      {
        loc: `${baseUrl}/contact`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/privacy`,
        lastmod: currentDate,
        changefreq: "yearly",
        priority: 0.5,
      },
      {
        loc: `${baseUrl}/terms`,
        lastmod: currentDate,
        changefreq: "yearly",
        priority: 0.5,
      },
    ]

    // Trading related pages
    const tradingPages: SitemapUrl[] = [
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
        loc: `${baseUrl}/watchlist`,
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
    ]

    // Stock symbols (popular Indian stocks)
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
      "WIPRO",
      "ULTRACEMCO",
      "TITAN",
      "SUNPHARMA",
      "POWERGRID",
    ]

    const stockPages: SitemapUrl[] = popularStocks.map((symbol) => ({
      loc: `${baseUrl}/stock/${symbol}`,
      lastmod: currentDate,
      changefreq: "hourly",
      priority: 0.7,
    }))

    // Sector pages
    const sectors = [
      "banking",
      "it",
      "pharma",
      "auto",
      "fmcg",
      "energy",
      "metals",
      "realty",
      "telecom",
      "infrastructure",
      "chemicals",
      "textiles",
    ]

    const sectorPages: SitemapUrl[] = sectors.map((sector) => ({
      loc: `${baseUrl}/sector/${sector}`,
      lastmod: currentDate,
      changefreq: "daily",
      priority: 0.6,
    }))

    // Index pages
    const indices = [
      "nifty50",
      "sensex",
      "niftybank",
      "niftyit",
      "niftypharma",
      "niftyauto",
      "niftyfmcg",
      "niftyenergy",
      "niftymetal",
      "niftyrealty",
    ]

    const indexPages: SitemapUrl[] = indices.map((index) => ({
      loc: `${baseUrl}/index/${index}`,
      lastmod: currentDate,
      changefreq: "hourly",
      priority: 0.8,
    }))

    // Educational content
    const educationalPages: SitemapUrl[] = [
      {
        loc: `${baseUrl}/learn`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/learn/basics`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      },
      {
        loc: `${baseUrl}/learn/technical-analysis`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      },
      {
        loc: `${baseUrl}/learn/fundamental-analysis`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      },
      {
        loc: `${baseUrl}/learn/risk-management`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      },
    ]

    // News and insights
    const newsPages: SitemapUrl[] = [
      {
        loc: `${baseUrl}/news`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      },
      {
        loc: `${baseUrl}/insights`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: `${baseUrl}/market-updates`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      },
    ]

    // Combine all URLs
    const allUrls = [
      ...staticPages,
      ...tradingPages,
      ...stockPages,
      ...sectorPages,
      ...indexPages,
      ...educationalPages,
      ...newsPages,
    ]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
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
