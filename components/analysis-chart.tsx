"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Move, TrendingUp, TrendingDown } from "lucide-react"

interface Point {
  x: number
  y: number
}

interface Line {
  id: string
  start: Point
  end: Point
  type: "support" | "resistance" | "trend"
  color: string
}

interface ChartData {
  timestamp: number
  price: number
  volume: number
}

export function AnalysisChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentLine, setCurrentLine] = useState<Line | null>(null)
  const [selectedTool, setSelectedTool] = useState<"support" | "resistance" | "trend">("support")
  const [chartData, setChartData] = useState<ChartData[]>([])

  // Generate sample chart data
  useEffect(() => {
    const generateData = () => {
      const data: ChartData[] = []
      let price = 2400
      const now = Date.now()

      for (let i = 0; i < 100; i++) {
        price += (Math.random() - 0.5) * 20
        data.push({
          timestamp: now - (100 - i) * 60000, // 1 minute intervals
          price: Math.max(2200, Math.min(2600, price)),
          volume: Math.random() * 1000000,
        })
      }
      return data
    }

    setChartData(generateData())
  }, [])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || chartData.length === 0) return

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
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, width, height)

    // Calculate price range
    const prices = chartData.map((d) => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice

    // Draw grid
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i * (height - 2 * padding)) / 10
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding + (i * (width - 2 * padding)) / 10
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Draw price line
    ctx.strokeStyle = "#8b5cf6"
    ctx.lineWidth = 2
    ctx.beginPath()

    chartData.forEach((point, index) => {
      const x = padding + (index * (width - 2 * padding)) / (chartData.length - 1)
      const y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding)

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw support/resistance lines
    lines.forEach((line) => {
      ctx.strokeStyle = line.color
      ctx.lineWidth = 2
      ctx.setLineDash(line.type === "trend" ? [] : [5, 5])
      ctx.beginPath()
      ctx.moveTo(line.start.x, line.start.y)
      ctx.lineTo(line.end.x, line.end.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw line labels
      ctx.fillStyle = line.color
      ctx.font = "12px sans-serif"
      const label = line.type.charAt(0).toUpperCase() + line.type.slice(1)
      ctx.fillText(label, line.start.x + 5, line.start.y - 5)
    })

    // Draw price labels
    ctx.fillStyle = "#94a3b8"
    ctx.font = "12px sans-serif"
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (i * priceRange) / 5
      const y = height - padding - (i * (height - 2 * padding)) / 5
      ctx.fillText(`₹${price.toFixed(0)}`, 5, y + 4)
    }
  }, [chartData, lines])

  const getToolColor = (tool: string) => {
    switch (tool) {
      case "support":
        return "#10b981"
      case "resistance":
        return "#ef4444"
      case "trend":
        return "#3b82f6"
      default:
        return "#6b7280"
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newLine: Line = {
      id: Date.now().toString(),
      start: { x, y },
      end: { x, y },
      type: selectedTool,
      color: getToolColor(selectedTool),
    }

    setCurrentLine(newLine)
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentLine) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentLine({
      ...currentLine,
      end: { x, y },
    })
  }

  const handleMouseUp = () => {
    if (currentLine && isDrawing) {
      setLines((prev) => [...prev, currentLine])
    }
    setIsDrawing(false)
    setCurrentLine(null)
  }

  const clearLines = () => {
    setLines([])
  }

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0
  const previousPrice = chartData.length > 1 ? chartData[chartData.length - 2].price : 0
  const priceChange = currentPrice - previousPrice
  const isPositive = priceChange >= 0

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedTool === "support" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("support")}
            className="text-xs"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Support
          </Button>
          <Button
            variant={selectedTool === "resistance" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("resistance")}
            className="text-xs"
          >
            <TrendingDown className="h-3 w-3 mr-1" />
            Resistance
          </Button>
          <Button
            variant={selectedTool === "trend" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTool("trend")}
            className="text-xs"
          >
            <Move className="h-3 w-3 mr-1" />
            Trend
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className={isPositive ? "text-green-600" : "text-red-600"}>
            ₹{currentPrice.toFixed(2)} ({isPositive ? "+" : ""}
            {priceChange.toFixed(2)})
          </Badge>
          <Button variant="outline" size="sm" onClick={clearLines}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            className="w-full h-80 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="text-xs text-white/70 text-center">
        Click and drag to draw {selectedTool} lines • {lines.length} lines drawn
      </div>
    </div>
  )
}
