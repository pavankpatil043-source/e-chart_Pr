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
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toYahooSymbol, toBaseSymbol } from "@/lib/nifty-50-stocks"

interface LivePrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  companyName: string
  timestamp: number
}

// Use popular Nifty 50 stocks
const STOCK_SYMBOLS = POPULAR_NIFTY_STOCKS

export default function SimpleLiveChart() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE.NS")
  const [livePrice, setLivePrice] = useState<LivePrice | null>(null)
  const [priceHistory, setPriceHistory] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const chartRef = useRef<HTMLCanvasElement>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch live price data
  const fetchLivePrice = async (symbol: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/yahoo-quote?symbol=${symbol}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const company = STOCK_SYMBOLS.find(s => s.symbol === symbol)
          const newPrice = {
            symbol: symbol,
            price: data.data.price || 0,
            change: data.data.change || 0,
            changePercent: data.data.changePercent || 0,
            volume: data.data.volume || 0,
            high: data.data.high || data.data.price * 1.02,
            low: data.data.low || data.data.price * 0.98,
            open: data.data.open || data.data.price * 0.999,
            companyName: company?.name || symbol,
            timestamp: Date.now()
          }
          
          setLivePrice(newPrice)
          
          // Update price history for mini chart (keep last 50 points)
          setPriceHistory(prev => {
            const updated = [...prev, newPrice.price]
            return updated.length > 50 ? updated.slice(-50) : updated
          })
          
          setLastUpdate(new Date())
          setIsConnected(true)
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
      
    } catch (error) {
      console.error("❌ Error fetching live price:", error)
      setError("Connection failed")
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Draw simple line chart
  const drawMiniChart = () => {
    const canvas = chartRef.current
    if (!canvas || priceHistory.length < 2) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = 10

    // Clear canvas
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    // Calculate price range
    const minPrice = Math.min(...priceHistory)
    const maxPrice = Math.max(...priceHistory)
    const priceRange = maxPrice - minPrice || 1

    // Draw grid
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * (height - 2 * padding)) / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw price line
    ctx.strokeStyle = livePrice && livePrice.change >= 0 ? "#10b981" : "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()

    priceHistory.forEach((price, index) => {
      const x = padding + (index * (width - 2 * padding)) / (priceHistory.length - 1)
      const y = height - padding - ((price - minPrice) / priceRange) * (height - 2 * padding)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw current price dot
    if (priceHistory.length > 0) {
      const lastPrice = priceHistory[priceHistory.length - 1]
      const x = width - padding
      const y = height - padding - ((lastPrice - minPrice) / priceRange) * (height - 2 * padding)
      
      ctx.fillStyle = livePrice && livePrice.change >= 0 ? "#10b981" : "#ef4444"
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Draw price labels
    ctx.fillStyle = "#64748b"
    ctx.font = "12px Arial"
    ctx.textAlign = "right"
    ctx.fillText(`₹${maxPrice.toFixed(1)}`, width - 5, padding + 15)
    ctx.fillText(`₹${minPrice.toFixed(1)}`, width - 5, height - padding - 5)
  }

  // Auto-update live data
  useEffect(() => {
    if (!isPlaying) return

    fetchLivePrice(selectedSymbol)
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
    }
    
    updateIntervalRef.current = setInterval(() => {
      fetchLivePrice(selectedSymbol)
    }, 2000) // Update every 2 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [selectedSymbol, isPlaying])

  // Draw chart when data changes
  useEffect(() => {
    const timer = setTimeout(drawMiniChart, 50)
    return () => clearTimeout(timer)
  }, [priceHistory, livePrice])

  // Handle symbol change - reset price history
  useEffect(() => {
    setPriceHistory([])
    setLivePrice(null)
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

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const currentStock = STOCK_SYMBOLS.find(s => s.symbol === selectedSymbol)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-7 w-7 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Live Stock Tracker</h2>
              <p className="text-sm text-slate-400">Real-time price updates with live charts</p>
            </div>
          </div>
          
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
            <Activity className="h-3 w-3 mr-1" />
            Fast & Reliable
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-56 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
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

          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="border-slate-700 text-white hover:bg-slate-800"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Badge className={isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>

          {error && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {error}
            </Badge>
          )}
        </div>
      </div>

      {/* Live Price Display */}
      {livePrice && (
        <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white flex items-center mb-2">
                  {livePrice.companyName}
                  <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    LIVE
                  </Badge>
                </h3>
                <div className="flex items-center space-x-2 text-slate-400">
                  <span>{livePrice.symbol}</span>
                  <span>•</span>
                  <span>{currentStock?.sector}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-5xl font-bold text-white mb-2">
                  {formatPrice(livePrice.price)}
                </div>
                <div className={`flex items-center justify-end text-xl font-medium ${
                  livePrice.change >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {livePrice.change >= 0 ? (
                    <TrendingUp className="h-6 w-6 mr-2" />
                  ) : (
                    <TrendingDown className="h-6 w-6 mr-2" />
                  )}
                  {formatChange(livePrice.change)} ({formatPercentage(livePrice.changePercent)})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Open</p>
                <p className="text-lg font-semibold text-white">{formatPrice(livePrice.open)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">High</p>
                <p className="text-lg font-semibold text-green-400">{formatPrice(livePrice.high)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Low</p>
                <p className="text-lg font-semibold text-red-400">{formatPrice(livePrice.low)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-2">Volume</p>
                <p className="text-lg font-semibold text-white">
                  {livePrice.volume.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Price Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              Live Price Chart ({priceHistory.length} data points)
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
                onClick={() => fetchLivePrice(selectedSymbol)}
                disabled={loading}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="relative">
            <canvas
              ref={chartRef}
              className="w-full h-[300px] bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg"
            />
            
            {priceHistory.length < 2 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-slate-400 text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p>Building price history...</p>
                  <p className="text-sm">Wait for a few updates to see the chart</p>
                </div>
              </div>
            )}
            
            {loading && (
              <div className="absolute top-4 right-4">
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Live Features</h4>
            </div>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>✓ Real-time price updates</li>
              <li>✓ Live price charts</li>
              <li>✓ Multiple stock selection</li>
              <li>✓ Fast & reliable data</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Data Source</h4>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>API:</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  Yahoo Finance
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Updates:</span>
                <span className="text-green-400">Every 2 seconds</span>
              </div>
              <div className="flex justify-between">
                <span>Market:</span>
                <span className="text-yellow-400">NSE India</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/30 border-slate-700/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <h4 className="font-semibold text-white">Performance</h4>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge className={isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Data Points:</span>
                <span className="text-blue-400">{priceHistory.length}/50</span>
              </div>
              <div className="flex justify-between">
                <span>Auto Updates:</span>
                <Badge className={isPlaying ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                  {isPlaying ? "ON" : "OFF"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}