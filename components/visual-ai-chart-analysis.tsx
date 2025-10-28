"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target,
  AlertTriangle,
  Clock,
  Loader2,
  XCircle,
  Sparkles,
  BarChart3,
  Layers
} from "lucide-react"

interface VisualAIAnalysisProps {
  symbol: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  chartData?: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>
  onClose?: () => void
}

interface AnalysisResult {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  summary: string
  keyPoints: string[]
  entryPrice: number
  targetPrice: number
  stopLoss: number
  riskLevel: 'Low' | 'Medium' | 'High'
  timeHorizon: string
  technicalReasons: {
    title: string
    description: string
    type: 'support' | 'resistance' | 'risk' | 'opportunity'
  }[]
  supportLevels: number[]
  resistanceLevels: number[]
  riskZones: { start: number; end: number; reason: string }[]
  indicators?: {
    rsi?: number
    bollingerBands?: {
      upper: number
      middle: number
      lower: number
      percentB: number
      bandwidth: number
    }
    fibonacci?: {
      level_0: number
      level_236: number
      level_382: number
      level_500: number
      level_618: number
      level_786: number
      level_100: number
    }
    volume?: {
      current: number
      average: number
      ratio: number
      trend: string
    }
    macd?: {
      value: number
      signal: number
      histogram: number
      trend: 'bullish' | 'bearish' | 'neutral'
    }
    atr?: {
      value: number
      volatility: 'low' | 'medium' | 'high' | 'extreme'
    }
    stochastic?: {
      k: number
      d: number
      signal: 'overbought' | 'oversold' | 'neutral'
    }
  }
  aiReasoning?: {
    marketCondition: string
    indicatorSelection: string
    newsSentiment: string
    finalDecision: string
  }
}

export function VisualAIChartAnalysis({
  symbol,
  currentPrice,
  previousClose,
  change,
  changePercent,
  high,
  low,
  volume,
  chartData = [],
  onClose
}: VisualAIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/visual-ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          currentPrice,
          previousClose,
          change,
          changePercent,
          high,
          low,
          volume,
          chartData,
          timeframe: '1D',
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (err: any) {
      console.error('Visual AI Analysis error:', err)
      setError(err.message || 'Failed to analyze chart')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Draw annotated chart with candlesticks
  useEffect(() => {
    if (!analysis || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2 // Retina display
    canvas.height = 500 * 2 // Increased height
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#0a0e1a'
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2)

    // Chart dimensions
    const chartHeight = 350
    const chartWidth = canvas.width / 2 - 100
    const chartX = 50
    const chartY = 30
    
    // Calculate price range including all levels
    const allPrices = [
      high,
      low,
      currentPrice,
      ...analysis.supportLevels,
      ...analysis.resistanceLevels,
      ...(analysis.indicators?.bollingerBands ? [
        analysis.indicators.bollingerBands.lower,
        analysis.indicators.bollingerBands.upper
      ] : []),
      ...(chartData && chartData.length > 0 ? chartData.flatMap(d => [d.high, d.low]) : [])
    ]
    const priceMin = Math.min(...allPrices)
    const priceMax = Math.max(...allPrices)
    const priceRange = priceMax - priceMin
    const padding = priceRange * 0.05

    const toY = (price: number) => {
      return chartY + chartHeight - ((price - (priceMin - padding)) / (priceRange + padding * 2)) * chartHeight
    }

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = chartY + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(chartX, y)
      ctx.lineTo(chartX + chartWidth, y)
      ctx.stroke()
      
      // Price labels
      const price = priceMax - (priceRange / 5) * i
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.font = '10px monospace'
      ctx.fillText(`₹${price.toFixed(2)}`, 5, y + 3)
    }

    // Draw candlestick chart if data available
    if (chartData && chartData.length > 0) {
      const dataToShow = chartData.slice(-50) // Last 50 candles
      const candleWidth = (chartWidth - 20) / dataToShow.length
      const candleSpacing = 2
      const bodyWidth = Math.max(2, candleWidth - candleSpacing)
      
      dataToShow.forEach((candle, idx) => {
        const x = chartX + 10 + idx * candleWidth
        const openY = toY(candle.open)
        const closeY = toY(candle.close)
        const highY = toY(candle.high)
        const lowY = toY(candle.low)
        
        const isBullish = candle.close >= candle.open
        ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444'
        ctx.fillStyle = isBullish ? '#10b981' : '#ef4444'
        
        // Draw wick
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + bodyWidth / 2, highY)
        ctx.lineTo(x + bodyWidth / 2, lowY)
        ctx.stroke()
        
        // Draw body
        const bodyHeight = Math.abs(closeY - openY)
        const bodyY = Math.min(openY, closeY)
        
        if (isBullish) {
          ctx.fillRect(x, bodyY, bodyWidth, Math.max(1, bodyHeight))
        } else {
          ctx.fillRect(x, bodyY, bodyWidth, Math.max(1, bodyHeight))
        }
      })
    } else {
      // Draw simple price line if no candle data
      const priceLineY = toY(currentPrice)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(chartX, priceLineY)
      ctx.lineTo(chartX + chartWidth, priceLineY)
      ctx.stroke()
    }

    // Draw Bollinger Bands if available
    if (analysis.indicators?.bollingerBands) {
      const bb = analysis.indicators.bollingerBands
      
      // Upper Bollinger Band
      const upperY = toY(bb.upper)
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.7)' // Purple
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.moveTo(chartX, upperY)
      ctx.lineTo(chartX + chartWidth, upperY)
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(147, 51, 234, 0.9)'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`BB Upper: ₹${bb.upper.toFixed(2)}`, chartX + 10, upperY - 5)
      
      // Middle Bollinger Band (SMA)
      const middleY = toY(bb.middle)
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(chartX, middleY)
      ctx.lineTo(chartX + chartWidth, middleY)
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(147, 51, 234, 0.7)'
      ctx.font = '10px sans-serif'
      ctx.fillText(`BB Mid: ₹${bb.middle.toFixed(2)}`, chartX + 10, middleY + 12)
      
      // Lower Bollinger Band
      const lowerY = toY(bb.lower)
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.7)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.moveTo(chartX, lowerY)
      ctx.lineTo(chartX + chartWidth, lowerY)
      ctx.stroke()
      
      ctx.fillStyle = 'rgba(147, 51, 234, 0.9)'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`BB Lower: ₹${bb.lower.toFixed(2)}`, chartX + 10, lowerY + 12)
      
      // Shade between bands
      ctx.fillStyle = 'rgba(147, 51, 234, 0.08)'
      ctx.fillRect(chartX, upperY, chartWidth, lowerY - upperY)
      
      ctx.setLineDash([]) // Reset dash
    }

    // Draw Fibonacci levels if available
    if (analysis.indicators?.fibonacci) {
      const fib = analysis.indicators.fibonacci
      const fibLevels = [
        { price: fib.level_236, name: '23.6%', color: 'rgba(251, 191, 36, 0.5)' },
        { price: fib.level_382, name: '38.2%', color: 'rgba(251, 191, 36, 0.6)' },
        { price: fib.level_500, name: '50%', color: 'rgba(251, 191, 36, 0.8)' },
        { price: fib.level_618, name: '61.8%', color: 'rgba(251, 191, 36, 0.6)' },
        { price: fib.level_786, name: '78.6%', color: 'rgba(251, 191, 36, 0.5)' }
      ]
      
      fibLevels.forEach(({ price, name, color }) => {
        if (price > priceMin && price < priceMax) {
          const y = toY(price)
          
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(chartX, y)
          ctx.lineTo(chartX + chartWidth, y)
          ctx.stroke()
          
          ctx.fillStyle = color
          ctx.font = '9px sans-serif'
          ctx.fillText(`Fib ${name}`, chartX + chartWidth - 60, y - 2)
        }
      })
      
      ctx.setLineDash([]) // Reset dash
    }

    // Draw risk zones
    analysis.riskZones.forEach((zone) => {
      const y1 = toY(zone.end)
      const y2 = toY(zone.start)
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)'
      ctx.fillRect(chartX, y1, chartWidth, y2 - y1)
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.strokeRect(chartX, y1, chartWidth, y2 - y1)
      ctx.setLineDash([])
      
      // Label
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('⚠️ RISK ZONE', chartX + 10, y1 + 15)
    })

    // Draw support levels
    analysis.supportLevels.forEach((level) => {
      const y = toY(level)
      
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(chartX, y)
      ctx.lineTo(chartX + chartWidth, y)
      ctx.stroke()
      
      // Label with background
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
      ctx.fillRect(chartX + chartWidth - 120, y - 18, 115, 16)
      
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`Support: ₹${level.toFixed(2)}`, chartX + chartWidth - 115, y - 6)
    })

    // Draw resistance levels
    analysis.resistanceLevels.forEach((level) => {
      const y = toY(level)
      
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.moveTo(chartX, y)
      ctx.lineTo(chartX + chartWidth, y)
      ctx.stroke()
      
      // Label with background
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
      ctx.fillRect(chartX + chartWidth - 135, y - 18, 130, 16)
      
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`Resistance: ₹${level.toFixed(2)}`, chartX + chartWidth - 130, y - 6)
    })

    // Draw current price line with glow effect
    const currentY = toY(currentPrice)
    
    // Glow
    ctx.shadowColor = '#3b82f6'
    ctx.shadowBlur = 10
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.moveTo(chartX, currentY)
    ctx.lineTo(chartX + chartWidth, currentY)
    ctx.stroke()
    ctx.shadowBlur = 0
    
    // Current price label with background
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(chartX + 5, currentY - 18, 130, 16)
    
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(`Current: ₹${currentPrice.toFixed(2)}`, chartX + 10, currentY - 6)
    
    // Price movement arrow
    ctx.font = 'bold 16px sans-serif'
    if (change > 0) {
      ctx.fillStyle = '#10b981'
      ctx.fillText('↑', chartX + 140, currentY - 4)
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`+${changePercent.toFixed(2)}%`, chartX + 155, currentY - 6)
    } else if (change < 0) {
      ctx.fillStyle = '#ef4444'
      ctx.fillText('↓', chartX + 140, currentY - 4)
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(`${changePercent.toFixed(2)}%`, chartX + 155, currentY - 6)
    }

    // Draw target price
    if (analysis.action !== 'HOLD') {
      const targetY = toY(analysis.targetPrice)
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 5])
      ctx.beginPath()
      ctx.moveTo(chartX, targetY)
      ctx.lineTo(chartX + chartWidth, targetY)
      ctx.stroke()
      ctx.setLineDash([])
      
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)'
      ctx.fillRect(chartX + 5, targetY - 18, 125, 16)
      
      ctx.fillStyle = '#8b5cf6'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(`🎯 Target: ₹${analysis.targetPrice.toFixed(2)}`, chartX + 10, targetY - 6)
    }

    // Draw stop loss
    const stopLossY = toY(analysis.stopLoss)
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 3])
    ctx.beginPath()
    ctx.moveTo(chartX, stopLossY)
    ctx.lineTo(chartX + chartWidth, stopLossY)
    ctx.stroke()
    ctx.setLineDash([])
    
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)'
    ctx.fillRect(chartX + 5, stopLossY - 18, 135, 16)
    
    ctx.fillStyle = '#f59e0b'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText(`🛑 Stop Loss: ₹${analysis.stopLoss.toFixed(2)}`, chartX + 10, stopLossY - 6)

    // Draw Y-axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(chartX, chartY)
    ctx.lineTo(chartX, chartY + chartHeight)
    ctx.stroke()
    
    // Draw X-axis
    ctx.beginPath()
    ctx.moveTo(chartX, chartY + chartHeight)
    ctx.lineTo(chartX + chartWidth, chartY + chartHeight)
    ctx.stroke()

    // Draw legend
    const legendY = chartY + chartHeight + 25
    ctx.font = '10px sans-serif'
    
    const legendItems = [
      { color: '#10b981', text: '━━ Support', x: 0 },
      { color: '#ef4444', text: '━━ Resistance', x: 90 },
      { color: '#3b82f6', text: '━━ Current', x: 200 },
      { color: '#8b5cf6', text: '- - Target', x: 290 },
      { color: '#f59e0b', text: '- - Stop Loss', x: 370 }
    ]
    
    legendItems.forEach(({ color, text, x }) => {
      ctx.fillStyle = color
      ctx.fillText(text, chartX + x, legendY)
    })
    
    // Draw AI indicator labels at bottom
    if (analysis.indicators) {
      const indicatorY = legendY + 20
      ctx.font = '11px sans-serif'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.fillText('AI Selected Indicators:', chartX, indicatorY)
      
      const indicators: string[] = []
      if (analysis.indicators.rsi !== undefined) indicators.push(`RSI: ${analysis.indicators.rsi.toFixed(1)}`)
      if (analysis.indicators.bollingerBands) indicators.push('Bollinger Bands')
      if (analysis.indicators.fibonacci) indicators.push('Fibonacci')
      if (analysis.indicators.volume && analysis.indicators.volume.ratio != null) {
        indicators.push(`Vol: ${analysis.indicators.volume.ratio.toFixed(1)}x`)
      }
      
      ctx.fillStyle = '#8b5cf6'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText(indicators.join(' • '), chartX + 150, indicatorY)
    }

  }, [analysis, currentPrice, high, low, change, changePercent, chartData])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'bg-green-500 hover:bg-green-600'
      case 'SELL': return 'bg-red-500 hover:bg-red-600'
      default: return 'bg-yellow-500 hover:bg-yellow-600'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400'
      case 'Medium': return 'text-yellow-400'
      case 'High': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getReasonIcon = (type: string) => {
    switch (type) {
      case 'support': return '🛡️'
      case 'resistance': return '🚧'
      case 'risk': return '⚠️'
      case 'opportunity': return '✨'
      default: return '📊'
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            <span>Visual AI Chart Analysis</span>
            <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
          </CardTitle>
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </Button>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Get AI-powered visual insights with technical annotations for {symbol}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!analysis && !error && (
          <div className="text-center py-8">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-6 text-lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing Chart...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Analyze Chart Visually
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              AI will draw support/resistance lines and explain technical reasons
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
            <Button
              onClick={handleAnalyze}
              variant="outline"
              className="mt-3 w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {/* Action & Risk Header */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-4 rounded-lg text-white text-center ${getActionColor(analysis.action)}`}>
                <div className="text-xs uppercase font-medium opacity-80 mb-1">Action</div>
                <p className="text-2xl font-bold">{analysis.action}</p>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">Confidence</div>
                <p className="text-2xl font-bold text-blue-400">{analysis.confidence}%</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">Risk Level</div>
                <p className={`text-2xl font-bold ${getRiskColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel}
                </p>
              </div>
            </div>

            {/* Visual Chart with Annotations */}
            <div className="bg-[#0a0e1a] border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-white flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-purple-400" />
                  AI Technical Chart with Candlesticks
                </h4>
                <Badge variant="outline" className="text-xs">
                  Real-Time Analysis
                </Badge>
              </div>
              <canvas
                ref={canvasRef}
                className="w-full rounded"
                style={{ height: '500px' }}
              />
            </div>

            {/* Technical Indicators Panel */}
            {analysis.indicators && (
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-indigo-400" />
                  Technical Indicators (Mathematical Analysis)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* RSI */}
                  {analysis.indicators.rsi !== undefined && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">RSI (14)</div>
                      <div className={`text-2xl font-bold ${
                        analysis.indicators.rsi > 70 ? 'text-red-400' :
                        analysis.indicators.rsi < 30 ? 'text-green-400' :
                        'text-blue-400'
                      }`}>
                        {analysis.indicators.rsi.toFixed(1)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {analysis.indicators.rsi > 70 ? 'Overbought ⚠️' :
                         analysis.indicators.rsi < 30 ? 'Oversold ✨' :
                         analysis.indicators.rsi > 50 ? 'Bullish 📈' : 'Bearish 📉'}
                      </div>
                    </div>
                  )}

                  {/* Bollinger %B */}
                  {analysis.indicators.bollingerBands && analysis.indicators.bollingerBands.percentB !== undefined && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Bollinger %B</div>
                      <div className={`text-2xl font-bold ${
                        analysis.indicators.bollingerBands.percentB > 1 ? 'text-red-400' :
                        analysis.indicators.bollingerBands.percentB < 0 ? 'text-green-400' :
                        'text-purple-400'
                      }`}>
                        {(analysis.indicators.bollingerBands.percentB * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {analysis.indicators.bollingerBands.percentB > 1 ? 'Above Band' :
                         analysis.indicators.bollingerBands.percentB < 0 ? 'Below Band' :
                         'In Range'}
                      </div>
                    </div>
                  )}

                  {/* Volume Ratio */}
                  {analysis.indicators.volume && 
                   analysis.indicators.volume.ratio != null && 
                   analysis.indicators.volume.trend && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Volume Ratio</div>
                      <div className={`text-2xl font-bold ${
                        analysis.indicators.volume.ratio > 2 ? 'text-orange-400' :
                        analysis.indicators.volume.ratio > 1.2 ? 'text-green-400' :
                        'text-slate-400'
                      }`}>
                        {analysis.indicators.volume.ratio.toFixed(1)}x
                      </div>
                      <div className="text-xs text-slate-400 mt-1 capitalize">
                        {analysis.indicators.volume.trend.replace('-', ' ')}
                      </div>
                    </div>
                  )}

                  {/* Fibonacci Position */}
                  {analysis.indicators.fibonacci && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Fib Position</div>
                      <div className="text-2xl font-bold text-amber-400">
                        {((currentPrice - analysis.indicators.fibonacci.level_0) / 
                          (analysis.indicators.fibonacci.level_100 - analysis.indicators.fibonacci.level_0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Of Range
                      </div>
                    </div>
                  )}
                </div>

                {/* Bollinger Band Values */}
                {analysis.indicators.bollingerBands && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Upper: </span>
                      <span className="text-purple-400 font-mono">₹{analysis.indicators.bollingerBands.upper.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Middle: </span>
                      <span className="text-purple-400 font-mono">₹{analysis.indicators.bollingerBands.middle.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Lower: </span>
                      <span className="text-purple-400 font-mono">₹{analysis.indicators.bollingerBands.lower.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Key Fibonacci Levels */}
                {analysis.indicators.fibonacci && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Fib 38.2%: </span>
                      <span className="text-amber-400 font-mono">₹{analysis.indicators.fibonacci.level_382.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Fib 50%: </span>
                      <span className="text-amber-400 font-mono">₹{analysis.indicators.fibonacci.level_500.toFixed(2)}</span>
                    </div>
                    <div className="bg-slate-800/30 rounded px-2 py-1">
                      <span className="text-slate-400">Fib 61.8%: </span>
                      <span className="text-amber-400 font-mono">₹{analysis.indicators.fibonacci.level_618.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Technical Reasons - WHY */}
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                <Brain className="h-4 w-4 mr-2 text-purple-400" />
                Why {analysis.action}? - Technical Reasons
              </h4>
              <div className="space-y-3">
                {analysis.technicalReasons.map((reason, idx) => (
                  <div key={idx} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                    <div className="flex items-start space-x-2">
                      <span className="text-xl">{getReasonIcon(reason.type)}</span>
                      <div className="flex-1">
                        <h5 className="text-white font-medium text-sm mb-1">{reason.title}</h5>
                        <p className="text-slate-300 text-xs leading-relaxed">{reason.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Explanation */}
            {analysis.riskLevel === 'High' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h4 className="text-white font-medium">Why High Risk?</h4>
                </div>
                <ul className="space-y-1 text-sm text-slate-300">
                  {analysis.riskZones.map((zone, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-red-400">•</span>
                      <span>{zone.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Support & Resistance Levels */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <h5 className="text-green-400 font-medium text-sm mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Support Levels
                </h5>
                <div className="space-y-1">
                  {analysis.supportLevels.map((level, idx) => (
                    <div key={idx} className="text-slate-300 text-xs font-mono">
                      ₹{level.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <h5 className="text-red-400 font-medium text-sm mb-2 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Resistance Levels
                </h5>
                <div className="space-y-1">
                  {analysis.resistanceLevels.map((level, idx) => (
                    <div key={idx} className="text-slate-300 text-xs font-mono">
                      ₹{level.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Targets */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-400" />
                Price Targets & Risk Management
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Entry Point</div>
                  <div className="font-mono text-blue-400 font-bold text-lg">₹{analysis.entryPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Target Price</div>
                  <div className="font-mono text-green-400 font-bold text-lg">₹{analysis.targetPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Stop Loss</div>
                  <div className="font-mono text-red-400 font-bold text-lg">₹{analysis.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Potential Return</div>
                  <div className="font-mono text-purple-400 font-bold text-lg">
                    {((analysis.targetPrice - analysis.entryPrice) / analysis.entryPrice * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Time Horizon */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-300">
                  <span className="text-slate-500">Time Horizon:</span>{' '}
                  <span className="text-purple-400 font-medium">{analysis.timeHorizon}</span>
                </span>
              </div>
            </div>

            {/* Re-analyze Button */}
            <Button
              onClick={handleAnalyze}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Re-analyze Chart
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
