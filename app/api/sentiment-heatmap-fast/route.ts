import { NextRequest, NextResponse } from "next/server"

/**
 * FAST Sentiment Heatmap API
 * Returns PRICE-ONLY sentiment in 10-20 seconds
 * Reddit/News data added progressively in background
 * 
 * Strategy:
 * 1. Fetch all 52 stock prices in parallel (fast - 5-10s)
 * 2. Calculate price-based sentiment (instant)
 * 3. Return immediately with "upgrading..." status
 * 4. Client polls for Reddit/News upgrades separately
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
  isFullData: boolean // false = price-only, true = full sentiment
}

// Same 52 stocks as main heatmap
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
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life' },
  { symbol: 'WIPRO.NS', name: 'Wipro' },
  { symbol: 'HCLTECH.NS', name: 'HCL Tech' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia' },
  { symbol: 'DABUR.NS', name: 'Dabur' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharma' },
  { symbol: 'DRREDDY.NS', name: 'Dr Reddy\'s' },
  { symbol: 'CIPLA.NS', name: 'Cipla' },
  { symbol: 'DIVISLAB.NS', name: 'Divis Labs' },
  { symbol: 'COALINDIA.NS', name: 'Coal India' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid' },
  { symbol: 'NTPC.NS', name: 'NTPC' },
  { symbol: 'ONGC.NS', name: 'ONGC' },
  { symbol: 'BPCL.NS', name: 'BPCL' },
  { symbol: 'ZOMATO.NS', name: 'Zomato' },
  { symbol: 'PAYTM.NS', name: 'Paytm' },
  { symbol: 'NYKAA.NS', name: 'Nykaa' },
  { symbol: 'POLICYBZR.NS', name: 'Policybazaar' },
  { symbol: 'CARTRADE.NS', name: 'CarTrade' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green' },
  { symbol: 'ADANITRANS.NS', name: 'Adani Transmission' },
  { symbol: 'ADANIPOWER.NS', name: 'Adani Power' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank' },
  { symbol: 'DMART.NS', name: 'DMart' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer' },
  { symbol: 'M&MFIN.NS', name: 'M&M Financial' },
  { symbol: 'TITAN.NS', name: 'Titan Company' }
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const count = parseInt(searchParams.get('count') || '52')

  console.log(`⚡ FAST heatmap: Fetching ${count} stocks (price-only, 10-20s)...`)

  try {
    const stocksToFetch = TOP_STOCKS.slice(0, count)
    
    // Fetch all prices in parallel (FAST - no batching needed)
    const results = await Promise.allSettled(
      stocksToFetch.map(stock => fetchPriceOnlySentiment(stock.symbol, stock.name))
    )

    const stocks: StockSentiment[] = results
      .filter((r): r is PromiseFulfilledResult<StockSentiment> => r.status === 'fulfilled')
      .map(r => r.value)

    // Sort by price score (highest first)
    stocks.sort((a, b) => b.score - a.score)

    console.log(`✅ FAST heatmap ready: ${stocks.length} stocks (price-only)`)

    return NextResponse.json({
      success: true,
      data: stocks,
      count: stocks.length,
      mode: 'price-only',
      message: '⚡ Quick load! Upgrading with Reddit/News data in background...',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Fast heatmap error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fast heatmap' },
      { status: 500 }
    )
  }
}

/**
 * Fetch PRICE-ONLY sentiment (fast - no Reddit/News)
 */
async function fetchPriceOnlySentiment(symbol: string, name: string): Promise<StockSentiment> {
  try {
    // Fetch price chart (fast - 1-2 seconds)
    const response = await fetch(
      `http://localhost:3000/api/yahoo-chart?symbol=${symbol}&interval=1d&range=1mo`,
      { 
        signal: AbortSignal.timeout(5000), // 5 second timeout
        cache: 'no-store' 
      }
    )

    if (!response.ok) {
      throw new Error(`Chart API failed: ${response.status}`)
    }

    const chartData = await response.json()
    
    // Calculate price-based sentiment
    const priceScore = calculatePriceScore(chartData)
    
    // Final score is 100% price-based (no news/social yet)
    const finalScore = priceScore

    return {
      symbol: symbol.replace('.NS', ''),
      name,
      score: Math.round(finalScore),
      sentiment: getSentimentLabel(finalScore),
      color: getSentimentColor(finalScore),
      emoji: getSentimentEmoji(finalScore),
      trend: '⏳ Upgrading...', // Will be replaced with real data
      change: getChangeIndicator(finalScore),
      breakdown: {
        news: 0, // Not fetched yet
        social: 0, // Not fetched yet
        price: Math.round(priceScore)
      },
      isFullData: false // Indicates this is price-only
    }

  } catch (error) {
    console.error(`⚠️ Failed to fetch price for ${symbol}:`, error)
    
    // Return neutral fallback
    return {
      symbol: symbol.replace('.NS', ''),
      name,
      score: 50,
      sentiment: 'neutral',
      color: '#6b7280',
      emoji: '⚪',
      trend: 'No data',
      change: '0%',
      breakdown: {
        news: 0,
        social: 0,
        price: 50
      },
      isFullData: false
    }
  }
}

/**
 * Calculate sentiment from price action only
 */
function calculatePriceScore(chartData: any): number {
  try {
    const quotes = chartData.quotes || []
    if (quotes.length < 5) return 50 // Neutral if not enough data

    const latestPrice = quotes[quotes.length - 1].close
    const firstPrice = quotes[0].close

    // 5-day price change percentage
    const priceChange = ((latestPrice - firstPrice) / firstPrice) * 100

    // Convert to 0-100 score (±40 points, 5x multiplier)
    let priceScore = 50 + (priceChange * 5)
    priceScore = Math.max(0, Math.min(100, priceScore)) // Clamp to 0-100

    // Volume boost (if volume is high, boost sentiment)
    const avgVolume = quotes.reduce((sum: number, q: any) => sum + (q.volume || 0), 0) / quotes.length
    const latestVolume = quotes[quotes.length - 1].volume || 0
    const volumeRatio = latestVolume / avgVolume

    if (volumeRatio > 1.5 && priceChange > 0) {
      priceScore = Math.min(100, priceScore + 5) // Boost bullish on high volume
    }

    return priceScore

  } catch (error) {
    console.error('Price score calculation error:', error)
    return 50 // Neutral fallback
  }
}

/**
 * Get sentiment label
 */
function getSentimentLabel(score: number): 'bullish' | 'bearish' | 'neutral' {
  if (score >= 70) return 'bullish'
  if (score <= 30) return 'bearish'
  return 'neutral'
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
