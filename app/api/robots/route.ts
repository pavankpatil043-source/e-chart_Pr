import { NextResponse } from "next/server"

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
    const isProduction = process.env.NODE_ENV === "production"

    let robotsTxt = ""

    if (isProduction) {
      // Production robots.txt - Allow most crawling with restrictions
      robotsTxt = `# EChart Trading Platform - Robots.txt
# Live NSE market data and AI-powered trading insights

# Allow all search engines
User-agent: *
Allow: /

# Disallow sensitive areas
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /settings/
Disallow: /profile/
Disallow: /account/
Disallow: /auth/
Disallow: /login/
Disallow: /register/
Disallow: /reset-password/
Disallow: /verify-email/
Disallow: /private/
Disallow: /user/
Disallow: /_next/
Disallow: /static/
Disallow: /*.json$
Disallow: /*.xml$
Disallow: /*?*
Disallow: /search?
Disallow: /filter?

# Allow important public pages
Allow: /stock/
Allow: /sector/
Allow: /index/
Allow: /learn/
Allow: /tools/
Allow: /market-data/
Allow: /news/
Allow: /analysis/

# Specific bot instructions
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: Slurp
Allow: /
Crawl-delay: 2

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 1

User-agent: Baiduspider
Allow: /
Crawl-delay: 5

User-agent: YandexBot
Allow: /
Crawl-delay: 3

User-agent: facebookexternalhit
Allow: /
Allow: /stock/
Allow: /sector/
Allow: /index/

User-agent: Twitterbot
Allow: /
Allow: /stock/
Allow: /sector/
Allow: /index/

User-agent: LinkedInBot
Allow: /
Allow: /stock/
Allow: /sector/
Allow: /index/

# Block aggressive crawlers and scrapers
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MegaIndex
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

# Block financial data scrapers
User-agent: *
Disallow: /api/stock-data/
Disallow: /api/live-prices/
Disallow: /api/market-data/
Disallow: /api/historical/
Disallow: /api/intraday/
Disallow: /api/quotes/

# Block AI training crawlers
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: YouBot
Disallow: /

User-agent: Bytespider
Disallow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps
Sitemap: ${baseUrl}/api/sitemap

# Crawl delay for all bots (in seconds)
Crawl-delay: 1

# Host directive (for search engines that support it)
Host: ${baseUrl.replace("https://", "").replace("http://", "")}

# Clean URLs preference
Clean-param: utm_source
Clean-param: utm_medium
Clean-param: utm_campaign
Clean-param: utm_term
Clean-param: utm_content
Clean-param: fbclid
Clean-param: gclid
Clean-param: ref
Clean-param: source

# Request rate (requests per second)
Request-rate: 1/1s

# Visit time (time to wait between requests in seconds)
Visit-time: 0600-2300

# Comments for webmasters
# This robots.txt file is optimized for EChart Trading Platform
# It allows search engines to index public content while protecting
# sensitive user data and API endpoints
# 
# For questions about crawling permissions, contact: admin@echart.in
# Last updated: ${new Date().toISOString().split("T")[0]}
`
    } else {
      // Development/staging robots.txt - Block all crawling
      robotsTxt = `# EChart Trading Platform - Development Environment
# This is a development/staging environment - crawling is disabled

User-agent: *
Disallow: /

# Block all search engines in non-production environments
User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /

User-agent: Slurp
Disallow: /

User-agent: DuckDuckBot
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: YandexBot
Disallow: /

# No sitemap for development
# Sitemap: ${baseUrl}/sitemap.xml

# Development environment notice
# This is not the production site
# Production site: https://echart.in
`
    }

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": isProduction
          ? "public, max-age=86400, stale-while-revalidate=604800" // Cache for 1 day in production
          : "public, max-age=300", // Cache for 5 minutes in development
        "X-Robots-Tag": "noindex, nofollow", // Don't index the robots.txt file itself
      },
    })
  } catch (error) {
    console.error("Robots.txt generation error:", error)

    // Return a safe default robots.txt on error
    const fallbackRobots = `User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /settings/

Sitemap: ${process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"}/sitemap.xml
`

    return new NextResponse(fallbackRobots, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=300", // Short cache on error
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
