import { NextResponse } from "next/server"

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

    const robotsTxt = `# Robots.txt for EChart Trading Platform
# Generated on ${new Date().toISOString()}

# Allow all crawlers
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
Disallow: /dashboard/private/
Disallow: /user/
Disallow: /account/
Disallow: /settings/private/

# Block access to temporary and cache files
Disallow: /tmp/
Disallow: /cache/
Disallow: /*.json$
Disallow: /*.xml$
Disallow: /*.log$

# Block access to development and testing files
Disallow: /test/
Disallow: /dev/
Disallow: /.env
Disallow: /package.json
Disallow: /package-lock.json
Disallow: /yarn.lock
Disallow: /pnpm-lock.yaml

# Block access to version control
Disallow: /.git/
Disallow: /.github/
Disallow: /.gitignore

# Block access to configuration files
Disallow: /next.config.js
Disallow: /next.config.mjs
Disallow: /tailwind.config.js
Disallow: /postcss.config.js
Disallow: /tsconfig.json

# Allow access to important pages
Allow: /markets
Allow: /stocks
Allow: /indices
Allow: /sectors
Allow: /news
Allow: /analysis
Allow: /learn
Allow: /help
Allow: /about
Allow: /contact

# Allow access to static assets
Allow: /images/
Allow: /icons/
Allow: /favicon.ico
Allow: /manifest.json

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

# Block AI training crawlers (optional)
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
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

User-agent: Twitterbot
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

# Crawl delay for all bots
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Additional sitemaps (if you have them)
# Sitemap: ${baseUrl}/sitemap-stocks.xml
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-analysis.xml

# Host directive (helps with canonicalization)
Host: ${baseUrl}

# Request rate (requests per second)
Request-rate: 1/1

# Visit time (time to wait between requests in seconds)
Visit-time: 0100-2300

# Clean-param (remove tracking parameters)
Clean-param: utm_source
Clean-param: utm_medium
Clean-param: utm_campaign
Clean-param: utm_term
Clean-param: utm_content
Clean-param: fbclid
Clean-param: gclid

# Comments for developers
# This robots.txt file is optimized for a trading platform
# It allows search engines to index public content while protecting
# sensitive user data and private areas
# 
# For questions about this file, contact: admin@echart.in
# Last updated: ${new Date().toISOString().split("T")[0]}
`

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "CDN-Cache-Control": "public, max-age=86400",
        "Vercel-CDN-Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("Robots.txt generation error:", error)

    return new NextResponse("# Error generating robots.txt", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
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
