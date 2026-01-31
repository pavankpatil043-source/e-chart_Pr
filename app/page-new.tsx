"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { RefreshCw, Activity, Newspaper, Bot, ArrowUpRight, ArrowDownRight } from "lucide-react"
import RealLiveChart from "@/components/real-live-chart"
import { ChatPanel } from "@/components/chat-panel"
import { EnhancedNewsPanel } from "@/components/enhanced-news-panel"
import { FIIDIIDataPanel } from "@/components/fii-dii-data-panel"
import { AIInsightsDashboard } from "@/components/ai-insights-dashboard"
import { POPULAR_NIFTY_STOCKS } from "@/lib/nifty-50-stocks"

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

interface SelectedStock {
  symbol: string
  name: string
  sector: string
}

export default function TradingDashboard() {
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([])
  const [indicesLoading, setIndicesLoading] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  const [selectedStock, setSelectedStock] = useState<SelectedStock>(POPULAR_NIFTY_STOCKS[0])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1mo")

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

    try {
      setIndicesLoading(true)
      const response = await fetch("/api/indian-indices", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
      const data = await response.json()

      if (data.success && isComponentMountedRef.current && Array.isArray(data.indices)) {
        setMarketIndices(data.indices)
        setLastUpdateTime(new Date())
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
    fetchMarketIndices()
    intervalRef.current = setInterval(() => {
      if (isComponentMountedRef.current) fetchMarketIndices()
    }, 3000)

    return () => {
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

          {/* Live Market Indices - Clean Cards */}
          <div className="flex items-center gap-3">
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
                        {Math.abs(index.pChange).toFixed(2)}%
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
          </div>
        </div>
      </header>

      {/* Main Content - Clean 2-Column Layout */}
      <div className="flex gap-4 p-4 h-[calc(100vh-4.5rem)]">
        {/* Left: Charts & Analysis (68%) */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* FII/DII - Minimal Card */}
          <Card className="border-white/10 bg-[#131722]/50 backdrop-blur-sm p-5">
            <FIIDIIDataPanel />
          </Card>

          {/* Main Chart - Primary Focus */}
          <Card className="border-white/10 bg-[#131722]/50 backdrop-blur-sm p-5">
            <RealLiveChart 
              onStockChange={setSelectedStock}
              onTimeframeChange={setSelectedTimeframe}
            />
          </Card>

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
