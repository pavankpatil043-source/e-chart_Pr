import { NextResponse } from "next/server"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

  const robotsTxt = `# Robots.txt for EChart Trading Platform
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
Disallow: /admin/
Disallow: /private/
Disallow: /_next/
Disallow: /static/
Disallow: /.well-known/
Disallow: /health
Disallow: /debug/

# Block access to user-specific content
Disallow: /user/
Disallow: /account/
Disallow: /profile/
Disallow: /settings/
Disallow: /dashboard/private/

# Block access to temporary or test pages
Disallow: /test/
Disallow: /temp/
Disallow: /staging/
Disallow: /dev/

# Block access to search and filter pages with parameters
Disallow: /*?*
Disallow: /search?*
Disallow: /filter?*

# Allow specific important pages with parameters
Allow: /stock/*
Allow: /index/*
Allow: /news/*
Allow: /analysis/*

# Block common bot traps
Disallow: /trap/
Disallow: /honeypot/

# Block access to common CMS and development files
Disallow: /.git/
Disallow: /.env
Disallow: /package.json
Disallow: /yarn.lock
Disallow: /package-lock.json
Disallow: /node_modules/

# Block access to backup and log files
Disallow: /*.log
Disallow: /*.bak
Disallow: /*.tmp
Disallow: /*.old

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps (if you have them)
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-stocks.xml

# Crawl delay for aggressive bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: MJ12bot
Crawl-delay: 10

User-agent: DotBot
Crawl-delay: 10

# Block known bad bots
User-agent: SemrushBot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

# Block social media bots from sensitive content
User-agent: facebookexternalhit
Disallow: /api/
Disallow: /user/
Allow: /

User-agent: Twitterbot
Disallow: /api/
Disallow: /user/
Allow: /

User-agent: LinkedInBot
Disallow: /api/
Disallow: /user/
Allow: /

# Allow financial data aggregators (be selective)
User-agent: YahooSeeker
Allow: /stock/
Allow: /index/
Allow: /news/
Disallow: /

User-agent: GoogleOther
Allow: /stock/
Allow: /index/
Allow: /news/
Disallow: /

# Block AI training bots (optional - adjust based on your policy)
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

# Allow legitimate financial services
User-agent: BloombergBot
Allow: /
Crawl-delay: 2

User-agent: ReutersBot
Allow: /
Crawl-delay: 2

# Special rules for mobile crawlers
User-agent: Googlebot-Mobile
Allow: /
Crawl-delay: 1

# Rules for image crawlers
User-agent: Googlebot-Image
Allow: /images/
Allow: /static/images/
Disallow: /user/
Disallow: /private/

# Rules for news crawlers
User-agent: Googlebot-News
Allow: /news/
Allow: /analysis/
Crawl-delay: 1

# Block archive crawlers from dynamic content
User-agent: ia_archiver
Disallow: /api/
Disallow: /real-time/
Allow: /

User-agent: Wayback
Disallow: /api/
Disallow: /real-time/
Allow: /

# Host directive (optional)
Host: ${baseUrl.replace("https://", "").replace("http://", "")}

# Clean-param directive for better crawling
# Clean-param: utm_source&utm_medium&utm_campaign

# Last updated: ${new Date().toISOString()}
# Contact: webmaster@echart.in
# For questions about this robots.txt file, please contact our technical team.
`

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      "X-Robots-Tag": "noindex, nofollow", // Don't index robots.txt itself
    },
  })
}

// Handle HEAD requests
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
