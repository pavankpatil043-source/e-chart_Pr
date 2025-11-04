"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  BarChart3,
  Wifi,
  WifiOff,
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toYahooSymbol, toBaseSymbol } from "@/lib/nifty-50-stocks"

// TradingView Widget Types
declare global {
  interface Window {
    TradingView: any
  }
}

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  companyName: string
}

// Use Nifty 50 stocks with TradingView symbols
const STOCK_SYMBOLS = POPULAR_NIFTY_STOCKS.map(stock => ({
  symbol: stock.baseSymbol,
  name: stock.name,
  tvSymbol: `NSE:${stock.baseSymbol}`,
  yahooSymbol: stock.symbol
}))

export default function AdvancedTradingViewChart() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [interval, setInterval] = useState("5")
  
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  // Load TradingView script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      console.log("TradingView script loaded")
      createTradingViewWidget()
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Create TradingView widget
  const createTradingViewWidget = () => {
    if (!window.TradingView || !chartContainerRef.current) return

    const currentSymbol = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)
    
    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: currentSymbol?.tvSymbol || "NSE:RELIANCE",
        interval: interval + "m",
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1", // Candlestick
        locale: "en",
        toolbar_bg: "#1a1a1a",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: "tradingview-chart-container",
        studies: [
          "MASimple@tv-basicstudies",
          "Volume@tv-basicstudies"
        ],
        overrides: {
          "paneProperties.background": "#0f172a",
          "paneProperties.vertGridProperties.color": "#1e293b",
          "paneProperties.horzGridProperties.color": "#1e293b",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#94a3b8",
          "mainSeriesProperties.candleStyle.upColor": "#10b981",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444"
        }
      })
      
      setIsConnected(true)
    } catch (error) {
      console.error("Error creating TradingView widget:", error)
      setIsConnected(false)
    }
  }

  // Update widget symbol
  useEffect(() => {
    if (widgetRef.current && window.TradingView) {
      const currentSymbol = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)
      if (currentSymbol) {
        widgetRef.current.setSymbol(currentSymbol.tvSymbol, () => {
          console.log("Symbol updated:", currentSymbol.tvSymbol)
        })
      }
    }
  }, [selectedSymbol])

  // Update interval
  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.chart().setResolution(interval + "m", () => {
        console.log("Interval updated:", interval + "m")
      })
    }
  }, [interval])

  // Fetch live price data
  const fetchLivePrice = async (symbol: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/yahoo-quote?symbol=${symbol}.NS`)
      if (!response.ok) throw new Error("Failed to fetch price")
      
      const data = await response.json()
      if (data.success && data.data) {
        const company = STOCK_SYMBOLS.find(s => s.symbol === symbol)
        setStockData({
          symbol: symbol,
          price: data.data.price,
          change: data.data.change,
          changePercent: data.data.changePercent,
          volume: data.data.volume || 0,
          high: data.data.high || data.data.price * 1.02,
          low: data.data.low || data.data.price * 0.98,
          open: data.data.open || data.data.price * 0.999,
          companyName: company?.name || symbol
        })
        setLastUpdate(new Date())
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Error fetching live price:", error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch live prices
  useEffect(() => {
    fetchLivePrice(selectedSymbol)
    const priceInterval = setInterval(() => {
      fetchLivePrice(selectedSymbol)
    }, 3000) // Update every 3 seconds

    return () => clearInterval(priceInterval)
  }, [selectedSymbol])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price)
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}`
  }

  const formatPercentage = (percent: number) => {
    const sign = percent >= 0 ? "+" : ""
    return `${sign}${percent.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-400" />
            Live Trading Chart
          </h2>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Real-time data with advanced indicators
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-48 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {STOCK_SYMBOLS.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-slate-700">
                  {stock.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-24 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="1" className="text-white hover:bg-slate-700">1m</SelectItem>
              <SelectItem value="5" className="text-white hover:bg-slate-700">5m</SelectItem>
              <SelectItem value="15" className="text-white hover:bg-slate-700">15m</SelectItem>
              <SelectItem value="30" className="text-white hover:bg-slate-700">30m</SelectItem>
              <SelectItem value="60" className="text-white hover:bg-slate-700">1h</SelectItem>
            </SelectContent>
          </Select>

          <Badge className={isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "CONNECTED" : "DISCONNECTED"}
          </Badge>
        </div>
      </div>

      {/* Live Price Ticker */}
      {stockData && (
        <Card className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  {stockData.companyName}
                  <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    LIVE
                  </Badge>
                </h3>
                <p className="text-sm text-slate-400">{stockData.symbol}</p>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-white mb-1">
                  {formatPrice(stockData.price)}
                </div>
                <div className={`flex items-center text-sm font-medium ${
                  stockData.change >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {stockData.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {formatChange(stockData.change)} ({formatPercentage(stockData.changePercent)})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Open</p>
                <p className="text-sm font-semibold text-white">{formatPrice(stockData.open)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">High</p>
                <p className="text-sm font-semibold text-green-400">{formatPrice(stockData.high)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Low</p>
                <p className="text-sm font-semibold text-red-400">{formatPrice(stockData.low)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Volume</p>
                <p className="text-sm font-semibold text-white">
                  {stockData.volume.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TradingView Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              Professional Trading Chart
            </CardTitle>
            {lastUpdate && (
              <span className="text-xs text-slate-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div 
            id="tradingview-chart-container"
            ref={chartContainerRef}
            className="w-full h-[600px] rounded-lg overflow-hidden"
          />
          
          {loading && (
            <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-white">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading chart...</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Controls and Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Live Features</h4>
            </div>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• Real-time candlestick charts</li>
              <li>• Technical indicators (SMA, Volume)</li>
              <li>• Multiple timeframes (1m to 1h)</li>
              <li>• Professional chart interface</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Market Status</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Data Source:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  TradingView + Yahoo Finance
                </Badge>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Update Frequency:</span>
                <span className="text-green-400">3 seconds</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Chart Info</h4>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div>🟢 Green candles = Price up</div>
              <div>🔴 Red candles = Price down</div>
              <div>📊 Volume bars show trading activity</div>
              <div>📈 SMA lines show trend direction</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}