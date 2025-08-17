import { NextResponse } from "next/server"

export async function GET() {
  const robots = `User-agent: *
Allow: /

Sitemap: https://echart.in/sitemap.xml

# Block access to API documentation in production
Disallow: /api/

# Allow specific API endpoints for SEO
Allow: /api/health
Allow: /api/sitemap
Allow: /api/robots`

  return new NextResponse(robots, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
