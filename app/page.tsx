"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { RefreshCw, Activity, Newspaper, Bot, ArrowUpRight, ArrowDownRight, Brain, Sparkles, BarChart3, Clock } from "lucide-react"
import RealLiveChart from "@/components/real-live-chart"
import { ChatPanel } from "@/components/chat-panel"
import { EnhancedNewsPanel } from "@/components/enhanced-news-panel"
import { FIIDIIDataPanel } from "@/components/fii-dii-data-panel"
import { FIIDIIDataPanelEnhanced } from "@/components/fii-dii-data-panel-enhanced"
import { AIInsightsDashboard } from "@/components/ai-insights-dashboard"
import { VisualAIChartAnalysis } from "@/components/visual-ai-chart-analysis"
import { POPULAR_NIFTY_STOCKS } from "@/lib/nifty-50-stocks"

// Market Status Badge Component
function MarketStatusBadge() {
  const [isMarketOpen, setIsMarketOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState("")

  // NSE/BSE Holiday list for 2025 (update annually)
  const MARKET_HOLIDAYS_2025 = [
    '2025-01-26', // Republic Day
    '2025-03-14', // Holi
    '2025-03-31', // Id-Ul-Fitr
    '2025-04-10', // Mahavir Jayanti
    '2025-04-14', // Dr. Ambedkar Jayanti
    '2025-04-18', // Good Friday
    '2025-05-01', // Maharashtra Day
    '2025-06-07', // Bakri Id
    '2025-08-15', // Independence Day
    '2025-08-27', // Ganesh Chaturthi
    '2025-10-02', // Gandhi Jayanti / Dussehra
    '2025-10-21', // Diwali (Laxmi Pujan)
    '2025-10-22', // Diwali (Balipratipada)
    '2025-11-05', // Guru Nanak Jayanti
    '2025-12-25', // Christmas
  ]

  const checkMarketStatus = () => {
    const now = new Date()
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    
    const dayOfWeek = istTime.getDay() // 0 = Sunday, 6 = Saturday
    const hours = istTime.getHours()
    const minutes = istTime.getMinutes()
    const currentTime = hours * 60 + minutes
    
    // Market hours: 9:15 AM to 3:30 PM IST
    const marketOpen = 9 * 60 + 15  // 555 minutes
    const marketClose = 15 * 60 + 30 // 930 minutes
    
    // Weekend check
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }
    
    // Holiday check
    const dateString = istTime.toISOString().split('T')[0]
    if (MARKET_HOLIDAYS_2025.includes(dateString)) {
      return false
    }
    
    // Trading hours check
    return currentTime >= marketOpen && currentTime <= marketClose
  }

  useEffect(() => {
    const updateStatus = () => {
      setIsMarketOpen(checkMarketStatus())
      const now = new Date()
      const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
      setCurrentTime(istTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }))
    }
    
    updateStatus()
    const interval = setInterval(updateStatus, 1000) // Update every second for time display
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-center gap-2 transition-all ${
      isMarketOpen ? 'text-green-400' : 'text-red-400'
    }`}>
      <Clock className="h-4 w-4" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider">
          {isMarketOpen ? 'Market Open' : 'Market Closed'}
        </div>
        <div className="text-xs font-medium text-slate-300 tabular-nums">
          {currentTime}
        </div>
      </div>
    </div>
  )
}

interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  pChange: number
  isPositive: boolean
  lastUpdate: number
  source: string
}

interface GiftNiftyData {
  price: number
  change: number
  pChange: number
  isPositive: boolean
  lastUpdate: number
  source: string
}

interface SelectedStock {
  symbol: string
  name: string
  sector: string
}

export default function TradingDashboard() {
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([])
  const [giftNifty, setGiftNifty] = useState<GiftNiftyData | null>(null)
  const [indicesLoading, setIndicesLoading] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  const [selectedStock, setSelectedStock] = useState<SelectedStock>(POPULAR_NIFTY_STOCKS[0])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1mo")
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [currentStockData, setCurrentStockData] = useState({
    price: 0,
    previousClose: 0,
    change: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    volume: 0
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchMarketIndices = useCallback(async () => {
    const now = Date.now()
    if (now - lastFetchTimeRef.current < 500) return
    lastFetchTimeRef.current = now
    if (!isComponentMountedRef.current) return

    console.log('🔄 Fetching market data at:', new Date().toLocaleTimeString())

    try {
      setIndicesLoading(true)
      
      // Fetch both market indices and Gift Nifty in parallel with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const [indicesResponse, giftNiftyResponse] = await Promise.all([
        fetch("/api/indian-indices", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          signal: controller.signal,
        }).catch(err => {
          console.warn("Indian indices API failed:", err.message)
          return null
        }),
        fetch("/api/gift-nifty", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
          signal: controller.signal,
        }).catch(err => {
          console.warn("Gift Nifty API failed:", err.message)
          return null
        })
      ])
      
      clearTimeout(timeoutId)
      
      // Safely parse responses
      const indicesData = indicesResponse ? await indicesResponse.json().catch(() => ({ success: false })) : { success: false }
      const giftNiftyData = giftNiftyResponse ? await giftNiftyResponse.json().catch(() => ({ success: false })) : { success: false }

      if (indicesData.success && isComponentMountedRef.current && Array.isArray(indicesData.indices)) {
        setMarketIndices(indicesData.indices)
        setLastUpdateTime(new Date())
      }
      
      if (giftNiftyData.success && isComponentMountedRef.current && giftNiftyData.data) {
        setGiftNifty(giftNiftyData.data)
      }
    } catch (error) {
      console.error("Error fetching market indices:", error)
      if (isComponentMountedRef.current) {
        const fallbackData = [
          {
            symbol: "NIFTY",
            name: "Nifty 50",
            price: 24781.1 + (Math.random() - 0.5) * 100,
            change: 125.5 + (Math.random() - 0.5) * 50,
            pChange: 0.51 + (Math.random() - 0.5) * 0.5,
            isPositive: Math.random() > 0.5,
            lastUpdate: Date.now(),
            source: "Simulated Data",
          },
          {
            symbol: "BANKNIFTY",
            name: "Bank Nifty",
            price: 51667.75 + (Math.random() - 0.5) * 200,
            change: -245.3 + (Math.random() - 0.5) * 100,
            pChange: -0.48 + (Math.random() - 0.5) * 0.3,
            isPositive: Math.random() > 0.5,
            lastUpdate: Date.now(),
            source: "Simulated Data",
          },
          {
            symbol: "FINNIFTY",
            name: "Fin Nifty",
            price: 23456.8 + (Math.random() - 0.5) * 150,
            change: 89.75 + (Math.random() - 0.5) * 40,
            pChange: 0.38 + (Math.random() - 0.5) * 0.2,
            isPositive: Math.random() > 0.5,
            lastUpdate: Date.now(),
            source: "Simulated Data",
          },
          {
            symbol: "SENSEX",
            name: "Sensex",
            price: 82365.77 + (Math.random() - 0.5) * 300,
            change: 156.8 + (Math.random() - 0.5) * 80,
            pChange: 0.19 + (Math.random() - 0.5) * 0.15,
            isPositive: Math.random() > 0.5,
            lastUpdate: Date.now(),
            source: "Simulated Data",
          },
        ]
        setMarketIndices(fallbackData)
        setLastUpdateTime(new Date())
      }
    } finally {
      if (isComponentMountedRef.current) setIndicesLoading(false)
    }
  }, [])

  useEffect(() => {
    isComponentMountedRef.current = true
    console.log('⏰ Setting up 3-second auto-refresh interval')
    fetchMarketIndices()
    intervalRef.current = setInterval(() => {
      if (isComponentMountedRef.current) fetchMarketIndices()
    }, 3000) // Poll every 3 seconds - real-time stock price updates

    return () => {
      console.log('🛑 Cleaning up interval')
      isComponentMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchMarketIndices])

  const handleManualRefresh = useCallback(() => {
    fetchMarketIndices()
  }, [fetchMarketIndices])

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      {/* Ultra-Minimal Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0e1a]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo - Simple & Clean */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ECHART</span>
          </div>

          {/* Market Status Badge */}
          <MarketStatusBadge />

          {/* Market Data Container - Gift Nifty First, then Indices */}
          <div className="flex items-center gap-3">
            {/* Gift Nifty - Pre-Market Indicator (First Position) */}
            {giftNifty && (
              <div className="group">
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-4 py-2.5 backdrop-blur-sm transition-all hover:border-amber-400/50 hover:from-amber-500/20 hover:to-orange-500/20 shadow-lg shadow-amber-500/10">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Gift Nifty
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-white tabular-nums">
                        {giftNifty.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${giftNifty.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {giftNifty.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {giftNifty.isPositive ? "+" : "-"}{Math.abs(giftNifty.change).toFixed(2)} ({Math.abs(giftNifty.pChange).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Market Indices - Clean Cards */}
            {marketIndices.slice(0, 4).map((index, i) => (
              <div key={`${index.symbol}-${i}`} className="group">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-white/50">{index.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold text-white tabular-nums">
                        {index.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${index.isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {index.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {index.isPositive ? "+" : "-"}{Math.abs(index.change).toFixed(2)} ({Math.abs(index.pChange).toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
              onClick={handleManualRefresh}
              disabled={indicesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${indicesLoading ? "animate-spin" : ""}`} />
            </Button>

            {/* AI Chart Analysis Button - Right Corner with Blinking Highlight */}
            <Button
              onClick={() => setShowAIAnalysis(!showAIAnalysis)}
              className="relative bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-purple-500/25 border border-purple-400/20 transition-all hover:shadow-purple-500/40 hover:scale-105 animate-pulse"
            >
              {/* Blinking glow ring */}
              <span className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg blur opacity-75 animate-pulse"></span>
              
              {/* Button content */}
              <span className="relative flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 animate-bounce" />
                AI Visual Analysis
                <Sparkles className="h-3 w-3 ml-2 animate-spin" />
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Clean 2-Column Layout */}
      <div className="flex gap-4 p-4 h-[calc(100vh-4.5rem)]">
        {/* Left: Charts & Analysis (68%) */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Main Chart - Primary Focus */}
          <Card className="border-white/10 bg-[#131722]/50 backdrop-blur-sm p-5">
            <RealLiveChart 
              onStockChange={setSelectedStock}
              onTimeframeChange={setSelectedTimeframe}
              onDataUpdate={setCurrentStockData}
            />
          </Card>

          {/* FII/DII - Enhanced Card with AI Analysis */}
          <Card className="border-white/10 bg-[#131722]/50 backdrop-blur-sm p-5">
            <FIIDIIDataPanelEnhanced />
          </Card>

          {/* AI Chart Analysis Modal - Full Screen */}
          {showAIAnalysis && currentStockData.price > 0 && (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="h-full w-full overflow-y-auto">
                <div className="container mx-auto p-4 max-w-7xl">
                  <VisualAIChartAnalysis
                    symbol={selectedStock.symbol}
                    currentPrice={currentStockData.price}
                    previousClose={currentStockData.previousClose}
                    change={currentStockData.change}
                    changePercent={currentStockData.changePercent}
                    high={currentStockData.high}
                    low={currentStockData.low}
                    volume={currentStockData.volume}
                    timeframe={selectedTimeframe}
                    onClose={() => setShowAIAnalysis(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <Card className="border-white/10 bg-[#131722]/50 backdrop-blur-sm p-5">
            <AIInsightsDashboard 
              symbol={selectedStock.symbol} 
              timeframe={selectedTimeframe} 
            />
          </Card>
        </div>

        {/* Right: News & AI Panel (32%) */}
        <div className="w-[420px] flex-shrink-0">
          <Card className="h-full border-white/10 bg-[#131722]/50 backdrop-blur-sm overflow-hidden">
            <Tabs defaultValue="news" className="flex h-full flex-col">
              {/* Tab Headers - Sleek Design */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <TabsList className="bg-white/5 p-1 rounded-lg">
                  <TabsTrigger 
                    value="news" 
                    className="gap-2 rounded-md px-4 py-2 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                  >
                    <Newspaper className="h-4 w-4" />
                    <span className="font-medium">News</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="ai" 
                    className="gap-2 rounded-md px-4 py-2 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                  >
                    <Bot className="h-4 w-4" />
                    <span className="font-medium">AI</span>
                  </TabsTrigger>
                </TabsList>

                {/* Live Dot */}
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <span className="text-xs font-medium text-emerald-400">LIVE</span>
                </div>
              </div>

              {/* Tab Content - Full Height */}
              <div className="flex-1 overflow-hidden">
                <TabsContent value="news" className="h-full m-0 p-5 overflow-y-auto">
                  <EnhancedNewsPanel stockSymbol={selectedStock.symbol} />
                </TabsContent>
                
                <TabsContent value="ai" className="h-full m-0 p-5">
                  <ChatPanel />
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  )
}
