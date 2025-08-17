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

    // Define all pages and their properties
    const urls: SitemapUrl[] = [
      {
        loc: `${baseUrl}/`,
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
        loc: `${baseUrl}/chat`,
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
      {
        loc: `${baseUrl}/help`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.4,
      },
      {
        loc: `${baseUrl}/about`,
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.3,
      },
      {
        loc: `${baseUrl}/privacy`,
        lastmod: currentDate,
        changefreq: "yearly",
        priority: 0.2,
      },
      {
        loc: `${baseUrl}/terms`,
        lastmod: currentDate,
        changefreq: "yearly",
        priority: 0.2,
      },
    ]

    // Add popular Indian stocks
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

    popularStocks.forEach((stock) => {
      urls.push({
        loc: `${baseUrl}/stock/${stock}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.7,
      })
    })

    // Add market sectors
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

    sectors.forEach((sector) => {
      urls.push({
        loc: `${baseUrl}/sector/${sector}`,
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.6,
      })
    })

    // Add Indian market indices
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

    indices.forEach((index) => {
      urls.push({
        loc: `${baseUrl}/index/${index}`,
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      })
    })

    // Add educational content
    const educationalPages = [
      "trading-basics",
      "technical-analysis",
      "fundamental-analysis",
      "risk-management",
      "portfolio-management",
      "market-psychology",
      "options-trading",
      "derivatives",
      "mutual-funds",
      "ipo-guide",
    ]

    educationalPages.forEach((page) => {
      urls.push({
        loc: `${baseUrl}/learn/${page}`,
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.5,
      })
    })

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls
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
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "CDN-Cache-Control": "public, max-age=3600",
        "Vercel-CDN-Cache-Control": "public, max-age=3600",
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
