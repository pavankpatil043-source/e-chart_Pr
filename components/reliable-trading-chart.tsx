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
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toYahooSymbol, toBaseSymbol, type StockInfo } from "@/lib/nifty-50-stocks"

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

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
}

// Use popular Nifty 50 stocks for the dropdown
const STOCK_SYMBOLS = POPULAR_NIFTY_STOCKS

const TIMEFRAMES = [
  { value: "1d", label: "1D", interval: "5m" },
  { value: "5d", label: "5D", interval: "15m" },
  { value: "1mo", label: "1M", interval: "1h" },
  { value: "3mo", label: "3M", interval: "1d" },
  { value: "6mo", label: "6M", interval: "1d" },
  { value: "1y", label: "1Y", interval: "1wk" },
]

export default function ReliableTradingChart() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE.NS")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [timeframe, setTimeframe] = useState("1d")
  const [isPlaying, setIsPlaying] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [dataSource, setDataSource] = useState<string>("Loading...")
  
  const chartRef = useRef<HTMLCanvasElement>(null)
  const volumeChartRef = useRef<HTMLCanvasElement>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const priceHistoryRef = useRef<number[]>([])

  // Initialize client-side to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch live price and chart data using Breeze API first, then fallback
  const fetchLiveData = async (symbol: string, timeframePeriod: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔄 Fetching live data for ${symbol} using Breeze API primary, Yahoo fallback`)
      
      // Try Breeze API first for live price
      let priceData = null
      let priceSource = ""
      
      try {
        console.log(`💹 Attempting Breeze live price for ${symbol}`)
        const breezeResponse = await fetch(`/api/breeze-live-price?symbol=${symbol}&exchange=NSE`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        
        if (breezeResponse.ok) {
          const breezeResult = await breezeResponse.json()
          if (breezeResult.success && breezeResult.data) {
            priceData = breezeResult.data
            priceSource = breezeResult.data.source || "Breeze API"
            console.log(`✅ Got live price from Breeze: ${priceData.price}`)
          }
        }
      } catch (breezeError) {
        console.warn(`⚠️ Breeze price API failed, trying Yahoo:`, breezeError)
      }
      
      // Fallback to Yahoo Finance if Breeze failed
      if (!priceData) {
        console.log(`📊 Falling back to Yahoo Finance for ${symbol}`)
        const priceResponse = await fetch(`/api/yahoo-quote?symbol=${symbol}.NS`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
      
        if (priceResponse.ok) {
          const yahooResult = await priceResponse.json()
          if (yahooResult.success && yahooResult.data) {
            priceData = yahooResult.data
            priceSource = "Yahoo Finance (Fallback)"
            console.log(`✅ Got fallback price from Yahoo: ${priceData.price}`)
          }
        }
      }
      
      // Process price data if available
      if (priceData) {
        const company = STOCK_SYMBOLS.find(s => s.symbol === symbol)
        const newStockData = {
          symbol: symbol,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          volume: priceData.volume || 0,
          high: priceData.high || priceData.price * 1.02,
          low: priceData.low || priceData.price * 0.98,
          open: priceData.open || priceData.price * 0.999,
          companyName: company?.name || symbol,
        }
        setStockData(newStockData)
        
        // Add to price history for mini chart
        priceHistoryRef.current.push(newStockData.price)
        if (priceHistoryRef.current.length > 50) {
          priceHistoryRef.current = priceHistoryRef.current.slice(-50)
        }
        
        setLastUpdate(new Date())
        setIsConnected(true)
        console.log(`✅ Price data processed from ${priceSource}`)
      }

      // Fetch chart data - try Breeze API first, then fallback to Yahoo
      const currentTimeframe = TIMEFRAMES.find(tf => tf.value === timeframePeriod)
      console.log(`� Fetching chart data for ${symbol} (${timeframePeriod}, ${currentTimeframe?.interval})`)
      
      let chartResponse: Response
      let chartSource = ""
      
      try {
        console.log(`💹 Attempting Breeze chart data for ${symbol}`)
        chartResponse = await fetch(
          `/api/breeze-live-chart?symbol=${symbol}&range=${timeframePeriod}&interval=${currentTimeframe?.interval || '5m'}&exchange=NSE`,
          {
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache',
              'Content-Type': 'application/json'
            }
          }
        )
        chartSource = "Breeze API"
        console.log(`📊 Breeze chart response: ${chartResponse.status}`)
      } catch (breezeChartError) {
        console.warn(`⚠️ Breeze chart API failed, falling back to Yahoo:`, breezeChartError)
        chartResponse = await fetch(
          `/api/reliable-yahoo-chart?symbol=${symbol}.NS&range=${timeframePeriod}&interval=${currentTimeframe?.interval || '5m'}`,
          {
            cache: 'no-store',
            headers: { 
              'Cache-Control': 'no-cache',
              'Content-Type': 'application/json'
            }
          }
        )
        chartSource = "Yahoo Finance (Fallback)"
        console.log(`📊 Yahoo chart response: ${chartResponse.status}`)
      }
      
      if (chartResponse.ok) {
        const chartResult = await chartResponse.json()
        console.log(`📊 Chart API Response:`, {
          success: chartResult.success,
          source: chartResult.source,
          cached: chartResult.cached,
          dataPoints: chartResult.data?.length,
          rateLimited: chartResult.rateLimited
        })
        
        if (chartResult.success && chartResult.data && Array.isArray(chartResult.data)) {
          const actualSource = chartResult.source || chartSource
          console.log(`✅ Received ${chartResult.data.length} data points from ${actualSource}`)
          setDataSource(actualSource)
          
          const formattedData = chartResult.data.map((item: any, index: number) => {
            const timestamp = item.timestamp || Date.now() - (chartResult.data.length - index) * 300000
            return {
              timestamp,
              open: item.open || item.close || 0,
              high: item.high || item.close || 0,
              low: item.low || item.close || 0,
              close: item.close || 0,
              volume: item.volume || 0,
              time: isClient ? new Date(timestamp).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : ''
            }
          })
          setChartData(formattedData)
          
          // Log first and last data points for verification
          if (formattedData.length > 0) {
            const first = formattedData[0]
            const last = formattedData[formattedData.length - 1]
            console.log(`📈 First data point:`, new Date(first.timestamp).toLocaleString(), `Close: ${first.close}`)
            console.log(`📈 Last data point:`, new Date(last.timestamp).toLocaleString(), `Close: ${last.close}`)
          }
          
        } else if (chartResult.rateLimited) {
          console.warn(`🚫 Chart API is rate limited, retry after: ${chartResult.retryAfter}ms`)
          setError("Rate limited - Please wait before refreshing")
          setDataSource(`Rate Limited (${chartSource})`)
        } else {
          console.error(`❌ Chart API failed:`, chartResult.error)
          setError(`Chart data unavailable: ${chartResult.error}`)
          setDataSource(`Error: ${chartResult.error || "Unknown"} (${chartSource})`)
        }
      } else {
        console.error(`❌ Chart API HTTP error: ${chartResponse.status} (${chartSource})`)
        setError(`Chart API error: ${chartResponse.status}`)
        setDataSource(`HTTP ${chartResponse.status} (${chartSource})`)
      }
      
    } catch (error) {
      console.error("❌ Error fetching live data:", error)
      setError("Failed to fetch market data")
      setDataSource("Network Error")
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Draw enhanced candlestick chart
  const drawChart = () => {
    const canvas = chartRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 60, bottom: 40, left: 10 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear canvas
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    if (chartData.length === 0) {
      ctx.fillStyle = "#64748b"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Loading chart data...", width / 2, height / 2)
      return
    }

    // Calculate price range
    const prices = chartData.flatMap((d) => [d.high, d.low])
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const priceStep = priceRange / 5

    if (priceRange === 0) return

    // Draw horizontal grid lines and price labels
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    ctx.fillStyle = "#64748b"
    ctx.font = "11px Arial"
    ctx.textAlign = "left"

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (i * priceStep)
      const y = padding.top + chartHeight - (i * chartHeight / 5)
      
      // Grid line
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
      
      // Price label
      ctx.fillText(price.toFixed(1), padding.left + chartWidth + 5, y + 4)
    }

    // Draw vertical grid lines
    const timeStep = Math.max(1, Math.floor(chartData.length / 6))
    for (let i = 0; i < chartData.length; i += timeStep) {
      const x = padding.left + (i * chartWidth / (chartData.length - 1))
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, padding.top + chartHeight)
      ctx.stroke()
      
      // Time label
      if (chartData[i]?.time) {
        ctx.fillText(chartData[i].time, x - 20, height - 5)
      }
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / (chartData.length * 1.5))

    chartData.forEach((candle, index) => {
      const x = padding.left + (index * chartWidth / (chartData.length - 1))
      const openY = padding.top + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight
      const closeY = padding.top + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight
      const highY = padding.top + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight
      const lowY = padding.top + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight

      const isGreen = candle.close >= candle.open
      const color = isGreen ? "#10b981" : "#ef4444"

      // Draw wick
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw body
      ctx.fillStyle = color
      const bodyHeight = Math.abs(closeY - openY) || 1
      const bodyY = Math.min(openY, closeY)
      
      if (isGreen) {
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
      } else {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight)
      }
    })

    // Draw current price line if we have stock data
    if (stockData) {
      const currentPriceY = padding.top + chartHeight - ((stockData.price - minPrice) / priceRange) * chartHeight
      ctx.strokeStyle = "#3b82f6"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(padding.left, currentPriceY)
      ctx.lineTo(padding.left + chartWidth, currentPriceY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // Current price label
      ctx.fillStyle = "#3b82f6"
      ctx.font = "12px Arial"
      ctx.textAlign = "right"
      ctx.fillText(`₹${stockData.price.toFixed(2)}`, width - 5, currentPriceY - 5)
    }
  }

  // Draw volume chart
  const drawVolumeChart = () => {
    const canvas = volumeChartRef.current
    if (!canvas || chartData.length === 0 || !showVolume) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 5, right: 60, bottom: 5, left: 10 }

    // Clear canvas
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    const volumes = chartData.map(d => d.volume)
    const maxVolume = Math.max(...volumes)

    if (maxVolume === 0) return

    // Draw volume bars
    chartData.forEach((candle, index) => {
      const x = padding.left + (index * (width - padding.left - padding.right) / (chartData.length - 1))
      const barHeight = (candle.volume / maxVolume) * (height - padding.top - padding.bottom)
      const isGreen = candle.close >= candle.open

      ctx.fillStyle = isGreen ? "#10b98150" : "#ef444450"
      ctx.fillRect(x - 1, height - padding.bottom - barHeight, 2, barHeight)
    })
  }

  // Auto-update live data
  useEffect(() => {
    if (!isPlaying) return

    fetchLiveData(selectedSymbol, timeframe)
    
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current)
    }
    
    updateIntervalRef.current = setInterval(() => {
      fetchLiveData(selectedSymbol, timeframe)
    }, 3000) // Update every 3 seconds

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [selectedSymbol, timeframe, isPlaying])

  // Draw charts when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      drawChart()
      drawVolumeChart()
    }, 100) // Small delay to ensure canvas is ready

    return () => clearTimeout(timer)
  }, [chartData, stockData, showVolume])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        drawChart()
        drawVolumeChart()
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
              <h2 className="text-2xl font-bold text-white">Live Trading Chart</h2>
              <p className="text-sm text-slate-400">Real-time market data from Yahoo Finance</p>
            </div>
          </div>
          
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
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
                    <span className="font-medium">{stock.baseSymbol}</span>
                    <span className="text-xs text-slate-400">{stock.sector}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={setTimeframe}>
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
          
          <Badge 
            className={
              dataSource.includes("Live") ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
              dataSource.includes("Cached") ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
              dataSource.includes("Stale") ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
              "bg-slate-500/20 text-slate-400 border-slate-500/30"
            }
            title={`Data Source: ${dataSource}`}
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            {dataSource.length > 15 ? dataSource.substring(0, 12) + "..." : dataSource}
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

      {/* Reliable Trading Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              Live Candlestick Chart
              {error && (
                <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">
                  {error}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-4">
              {lastUpdate && isClient && (
                <span className="text-sm text-slate-400">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLiveData(selectedSymbol, timeframe)}
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
            <canvas
              ref={chartRef}
              className="w-full h-[500px] bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg cursor-crosshair"
            />
            
            {showVolume && (
              <canvas
                ref={volumeChartRef}
                className="w-full h-[100px] bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-lg mt-2"
              />
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


    </div>
  )
}