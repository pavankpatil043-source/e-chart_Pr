import { NextResponse } from "next/server"

// In-memory storage for sentiment history
interface SentimentRecord {
  symbol: string
  score: number
  timestamp: number
  priceChange: number
  newsScore: number
  socialScore: number
  volume?: number
}

interface Alert {
  id: string
  symbol: string
  type: 'spike' | 'drop' | 'overbought' | 'oversold' | 'momentum'
  severity: 'high' | 'medium' | 'low'
  message: string
  currentScore: number
  previousScore?: number
  change?: number
  timestamp: number
  metadata?: {
    price?: number
    volume?: number
    newsHeadline?: string
  }
}

// Store last 24 hours of sentiment data (1 hour intervals)
const sentimentHistory: Map<string, SentimentRecord[]> = new Map()

// Store active alerts (last 6 hours)
const activeAlerts: Alert[] = []
const ALERT_RETENTION_HOURS = 6

// Thresholds for alerts
const THRESHOLDS = {
  SPIKE_DROP: 20,        // 20 point change in 1 hour
  OVERBOUGHT: 85,        // Extreme bullish
  OVERSOLD: 15,          // Extreme bearish
  HIGH_MOMENTUM: 75,     // Strong uptrend
  LOW_MOMENTUM: 25,      // Strong downtrend
  VOLUME_SURGE: 2.0,     // 2x average volume
}

// Store sentiment record
function recordSentiment(data: SentimentRecord) {
  const { symbol } = data
  
  if (!sentimentHistory.has(symbol)) {
    sentimentHistory.set(symbol, [])
  }
  
  const records = sentimentHistory.get(symbol)!
  
  // Add new record
  records.push(data)
  
  // Keep only last 24 hours (24 records if 1 per hour)
  const cutoff = Date.now() - (24 * 60 * 60 * 1000)
  const filtered = records.filter(r => r.timestamp > cutoff)
  
  sentimentHistory.set(symbol, filtered)
  
  return filtered
}

// Get sentiment change over time period
function getSentimentChange(symbol: string, hours: number): number | null {
  const records = sentimentHistory.get(symbol)
  if (!records || records.length < 2) return null
  
  const cutoff = Date.now() - (hours * 60 * 60 * 1000)
  const oldRecords = records.filter(r => r.timestamp <= cutoff)
  
  if (oldRecords.length === 0) return null
  
  const oldScore = oldRecords[oldRecords.length - 1].score
  const currentScore = records[records.length - 1].score
  
  return currentScore - oldScore
}

// Generate alerts based on sentiment changes
function generateAlerts(symbol: string, currentRecord: SentimentRecord): Alert[] {
  const alerts: Alert[] = []
  const now = Date.now()
  
  // Check 1-hour change
  const change1h = getSentimentChange(symbol, 1)
  
  if (change1h !== null) {
    // Spike alert (sudden positive jump)
    if (change1h >= THRESHOLDS.SPIKE_DROP) {
      alerts.push({
        id: `${symbol}-spike-${now}`,
        symbol,
        type: 'spike',
        severity: change1h >= 30 ? 'high' : 'medium',
        message: `🚀 SPIKE ALERT: ${symbol} sentiment jumped ${change1h.toFixed(0)} points in 1 hour!`,
        currentScore: currentRecord.score,
        previousScore: currentRecord.score - change1h,
        change: change1h,
        timestamp: now,
        metadata: {
          price: currentRecord.priceChange,
          volume: currentRecord.volume
        }
      })
    }
    
    // Drop alert (sudden negative drop)
    if (change1h <= -THRESHOLDS.SPIKE_DROP) {
      alerts.push({
        id: `${symbol}-drop-${now}`,
        symbol,
        type: 'drop',
        severity: change1h <= -30 ? 'high' : 'medium',
        message: `⚠️ DROP ALERT: ${symbol} sentiment dropped ${Math.abs(change1h).toFixed(0)} points in 1 hour!`,
        currentScore: currentRecord.score,
        previousScore: currentRecord.score - change1h,
        change: change1h,
        timestamp: now,
        metadata: {
          price: currentRecord.priceChange,
          volume: currentRecord.volume
        }
      })
    }
  }
  
  // Overbought alert
  if (currentRecord.score >= THRESHOLDS.OVERBOUGHT) {
    alerts.push({
      id: `${symbol}-overbought-${now}`,
      symbol,
      type: 'overbought',
      severity: currentRecord.score >= 90 ? 'high' : 'medium',
      message: `🔥 OVERBOUGHT: ${symbol} at extreme bullish level (${currentRecord.score}/100)`,
      currentScore: currentRecord.score,
      timestamp: now,
      metadata: {
        price: currentRecord.priceChange
      }
    })
  }
  
  // Oversold alert
  if (currentRecord.score <= THRESHOLDS.OVERSOLD) {
    alerts.push({
      id: `${symbol}-oversold-${now}`,
      symbol,
      type: 'oversold',
      severity: currentRecord.score <= 10 ? 'high' : 'medium',
      message: `❄️ OVERSOLD: ${symbol} at extreme bearish level (${currentRecord.score}/100)`,
      currentScore: currentRecord.score,
      timestamp: now,
      metadata: {
        price: currentRecord.priceChange
      }
    })
  }
  
  // Momentum alert (strong consistent trend)
  const change6h = getSentimentChange(symbol, 6)
  if (change6h !== null && Math.abs(change6h) >= 15) {
    alerts.push({
      id: `${symbol}-momentum-${now}`,
      symbol,
      type: 'momentum',
      severity: Math.abs(change6h) >= 25 ? 'high' : 'low',
      message: change6h > 0 
        ? `📈 MOMENTUM: ${symbol} strong uptrend (+${change6h.toFixed(0)} over 6h)`
        : `📉 MOMENTUM: ${symbol} strong downtrend (${change6h.toFixed(0)} over 6h)`,
      currentScore: currentRecord.score,
      change: change6h,
      timestamp: now,
      metadata: {
        price: currentRecord.priceChange
      }
    })
  }
  
  return alerts
}

// Clean old alerts
function cleanOldAlerts() {
  const cutoff = Date.now() - (ALERT_RETENTION_HOURS * 60 * 60 * 1000)
  const filtered = activeAlerts.filter(a => a.timestamp > cutoff)
  activeAlerts.length = 0
  activeAlerts.push(...filtered)
}

// POST: Record new sentiment data and check for alerts
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { symbol, score, priceChange, newsScore, socialScore, volume } = body
    
    if (!symbol || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: symbol, score' },
        { status: 400 }
      )
    }
    
    // Record sentiment
    const record: SentimentRecord = {
      symbol,
      score,
      timestamp: Date.now(),
      priceChange: priceChange || 0,
      newsScore: newsScore || 50,
      socialScore: socialScore || 50,
      volume
    }
    
    const history = recordSentiment(record)
    
    // Generate alerts
    const newAlerts = generateAlerts(symbol, record)
    
    // Add to active alerts
    if (newAlerts.length > 0) {
      activeAlerts.push(...newAlerts)
      cleanOldAlerts()
    }
    
    // Calculate changes
    const change1h = getSentimentChange(symbol, 1)
    const change6h = getSentimentChange(symbol, 6)
    const change24h = getSentimentChange(symbol, 24)
    
    return NextResponse.json({
      success: true,
      symbol,
      currentScore: score,
      changes: {
        '1h': change1h,
        '6h': change6h,
        '24h': change24h
      },
      alerts: newAlerts,
      historyCount: history.length
    })
    
  } catch (error) {
    console.error('❌ Sentiment alerts API error:', error)
    return NextResponse.json(
      { error: 'Failed to process sentiment data' },
      { status: 500 }
    )
  }
}

// GET: Retrieve active alerts and sentiment trends
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type') // 'alerts' | 'history' | 'trends'
    
    cleanOldAlerts()
    
    // Get alerts for specific symbol or all
    if (type === 'alerts') {
      const filteredAlerts = symbol 
        ? activeAlerts.filter(a => a.symbol === symbol)
        : activeAlerts
      
      // Sort by severity and timestamp
      const sortedAlerts = filteredAlerts.sort((a, b) => {
        const severityWeight = { high: 3, medium: 2, low: 1 }
        const diff = severityWeight[b.severity] - severityWeight[a.severity]
        return diff !== 0 ? diff : b.timestamp - a.timestamp
      })
      
      return NextResponse.json({
        alerts: sortedAlerts,
        count: sortedAlerts.length,
        timestamp: Date.now()
      })
    }
    
    // Get sentiment history
    if (type === 'history' && symbol) {
      const history = sentimentHistory.get(symbol) || []
      return NextResponse.json({
        symbol,
        history,
        count: history.length
      })
    }
    
    // Get trends for all tracked symbols
    if (type === 'trends') {
      const trends = Array.from(sentimentHistory.entries()).map(([sym, records]) => {
        if (records.length === 0) return null
        
        const latest = records[records.length - 1]
        const change1h = getSentimentChange(sym, 1)
        const change6h = getSentimentChange(sym, 6)
        const change24h = getSentimentChange(sym, 24)
        
        return {
          symbol: sym,
          currentScore: latest.score,
          changes: {
            '1h': change1h,
            '6h': change6h,
            '24h': change24h
          },
          trend: change24h ? (change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'flat') : 'unknown',
          lastUpdated: latest.timestamp
        }
      }).filter(Boolean)
      
      return NextResponse.json({
        trends,
        count: trends.length,
        timestamp: Date.now()
      })
    }
    
    // Default: return summary
    return NextResponse.json({
      alertCount: activeAlerts.length,
      trackedSymbols: sentimentHistory.size,
      activeAlerts: activeAlerts.slice(0, 10), // Top 10 recent
      timestamp: Date.now()
    })
    
  } catch (error) {
    console.error('❌ Sentiment alerts GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
