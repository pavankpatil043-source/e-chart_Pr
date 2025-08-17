"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from "lucide-react"

interface ProbabilityData {
  symbol: string
  bullishProbability: number
  bearishProbability: number
  neutralProbability: number
  confidence: number
  factors: {
    technical: number
    volume: number
    sentiment: number
    momentum: number
  }
  prediction: "bullish" | "bearish" | "neutral"
  timeframe: string
}

export function ProbabilityCalculator() {
  const [selectedSymbol, setSelectedSymbol] = useState("RELIANCE")
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D")
  const [data, setData] = useState<ProbabilityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "SBIN", "BHARTIARTL"]
  const timeframes = ["1H", "4H", "1D", "1W"]

  const calculateProbability = async () => {
    setIsLoading(true)

    // Simulate AI calculation
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Generate realistic probability data
    const technical = Math.random() * 100
    const volume = Math.random() * 100
    const sentiment = Math.random() * 100
    const momentum = Math.random() * 100

    const avgScore = (technical + volume + sentiment + momentum) / 4

    let bullish = 0,
      bearish = 0,
      neutral = 0

    if (avgScore > 60) {
      bullish = 50 + Math.random() * 40
      bearish = Math.random() * 30
      neutral = 100 - bullish - bearish
    } else if (avgScore < 40) {
      bearish = 50 + Math.random() * 40
      bullish = Math.random() * 30
      neutral = 100 - bullish - bearish
    } else {
      neutral = 40 + Math.random() * 30
      bullish = Math.random() * 35
      bearish = 100 - bullish - neutral
    }

    const prediction =
      bullish > bearish && bullish > neutral
        ? "bullish"
        : bearish > bullish && bearish > neutral
          ? "bearish"
          : "neutral"

    setData({
      symbol: selectedSymbol,
      bullishProbability: Math.round(bullish),
      bearishProbability: Math.round(bearish),
      neutralProbability: Math.round(neutral),
      confidence: Math.round(60 + Math.random() * 35),
      factors: {
        technical: Math.round(technical),
        volume: Math.round(volume),
        sentiment: Math.round(sentiment),
        momentum: Math.round(momentum),
      },
      prediction,
      timeframe: selectedTimeframe,
    })

    setIsLoading(false)
  }

  useEffect(() => {
    calculateProbability()
  }, [selectedSymbol, selectedTimeframe])

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case "bullish":
        return "text-green-400"
      case "bearish":
        return "text-red-400"
      default:
        return "text-yellow-400"
    }
  }

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case "bullish":
        return <TrendingUp className="h-5 w-5 text-green-400" />
      case "bearish":
        return <TrendingDown className="h-5 w-5 text-red-400" />
      default:
        return <BarChart3 className="h-5 w-5 text-yellow-400" />
    }
  }

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
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

            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                {timeframes.map((tf) => (
                  <SelectItem key={tf} value={tf} className="text-white hover:bg-white/10">
                    {tf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={calculateProbability}
            disabled={isLoading}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-white font-medium">Calculating probabilities...</p>
            <p className="text-gray-400 text-sm mt-1">Analyzing market data with AI</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Main Prediction */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                {getPredictionIcon(data.prediction)}
                <h3 className={`text-2xl font-bold ${getPredictionColor(data.prediction)}`}>
                  {data.prediction.toUpperCase()}
                </h3>
              </div>
              <p className="text-gray-400 text-sm">
                {data.timeframe} prediction for {data.symbol}
              </p>
              <Badge className="mt-2 bg-blue-500/20 text-blue-300 border-blue-400/30">
                {data.confidence}% Confidence
              </Badge>
            </div>

            {/* Probability Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-green-400 font-medium">Bullish</span>
                  <span className="text-sm text-green-400">{data.bullishProbability}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${data.bullishProbability}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-red-400 font-medium">Bearish</span>
                  <span className="text-sm text-red-400">{data.bearishProbability}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-red-500 to-red-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${data.bearishProbability}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-yellow-400 font-medium">Neutral</span>
                  <span className="text-sm text-yellow-400">{data.neutralProbability}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${data.neutralProbability}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Factors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Technical</span>
                  <span className="text-sm font-semibold text-white">{data.factors.technical}%</span>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Volume</span>
                  <span className="text-sm font-semibold text-white">{data.factors.volume}%</span>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Sentiment</span>
                  <span className="text-sm font-semibold text-white">{data.factors.sentiment}%</span>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Momentum</span>
                  <span className="text-sm font-semibold text-white">{data.factors.momentum}%</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
