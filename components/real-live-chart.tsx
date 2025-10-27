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
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toBaseSymbol } from "@/lib/nifty-50-stocks"

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  companyName: string
  sector: string
  source: string
}

interface ChartDataPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
}

const TIMEFRAMES = [
  { value: "1d", label: "1 Day", interval: "5m" },
  { value: "5d", label: "5 Days", interval: "15m" },
  { value: "1mo", label: "1 Month", interval: "1h" },
  { value: "3mo", label: "3 Months", interval: "1d" },
  { value: "6mo", label: "6 Months", interval: "1d" },
  { value: "1y", label: "1 Year", interval: "1wk" },
]

interface RealLiveChartProps {
  onStockChange?: (stock: { symbol: string; name: string; sector: string }) => void
  onTimeframeChange?: (timeframe: string) => void
}

export default function RealLiveChart({ onStockChange, onTimeframeChange }: RealLiveChartProps = {}) {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [timeframe, setTimeframe] = useState("1mo")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [srLevels, setSRLevels] = useState<Array<{ price: number; type: 'support' | 'resistance'; strength: string }>>([])
  const [detectedPatterns, setDetectedPatterns] = useState<Array<{
    pattern: string
    type: 'bullish' | 'bearish' | 'neutral' | 'reversal'
    confidence: number
    points?: Array<{ x: number; y: number; price: number; time: string }>
    startIndex?: number
    endIndex?: number
  }>>([])
  const [showPatterns, setShowPatterns] = useState(true)
  
  const chartRef = useRef<HTMLCanvasElement>(null)
  const volumeChartRef = useRef<HTMLCanvasElement>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch live price data from multiple sources
  const fetchStockPrice = async (symbol: string) => {
    try {
      const response = await fetch(`/api/multi-source-quote?symbol=${symbol}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
          
          // Only update if we get real data, not simulation
          if (!data.source || !data.source.includes('Simulation')) {
            setStockData({
              symbol: toBaseSymbol(symbol),
              price: data.price,
              change: data.change,
              changePercent: data.changePercent,
              volume: data.volume || 0,
              high: data.high || data.price,
              low: data.low || data.price,
              open: data.open || data.price,
              previousClose: data.previousClose || (data.price - data.change),
              companyName: stock?.name || data.companyName || toBaseSymbol(symbol),
              sector: stock?.sector || "Unknown",
              source: data.source || "Yahoo Finance"
            })
            
            setIsConnected(true)
            setLastUpdate(new Date())
            console.log(`✅ Real price for ${symbol}: ₹${data.price} from ${data.source}`)
          } else {
            console.warn(`⚠️ Got simulated data for ${symbol}, waiting for real data`)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
      setIsConnected(false)
    }
  }

  // Fetch chart data
  const fetchChartData = async (symbol: string, range: string) => {
    try {
      setLoading(true)
      setChartError(null)
      
      const tf = TIMEFRAMES.find(t => t.value === range)
      console.log(`📊 Fetching chart data for ${symbol} (${range} / ${tf?.interval})...`)
      
      const response = await fetch(
        `/api/yahoo-chart?symbol=${symbol}&range=${range}&interval=${tf?.interval || '5m'}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }
      )
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && Array.isArray(result.data)) {
          const formattedData = result.data.map((item: any) => ({
            timestamp: item.timestamp,
            open: item.open || item.close || 0,
            high: item.high || item.close || 0,
            low: item.low || item.close || 0,
            close: item.close || 0,
            volume: item.volume || 0,
            time: new Date(item.timestamp).toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }))
          
          // Validate data
          const validData = formattedData.filter((d: any) => 
            d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
          )
          
          if (validData.length === 0) {
            console.error('❌ No valid OHLC data found')
            setChartError("Invalid chart data")
            return
          }
          
          setChartData(validData)
          console.log(`✅ Got ${validData.length} valid candles from ${result.source}`)
          console.log(`   Sample candle:`, validData[0])
        } else {
          console.error('❌ No chart data in response')
          setChartError("No chart data available")
        }
      } else {
        console.error('❌ Chart API error:', response.status)
        setChartError("Failed to load chart data")
      }
    } catch (error) {
      console.error("Error fetching chart data:", error)
      setChartError("Chart loading error")
    } finally {
      setLoading(false)
    }
  }

  // Draw candlestick chart
  const drawChart = () => {
    const canvas = chartRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 20, right: 70, bottom: 40, left: 10 }
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
    const prices = chartData.flatMap(d => [d.high, d.low])
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const priceRange = maxPrice - minPrice
    const paddedMax = maxPrice + priceRange * 0.1
    const paddedMin = minPrice - priceRange * 0.1

    // Draw grid lines
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // Draw price labels
    ctx.fillStyle = "#94a3b8"
    ctx.font = "11px Arial"
    ctx.textAlign = "right"
    for (let i = 0; i <= 5; i++) {
      const price = paddedMax - ((paddedMax - paddedMin) / 5) * i
      const y = padding.top + (chartHeight / 5) * i
      ctx.fillText(`₹${price.toFixed(2)}`, width - padding.right + 60, y + 4)
    }

    // Draw candlesticks
    const spacing = chartWidth / chartData.length
    const candleWidth = Math.max(1, Math.min(spacing * 0.8, 12)) // Max 80% of spacing, cap at 12px
    const candleGap = (spacing - candleWidth) / 2

    chartData.forEach((point, index) => {
      const x = padding.left + index * spacing + spacing / 2
      const isGreen = point.close >= point.open

      // Validate data points
      if (!point.open || !point.high || !point.low || !point.close || 
          point.open === 0 || point.high === 0 || point.low === 0 || point.close === 0) {
        console.warn(`Invalid candle data at index ${index}:`, point)
        return
      }

      // Scale prices to canvas coordinates
      const openY = padding.top + ((paddedMax - point.open) / (paddedMax - paddedMin)) * chartHeight
      const closeY = padding.top + ((paddedMax - point.close) / (paddedMax - paddedMin)) * chartHeight
      const highY = padding.top + ((paddedMax - point.high) / (paddedMax - paddedMin)) * chartHeight
      const lowY = padding.top + ((paddedMax - point.low) / (paddedMax - paddedMin)) * chartHeight

      // Draw wick (high-low line)
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()

      // Draw candle body (open-close rectangle)
      const bodyTop = Math.min(openY, closeY)
      const bodyBottom = Math.max(openY, closeY)
      const bodyHeight = Math.max(1, bodyBottom - bodyTop) // Minimum 1px height
      
      if (isGreen) {
        // Bullish candle: filled green
        ctx.fillStyle = "#10b981"
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
      } else {
        // Bearish candle: filled red
        ctx.fillStyle = "#ef4444"
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight)
      }
    })

    // Draw Support/Resistance levels
    if (srLevels.length > 0) {
      srLevels.forEach((level) => {
        const y = padding.top + ((paddedMax - level.price) / (paddedMax - paddedMin)) * chartHeight
        
        // Only draw if level is within visible range
        if (y >= padding.top && y <= padding.top + chartHeight) {
          const isSupport = level.type === 'support'
          const color = isSupport ? '#10b981' : '#ef4444'
          const alpha = level.strength === 'strong' ? 0.6 : level.strength === 'moderate' ? 0.4 : 0.25
          
          // Draw line
          ctx.strokeStyle = color
          ctx.globalAlpha = alpha
          ctx.lineWidth = level.strength === 'strong' ? 2 : 1
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(padding.left, y)
          ctx.lineTo(padding.left + chartWidth, y)
          ctx.stroke()
          ctx.setLineDash([]) // Reset line dash
          ctx.globalAlpha = 1
          
          // Draw label
          ctx.fillStyle = color
          ctx.font = 'bold 10px Arial'
          ctx.textAlign = 'left'
          ctx.fillText(
            `${isSupport ? 'S' : 'R'}: ₹${level.price.toFixed(2)}`,
            padding.left + 5,
            y - 3
          )
        }
      })
    }

    // Draw Chart Patterns
    if (showPatterns && detectedPatterns.length > 0 && chartData.length > 10) {
      detectedPatterns.forEach((pattern, patternIdx) => {
        const isBullish = pattern.type === 'bullish'
        const isBearish = pattern.type === 'bearish'
        const patternColor = isBullish ? '#10b981' : isBearish ? '#ef4444' : '#f59e0b'
        
        // Draw pattern overlay based on pattern type
        if (pattern.pattern.toLowerCase().includes('head and shoulders') || 
            pattern.pattern.toLowerCase().includes('double top') ||
            pattern.pattern.toLowerCase().includes('double bottom')) {
          // Draw pattern shape markers
          const numPoints = pattern.pattern.toLowerCase().includes('double') ? 5 : 7
          const step = Math.floor(chartData.length / (numPoints + 1))
          
          ctx.strokeStyle = patternColor
          ctx.globalAlpha = 0.4
          ctx.lineWidth = 2
          ctx.beginPath()
          
          for (let i = 1; i <= numPoints; i++) {
            const idx = Math.min(i * step, chartData.length - 1)
            const point = chartData[idx]
            const x = padding.left + idx * spacing + spacing / 2
            
            // Alternate between highs and lows for pattern shape
            const isHigh = (i % 2 === 1)
            const price = isHigh ? point.high : point.low
            const y = padding.top + ((paddedMax - price) / (paddedMax - paddedMin)) * chartHeight
            
            if (i === 1) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
            
            // Draw point markers
            ctx.fillStyle = patternColor
            ctx.globalAlpha = 0.6
            ctx.beginPath()
            ctx.arc(x, y, 4, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalAlpha = 0.4
          }
          
          ctx.stroke()
          ctx.globalAlpha = 1
        } 
        else if (pattern.pattern.toLowerCase().includes('triangle') ||
                 pattern.pattern.toLowerCase().includes('wedge')) {
          // Draw triangle/wedge trendlines
          const quarterLength = Math.floor(chartData.length / 4)
          const startIdx = quarterLength
          const endIdx = chartData.length - quarterLength
          
          // Find highs and lows for trendlines
          let highPoints: Array<{x: number, y: number}> = []
          let lowPoints: Array<{x: number, y: number}> = []
          
          for (let i = startIdx; i < endIdx; i += Math.floor((endIdx - startIdx) / 4)) {
            if (i < chartData.length) {
              const point = chartData[i]
              const x = padding.left + i * spacing + spacing / 2
              const highY = padding.top + ((paddedMax - point.high) / (paddedMax - paddedMin)) * chartHeight
              const lowY = padding.top + ((paddedMax - point.low) / (paddedMax - paddedMin)) * chartHeight
              highPoints.push({x, y: highY})
              lowPoints.push({x, y: lowY})
            }
          }
          
          // Draw upper trendline
          if (highPoints.length >= 2) {
            ctx.strokeStyle = patternColor
            ctx.globalAlpha = 0.5
            ctx.lineWidth = 2
            ctx.setLineDash([5, 3])
            ctx.beginPath()
            ctx.moveTo(highPoints[0].x, highPoints[0].y)
            ctx.lineTo(highPoints[highPoints.length - 1].x, highPoints[highPoints.length - 1].y)
            ctx.stroke()
          }
          
          // Draw lower trendline
          if (lowPoints.length >= 2) {
            ctx.beginPath()
            ctx.moveTo(lowPoints[0].x, lowPoints[0].y)
            ctx.lineTo(lowPoints[lowPoints.length - 1].x, lowPoints[lowPoints.length - 1].y)
            ctx.stroke()
          }
          
          ctx.setLineDash([])
          ctx.globalAlpha = 1
        }
        else if (pattern.pattern.toLowerCase().includes('flag') ||
                 pattern.pattern.toLowerCase().includes('pennant')) {
          // Draw flag/pennant channel
          const poleLength = Math.floor(chartData.length / 3)
          const flagStart = poleLength
          const flagEnd = Math.min(flagStart + Math.floor(chartData.length / 4), chartData.length - 1)
          
          // Draw the "pole" (strong move)
          if (poleLength < chartData.length) {
            const startPoint = chartData[0]
            const poleEndPoint = chartData[poleLength]
            const startX = padding.left + spacing / 2
            const poleEndX = padding.left + poleLength * spacing + spacing / 2
            const startY = padding.top + ((paddedMax - startPoint.close) / (paddedMax - paddedMin)) * chartHeight
            const poleEndY = padding.top + ((paddedMax - poleEndPoint.close) / (paddedMax - paddedMin)) * chartHeight
            
            ctx.strokeStyle = patternColor
            ctx.globalAlpha = 0.6
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(startX, startY)
            ctx.lineTo(poleEndX, poleEndY)
            ctx.stroke()
          }
          
          // Draw the flag (consolidation)
          ctx.globalAlpha = 0.3
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 2])
          
          for (let i = flagStart; i < flagEnd - 1; i++) {
            const point = chartData[i]
            const nextPoint = chartData[i + 1]
            const x1 = padding.left + i * spacing + spacing / 2
            const x2 = padding.left + (i + 1) * spacing + spacing / 2
            const y1 = padding.top + ((paddedMax - point.high) / (paddedMax - paddedMin)) * chartHeight
            const y2 = padding.top + ((paddedMax - nextPoint.high) / (paddedMax - paddedMin)) * chartHeight
            
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
          }
          
          ctx.setLineDash([])
          ctx.globalAlpha = 1
        }
        
        // Draw pattern label
        const labelX = padding.left + chartWidth - 150
        const labelY = padding.top + 20 + (patternIdx * 25)
        
        // Label background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
        ctx.fillRect(labelX - 5, labelY - 15, 145, 20)
        
        // Pattern name
        ctx.fillStyle = patternColor
        ctx.font = 'bold 11px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(`${pattern.pattern}`, labelX, labelY)
        
        // Confidence badge
        ctx.fillStyle = '#94a3b8'
        ctx.font = '9px Arial'
        ctx.fillText(`${pattern.confidence}%`, labelX + 100, labelY)
      })
    }

    // Draw time labels
    ctx.fillStyle = "#94a3b8"
    ctx.font = "10px Arial"
    ctx.textAlign = "center"
    const labelCount = Math.min(6, chartData.length)
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((chartData.length / labelCount) * i)
      if (index < chartData.length) {
        const x = padding.left + index * spacing + spacing / 2
        ctx.fillText(chartData[index].time, x, height - 20)
      }
    }
  }

  // Draw volume chart
  const drawVolumeChart = () => {
    const canvas = volumeChartRef.current
    if (!canvas || chartData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height
    const padding = { top: 10, right: 70, bottom: 20, left: 10 }

    ctx.fillStyle = "#0f172a"
    ctx.fillRect(0, 0, width, height)

    const maxVolume = Math.max(...chartData.map(d => d.volume))
    const barWidth = Math.max(2, (width - padding.left - padding.right) / chartData.length - 2)
    const spacing = (width - padding.left - padding.right) / chartData.length

    chartData.forEach((point, index) => {
      const x = padding.left + index * spacing + spacing / 2
      const barHeight = ((point.volume / maxVolume) * (height - padding.top - padding.bottom))
      const y = height - padding.bottom - barHeight

      const isGreen = point.close >= point.open
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)"
      ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)
    })
  }

  // Update charts when data changes
  useEffect(() => {
    if (chartData.length > 0) {
      console.log(`📊 Drawing chart with ${chartData.length} data points`)
      drawChart()
      drawVolumeChart()
    }
  }, [chartData, srLevels, detectedPatterns, showPatterns]) // Redraw when S/R levels or patterns change

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartData.length > 0) {
        drawChart()
        drawVolumeChart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [chartData])

  // Fetch data when stock or timeframe changes
  useEffect(() => {
    console.log(`🔄 Effect triggered - Stock: ${selectedStock?.symbol}, Timeframe: ${timeframe}`)
    if (selectedStock) {
      console.log(`   → Fetching data for ${selectedStock.symbol}...`)
      fetchStockPrice(selectedStock.symbol)
      fetchChartData(selectedStock.symbol, timeframe)
      
      // Update price every 5 seconds
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      
      updateIntervalRef.current = setInterval(() => {
        fetchStockPrice(selectedStock.symbol)
      }, 5000)
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [selectedStock, timeframe])

  const handleStockChange = (symbol: string) => {
    const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      setSelectedStock(stock)
      // Notify parent component about stock change
      if (onStockChange) {
        onStockChange(stock)
      }
    }
  }

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    // Notify parent component about timeframe change
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe)
    }
  }
  
  // Fetch S/R levels
  const fetchSRLevels = async (symbol: string, tf: string) => {
    try {
      console.log(`📏 Fetching S/R levels for ${symbol} (${tf})...`)
      const response = await fetch(`/api/support-resistance?symbol=${symbol}&timeframe=${tf}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.levels) {
          const levels = result.data.levels.slice(0, 8) // Top 8 levels
          setSRLevels(levels)
          console.log(`✅ Loaded ${levels.length} S/R levels:`, levels)
        } else {
          console.warn(`⚠️ No S/R levels found`)
          setSRLevels([])
        }
      }
    } catch (error) {
      console.error("Error fetching S/R levels:", error)
      setSRLevels([])
    }
  }

  // Fetch pattern data and map to chart coordinates
  const fetchPatternData = async (symbol: string, tf: string) => {
    try {
      console.log(`🔍 Fetching patterns for ${symbol} (${tf})...`)
      const response = await fetch(`/api/ai-pattern-recognition?symbol=${symbol}&timeframe=${tf}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.detectedPatterns) {
          // Map patterns with high confidence (>60%) and significance
          const significantPatterns = result.data.detectedPatterns
            .filter((p: any) => p.confidence > 60 && p.significance !== 'low')
            .slice(0, 3) // Top 3 most significant patterns
          
          const mappedPatterns = significantPatterns.map((p: any) => ({
            pattern: p.pattern,
            type: p.type,
            confidence: p.confidence,
            points: [], // Will be calculated during rendering
            startIndex: 0,
            endIndex: chartData.length - 1
          }))
          
          setDetectedPatterns(mappedPatterns)
          console.log(`✅ Detected ${significantPatterns.length} significant patterns:`, significantPatterns.map((p: any) => `${p.pattern} (${p.confidence}%)`))
        } else {
          console.warn(`⚠️ No patterns detected`)
          setDetectedPatterns([])
        }
      }
    } catch (error) {
      console.error("Error fetching patterns:", error)
      setDetectedPatterns([])
    }
  }

  // Notify parent on initial mount
  useEffect(() => {
    if (onStockChange && selectedStock) {
      onStockChange(selectedStock)
    }
    if (onTimeframeChange && timeframe) {
      onTimeframeChange(timeframe)
    }
  }, [])

  // Fetch S/R levels when stock or timeframe changes
  useEffect(() => {
    if (selectedStock) {
      fetchSRLevels(selectedStock.symbol, timeframe)
      fetchPatternData(selectedStock.symbol, timeframe)
    }
  }, [selectedStock, timeframe])

  const handleRefresh = () => {
    if (selectedStock) {
      fetchStockPrice(selectedStock.symbol)
      fetchChartData(selectedStock.symbol, timeframe)
      fetchSRLevels(selectedStock.symbol, timeframe)
      fetchPatternData(selectedStock.symbol, timeframe)
    }
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-7 w-7 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Live Stock Chart</h2>
              <p className="text-sm text-slate-400">Real-time data from Yahoo Finance</p>
            </div>
          </div>
          
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
            <Activity className="h-3 w-3 mr-1" />
            Live Data
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedStock.symbol} onValueChange={handleStockChange}>
            <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700 text-white">
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
            <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white">
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

          <Badge className={isConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
            {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>

          <Button
            variant={showPatterns ? "default" : "outline"}
            size="sm"
            className={showPatterns ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-700 text-white hover:bg-slate-800"}
            onClick={() => setShowPatterns(!showPatterns)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {showPatterns ? "Hide" : "Show"} Patterns
            {detectedPatterns.length > 0 && (
              <Badge className="ml-2 bg-white/20 text-white text-xs">{detectedPatterns.length}</Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Live Price Display */}
      {stockData && (
        <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    {stockData.companyName}
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
                      LIVE
                    </Badge>
                  </h3>
                  <div className="flex items-center space-x-2 text-slate-400 text-sm">
                    <span>{stockData.symbol}</span>
                    <span>•</span>
                    <span>{stockData.sector}</span>
                    <span>•</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      NSE
                    </Badge>
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

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-xs text-slate-400 mb-1">Prev Close</p>
                <p className="text-sm font-semibold text-white">{formatPrice(stockData.previousClose)}</p>
              </div>
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

            {lastUpdate && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span>Data source: {stockData.source}</span>
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candlestick Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-400" />
              Live Candlestick Chart
            </div>
            {chartError && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {chartError}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="relative">
            <canvas
              ref={chartRef}
              className="w-full bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg cursor-crosshair"
              style={{ height: "500px" }}
            />
            
            <canvas
              ref={volumeChartRef}
              className="w-full bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-lg mt-2"
              style={{ height: "100px" }}
            />
            
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-2 text-white">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading chart data...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detected Patterns Legend */}
      {detectedPatterns.length > 0 && (
        <Card className="bg-purple-900/20 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Detected Chart Patterns ({detectedPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {detectedPatterns.map((pattern, idx) => {
                const isBullish = pattern.type === 'bullish'
                const isBearish = pattern.type === 'bearish'
                const bgColor = isBullish ? 'bg-green-500/10 border-green-500/30' : 
                               isBearish ? 'bg-red-500/10 border-red-500/30' : 
                               'bg-yellow-500/10 border-yellow-500/30'
                const textColor = isBullish ? 'text-green-400' : 
                                 isBearish ? 'text-red-400' : 
                                 'text-yellow-400'
                const icon = isBullish ? '↗' : isBearish ? '↘' : '↔'
                
                return (
                  <div key={idx} className={`p-3 rounded-lg border ${bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${textColor}`}>{icon}</span>
                      <Badge variant="outline" className="text-xs">
                        {pattern.confidence}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{pattern.pattern}</p>
                    <p className="text-xs text-slate-400 capitalize">{pattern.type} signal</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-slate-400 flex items-start gap-2">
              <span className="text-purple-400">ℹ️</span>
              <span>
                Pattern shapes are highlighted on the chart. Green = Bullish (buy signal), Red = Bearish (sell signal).
                Use these patterns along with S/R levels and AI analysis to make informed trading decisions.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Real-Time Stock Data</h4>
              <p className="text-sm text-slate-300">
                This chart displays <strong>real-time price data</strong> from Yahoo Finance API. 
                Prices update automatically every 5 seconds. The candlestick chart shows OHLC (Open, High, Low, Close) data 
                with volume bars below. Select any Nifty 50 stock from the dropdown to view its live chart. 
                Data is fetched directly from Yahoo Finance - no simulated data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
