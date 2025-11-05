import { NextRequest, NextResponse } from "next/server"

// ✅ SWITCHED FROM HUGGING FACE TO GOOGLE GEMINI FLASH
// Google Gemini Flash - FREE, Fast (1-2s), Reliable (99% uptime)
// Get free API key: https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = 
  process.env.GOOGLE_GEMINI_API_KEY || 
  process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY ||
  ""

// Check if Gemini is configured
const isGeminiConfigured = !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10

// Track daily quota status (reset at midnight UTC)
let dailyQuotaExceeded = false
let quotaResetTime = 0

// Log configuration status (without exposing the key)
console.log(`🔑 Google Gemini Flash API configured: ${isGeminiConfigured}`)
if (isGeminiConfigured) {
  console.log(`✅ API Key length: ${GEMINI_API_KEY.length} chars (starts with: ${GEMINI_API_KEY.substring(0, 6)}...)`)
} else {
  console.warn("⚠️ Google Gemini API key not found in environment variables")
  console.warn("   Get free API key: https://aistudio.google.com/app/apikey")
  console.warn("   Add to Vercel: GOOGLE_GEMINI_API_KEY")
}

// 🎯 SMART CACHING: Store summaries to avoid re-processing same articles
// Key: article URL (unique identifier), Value: { summary, affectedStocks, marketImpactScore, timestamp }
interface CachedSummary {
  summary: string
  affectedStocks: string[]
  marketImpactScore: number
  timestamp: number
}

const summaryCache = new Map<string, CachedSummary>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Clean old cache entries periodically
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [key, value] of summaryCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      summaryCache.delete(key)
      cleaned++
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} old summaries from cache. Cache size: ${summaryCache.size}`)
  }
}, 60 * 60 * 1000) // Check every hour

/**
 * Clean text by removing HTML tags, entities, and URLs
 */
function cleanText(text: string): string {
  if (!text) return ""
  
  return text
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "...")
    .replace(/&[a-zA-Z]+;/g, "") // Remove other HTML entities
    .replace(/&#\d+;/g, "") // Remove numeric entities
    .replace(/href="[^"]*"/gi, "")
    .replace(/target="[^"]*"/gi, "")
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

// List of Indian stock symbols and company names for detection
const INDIAN_STOCKS = [
  { symbol: "RELIANCE.NS", names: ["reliance", "ril", "reliance industries"] },
  { symbol: "TCS.NS", names: ["tcs", "tata consultancy", "tata consultancy services"] },
  { symbol: "HDFCBANK.NS", names: ["hdfc bank", "hdfcbank", "hdfc"] },
  { symbol: "INFY.NS", names: ["infosys", "infy"] },
  { symbol: "ICICIBANK.NS", names: ["icici bank", "icicibank", "icici"] },
  { symbol: "HINDUNILVR.NS", names: ["hindustan unilever", "hul", "hindunilvr"] },
  { symbol: "ITC.NS", names: ["itc", "itc limited"] },
  { symbol: "SBIN.NS", names: ["sbi", "state bank", "state bank of india"] },
  { symbol: "BHARTIARTL.NS", names: ["bharti airtel", "airtel", "bharti"] },
  { symbol: "KOTAKBANK.NS", names: ["kotak", "kotak bank", "kotak mahindra"] },
  { symbol: "LT.NS", names: ["l&t", "larsen", "larsen & toubro", "larsen and toubro"] },
  { symbol: "AXISBANK.NS", names: ["axis bank", "axisbank", "axis"] },
  { symbol: "ASIANPAINT.NS", names: ["asian paints", "asian paint", "asianpaint"] },
  { symbol: "MARUTI.NS", names: ["maruti", "maruti suzuki"] },
  { symbol: "WIPRO.NS", names: ["wipro"] },
  { symbol: "ULTRACEMCO.NS", names: ["ultratech", "ultratech cement", "ultracemco"] },
  { symbol: "BAJFINANCE.NS", names: ["bajaj finance", "bajfinance"] },
  { symbol: "TATASTEEL.NS", names: ["tata steel", "tatasteel"] },
  { symbol: "SUNPHARMA.NS", names: ["sun pharma", "sunpharma", "sun pharmaceutical"] },
  { symbol: "TECHM.NS", names: ["tech mahindra", "techm"] },
]

// Keywords that indicate market impact
const MARKET_IMPACT_KEYWORDS = {
  high: [
    "rate cut", "rate hike", "interest rate", "rbi", "reserve bank",
    "policy change", "regulation", "ban", "sebi", "merger", "acquisition",
    "quarterly results", "earnings", "profit warning", "loss", "bankruptcy",
    "scandal", "fraud", "investigation", "crash", "surge", "record high",
    "record low", "emergency", "crisis"
  ],
  medium: [
    "growth", "expansion", "investment", "launch", "partnership",
    "revenue", "sales", "forecast", "outlook", "guidance", "upgrade",
    "downgrade", "target price", "recommendation", "debt", "loan"
  ],
  low: [
    "appointment", "resignation", "dividend", "bonus", "split",
    "meeting", "conference", "announcement", "statement", "report"
  ]
}

/**
 * Detect which stocks are mentioned in the article
 */
function detectAffectedStocks(text: string): string[] {
  const lowerText = text.toLowerCase()
  const detected: string[] = []

  for (const stock of INDIAN_STOCKS) {
    for (const name of stock.names) {
      if (lowerText.includes(name.toLowerCase())) {
        if (!detected.includes(stock.symbol)) {
          detected.push(stock.symbol)
        }
        break
      }
    }
  }

  return detected
}

/**
 * Calculate market impact score (0-100) based on keywords and context
 */
function calculateMarketImpact(title: string, description: string, sentiment: string): number {
  const text = `${title} ${description}`.toLowerCase()
  let score = 40 // Base score

  // Check for high impact keywords
  for (const keyword of MARKET_IMPACT_KEYWORDS.high) {
    if (text.includes(keyword.toLowerCase())) {
      score += 15
    }
  }

  // Check for medium impact keywords
  for (const keyword of MARKET_IMPACT_KEYWORDS.medium) {
    if (text.includes(keyword.toLowerCase())) {
      score += 8
    }
  }

  // Check for low impact keywords
  for (const keyword of MARKET_IMPACT_KEYWORDS.low) {
    if (text.includes(keyword.toLowerCase())) {
      score += 3
    }
  }

  // Sentiment boost/penalty
  if (sentiment === "positive") {
    score += 10
  } else if (sentiment === "negative") {
    score += 15 // Negative news often has higher impact
  }

  // Cap the score at 100
  return Math.min(100, score)
}

/**
 * Fetch full article content from URL if possible
 */
async function fetchArticleContent(url: string, fallbackDescription: string): Promise<string> {
  try {
    // Try to fetch the article page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    
    if (!response.ok) {
      return fallbackDescription
    }
    
    const html = await response.text()
    
    // Extract text from common article tags (simple extraction)
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    
    let content = articleMatch ? articleMatch[1] : (contentMatch ? contentMatch[1] : html)
    
    // Remove HTML tags and get clean text
    content = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Return first 2000 chars if we got good content
    if (content.length > 200) {
      return content.substring(0, 2000)
    }
    
    return fallbackDescription
  } catch (error) {
    // If fetch fails, use fallback
    return fallbackDescription
  }
}

/**
 * Generate a concise 30-word summary using Google Gemini Flash AI
 */
/**
 * Generate AI summary with automatic retry on rate limit
 */
async function generateSummary(title: string, description: string, url: string): Promise<string> {
  try {
    // Clean inputs first
    const cleanTitle = cleanText(title)
    const cleanDescription = cleanText(description)
    
    // Try to fetch full article content for better summarization
    const fullContent = await fetchArticleContent(url, cleanDescription)
    const text = `${cleanTitle}. ${fullContent}`
    
    // Skip if text is too short
    if (text.length < 100) {
      return cleanDescription.substring(0, 150) + (cleanDescription.length > 150 ? "..." : "")
    }

    console.log(`🤖 Summarizing article (${text.length} chars) to 30 words with Gemini Flash...`)

    // Check if daily quota exceeded
    if (dailyQuotaExceeded && Date.now() < quotaResetTime) {
      console.warn(`⚠️ Daily quota exceeded, using fallback until ${new Date(quotaResetTime).toISOString()}`)
      const words = cleanDescription.split(/\s+/).slice(0, 30)
      return words.join(' ') + (cleanDescription.split(/\s+/).length > 30 ? '...' : '.')
    }

    // Check if Gemini is configured
    if (!isGeminiConfigured) {
      console.warn("⚠️ Google Gemini API key not configured, using fallback summary")
      // Fallback: Extract first 30 words from clean description
      const words = cleanDescription.split(/\s+/).slice(0, 30)
      return words.join(' ') + (cleanDescription.split(/\s+/).length > 30 ? '...' : '.')
    }

    console.log("✅ Google Gemini API key detected, attempting AI summarization...")

    // Use Google Gemini Flash for fast, reliable summarization with retry logic
    const maxRetries = 3
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`
        
        if (attempt > 1) {
          console.log(`� Retry attempt ${attempt}/${maxRetries}...`)
        }
        
        const response = await Promise.race([
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Summarize this in exactly 30 words: ${cleanTitle}. ${text.substring(0, 500)}`
                }]
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 60,
              }
            })
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Gemini API timeout")), 10000) // 10 second timeout
          )
        ]) as Response

        if (!response.ok) {
          const errorText = await response.text()
          
          // If rate limited (429), check if it's daily quota
          if (response.status === 429) {
            const errorData = JSON.parse(errorText)
            
            // Check if daily quota exceeded
            if (errorData.error?.details?.some((d: any) => 
              d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure' &&
              d.violations?.some((v: any) => v.quotaId?.includes('PerDay'))
            )) {
              console.error('🚫 DAILY QUOTA EXCEEDED - Switching to fallback summaries until tomorrow')
              dailyQuotaExceeded = true
              // Reset at next midnight UTC
              const tomorrow = new Date()
              tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
              tomorrow.setUTCHours(0, 0, 0, 0)
              quotaResetTime = tomorrow.getTime()
              throw new Error(`Daily quota exceeded`)
            }
            
            // Otherwise it's per-minute rate limit, retry
            if (attempt < maxRetries) {
              const waitTime = Math.min(5000 * attempt, 15000) // 5s, 10s, 15s
              console.warn(`⏳ Rate limited, waiting ${waitTime/1000}s before retry...`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
              continue // Retry
            }
          }
          
          throw new Error(`Gemini API error: ${response.status}`)
        }

        const data = await response.json()
      
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const summary = cleanText(data.candidates[0].content.parts[0].text)
          
          // Post-process to ensure ~30 words
          const words = summary.split(/\s+/)
          if (words.length > 35) {
            // Trim to 30 words
            const trimmed = words.slice(0, 30).join(' ')
            return trimmed + (trimmed.endsWith('.') ? '' : '...')
          }
          
          console.log(`✅ Gemini summary generated: ${words.length} words`)
          return summary
        }
        
        // No valid response, use fallback
        break
        
      } catch (geminiError: any) {
        lastError = geminiError
        
        // If it's a timeout or network error and we have retries left, try again
        if (attempt < maxRetries && (geminiError.message?.includes('timeout') || geminiError.message?.includes('fetch'))) {
          const waitTime = 2000 * attempt // 2s, 4s, 6s
          console.warn(`⏳ Network error, retrying in ${waitTime/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
        
        // Otherwise, break and use fallback
        console.error("❌ Google Gemini API error:", geminiError)
        break
      }
    }

    // Fallback to extracting first 30 words from clean description
    console.warn("⚠️ Using fallback: first 30 words")
    const cleanDesc = cleanText(description)
    const words = cleanDesc.split(/\s+/).slice(0, 30)
    return words.join(' ') + (cleanDesc.split(/\s+/).length > 30 ? '...' : '.')
  } catch (error) {
    console.error("❌ Summarization error:", error)
    
    // Final fallback: Extract first 30 words from clean description
    const cleanDesc = cleanText(description)
    const words = cleanDesc.split(/\s+/).slice(0, 30)
    return words.join(' ') + (cleanDesc.split(/\s+/).length > 30 ? '...' : '.')
  }
}

/**
 * Helper function to process a batch of articles
 * Used to avoid code duplication
 */
async function processArticleBatch(articlesToProcess: any[]): Promise<any[]> {
  const batchSize = 5
  const delayBetweenBatches = 3000
  const results: any[] = []
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  for (let i = 0; i < articlesToProcess.length; i += batchSize) {
    const batch = articlesToProcess.slice(i, i + batchSize)
    
    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articlesToProcess.length / batchSize)} (${batch.length} articles)...`)
    
    const batchResults = await Promise.all(
      batch.map(async (article: any) => {
        try {
          const summary = await generateSummary(article.title, article.description, article.url)
          const affectedStocks = detectAffectedStocks(`${article.title} ${article.description}`)
          const marketImpactScore = calculateMarketImpact(article.title, article.description, article.sentiment)
          
          // Cache the result
          const cacheKey = article.url || article.id || article.title
          summaryCache.set(cacheKey, {
            summary,
            affectedStocks,
            marketImpactScore,
            timestamp: Date.now()
          })

          return { id: article.id, summary, affectedStocks, marketImpactScore }
        } catch (error) {
          console.error(`❌ Error processing article ${article.id}:`, error)
          return {
            id: article.id,
            summary: article.description.substring(0, 150) + "...",
            affectedStocks: [],
            marketImpactScore: 40,
          }
        }
      })
    )

    results.push(...batchResults)

    if (i + batchSize < articlesToProcess.length) {
      console.log(`⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`)
      await sleep(delayBetweenBatches)
    }
  }

  return results
}

// ⏱️ Vercel serverless function timeout (max 60s on free tier)
// If you have Pro plan, you can increase to 300s
export const maxDuration = 60 // seconds

/**
 * POST /api/summarize-news
 * Summarize news articles and calculate impact scores
 * 🎯 SMART CACHING: Only summarize NEW articles, reuse cached summaries
 * ⚡ OPTIMIZED: Returns cached articles immediately to avoid 504 timeout
 */
export async function POST(request: NextRequest) {
  try {
    const { articles } = await request.json()

    if (!articles || !Array.isArray(articles)) {
      return NextResponse.json(
        { success: false, error: "Invalid articles array" },
        { status: 400 }
      )
    }

    console.log(`🤖 Processing ${articles.length} articles...`)
    
    // 🎯 STEP 1: Separate cached vs new articles
    const cachedResults: any[] = []
    const newArticles: any[] = []
    
    for (const article of articles) {
      const cacheKey = article.url || article.id || article.title // Use URL as unique identifier
      const cached = summaryCache.get(cacheKey)
      
      if (cached && cached.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        // ✅ Use cached summary
        cachedResults.push({
          id: article.id,
          summary: cached.summary,
          affectedStocks: cached.affectedStocks,
          marketImpactScore: cached.marketImpactScore,
        })
      } else {
        // 🆕 New article - needs summarization
        newArticles.push(article)
      }
    }
    
    console.log(`✅ Found ${cachedResults.length} cached summaries`)
    console.log(`🆕 Need to summarize ${newArticles.length} new articles`)

    if (newArticles.length === 0) {
      console.log(`⚡ All articles cached - instant response!`)
      return NextResponse.json({
        success: true,
        data: cachedResults,
        cached: true,
        cacheHitRate: `${cachedResults.length}/${articles.length}`
      })
    }

    // ⚡ If we have cached articles, return them immediately to avoid timeout
    // Then process new articles in smaller batches
    if (cachedResults.length > 0 && newArticles.length > 20) {
      console.log(`⚡ Too many new articles (${newArticles.length}) - returning cached articles first to avoid timeout`)
      
      // Process only first 10 new articles to stay within 60s timeout
      const limitedNewArticles = newArticles.slice(0, 10)
      console.log(`⏱️ Processing only first ${limitedNewArticles.length} articles to avoid timeout`)
      
      // Process limited articles
      const quickResults = await processArticleBatch(limitedNewArticles)
      
      return NextResponse.json({
        success: true,
        data: [...cachedResults, ...quickResults],
        cached: false,
        cacheHitRate: `${cachedResults.length}/${articles.length}`,
        note: `Processed ${limitedNewArticles.length}/${newArticles.length} new articles (remaining will be cached on next request)`
      })
    }

    // 🎯 STEP 2: Process ALL NEW articles
    console.log(`� Processing all ${newArticles.length} new articles...`)
    const newResults = await processArticleBatch(newArticles)
    
    // 🎯 STEP 3: Combine cached + new results
    const allResults = [...cachedResults, ...newResults]

    console.log(`✅ Successfully processed ${allResults.length} articles (${cachedResults.length} cached, ${newResults.length} new)`)
    console.log(`💾 Cache size: ${summaryCache.size} summaries`)

    return NextResponse.json({
      success: true,
      data: allResults,
      stats: {
        total: allResults.length,
        cached: cachedResults.length,
        new: newResults.length,
        cacheHitRate: `${Math.round((cachedResults.length / allResults.length) * 100)}%`
      }
    })
  } catch (error: any) {
    console.error("❌ Error in summarize-news API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to summarize news",
      },
      { status: 500 }
    )
  }
}
