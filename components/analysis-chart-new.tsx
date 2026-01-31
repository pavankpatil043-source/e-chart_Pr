"use client"

import { useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { createChart, ColorType, CrosshairMode, type IChartApi } from "lightweight-charts"

interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface AnalysisChartProps {
  symbol?: string
  data?: ChartData[]
  patterns?: Array<{
    pattern: string
    type: 'bullish' | 'bearish' | 'neutral' | 'reversal'
    confidence: number
  }>
  indicators?: {
    rsi?: number
    fibonacci?: Array<{ level: number; price: number }>
  }
}

export function AnalysisChart({ 
  symbol = "NIFTY 50", 
  data = [],
  patterns = [],
  indicators = {}
}: AnalysisChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<any>(null)

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#758696',
          style: 3,
          labelBackgroundColor: '#4682B4',
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: 3,
          labelBackgroundColor: '#4682B4',
        },
      },
      grid: {
        vertLines: { color: "#1e293b", style: 1, visible: true },
        horzLines: { color: "#1e293b", style: 1, visible: true },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000)
          const timeStr = date.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
          const match = timeStr.match(/(\d{2}):(\d{2})/)
          return match ? `${match[1]}:${match[2]}` : timeStr
        },
      },
      localization: {
        locale: 'en-IN',
        priceFormatter: (price: any) => {
          return '₹' + price.toFixed(2)
        },
        timeFormatter: (time: any) => {
          const date = new Date(time * 1000)
          return date.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        },
      },
      rightPriceScale: {
        borderColor: "#2B2B43",
        visible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    chartRef.current = chart

    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })

    candlestickSeriesRef.current = candlestickSeries

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [])

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current || data.length === 0) return

    const formattedData = data.map((d) => ({
      time: Math.floor(d.timestamp / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    formattedData.sort((a, b) => a.time - b.time)
    candlestickSeriesRef.current.setData(formattedData)

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [data])

  return (
    <div className="space-y-2">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-semibold text-white">AI Technical Chart with Real Candlesticks</h3>
        {data.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {data.length} Candles
          </Badge>
        )}
      </div>

      {/* Pattern Badges */}
      {patterns.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {patterns.map((pattern, idx) => (
            <Badge 
              key={idx}
              variant={pattern.type === 'bullish' ? 'default' : pattern.type === 'bearish' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {pattern.pattern} ({Math.round(pattern.confidence)}%)
            </Badge>
          ))}
        </div>
      )}

      {/* Indicators */}
      {indicators.rsi && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">AI Selected Indicators:</span>
          <Badge variant="outline" className="text-xs">
            RSI: {indicators.rsi.toFixed(1)}
          </Badge>
          {indicators.fibonacci && indicators.fibonacci.map((fib, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              Fib {(fib.level * 100).toFixed(1)}%: ₹{fib.price.toFixed(2)}
            </Badge>
          ))}
        </div>
      )}

      {/* TradingView Chart */}
      <div 
        ref={chartContainerRef} 
        className="w-full rounded-lg overflow-hidden border border-slate-800"
        style={{ height: "400px" }}
      />
    </div>
  )
}
