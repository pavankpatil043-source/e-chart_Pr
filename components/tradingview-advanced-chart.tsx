"use client"

import { useState, useEffect, useRef } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS } from "@/lib/nifty-50-stocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react"

interface TradingViewAdvancedChartProps {
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

interface ChartDataPoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

declare global {
  interface Window {
    TradingView: any
  }
}

export default function TradingViewAdvancedChart({
  onStockChange,
  onTimeframeChange,
  onDataUpdate,
}: TradingViewAdvancedChartProps = {}) {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [stockData, setStockData] = useState<any>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const priceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load TradingView script
  useEffect(() => {
    if (document.getElementById("tradingview-widget-script")) {
      setIsScriptLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.id = "tradingview-widget-script"
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
      const existingScript = document.getElementById("tradingview-widget-script")
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

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

  // Initialize TradingView widget
  useEffect(() => {
    if (!isScriptLoaded || !containerRef.current || !window.TradingView) return

    // Clean up previous widget
    if (widgetRef.current) {
      try {
        widgetRef.current.remove()
      } catch (e) {
        console.warn("Error removing widget:", e)
      }
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = ""
    }

    // Map Indian stock symbols to TradingView format
    const getTradingViewSymbol = (symbol: string) => {
      // Remove .NS suffix and map to NSE exchange
      const baseSymbol = symbol.replace(".NS", "")
      return `NSE:${baseSymbol}`
    }

    try {
      // Create new TradingView Advanced Chart widget
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: getTradingViewSymbol(selectedStock.symbol),
        interval: "D", // Daily interval
        timezone: "Asia/Kolkata",
        theme: "dark",
        style: "1", // Candlestick chart
        locale: "en",
        toolbar_bg: "#0a0e1a",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: containerRef.current.id,
        // Advanced features
        studies: [
          "Volume@tv-basicstudies",
          "MASimple@tv-basicstudies",
        ],
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        // Styling
        backgroundColor: "#0a0e1a",
        gridColor: "rgba(255, 255, 255, 0.06)",
        studies_overrides: {
          "volume.volume.color.0": "rgba(239, 68, 68, 0.5)",
          "volume.volume.color.1": "rgba(34, 197, 94, 0.5)",
        },
        overrides: {
          "paneProperties.background": "#0a0e1a",
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": "rgba(255, 255, 255, 0.06)",
          "paneProperties.horzGridProperties.color": "rgba(255, 255, 255, 0.06)",
          "scalesProperties.textColor": "#9ca3af",
          "scalesProperties.lineColor": "rgba(255, 255, 255, 0.1)",
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
          "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
          "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
        },
        disabled_features: [
          "use_localstorage_for_settings",
          "header_symbol_search",
        ],
        enabled_features: [
          "study_templates",
          "side_toolbar_in_fullscreen_mode",
        ],
      })

      console.log("✅ TradingView widget initialized for", selectedStock.symbol)
    } catch (error) {
      console.error("❌ Error initializing TradingView widget:", error)
    }

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {
          console.warn("Cleanup error:", e)
        }
      }
    }
  }, [isScriptLoaded, selectedStock])

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
      if (onStockChange) {
        onStockChange(stock)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Stock Selector and Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={selectedStock.symbol} onValueChange={handleStockChange}>
            <SelectTrigger className="w-[280px] bg-white/5 border-white/10">
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
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-semibold text-white">{stock.name}</p>
                      <p className="text-xs text-white/50">{stock.sector}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

        <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
          Live Chart
        </Badge>
      </div>

      {/* TradingView Chart Container */}
      <div className="relative w-full" style={{ height: "600px" }}>
        <div
          ref={containerRef}
          id="tradingview-advanced-chart"
          className="w-full h-full rounded-lg overflow-hidden border border-white/10"
        />
        {!isScriptLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a] rounded-lg">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-4 text-sm text-white/60">Loading advanced chart...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
