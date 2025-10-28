"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { RefreshCw, TrendingUp, TrendingDown, Newspaper, Bot, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react"
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
  
  // Shared state for stock selection and timeframe
  const [selectedStock, setSelectedStock] = useState<SelectedStock>(POPULAR_NIFTY_STOCKS[0])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1mo")

  // Initialize client-side to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Use refs to prevent infinite loops
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchMarketIndices = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    const now = Date.now()
    if (now - lastFetchTimeRef.current < 500) {
      return
    }
    lastFetchTimeRef.current = now

    if (!isComponentMountedRef.current) return

    try {
      setIndicesLoading(true)
      const response = await fetch("/api/indian-indices", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })
      const data = await response.json()

      if (data.success && isComponentMountedRef.current && Array.isArray(data.indices)) {
        setMarketIndices(data.indices)
        setLastUpdateTime(new Date())
      }
    } catch (error) {
      console.error("Error fetching market indices:", error)

      // Set fallback data on error
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
      if (isComponentMountedRef.current) {
        setIndicesLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isComponentMountedRef.current = true

    // Initial fetch
    fetchMarketIndices()

    // Set up interval for updates
    intervalRef.current = setInterval(() => {
      if (isComponentMountedRef.current) {
        fetchMarketIndices()
      }
    }, 3000) // Update every 3 seconds

    // Cleanup function
    return () => {
      isComponentMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchMarketIndices])

  // Format price with animation effect
  const formatPrice = (price: number, isPositive: boolean) => {
    return (
      <span className={`transition-all duration-300 ${isPositive ? "text-green-400" : "text-red-400"}`}>
        {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
      </span>
    )
  }

  const handleManualRefresh = useCallback(() => {
    fetchMarketIndices()
  }, [fetchMarketIndices])



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ECHART PRO</h1>
              <p className="text-sm text-white/70">Live NSE/BSE • Real-time News • AI Analytics</p>
            </div>
          </div>

          {/* Live Market Indices */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${indicesLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
              ></div>
              <span className="text-sm font-medium text-white">{indicesLoading ? "UPDATING..." : "LIVE MARKET"}</span>
              <span className="text-xs text-white/50">
                {lastUpdateTime && isClient && lastUpdateTime.toLocaleTimeString()}
              </span>
            </div>

            {/* Market Indices in Single Line */}
            <div className="flex items-center space-x-6">
              {marketIndices.slice(0, 4).map((index, i) => (
                <div key={`${index.symbol}-${i}`} className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-xs text-white/70 font-medium">{index.name}</div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-bold text-white transition-all duration-300">
                        {formatPrice(index.price, index.isPositive)}
                      </span>
                      <span
                        className={`text-xs flex items-center transition-all duration-300 ${
                          index.isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        <span
                          className={`inline-block transition-transform duration-300 ${
                            index.isPositive ? "rotate-45" : "-rotate-45"
                          }`}
                        >
                          {index.isPositive ? "↗" : "↘"}
                        </span>
                        <span className="ml-1">
                          {Math.abs(index.change).toFixed(2)} ({Math.abs(index.pChange).toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={handleManualRefresh}
              disabled={indicesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${indicesLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>


      </header>

      <div className="flex gap-4 p-4">
        {/* Left Column */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* FII DII Data Panel */}
          <FIIDIIDataPanel />

          {/* Live Trading Chart with TradingView */}
          <RealLiveChart 
            onStockChange={setSelectedStock}
            onTimeframeChange={setSelectedTimeframe}
          />
          
          {/* AI Insights Dashboard */}
          <AIInsightsDashboard 
            symbol={selectedStock.symbol} 
            timeframe={selectedTimeframe} 
          />
        </div>

        {/* Right Sidebar - Tabbed Interface */}
        <div className="w-96 flex-shrink-0">
          <Tabs defaultValue="news" className="h-full">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl h-[calc(100vh-6rem)]">
              {/* Tabs Header */}
              <div className="p-4 border-b border-white/10">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900/50">
                  <TabsTrigger value="news" className="flex items-center gap-2">
                    <Newspaper className="h-4 w-4" />
                    News
                  </TabsTrigger>
                  <TabsTrigger value="ai-chat" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Chat
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tabs Content */}
              <div className="h-[calc(100%-5rem)]">
                <TabsContent value="news" className="h-full m-0 p-4">
                  <EnhancedNewsPanel stockSymbol={selectedStock.symbol} />
                </TabsContent>
                
                <TabsContent value="ai-chat" className="h-full m-0 p-4">
                  <ChatPanel />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
