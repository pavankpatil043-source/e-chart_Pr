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
  Maximize2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toBaseSymbol } from "@/lib/nifty-50-stocks"

// TradingView widget types
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
  sector: string
  source: string
}

const TIMEFRAMES = [
  { value: "1", label: "1 Min", tvInterval: "1" },
  { value: "5", label: "5 Min", tvInterval: "5" },
  { value: "15", label: "15 Min", tvInterval: "15" },
  { value: "60", label: "1 Hour", tvInterval: "60" },
  { value: "D", label: "1 Day", tvInterval: "D" },
  { value: "W", label: "1 Week", tvInterval: "W" },
]

export default function TradingViewLiveChart() {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [timeframe, setTimeframe] = useState<string>("15")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load TradingView script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.TradingView) {
      const script = document.createElement("script")
      script.src = "https://s3.tradingview.com/tv.js"
      script.async = true
      script.onload = () => {
        console.log("✅ TradingView script loaded")
        setIsScriptLoaded(true)
      }
      script.onerror = () => {
        console.error("❌ Failed to load TradingView script")
      }
      document.head.appendChild(script)

      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    } else if (window.TradingView) {
      setIsScriptLoaded(true)
    }
  }, [])

  // Fetch live price data from Yahoo Finance API
  const fetchStockPrice = async (symbol: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/yahoo-quote?symbol=${symbol}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
          
          setStockData({
            symbol: toBaseSymbol(symbol),
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume || 0,
            high: data.high || data.price * 1.02,
            low: data.low || data.price * 0.98,
            open: data.open || data.price * 0.999,
            companyName: stock?.name || data.companyName || toBaseSymbol(symbol),
            sector: stock?.sector || "Unknown",
            source: data.source || "Yahoo Finance"
          })
          
          setIsConnected(true)
          setLastUpdate(new Date())
          console.log(`✅ Fetched price for ${symbol}: ₹${data.price}`)
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Update price periodically
  useEffect(() => {
    if (selectedStock) {
      fetchStockPrice(selectedStock.symbol)
      
      // Update every 5 seconds
      updateIntervalRef.current = setInterval(() => {
        fetchStockPrice(selectedStock.symbol)
      }, 5000)
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [selectedStock])

  // Initialize TradingView Chart Widget
  useEffect(() => {
    if (!isScriptLoaded || !chartContainerRef.current || !window.TradingView) return

    // Clear previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove()
      } catch (e) {
        console.log("Widget cleanup:", e)
      }
    }

    // Clear container
    if (chartContainerRef.current) {
      chartContainerRef.current.innerHTML = ""
    }

    const symbol = `NSE:${toBaseSymbol(selectedStock.symbol)}`
    console.log(`📊 Creating TradingView widget for ${symbol}`)

    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: timeframe,
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1", // Candlestick
        locale: "en",
        toolbar_bg: "#0f172a",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: chartContainerRef.current.id,
        studies: [
          "MASimple@tv-basicstudies",
          "Volume@tv-basicstudies"
        ],
        backgroundColor: "#1e293b",
        gridColor: "rgba(42, 46, 57, 0.5)",
        allow_symbol_change: false,
        details: true,
        hotlist: false,
        calendar: false,
        withdateranges: true,
        hide_side_toolbar: false,
        overrides: {
          "paneProperties.background": "#0f172a",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "#1e293b",
          "paneProperties.horzGridProperties.color": "#1e293b",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#94a3b8",
          "mainSeriesProperties.candleStyle.upColor": "#10b981",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
        },
        disabled_features: [
          "header_symbol_search",
          "symbol_search_hot_key",
          "header_compare",
          "compare_symbol",
        ],
        enabled_features: [
          "hide_left_toolbar_by_default",
        ],
      })

      console.log("✅ TradingView widget created")
    } catch (error) {
      console.error("❌ Error creating TradingView widget:", error)
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {
          console.log("Cleanup:", e)
        }
      }
    }
  }, [isScriptLoaded, selectedStock, timeframe])

  // Initialize TradingView Single Ticker for live price
  useEffect(() => {
    if (!isScriptLoaded || !tickerWidgetRef.current || !window.TradingView) return

    // Clear previous ticker
    if (tickerRef.current) {
      try {
        tickerRef.current.remove()
      } catch (e) {
        console.log("Ticker cleanup:", e)
      }
    }

    // Clear container
    if (tickerWidgetRef.current) {
      tickerWidgetRef.current.innerHTML = ""
    }

    const symbol = `NSE:${toBaseSymbol(selectedStock.symbol)}`
    console.log(`💹 Creating TradingView ticker for ${symbol}`)

    try {
      tickerRef.current = new window.TradingView.MediumWidget({
        symbols: [[selectedStock.name, symbol]],
        chartOnly: false,
        width: "100%",
        height: 220,
        locale: "en",
        colorTheme: "dark",
        isTransparent: false,
        showSymbolLogo: true,
        showFloatingTooltip: false,
        plotLineColorGrowing: "#10b981",
        plotLineColorFalling: "#ef4444",
        gridLineColor: "rgba(42, 46, 57, 0.5)",
        scaleFontColor: "rgba(120, 123, 134, 1)",
        belowLineFillColorGrowing: "rgba(16, 185, 129, 0.12)",
        belowLineFillColorFalling: "rgba(239, 68, 68, 0.12)",
        belowLineFillColorGrowingBottom: "rgba(16, 185, 129, 0)",
        belowLineFillColorFallingBottom: "rgba(239, 68, 68, 0)",
        symbolActiveColor: "rgba(255, 255, 255, 0.12)",
        container_id: tickerWidgetRef.current.id,
      })

      console.log("✅ TradingView ticker created")

      // Set mock data for display (TradingView will provide real data)
      setStockData({
        symbol: toBaseSymbol(selectedStock.symbol),
        companyName: selectedStock.name,
        sector: selectedStock.sector,
        price: 0,
        change: 0,
        changePercent: 0,
      })
    } catch (error) {
      console.error("❌ Error creating TradingView ticker:", error)
    }

    return () => {
      if (tickerRef.current) {
        try {
          tickerRef.current.remove()
        } catch (e) {
          console.log("Ticker cleanup:", e)
        }
      }
    }
  }, [isScriptLoaded, selectedStock])

  const handleStockChange = (symbol: string) => {
    const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      setSelectedStock(stock)
    }
  }

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
  }

  if (!isScriptLoaded) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900/50 rounded-lg">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-400" />
          <p className="text-white">Loading TradingView Charts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-7 w-7 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">TradingView Live Chart</h2>
              <p className="text-sm text-slate-400">Real-time data from TradingView</p>
            </div>
          </div>
          
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
            <Activity className="h-3 w-3 mr-1" />
            TradingView Live
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedStock.symbol} onValueChange={handleStockChange}>
            <SelectTrigger className="w-56 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-96 overflow-y-auto">
              {NIFTY_50_STOCKS.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{stock.baseSymbol}</span>
                    <span className="text-xs text-slate-400">{stock.sector}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-24 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="1" className="text-white hover:bg-slate-700">1m</SelectItem>
              <SelectItem value="5" className="text-white hover:bg-slate-700">5m</SelectItem>
              <SelectItem value="15" className="text-white hover:bg-slate-700">15m</SelectItem>
              <SelectItem value="60" className="text-white hover:bg-slate-700">1h</SelectItem>
              <SelectItem value="D" className="text-white hover:bg-slate-700">1D</SelectItem>
              <SelectItem value="W" className="text-white hover:bg-slate-700">1W</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=NSE:${toBaseSymbol(selectedStock.symbol)}`, '_blank')}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Full Screen
          </Button>
        </div>
      </div>

      {/* Live Price Ticker from TradingView */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div
            id={`tradingview-ticker-${selectedStock.symbol}`}
            ref={tickerWidgetRef}
            className="w-full"
            style={{ minHeight: "220px" }}
          />
        </CardContent>
      </Card>

      {/* Stock Info */}
      {stockData && (
        <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{stockData.companyName}</h3>
                <div className="flex items-center space-x-2 text-slate-400 text-sm">
                  <span>{stockData.symbol}</span>
                  <span>•</span>
                  <span>{stockData.sector}</span>
                  <span>•</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    NSE
                  </Badge>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Real-time by TradingView
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main TradingView Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-400" />
            Advanced Candlestick Chart
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <div
            id={`tradingview-chart-${selectedStock.symbol}-${timeframe}`}
            ref={chartContainerRef}
            className="w-full"
            style={{ height: "600px" }}
          />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Live Data from TradingView</h4>
              <p className="text-sm text-slate-300">
                This chart displays <strong>real-time price data</strong> directly from TradingView. 
                Prices are accurate and stable - they won't change on page refresh unless the actual 
                market price has changed. All Nifty 50 stocks are available with full technical analysis tools.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
