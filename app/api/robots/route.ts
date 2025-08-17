import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
  const isProduction = process.env.NODE_ENV === "production"

  // Generate robots.txt content
  const robotsContent = `# Robots.txt for EChart Trading Platform
# Generated on ${new Date().toISOString()}

# Global rules for all bots
User-agent: *
${isProduction ? "Allow: /" : "Disallow: /"}

# Specific rules for search engine bots
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
Disallow: /admin/
Disallow: /dashboard/private/
Disallow: /user/
Disallow: /auth/
Disallow: /login/
Disallow: /register/
Disallow: /profile/
Disallow: /settings/
Disallow: /portfolio/private/
Disallow: /orders/
Disallow: /transactions/

# Block access to technical files
Disallow: /_next/
Disallow: /static/
Disallow: /.well-known/
Disallow: /favicon.ico
Disallow: /robots.txt
Disallow: /sitemap.xml

# Block access to temporary and cache files
Disallow: /tmp/
Disallow: /cache/
Disallow: /logs/
Disallow: /*.log$
Disallow: /*.tmp$
Disallow: /*.bak$

# Block access to development and testing files
Disallow: /test/
Disallow: /tests/
Disallow: /dev/
Disallow: /debug/
Disallow: /.env
Disallow: /package.json
Disallow: /package-lock.json
Disallow: /yarn.lock

# Block access to version control
Disallow: /.git/
Disallow: /.svn/
Disallow: /.hg/

# Block access to backup files
Disallow: /*.sql$
Disallow: /*.dump$
Disallow: /*.backup$

# Block aggressive bots and scrapers
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

# Block AI training bots (optional - uncomment if needed)
# User-agent: GPTBot
# Disallow: /

# User-agent: ChatGPT-User
# Disallow: /

# User-agent: CCBot
# Disallow: /

# User-agent: anthropic-ai
# Disallow: /

# User-agent: Claude-Web
# Disallow: /

# Allow specific paths for SEO
Allow: /markets/
Allow: /stocks/
Allow: /indices/
Allow: /sectors/
Allow: /news/
Allow: /analysis/
Allow: /learn/
Allow: /tools/
Allow: /about/
Allow: /contact/
Allow: /help/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/api/sitemap

# Additional sitemaps (if you have them)
# Sitemap: ${baseUrl}/sitemap-stocks.xml
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-analysis.xml

# Host directive (helps with canonicalization)
Host: ${baseUrl}

# Request rate (optional - helps prevent server overload)
Request-rate: 1/10s

# Visit time (optional - suggests when to crawl)
Visit-time: 0600-2200

# Cache directive (optional)
Cache-delay: 3600

# Comments for developers
# This robots.txt file is automatically generated
# Last updated: ${new Date().toISOString()}
# Environment: ${process.env.NODE_ENV || "development"}
# Domain: ${baseUrl}
#
# For questions about this robots.txt file, contact:
# Email: support@echart.in
# Website: ${baseUrl}/contact
#
# Trading Platform Features:
# - Live NSE/BSE market data
# - Real-time stock prices and charts
# - Technical and fundamental analysis
# - Portfolio tracking and management
# - Market news and insights
# - AI-powered trading recommendations
#
# SEO-friendly URLs:
# /stocks/[symbol] - Individual stock pages
# /indices/[index] - Market index pages  
# /sectors/[sector] - Sector analysis pages
# /news/[category] - Market news by category
# /analysis/[type] - Technical analysis tools
# /learn/[topic] - Educational content
# /tools/[tool] - Trading calculators and tools
`

  return new NextResponse(robotsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
    },
  })
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
