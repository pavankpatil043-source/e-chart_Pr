import { NextRequest, NextResponse } from "next/server"

// Force dynamic rendering (disable Next.js route caching in production)
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Sentiment Heatmap Batch API
 * Fetches sentiment for multiple stocks in parallel
 * Used for the Social Sentiment Heatmap visualization
 */

interface StockSentiment {
  symbol: string
  name: string
  score: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  color: string
  emoji: string
  trend: string
  change: string
  breakdown: {
    news: number
    social: number
    price: number
  }
}

// Top Indian stocks for heatmap (Mix of blue-chips, volatile, and trending stocks)
const TOP_STOCKS = [
  // Blue-chip stable stocks
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
  { symbol: 'TCS.NS', name: 'TCS' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'SBIN.NS', name: 'SBI' },
  { symbol: 'BHARTIARTL.NS', name: 'Airtel' },
  { symbol: 'ITC.NS', name: 'ITC' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Bank' },
  { symbol: 'LT.NS', name: 'L&T' },
  { symbol: 'HINDUNILVR.NS', name: 'HUL' },
  { symbol: 'MARUTI.NS', name: 'Maruti' },
  
  // Financial & Banking
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life' },
  
  // IT & Tech
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'HCLTECH.NS', name: 'HCL Tech' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
  { symbol: 'LTIM.NS', name: 'LTIMindtree' },
  
  // Consumer & Pharma
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  { symbol: 'TITAN.NS', name: 'Titan' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia' },
  { symbol: 'DABUR.NS', name: 'Dabur' },
  
  // Adani Group (Volatile)
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green' },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power' },
  
  // Metals & Commodities
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco' },
  { symbol: 'COALINDIA.NS', name: 'Coal India' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel' },
  
  // Auto & Manufacturing
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
  
  // New-age Tech (High volatility)
  { symbol: 'ZOMATO.NS', name: 'Zomato' },
  { symbol: 'NYKAA.NS', name: 'Nykaa' },
  { symbol: 'PAYTM.NS', name: 'Paytm' },
  { symbol: 'POLICYBZR.NS', name: 'PolicyBazaar' },
  
  // Energy & Power
  { symbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid' },
  { symbol: 'ONGC.NS', name: 'ONGC' },
  { symbol: 'BPCL.NS', name: 'BPCL' },
  
  // Telecom & Media
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
  { symbol: 'DMART.NS', name: 'DMart' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer' }
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const count = parseInt(searchParams.get('count') || '12')
  const symbols = searchParams.get('symbols')?.split(',')

  console.log(`📊 Fetching sentiment heatmap for ${count} stocks...`)

  try {
    // Use provided symbols or default top stocks
    const stocksToFetch = symbols || TOP_STOCKS.slice(0, count).map(s => s.symbol)
    
    // Fetch sentiment for all stocks in parallel (batches of 5 to avoid rate limits)
    const batchSize = 5
    const results: StockSentiment[] = []

    for (let i = 0; i < stocksToFetch.length; i += batchSize) {
      const batch = stocksToFetch.slice(i, i + batchSize)
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stocksToFetch.length / batchSize)}...`)
      
      const batchResults = await Promise.allSettled(
        batch.map(symbol => fetchStockSentiment(symbol))
      )

      // Extract successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        } else {
          // Fallback for failed stocks
          const stockInfo = TOP_STOCKS.find(s => s.symbol === batch[index])
          results.push(createFallbackSentiment(batch[index], stockInfo?.name || batch[index]))
        }
      })

      // Wait 2 seconds between batches to respect rate limits
      if (i + batchSize < stocksToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Sort by sentiment score (highest first)
    results.sort((a, b) => b.score - a.score)

    console.log(`✅ Heatmap ready: ${results.length} stocks analyzed`)

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Heatmap generation error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate sentiment heatmap',
      data: []
    }, { status: 500 })
  }
}

/**
 * Fetch sentiment for a single stock
 */
async function fetchStockSentiment(symbol: string): Promise<StockSentiment | null> {
  try {
    const response = await fetch(
      `http://localhost:3000/api/social-sentiment?symbol=${symbol}`,
      { 
        cache: 'no-store',
        signal: AbortSignal.timeout(60000) // 60 second timeout (Reddit API takes 20-30s)
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const sentimentData = data.data

    const stockInfo = TOP_STOCKS.find(s => s.symbol === symbol)
    
    return {
      symbol: sentimentData.symbol,
      name: stockInfo?.name || sentimentData.symbol,
      score: sentimentData.score,
      sentiment: sentimentData.sentiment,
      color: getSentimentColor(sentimentData.score),
      emoji: getSentimentEmoji(sentimentData.score),
      trend: sentimentData.trend,
      change: getChangeIndicator(sentimentData.score),
      breakdown: {
        news: Math.round(sentimentData.breakdown.news.score),
        social: Math.round(sentimentData.breakdown.social.score),
        price: Math.round(sentimentData.breakdown.price.score)
      }
    }
  } catch (error) {
    console.log(`⚠️ Failed to fetch sentiment for ${symbol}:`, error)
    return null
  }
}

/**
 * Create fallback sentiment data
 */
function createFallbackSentiment(symbol: string, name: string): StockSentiment {
  return {
    symbol: symbol.replace('.NS', '').replace('.BO', ''),
    name,
    score: 50,
    sentiment: 'neutral',
    color: '#6b7280',
    emoji: '⚪',
    trend: '0K mentions',
    change: '0%',
    breakdown: {
      news: 50,
      social: 50,
      price: 50
    }
  }
}

/**
 * Get color based on sentiment score
 */
function getSentimentColor(score: number): string {
  if (score >= 70) return '#22c55e' // Green - Bullish
  if (score >= 55) return '#84cc16' // Light green
  if (score >= 45) return '#eab308' // Yellow - Neutral
  if (score >= 30) return '#f97316' // Orange
  return '#ef4444' // Red - Bearish
}

/**
 * Get emoji based on sentiment score
 */
function getSentimentEmoji(score: number): string {
  if (score >= 85) return '🔥🟢'
  if (score >= 70) return '🟢'
  if (score >= 55) return '🟡'
  if (score >= 45) return '⚪'
  if (score >= 30) return '🟠'
  return '🔴'
}

/**
 * Get change indicator
 */
function getChangeIndicator(score: number): string {
  if (score >= 70) return '+2.5%'
  if (score >= 55) return '+1.2%'
  if (score >= 45) return '0.0%'
  if (score >= 30) return '-1.1%'
  return '-2.8%'
}
