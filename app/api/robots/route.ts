import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
  const isProduction = process.env.NODE_ENV === "production"

  // Generate robots.txt content
  const robotsContent = `# Robots.txt for EChart Trading Platform
# Generated on ${new Date().toISOString()}

# Global rules for all bots
User-agent: *
${isProduction ? "Allow: /" : "Disallow: /"}

# Specific rules for search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: Slurp
Allow: /
Crawl-delay: 2

# Block specific paths
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: /private/
Disallow: /temp/
Disallow: /cache/
Disallow: /logs/
Disallow: /.env
Disallow: /package.json
Disallow: /package-lock.json
Disallow: /yarn.lock
Disallow: /node_modules/
Disallow: /.git/
Disallow: /.github/
Disallow: /docker/
Disallow: /scripts/

# Block sensitive trading data endpoints
Disallow: /api/user/
Disallow: /api/portfolio/
Disallow: /api/orders/
Disallow: /api/auth/
Disallow: /api/admin/
Disallow: /api/internal/

# Block development and testing paths
Disallow: /test/
Disallow: /dev/
Disallow: /staging/
Disallow: /debug/
Disallow: /__tests__/
Disallow: /coverage/

# Block search and filter pages with parameters
Disallow: /*?*
Disallow: /search?*
Disallow: /filter?*
Disallow: /*&*

# Block duplicate content
Disallow: /print/
Disallow: /mobile/
Disallow: /amp/

# Allow important static assets
Allow: /favicon.ico
Allow: /robots.txt
Allow: /sitemap.xml
Allow: /_next/static/
Allow: /images/
Allow: /icons/
Allow: /assets/

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

# Block social media crawlers from sensitive content
User-agent: facebookexternalhit
Disallow: /api/
Disallow: /user/
Disallow: /portfolio/

User-agent: Twitterbot
Disallow: /api/
Disallow: /user/
Disallow: /portfolio/

# Allow news aggregators for market data
User-agent: NewsNow
Allow: /news/
Allow: /market/
Crawl-delay: 5

# Financial data crawlers
User-agent: YahooSeeker
Allow: /
Crawl-delay: 10

User-agent: BloombergBot
Allow: /
Crawl-delay: 10

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps for different content types
Sitemap: ${baseUrl}/api/sitemap
Sitemap: ${baseUrl}/sitemap-stocks.xml
Sitemap: ${baseUrl}/sitemap-news.xml

# Cache directive
# This robots.txt file is cached for 24 hours
# Last modified: ${new Date().toISOString()}

# Contact information
# For questions about this robots.txt file, contact: admin@echart.in
# Website: ${baseUrl}
# Support: ${baseUrl}/contact

# Crawl rate limiting
# Please respect our servers and limit concurrent requests
# Recommended crawl delay: 1-2 seconds between requests
# For bulk data access, please contact us for API access

# Legal notice
# Unauthorized scraping of user data, portfolio information,
# or proprietary trading algorithms is prohibited.
# See our Terms of Service: ${baseUrl}/terms
`

  return new NextResponse(robotsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
      "X-Robots-Tag": "noindex, nofollow", // Don't index robots.txt itself
    },
  })
}
