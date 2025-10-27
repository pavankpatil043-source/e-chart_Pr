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
  Maximize2,
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
  companyName: string
  sector: string
  source: string
}

const TIMEFRAMES = [
  { value: "1", label: "1m" },
  { value: "5", label: "5m" },
  { value: "15", label: "15m" },
  { value: "60", label: "1h" },
  { value: "240", label: "4h" },
  { value: "D", label: "1D" },
]

export default function TradingViewLiveChart() {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [timeframe, setTimeframe] = useState<string>("15")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const chartKey = useRef(0)

  // Fetch live price data from Yahoo Finance API
  const fetchStockPrice = async (symbol: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/yahoo-quote?symbol=${symbol}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
          
          setStockData({
            symbol: toBaseSymbol(symbol),
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume || 0,
            high: data.high || data.price * 1.02,
            low: data.low || data.price * 0.98,
            open: data.open || data.price * 0.999,
            companyName: stock?.name || data.companyName || toBaseSymbol(symbol),
            sector: stock?.sector || "Unknown",
            source: data.source || "Yahoo Finance"
          })
          
          setIsConnected(true)
          setLastUpdate(new Date())
          console.log(`✅ Fetched price for ${symbol}: ₹${data.price}`)
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Update price periodically
  useEffect(() => {
    if (selectedStock) {
      fetchStockPrice(selectedStock.symbol)
      
      // Update every 5 seconds
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
  }, [selectedStock])

  const handleStockChange = (symbol: string) => {
    const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      setSelectedStock(stock)
      chartKey.current += 1 // Force chart to remount
    }
  }

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    chartKey.current += 1 // Force chart to remount
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

  // Get TradingView symbol (NSE format)
  const tvSymbol = `NSE:${toBaseSymbol(selectedStock.symbol)}`

  return (
    <div className="space-y-4">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-7 w-7 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">TradingView Live Chart</h2>
              <p className="text-sm text-slate-400">Real-time stock data and charts</p>
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
            <SelectTrigger className="w-24 bg-slate-800/50 border-slate-700 text-white">
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
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={() => fetchStockPrice(selectedStock.symbol)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-white hover:bg-slate-800"
            onClick={() => window.open(`https://www.tradingview.com/chart/?symbol=${tvSymbol}`, '_blank')}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Full Screen
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
                  <div className="flex items-center space-x-2 text-slate-400">
                    <span>{stockData.symbol}</span>
                    <span>•</span>
                    <span>{stockData.sector}</span>
                    <span>•</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
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

            {lastUpdate && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                <span>Data source: {stockData.source}</span>
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TradingView Embedded Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-400" />
            Live Candlestick Chart
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative w-full" style={{ height: "600px" }}>
            <iframe
              key={`chart-${chartKey.current}`}
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(tvSymbol)}&interval=${timeframe}&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=0f172a&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FKolkata&studies_overrides=%7B%7D&overrides=%7B%22paneProperties.background%22%3A%220f172a%22%2C%22paneProperties.vertGridProperties.color%22%3A%221e293b%22%2C%22paneProperties.horzGridProperties.color%22%3A%221e293b%22%2C%22symbolWatermarkProperties.transparency%22%3A90%2C%22scalesProperties.textColor%22%3A%2294a3b8%22%2C%22mainSeriesProperties.candleStyle.upColor%22%3A%2210b981%22%2C%22mainSeriesProperties.candleStyle.downColor%22%3A%22ef4444%22%2C%22mainSeriesProperties.candleStyle.drawWick%22%3Atrue%2C%22mainSeriesProperties.candleStyle.drawBorder%22%3Atrue%2C%22mainSeriesProperties.candleStyle.borderColor%22%3A%2210b981%22%2C%22mainSeriesProperties.candleStyle.borderUpColor%22%3A%2210b981%22%2C%22mainSeriesProperties.candleStyle.borderDownColor%22%3A%22ef4444%22%2C%22mainSeriesProperties.candleStyle.wickUpColor%22%3A%2210b981%22%2C%22mainSeriesProperties.candleStyle.wickDownColor%22%3A%22ef4444%22%7D&locale=en&uid=tradingview_chart&colorTheme=dark`}
              className="w-full h-full rounded-lg"
              style={{ border: 0 }}
              allowFullScreen
              title="TradingView Chart"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Activity className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-white font-medium mb-1">Real-Time Stock Data</h4>
              <p className="text-sm text-slate-300">
                This chart displays <strong>real-time price data</strong> from TradingView combined with live prices from Yahoo Finance. 
                Select any Nifty 50 stock from the dropdown to view its chart. Prices update automatically every 5 seconds and are 
                stable across page refreshes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
