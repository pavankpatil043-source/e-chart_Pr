import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"
  const environment = process.env.NODE_ENV || "development"

  const robots = `# EChart Trading Platform - Robots.txt
# Environment: ${environment}
# Generated: ${new Date().toISOString()}
# https://echart.in

User-agent: *
Allow: /

# Allow all major search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: YandexBot
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/private/
Disallow: /_next/
Disallow: /static/private/

# Disallow user-specific content
Disallow: /user/
Disallow: /profile/
Disallow: /account/
Disallow: /dashboard/private/

# Disallow temporary and cache files
Disallow: /tmp/
Disallow: /cache/
Disallow: /*.json$
Disallow: /*.xml$
Disallow: /*.txt$

# Allow important files
Allow: /sitemap.xml
Allow: /robots.txt
Allow: /favicon.ico
Allow: /manifest.json

# Crawl delay (be respectful)
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps (if needed)
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-stocks.xml

# Host directive (preferred domain)
Host: ${baseUrl}

# Clean URLs preference
# Prefer clean URLs over query parameters
Disallow: /*?*
Allow: /*?utm_*
Allow: /*?ref=*
Allow: /*?source=*

# Block common bot traps
Disallow: /trap/
Disallow: /honeypot/
Disallow: /bot-trap/

# Block development and testing paths
Disallow: /dev/
Disallow: /test/
Disallow: /staging/
Disallow: /beta/

# Block sensitive API endpoints
Disallow: /api/auth/
Disallow: /api/admin/
Disallow: /api/internal/
Disallow: /api/private/

# Allow public API documentation
Allow: /api/docs/
Allow: /api/health/
Allow: /api/status/

# Media files - allow indexing
Allow: /images/
Allow: /photos/
Allow: /media/
Allow: /assets/

# Block log files and backups
Disallow: /*.log$
Disallow: /*.bak$
Disallow: /*.old$
Disallow: /*.tmp$

# Block configuration files
Disallow: /*.config$
Disallow: /*.conf$
Disallow: /*.ini$
Disallow: /*.env$

# Special instructions for financial data crawlers
User-agent: FinancialBot
Crawl-delay: 5
Allow: /api/public/
Allow: /market-data/
Allow: /stocks/
Allow: /indices/

# Instructions for news aggregators
User-agent: NewsBot
Allow: /news/
Allow: /analysis/
Allow: /market-updates/
Crawl-delay: 2

# Block aggressive crawlers
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

User-agent: DotBot
Disallow: /

# Block AI training crawlers (optional)
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

# Allow social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

# Last updated: ${new Date().toISOString()}
# Contact: admin@echart.in
# More info: ${baseUrl}/robots-info`

  return new NextResponse(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
