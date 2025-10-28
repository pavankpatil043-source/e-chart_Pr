"use client"

import { useState } from "react"
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
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react"

interface AIAnalysisProps {
  symbol: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
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
}

export function AIChartAnalysis({
  symbol,
  currentPrice,
  previousClose,
  change,
  changePercent,
  high,
  low,
  volume,
  onClose
}: AIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/ai-chart-analysis', {
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
          timeframe: '1D',
          priceHistory: [] // Can be enhanced with actual history
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
    } catch (err: any) {
      console.error('AI Analysis error:', err)
      setError(err.message || 'Failed to analyze chart')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'bearish': return 'text-red-400 bg-red-500/20 border-red-500/30'
      default: return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
    }
  }

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

  return (
    <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <span>AI Chart Analysis</span>
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
          Get AI-powered insights for {symbol}
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
                  <Brain className="h-5 w-5 mr-2" />
                  Analyze Chart with AI
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-4">
              AI will analyze price action, volume, and technical indicators
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
            {/* Sentiment & Action Header */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border ${getSentimentColor(analysis.sentiment)}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase font-medium">Sentiment</span>
                  {analysis.sentiment === 'bullish' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : analysis.sentiment === 'bearish' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </div>
                <p className="text-lg font-bold capitalize">{analysis.sentiment}</p>
              </div>

              <div className={`p-4 rounded-lg text-white`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase font-medium opacity-80">Action</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className={`text-lg font-bold ${
                  analysis.action === 'BUY' ? 'text-green-400' :
                  analysis.action === 'SELL' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {analysis.action}
                </p>
              </div>
            </div>

            {/* Confidence & Risk */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Confidence</span>
                </div>
                <p className="text-xl font-bold text-blue-400">{analysis.confidence}%</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-slate-400">Risk Level</span>
                </div>
                <p className={`text-xl font-bold ${getRiskColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel}
                </p>
              </div>
            </div>

            {/* Price Targets */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-400" />
                Price Targets
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Entry Point</span>
                  <span className="font-mono text-blue-400 font-bold">₹{analysis.entryPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Target Price</span>
                  <span className="font-mono text-green-400 font-bold">₹{analysis.targetPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Stop Loss</span>
                  <span className="font-mono text-red-400 font-bold">₹{analysis.stopLoss.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-sm text-slate-400">Potential Return</span>
                  <span className="font-mono text-purple-400 font-bold">
                    {((analysis.targetPrice - analysis.entryPrice) / analysis.entryPrice * 100).toFixed(2)}%
                  </span>
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

            {/* Key Points */}
            {analysis.keyPoints && analysis.keyPoints.length > 0 && (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-white mb-3">Key Insights</h4>
                <ul className="space-y-2">
                  {analysis.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-slate-300">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                <Brain className="h-4 w-4 mr-2 text-purple-400" />
                AI Analysis Summary
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {analysis.summary}
              </p>
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
