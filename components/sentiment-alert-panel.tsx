"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

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
  }
}

interface SentimentTrend {
  symbol: string
  currentScore: number
  changes: {
    '1h': number | null
    '6h': number | null
    '24h': number | null
  }
  trend: 'up' | 'down' | 'flat' | 'unknown'
  lastUpdated: number
}

export function SentimentAlertPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [trends, setTrends] = useState<SentimentTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlertsAndTrends()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchAlertsAndTrends, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchAlertsAndTrends = async () => {
    try {
      // Fetch alerts
      const alertsRes = await fetch('/api/sentiment-alerts?type=alerts', {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (!alertsRes.ok) {
        throw new Error(`Alerts API error: ${alertsRes.status}`)
      }
      
      const alertsData = await alertsRes.json()
      
      // Fetch trends
      const trendsRes = await fetch('/api/sentiment-alerts?type=trends', {
        signal: AbortSignal.timeout(10000)
      })
      
      if (!trendsRes.ok) {
        throw new Error(`Trends API error: ${trendsRes.status}`)
      }
      
      const trendsData = await trendsRes.json()
      
      setAlerts(Array.isArray(alertsData.alerts) ? alertsData.alerts : [])
      setTrends(Array.isArray(trendsData.trends) ? trendsData.trends : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
      // Set empty arrays on error so UI shows "No alerts" instead of crashing
      setAlerts([])
      setTrends([])
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'spike': return <TrendingUp className="h-4 w-4" />
      case 'drop': return <TrendingDown className="h-4 w-4" />
      case 'overbought': return <Zap className="h-4 w-4" />
      case 'oversold': return <Zap className="h-4 w-4" />
      case 'momentum': return <TrendingUp className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const getTrendArrow = (change: number | null) => {
    if (change === null) return '→'
    if (change > 5) return '⬆'
    if (change < -5) return '⬇'
    return '→'
  }

  const getTrendColor = (change: number | null) => {
    if (change === null) return 'text-muted-foreground'
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  // Filter for high priority alerts only for summary
  const highPriorityAlerts = alerts.filter(a => a.severity === 'high').slice(0, 5)
  
  // Top movers (biggest 24h changes)
  const topMovers = [...trends]
    .filter(t => t.changes['24h'] !== null)
    .sort((a, b) => Math.abs(b.changes['24h']!) - Math.abs(a.changes['24h']!))
    .slice(0, 8)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Sentiment Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Real-time sentiment change notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
              <p className="font-semibold">No active alerts</p>
              <p className="text-xs">Alerts will appear when:</p>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Sentiment jumps ±20 points in 1 hour</li>
                <li>• Stock reaches overbought (≥85) or oversold (≤15)</li>
                <li>• Strong momentum detected over 6 hours</li>
              </ul>
              <p className="text-xs text-yellow-500 mt-3">
                💡 Alerts need 1-hour of sentiment history to activate
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className={`mt-0.5 ${
                      alert.severity === 'high' ? 'text-red-500' :
                      alert.severity === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{alert.symbol}</span>
                        <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-sm">{alert.message}</p>
                      
                      {alert.change !== undefined && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Score: {alert.previousScore} → {alert.currentScore}</span>
                          <span className={alert.change > 0 ? 'text-green-500' : 'text-red-500'}>
                            ({alert.change > 0 ? '+' : ''}{alert.change.toFixed(0)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Top Movers (24h) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Movers (24h)
          </CardTitle>
          <CardDescription>
            Biggest sentiment changes in last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topMovers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
              <p className="font-semibold">No trend data available yet</p>
              <p className="text-xs">Top movers will show after:</p>
              <ul className="text-xs space-y-1 mt-2">
                <li>• Sentiment data is collected for 24 hours</li>
                <li>• Stocks with biggest % changes appear here</li>
              </ul>
              <p className="text-xs text-blue-500 mt-3">
                💡 Check back in 1 hour to see trending stocks
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {topMovers.map((trend) => {
                const change24h = trend.changes['24h'] || 0
                const change1h = trend.changes['1h'] || 0
                
                return (
                  <div
                    key={trend.symbol}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{trend.symbol}</span>
                      <Badge variant={
                        trend.currentScore >= 70 ? 'default' :
                        trend.currentScore <= 30 ? 'destructive' :
                        'secondary'
                      }>
                        {trend.currentScore}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">1h:</span>
                        <span className={getTrendColor(change1h)}>
                          {getTrendArrow(change1h)} {change1h !== null ? 
                            (change1h > 0 ? '+' : '') + change1h.toFixed(0) : 
                            'N/A'
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">24h:</span>
                        <span className={getTrendColor(change24h)}>
                          {getTrendArrow(change24h)} {change24h !== null ? 
                            (change24h > 0 ? '+' : '') + change24h.toFixed(0) : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
