import { NextRequest, NextResponse } from "next/server"
import { HfInference } from "@huggingface/inference"

// Initialize Hugging Face with API key from env
// Check multiple possible environment variable names
const HF_API_KEY = 
  process.env.HUGGINGFACE_API_KEY || 
  process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || 
  process.env.FACE_API_KEY ||  // Vercel environment variable name
  process.env.NEXT_PUBLIC_FACE_API_KEY ||
  ""

const hf = HF_API_KEY ? new HfInference(HF_API_KEY) : null

// Check if HF is configured
const isHFConfigured = !!HF_API_KEY && HF_API_KEY.length > 10

// Log configuration status (without exposing the key)
console.log(`🔑 Hugging Face API configured: ${isHFConfigured}`)
if (isHFConfigured) {
  console.log(`✅ API Key length: ${HF_API_KEY.length} chars (starts with: ${HF_API_KEY.substring(0, 6)}...)`)
} else {
  console.warn("⚠️ Hugging Face API key not found in environment variables")
  console.warn("   Looking for: HUGGINGFACE_API_KEY, FACE_API_KEY, NEXT_PUBLIC_HUGGINGFACE_API_KEY, NEXT_PUBLIC_FACE_API_KEY")
}

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
 * Generate a concise 30-word summary using Hugging Face AI
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

    console.log(`🤖 Summarizing article (${text.length} chars) to 30 words...`)

    // Check if Hugging Face is configured
    if (!isHFConfigured || !hf) {
      console.warn("⚠️ Hugging Face API key not configured, using fallback summary")
      // Fallback: Extract first 30 words from clean description
      const words = cleanDescription.split(/\s+/).slice(0, 30)
      return words.join(' ') + (cleanDescription.split(/\s+/).length > 30 ? '...' : '.')
    }

    console.log("✅ Hugging Face API key detected, attempting AI summarization...")

    // Use Hugging Face summarization with strict 30-word limit
    try {
      const result = await Promise.race([
        hf.summarization({
          model: "facebook/bart-large-cnn",
          inputs: text.substring(0, 1500), // Limit input to avoid timeouts
          parameters: {
            max_length: 40,  // ~30-35 words
            min_length: 25,  // ~20-25 words
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("HF API timeout")), 30000) // Increased from 10s to 30s
        )
      ]) as any

      if (result && result.summary_text) {
        const summary = cleanText(result.summary_text)
        
        // Post-process to ensure ~30 words
        const words = summary.split(/\s+/)
        if (words.length > 35) {
          // Trim to 30 words and add proper ending
          const trimmed = words.slice(0, 30).join(' ')
          return trimmed + (trimmed.endsWith('.') ? '' : '...')
        }
        
        return summary
      }
    } catch (hfError) {
      console.error("❌ Hugging Face API error:", hfError)
      // Fall through to fallback
    }

    // Fallback to extracting first 30 words from clean description
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
 * POST /api/summarize-news
 * Summarize news articles and calculate impact scores
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

    console.log(`🤖 Summarizing ${articles.length} articles...`)

    // Process articles in parallel (but limit concurrency to avoid rate limits)
    const batchSize = 3
    const results = []

    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize)
      
      const batchResults = await Promise.all(
        batch.map(async (article: any) => {
          try {
            // Generate summary (30 words)
            const summary = await generateSummary(article.title, article.description, article.url)
            
            // Detect affected stocks
            const affectedStocks = detectAffectedStocks(
              `${article.title} ${article.description}`
            )
            
            // Calculate market impact score
            const marketImpactScore = calculateMarketImpact(
              article.title,
              article.description,
              article.sentiment
            )

            return {
              id: article.id,
              summary,
              affectedStocks,
              marketImpactScore,
            }
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

      // Small delay between batches to avoid rate limits
      if (i + batchSize < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`✅ Successfully summarized ${results.length} articles`)

    return NextResponse.json({
      success: true,
      data: results,
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
