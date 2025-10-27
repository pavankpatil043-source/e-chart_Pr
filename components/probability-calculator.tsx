"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface ProbabilityData {
  bullish: number
  bearish: number
  neutral: number
  confidence: number
  signal: "BUY" | "SELL" | "HOLD"
  factors: string[]
}

export function ProbabilityCalculator() {
  const [probability, setProbability] = useState<ProbabilityData>({
    bullish: 65,
    bearish: 25,
    neutral: 10,
    confidence: 78,
    signal: "BUY",
    factors: ["Strong volume", "RSI oversold", "Support holding"],
  })

  const [isUpdating, setIsUpdating] = useState(false)

  const updateProbability = () => {
    setIsUpdating(true)

    setTimeout(() => {
      const bullish = Math.floor(Math.random() * 40) + 40 // 40-80%
      const bearish = Math.floor(Math.random() * 30) + 10 // 10-40%
      const neutral = 100 - bullish - bearish
      const confidence = Math.floor(Math.random() * 30) + 60 // 60-90%

      let signal: "BUY" | "SELL" | "HOLD" = "HOLD"
      if (bullish > 60) signal = "BUY"
      else if (bearish > 40) signal = "SELL"

      const factorsList = [
        "Strong volume surge",
        "RSI showing momentum",
        "Support level holding",
        "Resistance breakout",
        "Moving average crossover",
        "Institutional buying",
        "Sector rotation",
        "Market sentiment positive",
        "Technical indicators aligned",
        "Price action bullish",
      ]

      const selectedFactors = factorsList.sort(() => 0.5 - Math.random()).slice(0, 3)

      setProbability({
        bullish,
        bearish,
        neutral,
        confidence,
        signal,
        factors: selectedFactors,
      })

      setIsUpdating(false)
    }, 1500)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      updateProbability()
    }, 15000) // Update every 15 seconds

    return () => clearInterval(interval)
  }, [])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "BUY":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "SELL":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    }
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case "BUY":
        return <TrendingUp className="h-4 w-4" />
      case "SELL":
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Signal */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Badge variant="secondary" className={`${getSignalColor(probability.signal)} text-lg px-4 py-2`}>
            {getSignalIcon(probability.signal)}
            <span className="ml-2 font-bold">{probability.signal}</span>
          </Badge>
        </div>
        <div className="text-sm text-white/70">
          Confidence: {probability.confidence}%{isUpdating && <span className="ml-2 text-blue-400">Updating...</span>}
        </div>
      </div>

      {/* Probability Breakdown */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/70 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              Bullish Probability
            </span>
            <span className="text-sm font-medium text-green-400">{probability.bullish}%</span>
          </div>
          <Progress value={probability.bullish} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/70 flex items-center">
              <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
              Bearish Probability
            </span>
            <span className="text-sm font-medium text-red-400">{probability.bearish}%</span>
          </div>
          <Progress value={probability.bearish} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/70 flex items-center">
              <Activity className="h-4 w-4 text-yellow-400 mr-1" />
              Neutral Probability
            </span>
            <span className="text-sm font-medium text-yellow-400">{probability.neutral}%</span>
          </div>
          <Progress value={probability.neutral} className="h-2" />
        </div>
      </div>

      {/* Key Factors */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Key Factors</h4>
        <div className="space-y-2">
          {probability.factors.map((factor, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm text-white/80">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-white/50 text-center border-t border-white/10 pt-3">
        AI analysis updates every 15 seconds • Based on technical indicators
      </div>
    </div>
  )
}
