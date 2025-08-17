import { NextResponse } from "next/server"

interface SitemapUrl {
  loc: string
  lastmod: string
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
}

// Define all the pages in your application
const staticPages: Omit<SitemapUrl, "lastmod">[] = [
  {
    loc: "/",
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
    priority: 0.3,
  },
  {
    loc: "/terms",
    changefreq: "yearly",
    priority: 0.3,
  },
  {
    loc: "/help",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    loc: "/api/health",
    changefreq: "daily",
    priority: 0.1,
  },
]

// Popular Indian stock symbols for dynamic pages
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
]

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

export async function GET() {
  try {
    const currentDate = new Date().toISOString()

    // Combine static pages with dynamic content
    const allUrls: SitemapUrl[] = [
      // Static pages
      ...staticPages.map((page) => ({
        ...page,
        lastmod: currentDate,
      })),

      // Dynamic stock pages
      ...popularStocks.map((symbol) => ({
        loc: `/stock/${symbol}`,
        lastmod: currentDate,
        changefreq: "hourly" as const,
        priority: 0.9,
      })),

      // Index pages
      ...indices.map((index) => ({
        loc: `/index/${index}`,
        lastmod: currentDate,
        changefreq: "hourly" as const,
        priority: 0.8,
      })),

      // Sector pages
      {
        loc: "/sectors/banking",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: "/sectors/it",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: "/sectors/pharma",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: "/sectors/auto",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },
      {
        loc: "/sectors/fmcg",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },

      // Analysis pages
      {
        loc: "/analysis/technical",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.8,
      },
      {
        loc: "/analysis/fundamental",
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.7,
      },
      {
        loc: "/analysis/market-trends",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.8,
      },

      // News pages
      {
        loc: "/news",
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.9,
      },
      {
        loc: "/news/market",
        lastmod: currentDate,
        changefreq: "hourly",
        priority: 0.8,
      },
      {
        loc: "/news/economy",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.7,
      },

      // Tools pages
      {
        loc: "/tools/calculator",
        lastmod: currentDate,
        changefreq: "monthly",
        priority: 0.6,
      },
      {
        loc: "/tools/screener",
        lastmod: currentDate,
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        loc: "/tools/portfolio",
        lastmod: currentDate,
        changefreq: "daily",
        priority: 0.9,
      },
    ]

    // Sort URLs by priority (highest first)
    allUrls.sort((a, b) => b.priority - a.priority)

    const sitemapXML = generateSitemapXML(allUrls)

    return new NextResponse(sitemapXML, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", // Cache for 1 hour
        "X-Robots-Tag": "noindex", // Don't index the sitemap itself
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)

    // Return a minimal sitemap in case of error
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
        "Cache-Control": "public, max-age=300", // Shorter cache for error case
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
