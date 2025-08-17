import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://echart.in"

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Trading Dashboard -->
  <url>
    <loc>${baseUrl}/dashboard</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Market Analysis -->
  <url>
    <loc>${baseUrl}/analysis</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Portfolio -->
  <url>
    <loc>${baseUrl}/portfolio</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    <mobile:mobile/>
  </url>
  
  <!-- News -->
  <url>
    <loc>${baseUrl}/news</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
    <mobile:mobile/>
  </url>
  
  <!-- AI Chat -->
  <url>
    <loc>${baseUrl}/chat</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Market Indices -->
  <url>
    <loc>${baseUrl}/indices</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Stocks -->
  <url>
    <loc>${baseUrl}/stocks</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Technical Analysis -->
  <url>
    <loc>${baseUrl}/technical</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Settings -->
  <url>
    <loc>${baseUrl}/settings</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.4</priority>
    <mobile:mobile/>
  </url>
  
  <!-- About -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
    <mobile:mobile/>
  </url>
  
  <!-- Privacy Policy -->
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>
  
  <!-- Terms of Service -->
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>
  
  <!-- API Documentation -->
  <url>
    <loc>${baseUrl}/api/docs</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  
</urlset>`

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
