"use client"

import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS } from "@/lib/nifty-50-stocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react"

interface YahooFinanceLiveChartProps {
  onStockChange?: (stock: { symbol: string; name: string; sector: string }) => void
  onTimeframeChange?: (timeframe: string) => void
  onDataUpdate?: (data: {
    price: number
    previousClose: number
    change: number
    changePercent: number
    high: number
    low: number
    volume: number
  }) => void
}

const TIMEFRAMES = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
]

export default function YahooFinanceLiveChart({
  onStockChange,
  onTimeframeChange,
  onDataUpdate,
}: YahooFinanceLiveChartProps) {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [timeframe, setTimeframe] = useState("1mo")
  const [stockData, setStockData] = useState<any>(null)
  const [widgetKey, setWidgetKey] = useState(0) // Force re-render on change
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch real-time stock price data
  const fetchStockPrice = async (symbol: string) => {
    try {
      const response = await fetch(`/api/multi-source-quote?symbol=${symbol}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setStockData(result.data)
          
          // Notify parent component
          if (onDataUpdate) {
            onDataUpdate({
              price: result.data.price || 0,
              previousClose: result.data.previousClose || 0,
              change: result.data.change || 0,
              changePercent: result.data.changePercent || 0,
              high: result.data.high || 0,
              low: result.data.low || 0,
              volume: result.data.volume || 0,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
    }
  }

  // Fetch stock price on mount and set up interval
  useEffect(() => {
    fetchStockPrice(selectedStock.symbol)

    // Update price every 5 seconds
    priceUpdateIntervalRef.current = setInterval(() => {
      fetchStockPrice(selectedStock.symbol)
    }, 5000)

    return () => {
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current)
      }
    }
  }, [selectedStock])

  const handleStockChange = (symbol: string) => {
    const stock = NIFTY_50_STOCKS.find((s) => s.symbol === symbol)
    if (stock) {
      setSelectedStock(stock)
      setWidgetKey(prev => prev + 1) // Force widget reload
      if (onStockChange) {
        onStockChange(stock)
      }
    }
  }

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf)
    setWidgetKey(prev => prev + 1) // Force widget reload
    if (onTimeframeChange) {
      onTimeframeChange(tf)
    }
  }

  // Map timeframe to Yahoo Finance range parameter
  const getYahooRange = (tf: string) => {
    const rangeMap: { [key: string]: string } = {
      "1d": "1d",
      "5d": "5d",
      "1mo": "1mo",
      "3mo": "3mo",
      "6mo": "6mo",
      "1y": "1y",
      "5y": "5y",
    }
    return rangeMap[tf] || "1mo"
  }

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* Stock Selector */}
          <Select value={selectedStock.symbol} onValueChange={handleStockChange}>
            <SelectTrigger className="w-[280px] bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[400px] bg-[#1a1f2e] border-white/10">
              <div className="p-2 border-b border-white/10">
                <p className="text-xs text-white/50 font-medium">POPULAR STOCKS</p>
              </div>
              {POPULAR_NIFTY_STOCKS.map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol} className="cursor-pointer hover:bg-white/10">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-semibold text-white">{stock.name}</p>
                      <p className="text-xs text-white/50">{stock.sector}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
              <div className="p-2 border-t border-b border-white/10">
                <p className="text-xs text-white/50 font-medium">ALL NIFTY 50</p>
              </div>
              {NIFTY_50_STOCKS.filter(
                (stock) => !POPULAR_NIFTY_STOCKS.find((p) => p.symbol === stock.symbol)
              ).map((stock) => (
                <SelectItem key={stock.symbol} value={stock.symbol} className="cursor-pointer hover:bg-white/10">
                  <div>
                    <p className="font-semibold text-white">{stock.name}</p>
                    <p className="text-xs text-white/50">{stock.sector}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Live Price Display */}
          {stockData && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <div>
                <div className="text-2xl font-bold text-white tabular-nums">
                  ₹{stockData.price?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${stockData.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stockData.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stockData.change >= 0 ? "+" : ""}
                  {stockData.change?.toFixed(2)} ({stockData.changePercent?.toFixed(2)}%)
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.value}
                variant="ghost"
                size="sm"
                className={`px-3 py-1 h-8 text-xs font-medium transition-all ${
                  timeframe === tf.value
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
                onClick={() => handleTimeframeChange(tf.value)}
              >
                {tf.label}
              </Button>
            ))}
          </div>

          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
            Live Chart
          </Badge>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={() => {
              setWidgetKey(prev => prev + 1)
              fetchStockPrice(selectedStock.symbol)
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Yahoo Finance Embedded Chart */}
      <div className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-[#0a0e1a]" style={{ height: "600px" }}>
        <iframe
          key={widgetKey}
          src={`https://finance.yahoo.com/chart/${selectedStock.symbol}?range=${getYahooRange(timeframe)}&interval=1d&theme=dark`}
          className="w-full h-full"
          style={{ border: "none" }}
          title={`Yahoo Finance Chart for ${selectedStock.symbol}`}
        />
      </div>

      {/* Additional Stock Info */}
      {stockData && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Open</p>
            <p className="text-lg font-semibold text-white">₹{stockData.open?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-white/50 mb-1">High</p>
            <p className="text-lg font-semibold text-emerald-400">₹{stockData.high?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Low</p>
            <p className="text-lg font-semibold text-red-400">₹{stockData.low?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-xs text-white/50 mb-1">Volume</p>
            <p className="text-lg font-semibold text-white">{(stockData.volume / 1000000).toFixed(2)}M</p>
          </div>
        </div>
      )}
    </div>
  )
}
