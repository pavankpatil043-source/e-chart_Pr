"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"

interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover: number
}

interface SupportResistance {
  level: number
  strength: number
  type: "support" | "resistance"
}

interface AnalysisResult {
  startDate: string
  endDate: string
  startPrice: number
  endPrice: number
  priceChange: number
  priceChangePercent: number
  high: number
  low: number
  volatility: number
  trend: "bullish" | "bearish" | "sideways"
  days: number
  supportLevels: SupportResistance[]
  resistanceLevels: SupportResistance[]
  keyLevels: {
    strongSupport: number
    strongResistance: number
    currentLevel: "above_support" | "below_resistance" | "between" | "at_support" | "at_resistance"
  }
  avgVolume: number
  totalTurnover: number
}

export function AnalysisChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [data, setData] = useState<HistoricalData[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE")
  const [selectedDays, setSelectedDays] = useState("30")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; index: number } | null>(null)

  const symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "ASIANPAINT"]

  // Fetch historical data from NSE API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`Fetching historical data for ${selectedSymbol}, ${selectedDays} days...`)
      const response = await fetch(`/api/nse/historical?symbol=${selectedSymbol}&days=${selectedDays}`)
      console.log("Historical response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("Historical result:", result)

      if (result.success && result.data) {
        setData(result.data)
        console.log("Historical data loaded:", result.data.length, "days")
      } else {
        throw new Error(result.error || "Failed to fetch historical data")
      }
    } catch (error) {
      console.error("Error fetching historical data:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [selectedSymbol, selectedDays])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate support and resistance levels
  const calculateSupportResistance = useCallback((selectedData: HistoricalData[]): SupportResistance[] => {
    if (selectedData.length < 5) return []

    const levels: SupportResistance[] = []
    const tolerance = 0.02 // 2% tolerance for level grouping

    // Find pivot highs and lows
    for (let i = 2; i < selectedData.length - 2; i++) {
      const current = selectedData[i]
      const prev2 = selectedData[i - 2]
      const prev1 = selectedData[i - 1]
      const next1 = selectedData[i + 1]
      const next2 = selectedData[i + 2]

      // Check for pivot high (resistance)
      if (
        current.high > prev2.high &&
        current.high > prev1.high &&
        current.high > next1.high &&
        current.high > next2.high
      ) {
        levels.push({
          level: current.high,
          strength: 1,
          type: "resistance",
        })
      }

      // Check for pivot low (support)
      if (current.low < prev2.low && current.low < prev1.low && current.low < next1.low && current.low < next2.low) {
        levels.push({
          level: current.low,
          strength: 1,
          type: "support",
        })
      }
    }

    // Group similar levels and increase strength
    const groupedLevels: SupportResistance[] = []

    levels.forEach((level) => {
      const existing = groupedLevels.find(
        (gl) => gl.type === level.type && Math.abs(gl.level - level.level) / level.level < tolerance,
      )

      if (existing) {
        existing.strength += 1
        existing.level = (existing.level + level.level) / 2 // Average the levels
      } else {
        groupedLevels.push({ ...level })
      }
    })

    return groupedLevels.sort((a, b) => b.strength - a.strength)
  }, [])

  // Calculate analysis for selected range
  const calculateAnalysis = useCallback(
    (startIdx: number, endIdx: number): AnalysisResult => {
      const selectedData = data.slice(startIdx, endIdx + 1)
      const startCandle = selectedData[0]
      const endCandle = selectedData[selectedData.length - 1]

      const high = Math.max(...selectedData.map((d) => d.high))
      const low = Math.min(...selectedData.map((d) => d.low))

      const priceChange = endCandle.close - startCandle.open
      const priceChangePercent = (priceChange / startCandle.open) * 100

      // Calculate volatility (standard deviation of daily returns)
      const dailyReturns = selectedData
        .slice(1)
        .map((d, i) => (d.close - selectedData[i].close) / selectedData[i].close)
      const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length
      const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length
      const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100 // Annualized volatility

      // Determine trend
      let trend: "bullish" | "bearish" | "sideways" = "sideways"
      if (priceChangePercent > 2) trend = "bullish"
      else if (priceChangePercent < -2) trend = "bearish"

      // Calculate support and resistance
      const allLevels = calculateSupportResistance(selectedData)
      const supportLevels = allLevels.filter((l) => l.type === "support").slice(0, 3)
      const resistanceLevels = allLevels.filter((l) => l.type === "resistance").slice(0, 3)

      // Find strongest levels
      const strongSupport = supportLevels.length > 0 ? supportLevels[0].level : low
      const strongResistance = resistanceLevels.length > 0 ? resistanceLevels[0].level : high
      const currentPrice = endCandle.close

      // Determine current level position
      let currentLevel: "above_support" | "below_resistance" | "between" | "at_support" | "at_resistance" = "between"
      const tolerance = (high - low) * 0.01 // 1% tolerance

      if (Math.abs(currentPrice - strongSupport) < tolerance) {
        currentLevel = "at_support"
      } else if (Math.abs(currentPrice - strongResistance) < tolerance) {
        currentLevel = "at_resistance"
      } else if (currentPrice < strongSupport) {
        currentLevel = "below_resistance"
      } else if (currentPrice > strongResistance) {
        currentLevel = "above_support"
      }

      const avgVolume = selectedData.reduce((sum, d) => sum + d.volume, 0) / selectedData.length
      const totalTurnover = selectedData.reduce((sum, d) => sum + d.turnover, 0)

      return {
        startDate: startCandle.date,
        endDate: endCandle.date,
        startPrice: startCandle.open,
        endPrice: endCandle.close,
        priceChange,
        priceChangePercent,
        high,
        low,
        volatility,
        trend,
        days: selectedData.length,
        supportLevels,
        resistanceLevels,
        keyLevels: {
          strongSupport,
          strongResistance,
          currentLevel,
        },
        avgVolume,
        totalTurnover,
      }
    },
    [data, calculateSupportResistance],
  )

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    // Ensure canvas doesn't exceed container bounds
    const maxWidth = rect.width
    const maxHeight = rect.height
    canvas.width = Math.min(maxWidth * dpr, 2000) // Cap at reasonable max
    canvas.height = Math.min(maxHeight * dpr, 1200) // Cap at reasonable max
    ctx.scale(dpr, dpr)

    const width = canvas.width / dpr
    const height = canvas.height / dpr
    const padding = { top: 20, right: 40, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Clear canvas with dark background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
    ctx.fillRect(0, 0, width, height)

    // Calculate price range
    const minPrice = Math.min(...data.map((d) => d.low))
    const maxPrice = Math.max(...data.map((d) => d.high))
    const priceRange = maxPrice - minPrice
    const priceScale = chartHeight / priceRange

    // Draw grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
    }

    // Draw price labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.font = "12px Arial"
    ctx.textAlign = "right"
    for (let i = 0; i <= 10; i++) {
      const price = maxPrice - (priceRange * i) / 10
      const y = padding.top + (chartHeight * i) / 10
      ctx.fillText(`₹${price.toFixed(2)}`, padding.left - 10, y + 4)
    }

    // Draw selection background
    if (selection) {
      const startX = padding.left + (selection.start / data.length) * chartWidth
      const endX = padding.left + (selection.end / data.length) * chartWidth
      ctx.fillStyle = "rgba(139, 92, 246, 0.2)"
      ctx.fillRect(startX, padding.top, endX - startX, chartHeight)
    }

    // Draw support and resistance levels if analysis exists
    if (analysis && selection) {
      // Draw support levels
      analysis.supportLevels.forEach((support, index) => {
        const y = padding.top + chartHeight - (support.level - minPrice) * priceScale
        ctx.strokeStyle = `rgba(34, 197, 94, ${0.8 - index * 0.2})` // Green with decreasing opacity
        ctx.lineWidth = 2 + support.strength
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartWidth, y)
        ctx.stroke()

        // Label
        ctx.fillStyle = "rgba(34, 197, 94, 0.9)"
        ctx.font = "11px Arial"
        ctx.textAlign = "left"
        ctx.fillText(`S${index + 1}: ₹${support.level.toFixed(2)}`, padding.left + 5, y - 5)
      })

      // Draw resistance levels
      analysis.resistanceLevels.forEach((resistance, index) => {
        const y = padding.top + chartHeight - (resistance.level - minPrice) * priceScale
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 - index * 0.2})` // Red with decreasing opacity
        ctx.lineWidth = 2 + resistance.strength
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + chartWidth, y)
        ctx.stroke()

        // Label
        ctx.fillStyle = "rgba(239, 68, 68, 0.9)"
        ctx.font = "11px Arial"
        ctx.textAlign = "left"
        ctx.fillText(`R${index + 1}: ₹${resistance.level.toFixed(2)}`, padding.left + 5, y + 15)
      })

      ctx.setLineDash([]) // Reset line dash
    }

    // Draw candlesticks
    const candleWidth = Math.max(2, chartWidth / data.length - 1)
    data.forEach((candle, index) => {
      const x = padding.left + (index / data.length) * chartWidth
      const openY = padding.top + chartHeight - (candle.open - minPrice) * priceScale
      const closeY = padding.top + chartHeight - (candle.close - minPrice) * priceScale
      const highY = padding.top + chartHeight - (candle.high - minPrice) * priceScale
      const lowY = padding.top + chartHeight - (candle.low - minPrice) * priceScale

      const isGreen = candle.close > candle.open
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444"
      ctx.fillStyle = isGreen ? "#10b981" : "#ef4444"

      // Draw wick
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + candleWidth / 2, highY)
      ctx.lineTo(x + candleWidth / 2, lowY)
      ctx.stroke()

      // Draw body
      const bodyTop = Math.min(openY, closeY)
      const bodyHeight = Math.abs(closeY - openY)
      ctx.fillRect(x, bodyTop, candleWidth, Math.max(1, bodyHeight))
    })

    // Draw selection borders
    if (selection) {
      const startX = padding.left + (selection.start / data.length) * chartWidth
      const endX = padding.left + (selection.end / data.length) * chartWidth
      ctx.strokeStyle = "#8b5cf6"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(startX, padding.top)
      ctx.lineTo(startX, padding.top + chartHeight)
      ctx.moveTo(endX, padding.top)
      ctx.lineTo(endX, padding.top + chartHeight)
      ctx.stroke()
    }
  }, [data, selection, analysis])

  // Handle mouse events for selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 60, right: 40 }
    const chartWidth = rect.width - padding.left - padding.right

    if (x < padding.left || x > rect.width - padding.right) return

    const index = Math.floor(((x - padding.left) / chartWidth) * data.length)
    setIsDragging(true)
    setDragStart({ x, index })
    setSelection({ start: index, end: index })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !data.length) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = { left: 60, right: 40 }
    const chartWidth = rect.width - padding.left - padding.right

    const index = Math.max(0, Math.min(data.length - 1, Math.floor(((x - padding.left) / chartWidth) * data.length)))
    const start = Math.min(dragStart.index, index)
    const end = Math.max(dragStart.index, index)

    setSelection({ start, end })
  }

  const handleMouseUp = () => {
    if (isDragging && selection) {
      const analysisResult = calculateAnalysis(selection.start, selection.end)
      setAnalysis(analysisResult)
    }
    setIsDragging(false)
    setDragStart(null)
  }

  const clearSelection = () => {
    setSelection(null)
    setAnalysis(null)
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/20">
            {symbols.map((symbol) => (
              <SelectItem key={symbol} value={symbol} className="text-white hover:bg-white/10">
                {symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDays} onValueChange={setSelectedDays}>
          <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/20">
            <SelectItem value="7" className="text-white hover:bg-white/10">
              7D
            </SelectItem>
            <SelectItem value="30" className="text-white hover:bg-white/10">
              30D
            </SelectItem>
            <SelectItem value="90" className="text-white hover:bg-white/10">
              90D
            </SelectItem>
            <SelectItem value="180" className="text-white hover:bg-white/10">
              180D
            </SelectItem>
            <SelectItem value="365" className="text-white hover:bg-white/10">
              1Y
            </SelectItem>
          </SelectContent>
        </Select>

        {data.length > 0 && (
          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-400/30">
            {data.length} trading days
          </Badge>
        )}

        {selection && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            Clear Selection
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={isLoading}
          className="ml-auto bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white font-medium">Loading NSE historical data...</p>
            <p className="text-gray-400 text-sm mt-1">
              Fetching {selectedSymbol} data for {selectedDays} days
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 mb-2 font-medium">Error loading NSE data</p>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <Button onClick={fetchData} className="bg-gradient-to-r from-purple-500 to-pink-500">
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <div className="w-full h-full">
              <canvas
                ref={canvasRef}
                className="w-full h-full max-w-full max-h-full border border-white/20 rounded-xl cursor-crosshair bg-black/20 backdrop-blur-xl"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
            <div className="absolute top-3 left-3 text-xs text-cyan-300 bg-black/60 px-3 py-2 rounded-lg backdrop-blur-xl border border-white/20">
              Click and drag to select a time period for technical analysis
            </div>
          </div>

          {analysis && (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {/* Key Levels Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-xl border border-blue-500/20 backdrop-blur-xl">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-white">
                  {analysis.trend === "bullish" && <TrendingUp className="h-4 w-4 text-green-400" />}
                  {analysis.trend === "bearish" && <TrendingDown className="h-4 w-4 text-red-400" />}
                  {analysis.trend === "sideways" && <Minus className="h-4 w-4 text-gray-400" />}
                  Key Levels Analysis ({analysis.days} days)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-gray-400">Strong Support</p>
                    <p className="text-lg font-bold text-green-400">₹{analysis.keyLevels.strongSupport.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-gray-400">Current Position</p>
                    <Badge
                      className={
                        analysis.keyLevels.currentLevel === "at_support"
                          ? "bg-red-500/20 text-red-300 border-red-400/30"
                          : analysis.keyLevels.currentLevel === "at_resistance"
                            ? "bg-red-500/20 text-red-300 border-red-400/30"
                            : analysis.keyLevels.currentLevel === "above_support"
                              ? "bg-green-500/20 text-green-300 border-green-400/30"
                              : "bg-gray-500/20 text-gray-300 border-gray-400/30"
                      }
                    >
                      {analysis.keyLevels.currentLevel.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-center p-3 bg-white/10 rounded-lg border border-white/20">
                    <p className="text-sm text-gray-400">Strong Resistance</p>
                    <p className="text-lg font-bold text-red-400">₹{analysis.keyLevels.strongResistance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Support and Resistance Levels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-xl border border-green-500/20 backdrop-blur-xl">
                  <h4 className="font-semibold text-green-300 mb-3">Support Levels</h4>
                  {analysis.supportLevels.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.supportLevels.map((support, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                          <span className="text-sm text-white">S{index + 1}</span>
                          <span className="font-mono text-green-300">₹{support.level.toFixed(2)}</span>
                          <Badge className="text-xs bg-green-500/20 text-green-300 border-green-400/30">
                            Strength: {support.strength}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No significant support levels found</p>
                  )}
                </div>

                <div className="p-4 bg-gradient-to-br from-red-900/40 to-pink-900/40 rounded-xl border border-red-500/20 backdrop-blur-xl">
                  <h4 className="font-semibold text-red-300 mb-3">Resistance Levels</h4>
                  {analysis.resistanceLevels.length > 0 ? (
                    <div className="space-y-2">
                      {analysis.resistanceLevels.map((resistance, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white/10 rounded-lg">
                          <span className="text-sm text-white">R{index + 1}</span>
                          <span className="font-mono text-red-300">₹{resistance.level.toFixed(2)}</span>
                          <Badge className="text-xs bg-red-500/20 text-red-300 border-red-400/30">
                            Strength: {resistance.strength}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No significant resistance levels found</p>
                  )}
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-xl">
                <div>
                  <div className="text-sm text-gray-400">Price Change</div>
                  <div className={`font-semibold ${analysis.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ₹{analysis.priceChange.toFixed(2)} ({analysis.priceChangePercent.toFixed(2)}%)
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">High / Low</div>
                  <div className="font-semibold text-white">
                    ₹{analysis.high.toFixed(2)} / ₹{analysis.low.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Volatility</div>
                  <div className="font-semibold text-purple-400">{analysis.volatility.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Trend</div>
                  <Badge
                    className={
                      analysis.trend === "bullish"
                        ? "bg-green-500/20 text-green-300 border-green-400/30"
                        : analysis.trend === "bearish"
                          ? "bg-red-500/20 text-red-300 border-red-400/30"
                          : "bg-gray-500/20 text-gray-300 border-gray-400/30"
                    }
                  >
                    {analysis.trend}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Avg Volume</div>
                  <div className="font-semibold text-blue-400">{(analysis.avgVolume / 1000000).toFixed(2)}M</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Total Turnover</div>
                  <div className="font-semibold text-cyan-400">₹{(analysis.totalTurnover / 10000000).toFixed(2)}Cr</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Start Price</div>
                  <div className="font-semibold text-white">₹{analysis.startPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">End Price</div>
                  <div className="font-semibold text-white">₹{analysis.endPrice.toFixed(2)}</div>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <div className="text-sm text-gray-400">Analysis Period</div>
                  <div className="text-sm text-white">
                    {analysis.startDate} to {analysis.endDate} ({analysis.days} trading days)
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
