"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, TrendingUp, TrendingDown, Minus, Info } from "lucide-react"

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

export function SocialSentimentHeatmap() {
  const [stocks, setStocks] = useState<StockSentiment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [selectedStock, setSelectedStock] = useState<StockSentiment | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const isLoadingRef = useRef(false) // Prevent duplicate loads in React StrictMode

  useEffect(() => {
    // Prevent duplicate execution in React StrictMode (development double-render)
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping duplicate load (StrictMode)')
      return
    }
    isLoadingRef.current = true
    fetchHeatmapIncremental()
  }, [])

  const fetchHeatmapIncremental = async () => {
    setLoading(true)
    setStocks([])
    setLoadingProgress(0)
    console.log('🔥 Loading stocks incrementally (10 stocks every 10-20 seconds)...')

    try {
      // Define batches: Load 10 stocks at a time
      const batches = [
        // Batch 1: Top 10 blue-chips (most important - load first)
        ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 
         'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS', 'LT.NS'],
        
        // Batch 2: Next 10 popular stocks
        ['HINDUNILVR.NS', 'MARUTI.NS', 'BAJFINANCE.NS', 'AXISBANK.NS', 'BAJAJFINSV.NS',
         'HDFCLIFE.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'ASIANPAINT.NS'],
        
        // Batch 3: FMCG & Auto
        ['BRITANNIA.NS', 'DABUR.NS', 'NESTLEIND.NS', 'TATAMOTORS.NS', 'M&M.NS',
         'HEROMOTOCO.NS', 'EICHERMOT.NS', 'SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS'],
        
        // Batch 4: Pharma & Energy
        ['DIVISLAB.NS', 'COALINDIA.NS', 'POWERGRID.NS', 'NTPC.NS', 'ONGC.NS',
         'BPCL.NS', 'ZOMATO.NS', 'PAYTM.NS', 'NYKAA.NS', 'POLICYBZR.NS'],
        
        // Batch 5: New-age tech & Adani
        ['CARTRADE.NS', 'ADANIENT.NS', 'ADANIPORTS.NS', 'ADANIGREEN.NS', 'ADANITRANS.NS',
         'ADANIPOWER.NS', 'INDUSINDBK.NS', 'DMART.NS', 'PIDILITIND.NS', 'GODREJCP.NS'],
        
        // Batch 6: Remaining stocks
        ['M&MFIN.NS', 'TITAN.NS']
      ]

      // Load each batch sequentially, display as it arrives
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const batchNumber = i + 1
        
        console.log(`� Loading batch ${batchNumber}/${batches.length} (${batch.length} stocks)...`)
        
        // Fetch this batch
        const symbolsParam = batch.join(',')
        const response = await fetch(`/api/sentiment-heatmap?symbols=${symbolsParam}`)
        const data = await response.json()

        if (data.success && data.data) {
          // Append this batch to existing stocks (with de-duplication)
          setStocks(prevStocks => {
            // Get existing symbols to prevent duplicates
            const existingSymbols = new Set(prevStocks.map(s => s.symbol))
            
            // Only add stocks that don't already exist
            const newUniqueStocks = data.data.filter((stock: StockSentiment) => 
              !existingSymbols.has(stock.symbol)
            )
            
            const newStocks = [...prevStocks, ...newUniqueStocks]
            console.log(`✅ Loaded batch ${batchNumber}: ${newUniqueStocks.length} new stocks (Total: ${newStocks.length})`)
            return newStocks
          })
          
          // Update progress
          const totalStocks = batches.reduce((sum, b) => sum + b.length, 0)
          const loadedStocks = batches.slice(0, i + 1).reduce((sum, b) => sum + b.length, 0)
          const progress = Math.round((loadedStocks / totalStocks) * 100)
          setLoadingProgress(progress)
          
          // If this is the first batch, mark initial loading as complete
          if (i === 0) {
            setLoading(false)
            setLastUpdated(new Date())
          }
        }

        // Small delay between batches (except last one)
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      console.log(`✅ All stocks loaded!`)
      setLoadingProgress(100)
      setLastUpdated(new Date())

    } catch (error) {
      console.error('❌ Failed to fetch incremental heatmap:', error)
      setLoading(false)
    }
  }

  const fetchHeatmap = async () => {
    // Manual refresh reloads incrementally
    fetchHeatmapIncremental()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Market Sentiment Heatmap
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loadingProgress < 100 && loadingProgress > 0 
              ? `📊 Loading more stocks... ${loadingProgress}% complete (${stocks.length}/52 loaded)`
              : loadingProgress === 100 
                ? '✅ All 52 stocks loaded with full sentiment data'
                : 'Real-time social and news sentiment across 52 Indian stocks'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loadingProgress > 0 && loadingProgress < 100 && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {loadingProgress}%
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            onClick={fetchHeatmap}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-blue-500/30"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="border-white/10 bg-white/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-green-400">Bullish (70-100)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <span className="text-yellow-400">Neutral (40-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-red-400">Bearish (0-39)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heatmap Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="border-white/10">
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {stocks.map((stock) => (
            <Card
              key={stock.symbol}
              className="border-white/10 hover:border-white/30 transition-all cursor-pointer group relative overflow-hidden"
              style={{
                borderColor: `${stock.color}30`,
                backgroundColor: `${stock.color}08`
              }}
              onClick={() => setSelectedStock(stock)}
            >
              {/* Hover glow effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{
                  background: `radial-gradient(circle at center, ${stock.color}, transparent 70%)`
                }}
              />

              <CardContent className="p-4 relative">
                <div className="flex flex-col items-center text-center space-y-2">
                  {/* Stock name */}
                  <h3 className="font-bold text-sm truncate w-full">{stock.name}</h3>
                  
                  {/* Sentiment score */}
                  <div className="text-4xl font-bold" style={{ color: stock.color }}>
                    {stock.score}
                  </div>
                  
                  {/* Emoji */}
                  <div className="text-3xl">{stock.emoji}</div>
                  
                  {/* Trend */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {stock.score >= 50 ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span>{stock.trend}</span>
                  </div>

                  {/* Breakdown mini */}
                  <div className="flex gap-2 text-xs w-full justify-center">
                    <span className="text-blue-400" title="News Score">
                      📰 {stock.breakdown.news}
                    </span>
                    <span className="text-purple-400" title="Social Score">
                      💬 {stock.breakdown.social}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Modal */}
      {selectedStock && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedStock(null)}
        >
          <Card
            className="max-w-2xl w-full border-white/20"
            style={{ borderColor: `${selectedStock.color}40` }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedStock.name}</CardTitle>
                  <p className="text-muted-foreground text-sm mt-1">{selectedStock.symbol}</p>
                </div>
                <div className="text-5xl">{selectedStock.emoji}</div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-6xl font-bold mb-2" style={{ color: selectedStock.color }}>
                  {selectedStock.score}
                </div>
                <Badge
                  variant="outline"
                  className="text-lg px-4 py-1"
                  style={{
                    borderColor: selectedStock.color,
                    color: selectedStock.color
                  }}
                >
                  {selectedStock.sentiment.toUpperCase()}
                </Badge>
              </div>

              {/* Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Sentiment Breakdown
                </h3>
                
                {/* News Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">📰 News Sentiment (25% weight)</span>
                    <span className="font-bold">{selectedStock.breakdown.news}/100</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${selectedStock.breakdown.news}%` }}
                    />
                  </div>
                </div>

                {/* Social Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">💬 Social Media (10% weight)</span>
                    <span className="font-bold">{selectedStock.breakdown.social}/100</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${selectedStock.breakdown.social}%` }}
                    />
                  </div>
                </div>

                {/* Price Action */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">📈 Price Action (65% weight)</span>
                    <span className="font-bold">{selectedStock.breakdown.price}/100</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${selectedStock.breakdown.price}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: selectedStock.color }}>
                    {selectedStock.change}
                  </div>
                  <div className="text-xs text-muted-foreground">Price Change</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {selectedStock.trend}
                  </div>
                  <div className="text-xs text-muted-foreground">Social Activity</div>
                </div>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setSelectedStock(null)}
                className="w-full"
                variant="outline"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
