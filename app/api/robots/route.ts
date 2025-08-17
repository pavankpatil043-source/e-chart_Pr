import { NextResponse } from "next/server"

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

    const robotsTxt = `# Robots.txt for EChart Trading Platform
# Generated on ${new Date().toISOString()}

# Allow all crawlers to access the site
User-agent: *
Allow: /

# Specific rules for major search engines
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 2

User-agent: Slurp
Allow: /
Crawl-delay: 2

# Block access to sensitive areas
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/
Disallow: /settings/
Disallow: /auth/
Disallow: /login/
Disallow: /register/
Disallow: /profile/
Disallow: /private/
Disallow: /_next/
Disallow: /static/
Disallow: /.well-known/
Disallow: /tmp/
Disallow: /logs/
Disallow: /backup/

# Block access to file types that shouldn't be indexed
Disallow: /*.json$
Disallow: /*.xml$
Disallow: /*.txt$
Disallow: /*.log$
Disallow: /*.env$
Disallow: /*.config$

# Block access to development and testing paths
Disallow: /test/
Disallow: /dev/
Disallow: /staging/
Disallow: /beta/
Disallow: /__tests__/
Disallow: /coverage/

# Block access to user-generated content that might be sensitive
Disallow: /uploads/private/
Disallow: /documents/private/
Disallow: /reports/private/

# Allow access to public content
Allow: /news/
Allow: /insights/
Allow: /learn/
Allow: /market-updates/
Allow: /stock/
Allow: /sector/
Allow: /index/
Allow: /about/
Allow: /contact/
Allow: /privacy/
Allow: /terms/

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

# Block AI training crawlers (optional - uncomment if desired)
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

# Block social media crawlers from sensitive content
User-agent: facebookexternalhit
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

User-agent: Twitterbot
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

User-agent: LinkedInBot
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

# Crawl delay for general bots to prevent server overload
User-agent: *
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/api/sitemap

# Additional sitemaps (if you have them)
# Sitemap: ${baseUrl}/sitemap-news.xml
# Sitemap: ${baseUrl}/sitemap-stocks.xml
# Sitemap: ${baseUrl}/sitemap-sectors.xml

# Host directive (helps with canonicalization)
Host: ${baseUrl}

# Clean URLs preference
# This helps search engines understand your preferred URL structure
# Example: prefer www or non-www version
`

    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    console.error("Error generating robots.txt:", error)

    // Return a basic robots.txt in case of error
    const fallbackRobots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /portfolio/
Disallow: /account/

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
