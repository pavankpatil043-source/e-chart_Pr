import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
    const currentDate = new Date().toISOString().split("T")[0]

    // Static pages
    const staticPages = [
      { url: "", priority: "1.0", changefreq: "daily" },
      { url: "/about", priority: "0.8", changefreq: "monthly" },
      { url: "/contact", priority: "0.7", changefreq: "monthly" },
      { url: "/privacy", priority: "0.5", changefreq: "yearly" },
      { url: "/terms", priority: "0.5", changefreq: "yearly" },
      { url: "/help", priority: "0.6", changefreq: "monthly" },
    ]

    // Trading related pages
    const tradingPages = [
      { url: "/markets", priority: "0.9", changefreq: "hourly" },
      { url: "/stocks", priority: "0.9", changefreq: "hourly" },
      { url: "/indices", priority: "0.8", changefreq: "daily" },
      { url: "/sectors", priority: "0.8", changefreq: "daily" },
      { url: "/analysis", priority: "0.8", changefreq: "daily" },
      { url: "/portfolio", priority: "0.7", changefreq: "daily" },
      { url: "/watchlist", priority: "0.7", changefreq: "daily" },
      { url: "/alerts", priority: "0.6", changefreq: "weekly" },
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
      "ULTRACEMCO",
      "WIPRO",
      "NESTLEIND",
      "POWERGRID",
    ].map((symbol) => ({
      url: `/stock/${symbol}`,
      priority: "0.8",
      changefreq: "hourly",
    }))

    // Indian market indices
    const indices = [
      "NIFTY50",
      "SENSEX",
      "NIFTYBANK",
      "NIFTYNEXT50",
      "NIFTYIT",
      "NIFTYFMCG",
      "NIFTYPHARMA",
      "NIFTYAUTO",
      "NIFTYMETAL",
      "NIFTYREALTY",
    ].map((index) => ({
      url: `/index/${index}`,
      priority: "0.8",
      changefreq: "hourly",
    }))

    // Sector pages
    const sectors = [
      "banking",
      "it",
      "pharma",
      "auto",
      "fmcg",
      "metal",
      "realty",
      "energy",
      "telecom",
      "infrastructure",
      "textiles",
      "chemicals",
    ].map((sector) => ({
      url: `/sector/${sector}`,
      priority: "0.7",
      changefreq: "daily",
    }))

    // Educational content
    const educationalPages = [
      { url: "/learn", priority: "0.7", changefreq: "weekly" },
      { url: "/learn/basics", priority: "0.6", changefreq: "monthly" },
      { url: "/learn/technical-analysis", priority: "0.6", changefreq: "monthly" },
      { url: "/learn/fundamental-analysis", priority: "0.6", changefreq: "monthly" },
      { url: "/learn/options", priority: "0.6", changefreq: "monthly" },
      { url: "/learn/derivatives", priority: "0.6", changefreq: "monthly" },
      { url: "/blog", priority: "0.7", changefreq: "weekly" },
    ]

    // Combine all pages
    const allPages = [...staticPages, ...tradingPages, ...popularStocks, ...indices, ...sectors, ...educationalPages]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <mobile:mobile/>
  </url>`,
  )
  .join("\n")}
</urlset>`

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Robots-Tag": "noindex",
      },
    })
  } catch (error) {
    console.error("Sitemap generation error:", error)

    return NextResponse.json(
      {
        error: "Failed to generate sitemap",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
