"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, RefreshCw, Building2, Users, Globe, BarChart3 } from "lucide-react"

interface FIIDIIData {
  date: string
  fii: {
    buy: number
    sell: number
    net: number
  }
  dii: {
    buy: number
    sell: number
    net: number
  }
}

interface CandlestickData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  type: 'buy' | 'sell'
}

export function FIIDIIDataPanel() {
  const [fiiDiiData, setFiiDiiData] = useState<FIIDIIData[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("7d")
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [hoveredData, setHoveredData] = useState<{ date: string; fii: number; dii: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const periods = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "3mo", label: "3 Months" },
    { value: "6mo", label: "6 Months" },
  ]

  // Fetch FII DII data from multiple sources
  const fetchFIIDIIData = async () => {
    setLoading(true)
    try {
      console.log("🌐 Fetching live FII/DII data...")
      
      // Try MoneyControl first (most reliable for Indian market)
      console.log("1️⃣ Trying MoneyControl...")
      const mcResponse = await fetch(`/api/moneycontrol-fiidii?period=${selectedPeriod}`)
      const mcData = await mcResponse.json()
      
      if (mcData.success && mcData.data?.length > 0) {
        setFiiDiiData(mcData.data)
        setLastUpdate(new Date())
        console.log(`✅ FII/DII data loaded from MoneyControl: ${mcData.data.length} records`)
        return
      }
      
      // Try NSE scraper second (backup source)
      console.log("2️⃣ MoneyControl unavailable, trying NSE...")
      const nseResponse = await fetch(`/api/nse-fiidii?period=${selectedPeriod}`)
      const nseData = await nseResponse.json()
      
      if (nseData.success && nseData.data?.length > 0) {
        setFiiDiiData(nseData.data)
        setLastUpdate(new Date())
        console.log(`✅ FII/DII data loaded from NSE: ${nseData.metadata?.source}`)
        console.log(`📊 ${nseData.data.length} records for period: ${selectedPeriod}`)
        return
      }
      
      // Fallback to Breeze API
      console.log("3️⃣ NSE unavailable, trying Breeze API...")
      const breezeResponse = await fetch(`/api/live-fii-dii?period=${selectedPeriod}`)
      const breezeData = await breezeResponse.json()
      
      if (breezeData.success) {
        setFiiDiiData(breezeData.data)
        setLastUpdate(new Date())
        console.log(`✅ FII/DII data loaded from Breeze API`)
        return
      }
      
      throw new Error('All sources (MoneyControl, NSE, Breeze) failed')
      
    } catch (error) {
      console.error("❌ Error fetching FII/DII data:", error)
      
      // Final fallback to original API
      try {
        console.log("4️⃣ Trying final fallback API...")
        const fallbackResponse = await fetch(`/api/fii-dii-data?period=${selectedPeriod}`)
        const fallbackData = await fallbackResponse.json()
        
        if (fallbackData.success) {
          setFiiDiiData(fallbackData.data)
          setLastUpdate(new Date())
          console.log("✅ FII/DII data loaded from fallback API")
        } else {
          generateSampleData()
        }
      } catch (fallbackError) {
        console.error("❌ All APIs failed, using sample data:", fallbackError)
        generateSampleData()
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const data: FIIDIIData[] = []
    const days = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : 90
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const fiiBuy = Math.random() * 5000 + 2000 // 2000-7000 crores
      const fiiSell = Math.random() * 5000 + 2000
      const diiBuy = Math.random() * 3000 + 1000 // 1000-4000 crores
      const diiSell = Math.random() * 3000 + 1000
      
      data.push({
        date: date.toISOString().split('T')[0],
        fii: {
          buy: fiiBuy,
          sell: fiiSell,
          net: fiiBuy - fiiSell
        },
        dii: {
          buy: diiBuy,
          sell: diiSell,
          net: diiBuy - diiSell
        }
      })
    }
    
    setFiiDiiData(data)
    setLastUpdate(new Date())
  }

  // Convert FII DII data to candlestick format (kept for compatibility)
  const convertToCandlestickData = (data: FIIDIIData[], type: 'fii' | 'dii'): CandlestickData[] => {
    return data.map((item, index) => {
      const netFlow = type === 'fii' ? item.fii.net : item.dii.net
      const buyAmount = type === 'fii' ? item.fii.buy : item.dii.buy
      const sellAmount = type === 'fii' ? item.fii.sell : item.dii.sell
      
      return {
        date: item.date,
        open: buyAmount,
        high: Math.max(buyAmount, sellAmount),
        low: Math.min(buyAmount, sellAmount),
        close: Math.abs(netFlow),
        volume: buyAmount + sellAmount,
        type: netFlow >= 0 ? 'buy' : 'sell'
      }
    })
  }

  // Draw candlestick chart
  const drawCandlestickChart = () => {
    const canvas = canvasRef.current
    if (!canvas || fiiDiiData.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = rect.width
    const height = rect.height
    const padding = 50
    const bottomPadding = 60

    ctx.clearRect(0, 0, width, height)

    // Calculate chart dimensions
    const chartWidth = width - padding * 2
    const chartHeight = height - padding - bottomPadding
    const centerY = padding + chartHeight / 2

    // Get data for both FII and DII
    const dataLength = fiiDiiData.length
    const candleWidth = Math.max(8, Math.min(24, chartWidth / dataLength / 3))
    const candleSpacing = chartWidth / dataLength

    // Find max absolute value for scaling
    const maxAbsValue = Math.max(
      ...fiiDiiData.map(item => Math.max(
        Math.abs(item.fii.buy),
        Math.abs(item.fii.sell),
        Math.abs(item.dii.buy),
        Math.abs(item.dii.sell)
      ))
    )

    const scale = (chartHeight / 2 - 20) / maxAbsValue

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight) / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Center line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, centerY)
    ctx.lineTo(width - padding, centerY)
    ctx.stroke()

    // Vertical grid lines for dates
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1
    fiiDiiData.forEach((_, index) => {
      const x = padding + index * candleSpacing + candleSpacing / 2
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - bottomPadding)
      ctx.stroke()
    })

    // Draw candlesticks for each day
    fiiDiiData.forEach((dayData, index) => {
      const baseX = padding + index * candleSpacing
      
      // FII Candlestick (Left side)
      const fiiX = baseX + candleSpacing * 0.2
      drawVolumeCandlestick(ctx, {
        x: fiiX,
        width: candleWidth,
        centerY,
        scale,
        buyVolume: dayData.fii.buy,
        sellVolume: dayData.fii.sell,
        netFlow: dayData.fii.net,
        label: 'FII'
      })

      // DII Candlestick (Right side)
      const diiX = baseX + candleSpacing * 0.6
      drawVolumeCandlestick(ctx, {
        x: diiX,
        width: candleWidth,
        centerY,
        scale,
        buyVolume: dayData.dii.buy,
        sellVolume: dayData.dii.sell,
        netFlow: dayData.dii.net,
        label: 'DII'
      })

      // Draw date labels (every other day to avoid crowding)
      if (index % 2 === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        const date = new Date(dayData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ctx.fillText(date, baseX + candleSpacing / 2, height - bottomPadding + 20)
      }
    })

    // Draw legends and labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("FII (Foreign)", padding, 25)
    
    ctx.fillStyle = "rgba(255, 200, 100, 0.8)"
    ctx.fillText("DII (Domestic)", padding + 120, 25)

    // Draw scale indicators
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"
    
    const scaleValues = [maxAbsValue, maxAbsValue / 2, 0, -maxAbsValue / 2, -maxAbsValue]
    scaleValues.forEach((value, index) => {
      const y = padding + (index * chartHeight) / 4
      ctx.fillText(`₹${(value / 100).toFixed(0)}Cr`, padding - 10, y + 3)
    })

    // Draw legend for colors
    const legendY = height - bottomPadding + 35
    
    // Green box for buying
    ctx.fillStyle = "#22c55e"
    ctx.fillRect(padding, legendY, 12, 8)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("Net Buying", padding + 18, legendY + 7)
    
    // Red box for selling
    ctx.fillStyle = "#ef4444"
    ctx.fillRect(padding + 100, legendY, 12, 8)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.fillText("Net Selling", padding + 118, legendY + 7)
  }

  // Helper function to draw volume-style candlesticks
  const drawVolumeCandlestick = (ctx: CanvasRenderingContext2D, params: {
    x: number
    width: number
    centerY: number
    scale: number
    buyVolume: number
    sellVolume: number
    netFlow: number
    label: string
  }) => {
    const { x, width, centerY, scale, buyVolume, sellVolume, netFlow } = params
    
    // Calculate heights
    const buyHeight = buyVolume * scale
    const sellHeight = sellVolume * scale
    const netHeight = Math.abs(netFlow) * scale

    // Determine colors
    const isNetPositive = netFlow >= 0
    const primaryColor = isNetPositive ? "#22c55e" : "#ef4444"
    const secondaryColor = isNetPositive ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"

    // Draw buy volume (above center)
    if (buyVolume > 0) {
      ctx.fillStyle = "rgba(34, 197, 94, 0.6)"
      ctx.fillRect(x, centerY - buyHeight, width, buyHeight)
      
      // Add border
      ctx.strokeStyle = "#22c55e"
      ctx.lineWidth = 1
      ctx.strokeRect(x, centerY - buyHeight, width, buyHeight)
    }

    // Draw sell volume (below center)
    if (sellVolume > 0) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)"
      ctx.fillRect(x, centerY, width, sellHeight)
      
      // Add border
      ctx.strokeStyle = "#ef4444"
      ctx.lineWidth = 1
      ctx.strokeRect(x, centerY, width, sellHeight)
    }

    // Draw net flow indicator (wick-like line)
    const netY = isNetPositive ? centerY - netHeight : centerY + netHeight
    ctx.strokeStyle = primaryColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + width / 2, centerY)
    ctx.lineTo(x + width / 2, netY)
    ctx.stroke()

    // Add a small circle at the end of net flow line
    ctx.fillStyle = primaryColor
    ctx.beginPath()
    ctx.arc(x + width / 2, netY, 2, 0, Math.PI * 2)
    ctx.fill()

    // Add volume text on hover effect (small labels)
    if (width > 15) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
      ctx.font = "8px sans-serif"
      ctx.textAlign = "center"
      
      // Show net amount if significant
      if (Math.abs(netFlow) > 100) {
        const netText = `${netFlow > 0 ? '+' : ''}${(netFlow / 100).toFixed(0)}`
        ctx.fillText(netText, x + width / 2, netY + (isNetPositive ? -5 : 12))
      }
    }
  }

  useEffect(() => {
    fetchFIIDIIData()
  }, [selectedPeriod])

  useEffect(() => {
    drawCandlestickChart()
  }, [fiiDiiData])

  // Add mouse interaction for hover effects
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const padding = 50
      const chartWidth = rect.width - padding * 2
      
      if (fiiDiiData.length > 0 && x >= padding && x <= rect.width - padding) {
        const dataIndex = Math.floor(((x - padding) / chartWidth) * fiiDiiData.length)
        const dataPoint = fiiDiiData[dataIndex]
        
        if (dataPoint) {
          setHoveredData({
            date: dataPoint.date,
            fii: dataPoint.fii.net,
            dii: dataPoint.dii.net
          })
        }
      } else {
        setHoveredData(null)
      }
    }

    const handleMouseLeave = () => {
      setHoveredData(null)
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [fiiDiiData])

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹${(amount / 100).toFixed(0)}Cr`
  }

  // Calculate totals
  const calculateTotals = () => {
    const fiiTotal = fiiDiiData.reduce((sum, item) => sum + item.fii.net, 0)
    const diiTotal = fiiDiiData.reduce((sum, item) => sum + item.dii.net, 0)
    
    return {
      fii: fiiTotal,
      dii: diiTotal,
      combined: fiiTotal + diiTotal
    }
  }

  const totals = fiiDiiData.length > 0 ? calculateTotals() : { fii: 0, dii: 0, combined: 0 }

  return (
    <Card className="border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-purple-800/40 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
            <BarChart3 className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-white">FII & DII Flow Analysis</CardTitle>
            <p className="text-sm text-white/70">Latest institutional investment flows in candlestick patterns</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={fetchFIIDIIData}
            disabled={loading}
            size="sm"
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="chart">Candlestick Chart</TabsTrigger>
            <TabsTrigger value="summary">Flow Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div className="space-y-4">
              {/* Enhanced Chart Legend */}
              <div className="bg-black/20 p-4 rounded-lg border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Investor Types */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Investor Types</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-blue-400" />
                        <span className="text-white/80 text-sm">FII - Foreign Institutional Investors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-orange-400" />
                        <span className="text-white/80 text-sm">DII - Domestic Institutional Investors</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Canvas Chart */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-80 bg-gradient-to-b from-black/10 to-black/30 rounded-lg border border-white/10 cursor-crosshair"
                  style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)' }}
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="flex items-center space-x-2 text-white/70">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading FII DII data...</span>
                    </div>
                  </div>
                )}
                {hoveredData && (
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-xs text-white/60 mb-1">
                      {new Date(hoveredData.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-blue-400 text-sm">FII Net:</span>
                        <span className={`text-sm font-medium ${hoveredData.fii >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(hoveredData.fii)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-orange-400 text-sm">DII Net:</span>
                        <span className={`text-sm font-medium ${hoveredData.dii >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(hoveredData.dii)}
                        </span>
                      </div>
                      <div className="border-t border-white/20 pt-1 mt-1">
                        <div className="flex items-center justify-between space-x-4">
                          <span className="text-white/70 text-xs">Combined:</span>
                          <span className={`text-xs font-medium ${(hoveredData.fii + hoveredData.dii) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(hoveredData.fii + hoveredData.dii)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {lastUpdate && (
                <p className="text-xs text-white/50 text-center">
                  Last updated: {lastUpdate.toLocaleString()}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70">FII Net Flow</p>
                        <p className={`text-lg font-bold ${totals.fii >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(totals.fii)}
                        </p>
                      </div>
                      <Globe className="h-8 w-8 text-blue-400" />
                    </div>
                    <div className="flex items-center mt-1">
                      {totals.fii >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <Badge 
                        variant="secondary" 
                        className={totals.fii >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                      >
                        {totals.fii >= 0 ? 'Inflow' : 'Outflow'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70">DII Net Flow</p>
                        <p className={`text-lg font-bold ${totals.dii >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(totals.dii)}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-400" />
                    </div>
                    <div className="flex items-center mt-1">
                      {totals.dii >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <Badge 
                        variant="secondary" 
                        className={totals.dii >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                      >
                        {totals.dii >= 0 ? 'Inflow' : 'Outflow'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/70">Combined Flow</p>
                        <p className={`text-lg font-bold ${totals.combined >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(totals.combined)}
                        </p>
                      </div>
                      <Building2 className="h-8 w-8 text-purple-400" />
                    </div>
                    <div className="flex items-center mt-1">
                      {totals.combined >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                      )}
                      <Badge 
                        variant="secondary" 
                        className={totals.combined >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                      >
                        Net {totals.combined >= 0 ? 'Positive' : 'Negative'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Data Table */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Recent Flows (₹ Crores)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {fiiDiiData.slice(-5).reverse().map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-white/10">
                        <span className="text-white/70">{new Date(item.date).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-4">
                          <span className={`font-medium ${item.fii.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            FII: {formatCurrency(item.fii.net)}
                          </span>
                          <span className={`font-medium ${item.dii.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            DII: {formatCurrency(item.dii.net)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}