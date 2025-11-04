import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

    const robotsTxt = `# EChart Trading Platform - Robots.txt
# Generated on ${new Date().toISOString()}

# Allow all web crawlers
User-agent: *
Allow: /

# Specific rules for major search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 2

# Block access to sensitive areas
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /dashboard/private/
Disallow: /user/
Disallow: /auth/
Disallow: /login/
Disallow: /register/
Disallow: /profile/
Disallow: /settings/

# Block access to temporary and cache files
Disallow: /tmp/
Disallow: /cache/
Disallow: *.json$
Disallow: *.xml$
Disallow: /sitemap_index.xml

# Block access to development and testing paths
Disallow: /test/
Disallow: /dev/
Disallow: /staging/
Disallow: /.well-known/
Disallow: /health

# Allow access to important trading data
Allow: /stock/
Allow: /index/
Allow: /sector/
Allow: /markets/
Allow: /analysis/

# Block aggressive crawlers and scrapers
User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: BLEXBot
Disallow: /

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

# Financial data specific rules
User-agent: *
Disallow: /api/realtime/
Disallow: /api/private/
Disallow: /api/user/
Disallow: /api/auth/

# Allow access to public market data
Allow: /api/public/
Allow: /api/market/
Allow: /api/stocks/
Allow: /api/indices/

# Crawl delay for financial data (to prevent overloading)
Crawl-delay: 2

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps for different content types
Sitemap: ${baseUrl}/sitemap-stocks.xml
Sitemap: ${baseUrl}/sitemap-news.xml
Sitemap: ${baseUrl}/sitemap-education.xml

# Host directive
Host: ${baseUrl.replace("https://", "").replace("http://", "")}

# Clean URLs preference
Clean-param: utm_source
Clean-param: utm_medium
Clean-param: utm_campaign
Clean-param: utm_term
Clean-param: utm_content
Clean-param: fbclid
Clean-param: gclid

# Cache directive for robots.txt
# This file should be cached for 24 hours
Cache-Control: public, max-age=86400
`

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Robots-Tag": "noindex, nofollow",
      },
    })
  } catch (error) {
    console.error("Robots.txt generation error:", error)

    // Fallback robots.txt in case of error
    const fallbackRobots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Sitemap: ${process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"}/sitemap.xml`

    return new NextResponse(fallbackRobots, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
      },
    })
  }
}
