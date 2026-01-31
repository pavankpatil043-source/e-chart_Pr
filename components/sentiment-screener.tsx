"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Filter, Star, TrendingUp, TrendingDown, Zap, Search } from "lucide-react"

interface ScreenerStock {
  symbol: string
  sentiment: number
  signalStrength: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'very-weak'
  signalStars: number
  volumeRatio: number
  priceChange: number
  recommendation: string
  trend24h: number | null
}

interface ScreenerFilters {
  sentimentMin: number
  sentimentMax: number
  signalStrength: string[]
  volumeMin: number
  trend: 'all' | 'bullish' | 'bearish' | 'neutral'
  strategy: 'all' | 'breakout' | 'oversold-bounce' | 'momentum' | 'contrarian'
}

const TRADING_STRATEGIES = {
  all: {
    name: 'All Stocks',
    description: 'No filter applied',
    filters: {} as Partial<{sentimentMin: number; sentimentMax: number; volumeMin: number; signalStrength: string[]; trend: string}>
  },
  breakout: {
    name: '🚀 Breakout Plays',
    description: 'High sentiment + Volume surge + Positive momentum',
    filters: {
      sentimentMin: 70,
      volumeMin: 1.5,
      signalStrength: ['very-strong', 'strong']
    } as Partial<{sentimentMin: number; sentimentMax: number; volumeMin: number; signalStrength: string[]; trend: string}>
  },
  'oversold-bounce': {
    name: '📉 Oversold Bounce',
    description: 'Low sentiment + High volume + Potential reversal',
    filters: {
      sentimentMax: 30,
      volumeMin: 1.2,
      signalStrength: ['strong', 'moderate']
    } as Partial<{sentimentMin: number; sentimentMax: number; volumeMin: number; signalStrength: string[]; trend: string}>
  },
  momentum: {
    name: '📈 Momentum Trade',
    description: 'Rising sentiment + Strong 24h trend',
    filters: {
      sentimentMin: 60,
      trend: 'bullish'
    } as Partial<{sentimentMin: number; sentimentMax: number; volumeMin: number; signalStrength: string[]; trend: string}>
  },
  contrarian: {
    name: '🔄 Contrarian Setup',
    description: 'Extreme sentiment + Low volume (potential reversal)',
    filters: {
      signalStrength: ['weak', 'very-weak']
    } as Partial<{sentimentMin: number; sentimentMax: number; volumeMin: number; signalStrength: string[]; trend: string}>
  }
}

export function SentimentScreener() {
  const [stocks, setStocks] = useState<ScreenerStock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<ScreenerStock[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ScreenerFilters>({
    sentimentMin: 0,
    sentimentMax: 100,
    signalStrength: [],
    volumeMin: 0,
    trend: 'all',
    strategy: 'all'
  })

  useEffect(() => {
    fetchScreenerData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, stocks])

  const fetchScreenerData = async () => {
    try {
      setLoading(true)
      
      // Fetch sentiment heatmap data with EXTENDED timeout
      const heatmapRes = await fetch('/api/sentiment-heatmap?count=52', {
        signal: AbortSignal.timeout(180000) // 3 MINUTE timeout (increased from 90s to prevent timeouts)
      })
      
      if (!heatmapRes.ok) {
        throw new Error(`Heatmap API error: ${heatmapRes.status}`)
      }
      
      const heatmapData = await heatmapRes.json()
      
      // Fetch trends for 24h changes
      const trendsRes = await fetch('/api/sentiment-alerts?type=trends', {
        signal: AbortSignal.timeout(10000)
      })
      
      const trendsData = trendsRes.ok ? await trendsRes.json() : { trends: [] }
      
      // Combine data
      const screenerStocks: ScreenerStock[] = []
      const stocksToProcess = (heatmapData.stocks || []).slice(0, 5) // REDUCED to 5 stocks for faster load times
      
      for (const stock of stocksToProcess) {
        try {
          // Get volume correlation
          const volumeRes = await fetch(
            `/api/volume-correlation?symbol=${stock.symbol}.NS&sentiment=${stock.score}`,
            { signal: AbortSignal.timeout(15000) }
          )
          
          if (!volumeRes.ok) {
            console.warn(`Volume API failed for ${stock.symbol}`)
            continue
          }
          
          const volumeData = await volumeRes.json()
          
          // Get trend data
          const trendInfo = trendsData.trends?.find((t: any) => t.symbol === stock.symbol)
          
          if (volumeData.success && volumeData.data) {
            screenerStocks.push({
              symbol: stock.symbol,
              sentiment: stock.score,
              signalStrength: volumeData.data.signalStrength,
              signalStars: volumeData.data.signalStars,
              volumeRatio: volumeData.data.volumeRatio,
              priceChange: volumeData.data.metadata?.priceChange || 0,
              recommendation: volumeData.data.recommendation,
              trend24h: trendInfo?.changes?.['24h'] || null
            })
          }
        } catch (err) {
          console.error(`Failed to fetch data for ${stock.symbol}:`, err)
        }
      }
      
      setStocks(screenerStocks)
      setLoading(false)
    } catch (error) {
      console.error('Screener fetch error:', error)
      setStocks([])
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...stocks]
    
    // Apply strategy preset first
    if (filters.strategy !== 'all') {
      const strategy = TRADING_STRATEGIES[filters.strategy as keyof typeof TRADING_STRATEGIES]
      if (strategy.filters.sentimentMin) {
        filtered = filtered.filter(s => s.sentiment >= strategy.filters.sentimentMin!)
      }
      if (strategy.filters.sentimentMax) {
        filtered = filtered.filter(s => s.sentiment <= strategy.filters.sentimentMax!)
      }
      if (strategy.filters.volumeMin) {
        filtered = filtered.filter(s => s.volumeRatio >= strategy.filters.volumeMin!)
      }
      if (strategy.filters.signalStrength) {
        filtered = filtered.filter(s => 
          strategy.filters.signalStrength!.includes(s.signalStrength)
        )
      }
      if (strategy.filters.trend === 'bullish') {
        filtered = filtered.filter(s => s.trend24h && s.trend24h > 5)
      }
    }
    
    // Apply manual filters
    filtered = filtered.filter(s => 
      s.sentiment >= filters.sentimentMin &&
      s.sentiment <= filters.sentimentMax &&
      s.volumeRatio >= filters.volumeMin
    )
    
    if (filters.signalStrength.length > 0) {
      filtered = filtered.filter(s => 
        filters.signalStrength.includes(s.signalStrength)
      )
    }
    
    if (filters.trend !== 'all') {
      if (filters.trend === 'bullish') {
        filtered = filtered.filter(s => s.trend24h && s.trend24h > 0)
      } else if (filters.trend === 'bearish') {
        filtered = filtered.filter(s => s.trend24h && s.trend24h < 0)
      } else {
        filtered = filtered.filter(s => s.trend24h === null || Math.abs(s.trend24h) < 5)
      }
    }
    
    // Sort by signal strength (stars) descending
    filtered.sort((a, b) => b.signalStars - a.signalStars)
    
    setFilteredStocks(filtered)
  }

  const applyStrategy = (strategy: string) => {
    setFilters({ ...filters, strategy: strategy as ScreenerFilters['strategy'] })
  }

  const resetFilters = () => {
    setFilters({
      sentimentMin: 0,
      sentimentMax: 100,
      signalStrength: [],
      volumeMin: 0,
      trend: 'all',
      strategy: 'all'
    })
  }

  const getSignalBadge = (stars: number) => {
    const color = 
      stars >= 4 ? 'default' :
      stars >= 3 ? 'secondary' :
      'outline'
    
    return (
      <Badge variant={color} className="flex items-center gap-1">
        {Array.from({ length: stars }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-current" />
        ))}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Screener</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-sm text-muted-foreground text-center">
              <p className="font-semibold">Loading screener data...</p>
              <p className="text-xs mt-2">Analyzing 5 stocks with volume correlation</p>
              <p className="text-xs text-yellow-500 mt-1">⏱️ This may take 60-90 seconds (heavy processing)</p>
              <p className="text-xs text-orange-400 mt-2">💡 Reduced to 5 stocks for faster load times</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Sentiment Screener
          </CardTitle>
          <CardDescription>
            Find trading opportunities with advanced sentiment + volume filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="strategies" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="strategies">Trading Strategies</TabsTrigger>
              <TabsTrigger value="custom">Custom Filters</TabsTrigger>
            </TabsList>
            
            {/* Preset Strategies */}
            <TabsContent value="strategies" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(TRADING_STRATEGIES).map(([key, strategy]) => (
                  <Button
                    key={key}
                    variant={filters.strategy === key ? 'default' : 'outline'}
                    className="h-auto p-4 flex flex-col items-start"
                    onClick={() => applyStrategy(key)}
                  >
                    <span className="font-semibold mb-1">{strategy.name}</span>
                    <span className="text-xs text-muted-foreground text-left">
                      {strategy.description}
                    </span>
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            {/* Custom Filters */}
            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-4">
                {/* Sentiment Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Sentiment Score: {filters.sentimentMin} - {filters.sentimentMax}
                  </label>
                  <div className="flex gap-2">
                    <Slider
                      value={[filters.sentimentMin]}
                      onValueChange={(v: number[]) => setFilters({ ...filters, sentimentMin: v[0] })}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <Slider
                      value={[filters.sentimentMax]}
                      onValueChange={(v: number[]) => setFilters({ ...filters, sentimentMax: v[0] })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
                
                {/* Volume Ratio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Min Volume Ratio: {filters.volumeMin}x
                  </label>
                  <Slider
                    value={[filters.volumeMin]}
                    onValueChange={(v: number[]) => setFilters({ ...filters, volumeMin: v[0] })}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                </div>
                
                {/* Trend Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">24h Trend</label>
                  <Select
                    value={filters.trend}
                    onValueChange={(v) => setFilters({ ...filters, trend: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Trends</SelectItem>
                      <SelectItem value="bullish">📈 Bullish Only</SelectItem>
                      <SelectItem value="bearish">📉 Bearish Only</SelectItem>
                      <SelectItem value="neutral">➡️ Neutral Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={resetFilters} variant="outline" className="w-full">
                  Reset Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Results ({filteredStocks.length})</span>
            <Button variant="outline" size="sm" onClick={fetchScreenerData}>
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No stocks match your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredStocks.map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{stock.symbol}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getSignalBadge(stock.signalStars)}
                          <Badge variant={
                            stock.sentiment >= 70 ? 'default' :
                            stock.sentiment <= 30 ? 'destructive' :
                            'secondary'
                          }>
                            {stock.sentiment}/100
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right text-sm">
                        <div className={stock.trend24h && stock.trend24h > 0 ? 'text-green-500' : 'text-red-500'}>
                          {stock.trend24h !== null && (
                            <>
                              {stock.trend24h > 0 ? <TrendingUp className="inline h-4 w-4" /> : <TrendingDown className="inline h-4 w-4" />}
                              {stock.trend24h > 0 ? '+' : ''}{stock.trend24h.toFixed(0)}% (24h)
                            </>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          Vol: {stock.volumeRatio.toFixed(1)}x
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{stock.recommendation}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
