"use client"

import { useEffect } from "react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, TrendingUp, TrendingDown, Activity, BarChart3, Loader2, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  content?: string
  ts: number
  image?: string
  meta?: {
    exchange?: string
    symbol?: string
    timeframe?: string
    stats?: {
      low: { price: number; time: number }
      high: { price: number; time: number }
    }
  }
}

type ProbabilityAnalysis = {
  symbol: string
  exchange: string
  bullishProbability: number
  bearishProbability: number
  neutralProbability: number
  newsAnalysis: {
    positive: number
    negative: number
    neutral: number
    topNews: string[]
  }
  technicalAnalysis: {
    dayHigh: number
    dayLow: number
    currentPrice: number
    pricePosition: number
    volatility: number
  }
  recommendation: "BUY" | "SELL" | "HOLD"
  confidence: number
}

export function ChatPanel() {
  const [messages, setMessages] = React.useState<ChatMsg[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Welcome to ECHART AI Assistant! I can analyze stocks using live news and technical data. Try asking for a probability analysis of any stock like 'analyze RELIANCE' or 'what's the sentiment for TCS?'",
      ts: Date.now(),
    },
  ])
  const [input, setInput] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [analysisLoading, setAnalysisLoading] = React.useState(false)
  const [currentAnalysis, setCurrentAnalysis] = React.useState<ProbabilityAnalysis | null>(null)
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function analyzeProbability(symbol: string, exchange = "NSE"): Promise<ProbabilityAnalysis> {
    setAnalysisLoading(true)

    try {
      // Simulate analysis delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock analysis data
      const mockPrice = 2500 + Math.random() * 100
      const mockHigh = mockPrice + Math.random() * 50
      const mockLow = mockPrice - Math.random() * 50

      const newsAnalysis = {
        positive: 30 + Math.random() * 40,
        negative: 20 + Math.random() * 30,
        neutral: 0,
        topNews: [
          `${symbol} shows strong quarterly performance`,
          `Market analysts upgrade ${symbol} rating`,
          `${symbol} announces strategic partnership`,
        ],
      }
      newsAnalysis.neutral = 100 - newsAnalysis.positive - newsAnalysis.negative

      const pricePosition = ((mockPrice - mockLow) / (mockHigh - mockLow)) * 100
      const volatility = ((mockHigh - mockLow) / mockPrice) * 100

      const newsSentimentScore = (newsAnalysis.positive - newsAnalysis.negative) / 100
      const technicalScore = (pricePosition - 50) / 50

      const bullishProbability = Math.max(0, Math.min(100, 50 + newsSentimentScore * 30 + technicalScore * 20))
      const bearishProbability = Math.max(0, Math.min(100, 50 - newsSentimentScore * 30 - technicalScore * 20))
      const neutralProbability = Math.max(0, 100 - bullishProbability - bearishProbability)

      const confidence = Math.abs(newsSentimentScore) * 50 + Math.abs(technicalScore) * 30 + 20

      let recommendation: "BUY" | "SELL" | "HOLD" = "HOLD"
      if (bullishProbability > 60 && confidence > 70) recommendation = "BUY"
      else if (bearishProbability > 60 && confidence > 70) recommendation = "SELL"

      return {
        symbol,
        exchange,
        bullishProbability: Math.round(bullishProbability),
        bearishProbability: Math.round(bearishProbability),
        neutralProbability: Math.round(neutralProbability),
        newsAnalysis: {
          positive: Math.round(newsAnalysis.positive),
          negative: Math.round(newsAnalysis.negative),
          neutral: Math.round(newsAnalysis.neutral),
          topNews: newsAnalysis.topNews,
        },
        technicalAnalysis: {
          dayHigh: mockHigh,
          dayLow: mockLow,
          currentPrice: mockPrice,
          pricePosition: Math.round(pricePosition),
          volatility: Math.round(volatility * 10) / 10,
        },
        recommendation,
        confidence: Math.round(confidence),
      }
    } finally {
      setAnalysisLoading(false)
    }
  }

  // Listen for analyzed screenshot from chart
  React.useEffect(() => {
    function onAnalyzed(e: Event) {
      const evt = e as CustomEvent
      const detail = evt.detail as ChatMsg["meta"] & { image: string }
      const assistantId = crypto.randomUUID()
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: "Captured chart and requested analysis.",
          ts: Date.now(),
        },
        {
          id: assistantId,
          role: "assistant",
          ts: Date.now(),
          image: detail.image,
          meta: {
            exchange: detail.exchange,
            symbol: detail.symbol,
            timeframe: detail.timeframe,
            stats: detail.stats,
          },
          content: makeSummary(detail),
        },
      ])
    }
    window.addEventListener("echart:screenshot-analyzed", onAnalyzed as EventListener)
    return () => window.removeEventListener("echart:screenshot-analyzed", onAnalyzed as EventListener)
  }, [])

  function makeSummary(detail: { exchange?: string; symbol?: string; timeframe?: string; stats?: any }) {
    const low = detail.stats?.low?.price
    const high = detail.stats?.high?.price
    const parts = [
      detail.exchange && detail.symbol ? `${detail.exchange}:${detail.symbol}` : undefined,
      detail.timeframe ? `TF ${detail.timeframe}` : undefined,
    ].filter(Boolean)
    const head = parts.length ? `${parts.join(" • ")}` : "Chart"
    return `${head}\nHigh: ${high?.toFixed(2)}\nLow: ${low?.toFixed(2)}`
  }

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput("")

    const probabilityKeywords = ["probability", "analysis", "analyze", "predict", "forecast", "sentiment"]
    const isAnalysisRequest = probabilityKeywords.some((keyword) => text.toLowerCase().includes(keyword))

    if (isAnalysisRequest) {
      // Extract symbol from message
      const words = text.toUpperCase().split(" ")
      const commonSymbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ITC", "SBIN", "NIFTY", "SENSEX"]
      const symbol = words.find((word) => commonSymbols.includes(word)) || "RELIANCE"

      const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() }
      setMessages((m) => [...m, userMsg])

      try {
        const analysis = await analyzeProbability(symbol)
        setCurrentAnalysis(analysis)

        const assistantMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `I've completed a comprehensive probability analysis for ${symbol}. The analysis shows a ${analysis.bullishProbability}% bullish probability with ${analysis.confidence}% confidence. Check the detailed analysis panel below for insights including news sentiment, technical indicators, and trading recommendation.`,
          ts: Date.now(),
        }
        setMessages((m) => [...m, assistantMsg])
      } catch (error) {
        const errorMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I couldn't complete the analysis right now. Please try again.",
          ts: Date.now(),
        }
        setMessages((m) => [...m, errorMsg])
      }
      return
    }

    // Handle general chat
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text, ts: Date.now() }
    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMsg = { id: assistantId, role: "assistant", content: "", ts: Date.now() }

    setMessages((m) => [...m, userMsg, assistantMsg])
    setLoading(true)

    try {
      // Simulate AI response
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const responses = [
        "I can help you analyze market trends and provide insights on various stocks. Try asking me to analyze a specific stock!",
        "The market is showing interesting patterns today. Would you like me to analyze any particular stock for you?",
        "I'm here to help with your trading decisions. Ask me about probability analysis, market sentiment, or technical indicators.",
        "Based on current market conditions, I can provide detailed analysis for any NSE-listed stock. What would you like to know?",
      ]

      const response = responses[Math.floor(Math.random() * responses.length)]

      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: response } : msg)))
    } catch (e: any) {
      const errorMsg = "Sorry, I couldn't get a response. Please try again."
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: errorMsg } : msg)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black/20 to-gray-900/20 backdrop-blur-xl">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-purple-400" />
          <h3 className="font-semibold text-white">AI Trading Assistant</h3>
          <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300 border-green-400/30">
            Live
          </Badge>
        </div>
      </div>

      {/* Scrollable Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl p-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "bg-white/10 text-white border border-white/20"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                {message.image && (
                  <img
                    src={message.image || "/placeholder.svg"}
                    alt="Attached analysis"
                    className="mt-2 w-full h-auto rounded-md border max-w-xs"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                {message.meta?.stats && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-300">
                    <div>
                      <div className="font-medium text-emerald-400">High</div>
                      <div>Price: {message.meta.stats.high.price.toFixed(2)}</div>
                      <div>Time: {new Date(message.meta.stats.high.time * 1000).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-400">Low</div>
                      <div>Price: {message.meta.stats.low.price.toFixed(2)}</div>
                      <div>Time: {new Date(message.meta.stats.low.time * 1000).toLocaleString()}</div>
                    </div>
                  </div>
                )}
                <p className="text-xs opacity-70 mt-2">
                  {new Date(message.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {(loading || analysisLoading) && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white/10 text-white border border-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{analysisLoading ? "Analyzing market data..." : "Thinking..."}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <form onSubmit={onSend} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about market trends, analyze stocks..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            disabled={loading || analysisLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || loading || analysisLoading}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {loading || analysisLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Analysis Panel */}
      {currentAnalysis && (
        <div className="flex-shrink-0 max-h-[300px] overflow-y-auto border-t border-white/10">
          <div className="p-3 bg-gradient-to-r from-blue-50/10 to-purple-50/10">
            <Card className="shadow-lg border-0 bg-white/5 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <BarChart3 className="h-5 w-5 text-blue-400" />
                      {currentAnalysis.symbol} Analysis
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Based on news sentiment & technical indicators
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      currentAnalysis.recommendation === "BUY"
                        ? "default"
                        : currentAnalysis.recommendation === "SELL"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-sm font-bold"
                  >
                    {currentAnalysis.recommendation}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Probability Bars */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Bullish</span>
                    </div>
                    <span className="text-sm font-bold text-green-400">{currentAnalysis.bullishProbability}%</span>
                  </div>
                  <Progress value={currentAnalysis.bullishProbability} className="h-2">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${currentAnalysis.bullishProbability}%` }}
                    />
                  </Progress>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-medium text-white">Bearish</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">{currentAnalysis.bearishProbability}%</span>
                  </div>
                  <Progress value={currentAnalysis.bearishProbability} className="h-2">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${currentAnalysis.bearishProbability}%` }}
                    />
                  </Progress>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">Neutral</span>
                    </div>
                    <span className="text-sm font-bold text-gray-400">{currentAnalysis.neutralProbability}%</span>
                  </div>
                  <Progress value={currentAnalysis.neutralProbability} className="h-2">
                    <div
                      className="h-full bg-gray-500 rounded-full transition-all"
                      style={{ width: `${currentAnalysis.neutralProbability}%` }}
                    />
                  </Progress>
                </div>

                {/* Technical Data */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Day High</div>
                    <div className="font-bold text-green-400">
                      ₹{currentAnalysis.technicalAnalysis.dayHigh.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Day Low</div>
                    <div className="font-bold text-red-400">₹{currentAnalysis.technicalAnalysis.dayLow.toFixed(2)}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Current Price</div>
                    <div className="font-bold text-white">
                      ₹{currentAnalysis.technicalAnalysis.currentPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Confidence</div>
                    <div className="font-bold text-blue-400">{currentAnalysis.confidence}%</div>
                  </div>
                </div>

                {/* News Sentiment */}
                <div className="pt-2 border-t border-white/10">
                  <div className="text-xs text-gray-400 mb-2">News Sentiment Analysis</div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-green-400">Positive: {currentAnalysis.newsAnalysis.positive}%</span>
                    <span className="text-red-400">Negative: {currentAnalysis.newsAnalysis.negative}%</span>
                    <span className="text-gray-400">Neutral: {currentAnalysis.newsAnalysis.neutral}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
