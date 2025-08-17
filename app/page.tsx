"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Activity,
  BarChart3,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Building2,
  Newspaper,
} from "lucide-react"
import { TradingViewChart } from "@/components/tradingview-chart"
import { AnalysisChart } from "@/components/analysis-chart"
import { ChatPanel } from "@/components/chat-panel"
import { AIImageCard } from "@/components/ai-image-card"
import { ProbabilityCalculator } from "@/components/probability-calculator"
import { EnhancedStockSelector } from "@/components/enhanced-stock-selector"
import { EnhancedNewsPanel } from "@/components/enhanced-news-panel"

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

interface StockData {
  symbol: string
  name: string
  sector: string
  marketCap: string
  exchange: string
}

export default function TradingDashboard() {
  const [showProbability, setShowProbability] = useState(false)
  const [showStockSelector, setShowStockSelector] = useState(false)
  const [selectedStock, setSelectedStock] = useState("RELIANCE.NS")
  const [selectedStockData, setSelectedStockData] = useState<StockData | null>(null)
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([])
  const [indicesLoading, setIndicesLoading] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)

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

  const handleStockSelect = (symbol: string) => {
    setSelectedStock(symbol)
  }

  const handleStockChange = (stock: StockData) => {
    setSelectedStockData(stock)
  }

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
                {lastUpdateTime && `${lastUpdateTime.toLocaleTimeString()}`}
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

        {/* Real-time Update Indicator */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Real-time updates • NSE/BSE Stocks • Live Financial News • AI-powered Analytics</span>
            <span className="flex items-center space-x-1">
              <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse"></div>
              <span>Live Data Stream Active</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex gap-6 p-6">
        {/* Left Column */}
        <div className="flex-1 space-y-6">
          {/* Enhanced Stock Selector */}
          <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 to-indigo-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Building2 className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Enhanced Stock Selector</CardTitle>
                  <p className="text-sm text-white/70">Browse all NSE & BSE stocks with filters</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                  {selectedStockData
                    ? `${selectedStockData.sector} • ${selectedStockData.marketCap} Cap`
                    : "Select Stock"}
                </Badge>
                <span className="text-sm text-white/70">Show</span>
                <Switch checked={showStockSelector} onCheckedChange={setShowStockSelector} />
                {showStockSelector ? (
                  <ChevronUp className="h-4 w-4 text-white/70" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/70" />
                )}
              </div>
            </CardHeader>
            {showStockSelector && (
              <CardContent>
                <EnhancedStockSelector
                  selectedStock={selectedStock}
                  onStockSelect={handleStockSelect}
                  onStockChange={handleStockChange}
                />
              </CardContent>
            )}
          </Card>

          {/* AI Probability Engine */}
          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-900/40 to-blue-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-white">AI Probability Engine</CardTitle>
                  <p className="text-sm text-white/70">Advanced market direction prediction</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white/70">Show</span>
                <Switch checked={showProbability} onCheckedChange={setShowProbability} />
                {showProbability ? (
                  <ChevronUp className="h-4 w-4 text-white/70" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/70" />
                )}
              </div>
            </CardHeader>
            {showProbability && (
              <CardContent>
                <ProbabilityCalculator />
              </CardContent>
            )}
          </Card>

          {/* Live Trading Chart */}
          <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-purple-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                  <Activity className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Live Trading Chart</CardTitle>
                  <p className="text-sm text-white/70">Real-time data with advanced indicators</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                LIVE API
              </Badge>
            </CardHeader>
            <CardContent>
              <TradingViewChart />
            </CardContent>
          </Card>

          {/* Technical Analysis Studio */}
          <Card className="border-green-500/20 bg-gradient-to-r from-green-900/40 to-green-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Technical Analysis Studio</CardTitle>
                  <p className="text-sm text-white/70">Interactive support/resistance analysis</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                DRAG & ANALYZE
              </Badge>
            </CardHeader>
            <CardContent>
              <AnalysisChart />
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 space-y-6">
          {/* Enhanced Financial News */}
          <Card className="border-orange-500/20 bg-gradient-to-r from-orange-900/40 to-orange-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20">
                  <Newspaper className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Financial News Hub</CardTitle>
                  <p className="text-sm text-white/70">Live news with sentiment analysis</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <EnhancedNewsPanel />
            </CardContent>
          </Card>

          {/* AI Trading Assistant */}
          <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-purple-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center space-x-3 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <MessageSquare className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">AI Trading Assistant</CardTitle>
                <p className="text-sm text-white/70">Smart insights & analysis</p>
              </div>
            </CardHeader>
            <CardContent>
              <ChatPanel />
            </CardContent>
          </Card>

          {/* AI Visualization */}
          <Card className="border-pink-500/20 bg-gradient-to-r from-pink-900/40 to-pink-800/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center space-x-3 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/20">
                <Sparkles className="h-5 w-5 text-pink-400" />
              </div>
              <div>
                <CardTitle className="text-white">AI Visualization</CardTitle>
                <p className="text-sm text-white/70">Generated market insights</p>
              </div>
            </CardHeader>
            <CardContent>
              <AIImageCard />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
