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
  Play,
  Pause,
  Volume2,
  Maximize,
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toYahooSymbol, toBaseSymbol } from "@/lib/nifty-50-stocks"

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
  marketCap?: string
}

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Use Nifty 50 stocks with TradingView symbols
const STOCK_SYMBOLS = POPULAR_NIFTY_STOCKS.map(stock => ({
  symbol: stock.baseSymbol,
  name: stock.name,
  tvSymbol: `NSE:${stock.baseSymbol}`,
  sector: stock.sector,
  yahooSymbol: stock.symbol
}))

const TIMEFRAMES = [
  { value: "1", label: "1m", interval: "1m" },
  { value: "5", label: "5m", interval: "5m" },
  { value: "15", label: "15m", interval: "15m" },
  { value: "30", label: "30m", interval: "30m" },
  { value: "60", label: "1h", interval: "1h" },
  { value: "240", label: "4h", interval: "4h" },
  { value: "D", label: "1D", interval: "1D" },
]

export default function ProfessionalTradingChart() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [interval, setInterval] = useState("5")
  const [isPlaying, setIsPlaying] = useState(true)
  const [tradingViewLoaded, setTradingViewLoaded] = useState(false)
  const [showVolume, setShowVolume] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const fallbackChartRef = useRef<HTMLCanvasElement>(null)
  const widgetRef = useRef<any>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load TradingView script and create widget
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      console.log("✅ TradingView script loaded successfully")
      setTradingViewLoaded(true)
      setTimeout(createTradingViewWidget, 500) // Small delay for DOM readiness
    }
    script.onerror = () => {
      console.log("❌ TradingView script failed to load, using fallback chart")
      setTradingViewLoaded(false)
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
      if (widgetRef.current) {
        widgetRef.current = null
      }
    }
  }, [])

  // Create TradingView widget with enhanced configuration
  const createTradingViewWidget = () => {
    if (!window.TradingView || !chartContainerRef.current) return

    const currentSymbol = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)
    
    try {
      // Clear previous widget
      if (widgetRef.current) {
        widgetRef.current = null
      }

      // Clear container
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = ""
      }

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: currentSymbol?.tvSymbol || "NSE:RELIANCE",
        interval: interval === "D" ? "1D" : interval + "m",
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1", // Candlestick
        locale: "en",
        toolbar_bg: "#0f172a",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: "tradingview-professional-chart",
        studies: [
          "MASimple@tv-basicstudies",
          showVolume ? "Volume@tv-basicstudies" : "",
          "RSI@tv-basicstudies",
          "MACD@tv-basicstudies"
        ].filter(Boolean),
        overrides: {
          "paneProperties.background": "#0f172a",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "#1e293b",
          "paneProperties.horzGridProperties.color": "#1e293b",
          "symbolWatermarkProperties.transparency": 90,
          "scalesProperties.textColor": "#94a3b8",
          "scalesProperties.lineColor": "#334155",
          
          // Candlestick colors
          "mainSeriesProperties.candleStyle.upColor": "#10b981",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#10b981",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
          
          // Volume colors
          "volume.volume.color.0": "#ef444450",
          "volume.volume.color.1": "#10b98150",
          
          // Moving averages
          "studies.MA Cross.ma1.color": "#3b82f6",
          "studies.MA Cross.ma2.color": "#f59e0b",
          
          // Grid and background
          "chartProperties.background": "#0f172a",
          "chartProperties.gridProperties.color": "#1e293b",
        },
        studies_overrides: {
          "volume.volume.color.0": "#ef444450",
          "volume.volume.color.1": "#10b98150",
        },
        loading_screen: {
          backgroundColor: "#0f172a",
          foregroundColor: "#94a3b8"
        },
        custom_css_url: "/tradingview-custom.css",
        debug: false,
      })
      
      setIsConnected(true)
      console.log("✅ TradingView widget created successfully")
    } catch (error) {
      console.error("❌ Error creating TradingView widget:", error)
      setIsConnected(false)
      setTradingViewLoaded(false)
    }
  }

  // Update widget symbol when changed
  useEffect(() => {
    if (widgetRef.current && window.TradingView && tradingViewLoaded) {
      const currentSymbol = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)
      if (currentSymbol) {
        try {
          widgetRef.current.setSymbol(currentSymbol.tvSymbol, () => {
            console.log("✅ Symbol updated:", currentSymbol.tvSymbol)
          })
        } catch (error) {
          console.error("❌ Error updating symbol:", error)
        }
      }
    }
  }, [selectedSymbol, tradingViewLoaded])

  // Update interval when changed
  useEffect(() => {
    if (widgetRef.current && tradingViewLoaded) {
      try {
        const resolution = interval === "D" ? "1D" : interval + "m"
        widgetRef.current.chart().setResolution(resolution, () => {
          console.log("✅ Interval updated:", resolution)
        })
      } catch (error) {
        console.error("❌ Error updating interval:", error)
      }
    }
  }, [interval, tradingViewLoaded])

  // Fetch live price and chart data
  const fetchLiveData = async (symbol: string) => {
    try {
      setLoading(true)
      
      // Fetch live price
      const priceResponse = await fetch(`/api/yahoo-quote?symbol=${symbol}.NS`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json()
        if (priceData.success && priceData.data) {
          const company = STOCK_SYMBOLS.find(s => s.symbol === symbol)
          setStockData({
            symbol: symbol,
            price: priceData.data.price,
            change: priceData.data.change,
            changePercent: priceData.data.changePercent,
            volume: priceData.data.volume || 0,
            high: priceData.data.high || priceData.data.price * 1.02,
            low: priceData.data.low || priceData.data.price * 0.98,
            open: priceData.data.open || priceData.data.price * 0.999,
            companyName: company?.name || symbol,
            marketCap: priceData.data.marketCap
          })
          setLastUpdate(new Date())
          setIsConnected(true)
        }
      }

      // Fetch chart data for fallback
      if (!tradingViewLoaded) {
        const chartResponse = await fetch(`/api/yahoo-chart?symbol=${symbol}.NS&range=1d&interval=${interval}m`)
        if (chartResponse.ok) {
          const chartResult = await chartResponse.json()
          if (chartResult.success && chartResult.data) {
            setChartData(chartResult.data)
          }
        }
      }
      
    } catch (error) {
      console.error("❌ Error fetching live data:", error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Auto-update live data
  useEffect(() => {
    if (!isPlaying) return

    fetchLiveData(selectedSymbol)
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
    }
    
    updateIntervalRef.current = setInterval(() => {
      fetchLiveData(selectedSymbol)
    }, 3000) // Update every 3 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [selectedSymbol, isPlaying])

  // Draw fallback chart
  const drawFallbackChart = () => {
    const canvas = fallbackChartRef.current
    if (!canvas || chartData.length === 0 || tradingViewLoaded) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height
    const padding = 40

    // Clear canvas
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    // Calculate price range
    const prices = chartData.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    if (priceRange === 0) return

    // Draw grid
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i * (height - 2 * padding)) / 10
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, (width - 2 * padding) / chartData.length - 2)

    chartData.forEach((candle, index) => {
      const x = padding + (index * (width - 2 * padding)) / (chartData.length - 1)
      const openY = height - padding - ((candle.open - minPrice) / priceRange) * (height - 2 * padding)
      const closeY = height - padding - ((candle.close - minPrice) / priceRange) * (height - 2 * padding)
      const highY = height - padding - ((candle.high - minPrice) / priceRange) * (height - 2 * padding)
      const lowY = height - padding - ((candle.low - minPrice) / priceRange) * (height - 2 * padding)

      const isGreen = candle.close > candle.open

      // Draw wick
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = isGreen ? "#10b981" : "#ef4444"
      const bodyHeight = Math.abs(closeY - openY) || 1
      const bodyY = Math.min(openY, closeY)
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
    })
  }

  // Draw fallback chart when data changes
  useEffect(() => {
    if (!tradingViewLoaded) {
      drawFallbackChart()
    }
  }, [chartData, tradingViewLoaded])

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

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const currentStock = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-7 w-7 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Professional Trading Chart</h2>
              <p className="text-sm text-slate-400">Real-time market data with advanced analytics</p>
            </div>
          </div>
          
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
            <Activity className="h-3 w-3 mr-1" />
            {tradingViewLoaded ? "TradingView Pro" : "Lightweight Chart"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-56 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
              {STOCK_SYMBOLS.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{stock.name}</span>
                    <span className="text-xs text-slate-400">{stock.sector}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-20 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {TIMEFRAMES.map((tf) => (
                <SelectItem key={tf.value} value={tf.value} className="text-white hover:bg-slate-700">
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVolume(!showVolume)}
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            <Volume2 className="h-4 w-4" />
          </Button>

          <Badge className={isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
      </div>

      {/* Enhanced Live Price Ticker */}
      {stockData && (
        <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center">
                    {stockData.companyName}
                    <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                      LIVE
                    </Badge>
                  </h3>
                  <div className="flex items-center space-x-2 text-slate-400">
                    <span>{stockData.symbol}</span>
                    <span>•</span>
                    <span>{currentStock?.sector}</span>
                    {stockData.marketCap && (
                      <>
                        <span>•</span>
                        <span>Market Cap: {stockData.marketCap}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-4xl font-bold text-white mb-2">
                  {formatPrice(stockData.price)}
                </div>
                <div className={`flex items-center justify-end text-lg font-medium ${
                  stockData.change >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {stockData.change >= 0 ? (
                    <TrendingUp className="h-5 w-5 mr-2" />
                  ) : (
                    <TrendingDown className="h-5 w-5 mr-2" />
                  )}
                  {formatChange(stockData.change)} ({formatPercentage(stockData.changePercent)})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Open</p>
                <p className="text-lg font-semibold text-white">{formatPrice(stockData.open)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">High</p>
                <p className="text-lg font-semibold text-green-400">{formatPrice(stockData.high)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Low</p>
                <p className="text-lg font-semibold text-red-400">{formatPrice(stockData.low)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Volume</p>
                <p className="text-lg font-semibold text-white">
                  {stockData.volume.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professional Trading Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              {tradingViewLoaded ? "TradingView Professional Chart" : "Lightweight Chart"}
            </CardTitle>
            <div className="flex items-center space-x-4">
              {lastUpdate && (
                <span className="text-sm text-slate-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLiveData(selectedSymbol)}
                disabled={loading}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative">
            {tradingViewLoaded ? (
              <div 
                id="tradingview-professional-chart"
                ref={chartContainerRef}
                className="w-full h-[700px] rounded-lg"
              />
            ) : (
              <div className="relative">
                <canvas
                  ref={fallbackChartRef}
                  className="w-full h-[600px] bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Fallback Chart (TradingView Loading...)
                  </Badge>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-2 text-white">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading live data...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chart Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Live Features</h4>
            </div>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Real-time candlestick charts</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Technical indicators (SMA, RSI, MACD)</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Multiple timeframes (1m to 1D)</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Professional trading interface</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Market Status</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Data Source:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {tradingViewLoaded ? "TradingView + Yahoo" : "Yahoo Finance"}
                </Badge>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Update Frequency:</span>
                <span className="text-green-400">3 seconds</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Market:</span>
                <span className="text-yellow-400">NSE (India)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Chart Legend</h4>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Bullish candle (price up)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Bearish candle (price down)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-blue-500 rounded"></div>
                <span>SMA 20 (short trend)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-1 bg-yellow-500 rounded"></div>
                <span>SMA 50 (long trend)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}