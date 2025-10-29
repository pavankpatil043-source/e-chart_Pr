"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, RefreshCw, Building2, Users, Globe, BarChart3, Brain, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

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

interface AIAnalysis {
  summary: string
  metrics: {
    totalFIINet: number
    totalDIINet: number
    avgFIINet: number
    avgDIINet: number
    fiiBuyingDays: number
    fiiSellingDays: number
    diiBuyingDays: number
    diiSellingDays: number
    recentFIINet: number
    recentDIINet: number
  }
  sentiment: {
    fii: string
    dii: string
    overall: string
  }
}

export function FIIDIIDataPanelEnhanced() {
  const [fiiDiiData, setFiiDiiData] = useState<FIIDIIData[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState("30")
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const dayOptions = [
    { value: "7", label: "7 Days" },
    { value: "30", label: "30 Days" },
    { value: "60", label: "60 Days" },
    { value: "90", label: "90 Days" },
  ]

  // Fetch FII DII data with AI analysis
  const fetchFIIDIIData = async (includeAI: boolean = false) => {
    setLoading(true)
    try {
      console.log(`🎁 Fetching ${selectedDays} days of FII/DII data...`)
      
      const response = await fetch(`/api/fii-dii-enhanced?days=${selectedDays}&analyze=${includeAI}`)
      const result = await response.json()
      
      if (result.success && result.data?.length > 0) {
        setFiiDiiData(result.data)
        setLastUpdate(new Date())
        
        if (result.aiAnalysis) {
          setAiAnalysis(result.aiAnalysis)
          console.log("🤖 AI Analysis received")
        }
        
        console.log(`✅ Loaded ${result.data.length} days of FII/DII data`)
      } else {
        throw new Error("No data received")
      }
      
    } catch (error) {
      console.error("❌ Error fetching FII/DII data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFIIDIIData(false)
  }, [selectedDays])

  useEffect(() => {
    if (fiiDiiData.length > 0) {
      drawBarChart()
    }
  }, [fiiDiiData, hoveredIndex])

  // Draw enhanced bar chart
  const drawBarChart = () => {
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
    const padding = 60
    const bottomPadding = 50

    ctx.clearRect(0, 0, width, height)

    // Calculate chart dimensions
    const chartWidth = width - padding * 2
    const chartHeight = height - padding - bottomPadding
    const centerY = padding + chartHeight / 2

    const dataLength = fiiDiiData.length
    const barGroupWidth = chartWidth / dataLength
    const barWidth = Math.max(3, Math.min(20, barGroupWidth / 3))

    // Find max absolute value for scaling
    const maxAbsValue = Math.max(
      ...fiiDiiData.map(item => Math.max(
        Math.abs(item.fii.net),
        Math.abs(item.dii.net)
      ))
    )

    const scale = (chartHeight / 2 - 20) / maxAbsValue

    // Draw grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight) / 4
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Center line (zero line)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, centerY)
    ctx.lineTo(width - padding, centerY)
    ctx.stroke()

    // Draw y-axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "right"
    
    const yLabels = [maxAbsValue, maxAbsValue / 2, 0, -maxAbsValue / 2, -maxAbsValue]
    yLabels.forEach((value, index) => {
      const y = padding + (index * chartHeight) / 4
      ctx.fillText(`₹${(value / 1).toFixed(0)}Cr`, padding - 10, y + 4)
    })

    // Draw bars for each day
    fiiDiiData.forEach((dayData, index) => {
      const baseX = padding + index * barGroupWidth
      const isHovered = hoveredIndex === index
      
      // FII Bar (Blue - Foreign)
      const fiiHeight = Math.abs(dayData.fii.net) * scale
      const fiiY = dayData.fii.net > 0 ? centerY - fiiHeight : centerY
      const fiiColor = dayData.fii.net > 0 
        ? (isHovered ? "rgba(59, 130, 246, 1)" : "rgba(59, 130, 246, 0.7)")  // Blue
        : (isHovered ? "rgba(239, 68, 68, 1)" : "rgba(239, 68, 68, 0.7)")    // Red
      
      ctx.fillStyle = fiiColor
      ctx.fillRect(
        baseX + barGroupWidth * 0.2,
        fiiY,
        barWidth,
        fiiHeight
      )

      // DII Bar (Amber - Domestic)
      const diiHeight = Math.abs(dayData.dii.net) * scale
      const diiY = dayData.dii.net > 0 ? centerY - diiHeight : centerY
      const diiColor = dayData.dii.net > 0 
        ? (isHovered ? "rgba(251, 191, 36, 1)" : "rgba(251, 191, 36, 0.7)") // Amber
        : (isHovered ? "rgba(249, 115, 22, 1)" : "rgba(249, 115, 22, 0.7)") // Orange
      
      ctx.fillStyle = diiColor
      ctx.fillRect(
        baseX + barGroupWidth * 0.55,
        diiY,
        barWidth,
        diiHeight
      )

      // Draw date labels (show every few days based on data length)
      const labelFrequency = dataLength > 60 ? 10 : dataLength > 30 ? 5 : dataLength > 14 ? 3 : 2
      if (index % labelFrequency === 0 || isHovered) {
        ctx.fillStyle = isHovered ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.5)"
        ctx.font = isHovered ? "bold 10px sans-serif" : "10px sans-serif"
        ctx.textAlign = "center"
        const date = new Date(dayData.date)
        const dateLabel = date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short' 
        })
        ctx.fillText(dateLabel, baseX + barGroupWidth / 2, height - bottomPadding + 20)
      }

      // Hover effect - show tooltip
      if (isHovered) {
        // Draw highlight background
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
        ctx.fillRect(baseX, padding, barGroupWidth, chartHeight)
        
        // Draw tooltip
        const tooltipX = baseX + barGroupWidth / 2
        const tooltipY = padding - 10
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)"
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(tooltipX - 100, tooltipY - 80, 200, 75, 5)
        ctx.fill()
        ctx.stroke()
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.font = "bold 11px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(
          new Date(dayData.date).toLocaleDateString('en-IN', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          }), 
          tooltipX, 
          tooltipY - 60
        )
        
        ctx.font = "10px sans-serif"
        ctx.fillStyle = "rgba(59, 130, 246, 1)"
        ctx.fillText(`FII: ₹${dayData.fii.net.toFixed(0)} Cr`, tooltipX, tooltipY - 40)
        
        ctx.fillStyle = "rgba(251, 191, 36, 1)"
        ctx.fillText(`DII: ₹${dayData.dii.net.toFixed(0)} Cr`, tooltipX, tooltipY - 25)
        
        const totalNet = dayData.fii.net + dayData.dii.net
        ctx.fillStyle = totalNet > 0 ? "rgba(34, 197, 94, 1)" : "rgba(239, 68, 68, 1)"
        ctx.fillText(`Total: ₹${totalNet.toFixed(0)} Cr`, tooltipX, tooltipY - 10)
      }
    })

    // Draw legend
    ctx.fillStyle = "rgba(59, 130, 246, 0.8)"
    ctx.fillRect(padding, 20, 15, 15)
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("FII (Foreign)", padding + 20, 32)

    ctx.fillStyle = "rgba(251, 191, 36, 0.8)"
    ctx.fillRect(padding + 120, 20, 15, 15)
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.fillText("DII (Domestic)", padding + 140, 32)
  }

  // Handle mouse move for hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || fiiDiiData.length === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const padding = 60
    const chartWidth = rect.width - padding * 2
    const barGroupWidth = chartWidth / fiiDiiData.length

    const index = Math.floor((x - padding) / barGroupWidth)
    
    if (index >= 0 && index < fiiDiiData.length) {
      setHoveredIndex(index)
    } else {
      setHoveredIndex(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  // Calculate summary stats
  const calculateStats = () => {
    if (fiiDiiData.length === 0) return null

    const totalFIINet = fiiDiiData.reduce((sum, day) => sum + day.fii.net, 0)
    const totalDIINet = fiiDiiData.reduce((sum, day) => sum + day.dii.net, 0)
    const totalNet = totalFIINet + totalDIINet

    return {
      totalFIINet,
      totalDIINet,
      totalNet,
      avgFIINet: totalFIINet / fiiDiiData.length,
      avgDIINet: totalDIINet / fiiDiiData.length
    }
  }

  const stats = calculateStats()

  return (
    <Card className="w-full bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-6 w-6 text-purple-400" />
              FII & DII Flow Analysis
              <Badge variant="outline" className="ml-2 text-purple-400 border-purple-400">
                AI Enhanced
              </Badge>
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Latest institutional investment flows in candlestick patterns
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedDays} onValueChange={setSelectedDays}>
              <SelectTrigger className="w-32 bg-purple-900/30 border-purple-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => fetchFIIDIIData(false)}
              disabled={loading}
              variant="outline"
              size="icon"
              className="border-purple-500/50 hover:bg-purple-900/30"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Investor Type Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <Globe className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-xs text-gray-400">FII - Foreign Institutional Investors</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Building2 className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-xs text-gray-400">DII - Domestic Institutional Investors</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">FII Net Flow</span>
                {stats.totalFIINet > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold mt-2 ${stats.totalFIINet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.totalFIINet.toFixed(0)} Cr
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: ₹{stats.avgFIINet.toFixed(0)} Cr/day
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">DII Net Flow</span>
                {stats.totalDIINet > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold mt-2 ${stats.totalDIINet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.totalDIINet.toFixed(0)} Cr
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg: ₹{stats.avgDIINet.toFixed(0)} Cr/day
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Net Flow</span>
                {stats.totalNet > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold mt-2 ${stats.totalNet > 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.totalNet.toFixed(0)} Cr
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedDays} days period
              </p>
            </div>
          </div>
        )}

        {/* Candlestick Chart */}
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Candlestick Chart</TabsTrigger>
            <TabsTrigger value="summary">Flow Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <div className="relative">
              {loading ? (
                <Skeleton className="w-full h-[400px]" />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="w-full h-[400px] rounded-lg bg-black/20 cursor-crosshair"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
              )}
            </div>

            {lastUpdate && (
              <p className="text-xs text-center text-gray-500">
                Last updated: {lastUpdate.toLocaleString('en-IN', { 
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="space-y-4 p-4 rounded-lg bg-black/20">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Flow Summary
              </h3>
              
              <div className="space-y-3">
                {fiiDiiData.slice(-7).reverse().map((day, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-sm text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <div className="flex gap-4">
                      <span className={`text-sm font-semibold ${day.fii.net > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        FII: ₹{day.fii.net.toFixed(0)}Cr
                      </span>
                      <span className={`text-sm font-semibold ${day.dii.net > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        DII: ₹{day.dii.net.toFixed(0)}Cr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* AI Analysis Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              AI Market Analysis
            </h3>
            <Button
              onClick={() => fetchFIIDIIData(true)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-purple-500/50 hover:bg-purple-900/30"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze with AI
            </Button>
          </div>

          {aiAnalysis ? (
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={
                  aiAnalysis.sentiment.overall === 'bullish' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                }>
                  {aiAnalysis.sentiment.overall.toUpperCase()} SENTIMENT
                </Badge>
                <Badge variant="outline" className="text-blue-400 border-blue-500/50">
                  FII: {aiAnalysis.sentiment.fii}
                </Badge>
                <Badge variant="outline" className="text-amber-400 border-amber-500/50">
                  DII: {aiAnalysis.sentiment.dii}
                </Badge>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed">
                {aiAnalysis.summary}
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-xs space-y-1">
                  <p className="text-gray-500">FII Buying Days: <span className="text-green-400 font-semibold">{aiAnalysis.metrics.fiiBuyingDays}</span></p>
                  <p className="text-gray-500">FII Selling Days: <span className="text-red-400 font-semibold">{aiAnalysis.metrics.fiiSellingDays}</span></p>
                  <p className="text-gray-500">Recent 5D FII: <span className="text-white font-semibold">₹{aiAnalysis.metrics.recentFIINet.toFixed(0)}Cr</span></p>
                </div>
                <div className="text-xs space-y-1">
                  <p className="text-gray-500">DII Buying Days: <span className="text-green-400 font-semibold">{aiAnalysis.metrics.diiBuyingDays}</span></p>
                  <p className="text-gray-500">DII Selling Days: <span className="text-red-400 font-semibold">{aiAnalysis.metrics.diiSellingDays}</span></p>
                  <p className="text-gray-500">Recent 5D DII: <span className="text-white font-semibold">₹{aiAnalysis.metrics.recentDIINet.toFixed(0)}Cr</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-black/20 border border-dashed border-gray-700 text-center">
              <Brain className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Click "Analyze with AI" to get AI-powered insights on FII/DII flows</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
