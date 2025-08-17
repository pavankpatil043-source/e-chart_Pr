"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react"

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface ChartResponse {
  symbol: string
  data: ChartData[]
  interval: string
  source: string
}

interface TradingViewChartProps {
  symbol: string
  height?: number
  interval?: string
  range?: string
}

export default function TradingViewChart({
  symbol,
  height = 400,
  interval = "1d",
  range = "1mo",
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chartData, setChartData] = useState<ChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentInterval, setCurrentInterval] = useState(interval)
  const [currentRange, setCurrentRange] = useState(range)
  const [dataSource, setDataSource] = useState<string>("Unknown")
  const [lastUpdate, setLastUpdate] = useState<number>(0)

  // Fetch chart data with enhanced error handling
  const fetchChartData = async (sym: string, int: string, rng: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/yahoo-chart?symbol=${encodeURIComponent(sym)}&interval=${int}&range=${rng}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.chart) {
        setChartData(data.chart)
        setDataSource(data.source || "Unknown")
        setLastUpdate(Date.now())
        setError(null)
      } else {
        throw new Error(data.error || "Failed to fetch chart data")
      }
    } catch (err) {
      console.error("Error fetching chart data:", err)
      setError(err instanceof Error ? err.message : "Failed to load chart data")
      setDataSource("Error")
    } finally {
      setLoading(false)
    }
  }

  // Initialize chart
  useEffect(() => {
    fetchChartData(symbol, currentInterval, currentRange)
  }, [symbol, currentInterval, currentRange])

  // Render simple chart using Canvas
  useEffect(() => {
    if (!chartData || !chartContainerRef.current || chartData.data.length === 0) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const container = chartContainerRef.current
    canvas.width = container.clientWidth
    canvas.height = height
    canvas.style.width = "100%"
    canvas.style.height = `${height}px`

    // Clear container and add canvas
    container.innerHTML = ""
    container.appendChild(canvas)

    // Draw chart
    drawChart(ctx, chartData.data, canvas.width, canvas.height)
  }, [chartData, height])

  // Simple chart drawing function
  const drawChart = (ctx: CanvasRenderingContext2D, data: ChartData[], width: number, height: number) => {
    if (data.length === 0) return

    // Calculate price range
    const prices = data.map((d) => d.close)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // Setup
    const padding = 40
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * chartHeight) / 5
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Price labels
      const price = maxPrice - (i * priceRange) / 5
      ctx.fillStyle = "#6b7280"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(price.toFixed(2), padding - 5, y + 4)
    }

    // Vertical grid lines
    const timeStep = Math.max(1, Math.floor(data.length / 6))
    for (let i = 0; i < data.length; i += timeStep) {
      const x = padding + (i * chartWidth) / (data.length - 1)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()

      // Time labels
      const date = new Date(data[i].timestamp)
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      ctx.fillStyle = "#6b7280"
      ctx.font = "12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(label, x, height - padding + 20)
    }

    // Draw price line
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 2
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = padding + (index * chartWidth) / (data.length - 1)
      const y = padding + ((maxPrice - point.close) * chartHeight) / priceRange

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw candlesticks for daily or higher intervals
    if (currentInterval === "1d" || currentInterval === "1wk" || currentInterval === "1mo") {
      data.forEach((point, index) => {
        const x = padding + (index * chartWidth) / (data.length - 1)
        const openY = padding + ((maxPrice - point.open) * chartHeight) / priceRange
        const closeY = padding + ((maxPrice - point.close) * chartHeight) / priceRange
        const highY = padding + ((maxPrice - point.high) * chartHeight) / priceRange
        const lowY = padding + ((maxPrice - point.low) * chartHeight) / priceRange

        const isGreen = point.close > point.open
        ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444"
        ctx.fillStyle = isGreen ? "#10b981" : "#ef4444"

        // High-low line
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, highY)
        ctx.lineTo(x, lowY)
        ctx.stroke()

        // Body
        const bodyHeight = Math.abs(closeY - openY)
        const bodyY = Math.min(openY, closeY)
        ctx.fillRect(x - 2, bodyY, 4, Math.max(bodyHeight, 1))
      })
    }
  }

  // Handle interval change
  const handleIntervalChange = (newInterval: string) => {
    setCurrentInterval(newInterval)
  }

  // Handle range change
  const handleRangeChange = (newRange: string) => {
    setCurrentRange(newRange)
  }

  // Manual refresh
  const handleRefresh = () => {
    fetchChartData(symbol, currentInterval, currentRange)
  }

  // Get source badge color
  const getSourceBadgeVariant = (source: string) => {
    if (source.includes("Yahoo Finance API")) return "default"
    if (source.includes("Simulation")) return "secondary"
    if (source.includes("Error")) return "destructive"
    return "outline"
  }

  // Get trend info
  const getTrendInfo = () => {
    if (!chartData || chartData.data.length < 2) return null

    const firstPrice = chartData.data[0].close
    const lastPrice = chartData.data[chartData.data.length - 1].close
    const change = lastPrice - firstPrice
    const changePercent = (change / firstPrice) * 100

    return {
      change,
      changePercent,
      isPositive: change >= 0,
    }
  }

  const trendInfo = getTrendInfo()

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{symbol.replace(".NS", "")} Chart</CardTitle>
            {trendInfo && (
              <div className="flex items-center gap-1">
                {trendInfo.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${trendInfo.isPositive ? "text-green-600" : "text-red-600"}`}>
                  {trendInfo.changePercent.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getSourceBadgeVariant(dataSource)} className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {dataSource}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Select value={currentInterval} onValueChange={handleIntervalChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="30m">30m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="1d">1d</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currentRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">1D</SelectItem>
              <SelectItem value="5d">5D</SelectItem>
              <SelectItem value="1mo">1M</SelectItem>
              <SelectItem value="3mo">3M</SelectItem>
              <SelectItem value="6mo">6M</SelectItem>
              <SelectItem value="1y">1Y</SelectItem>
              <SelectItem value="2y">2Y</SelectItem>
            </SelectContent>
          </Select>

          {lastUpdate > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              Updated: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading chart data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Failed to load chart</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div
            ref={chartContainerRef}
            className="w-full border rounded-lg bg-white"
            style={{ height: `${height}px` }}
          />
        )}

        {chartData && chartData.data.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            Showing {chartData.data.length} data points • {currentInterval} interval • {currentRange} range
          </div>
        )}
      </CardContent>
    </Card>
  )
}
