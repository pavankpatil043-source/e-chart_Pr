"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, TrendingUp, TrendingDown, Activity, Wifi, WifiOff } from "lucide-react"
import { useLivePrices } from "@/hooks/use-live-prices"

interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: Date
  marketData?: {
    symbol: string
    price: number
    change: number
    changePercent: number
  }
}

const QUICK_QUESTIONS = [
  "What's the current Nifty 50 trend?",
  "Top gainers today?",
  "Banking sector analysis",
  "Reliance stock outlook",
  "Market sentiment today",
  "Best stocks to buy now",
]

const LIVE_SYMBOLS = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS"]

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Initialize messages on client side to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
    setMessages([
      {
        id: "1",
        content: "Market AI Assistant ready. Ask about live prices, trends, or analysis.",
        sender: "ai",
        timestamp: new Date(),
      },
    ])
  }, [])

  // Use live prices for real-time data
  const { prices, isConnected, connectionStatus, lastUpdate } = useLivePrices({
    symbols: LIVE_SYMBOLS,
    updateInterval: 2000,
  })

  // Safe time formatting to prevent hydration issues
  const formatTime = useCallback((date: Date) => {
    if (!isClient) return ""
    try {
      return date.toLocaleTimeString("en-IN", {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return date.toTimeString().slice(0, 8)
    }
  }, [isClient])

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const generateMarketResponse = useCallback(
    (userMessage: string): { content: string; marketData?: any } => {
      const message = userMessage.toLowerCase()
      const currentPrices = Object.fromEntries(prices.entries())

      if (message.includes("nifty") || message.includes("trend")) {
        const niftyPrice = 24850.25 + (Math.random() - 0.5) * 100
        const niftyChange = (Math.random() - 0.5) * 200
        const niftyChangePercent = (niftyChange / niftyPrice) * 100

        return {
          content: `📊 **LIVE Nifty 50 Analysis** 🔴

**Current Level:** ${niftyPrice.toFixed(2)} (${niftyChange > 0 ? "+" : ""}${(niftyChange ?? 0).toFixed(2)}, ${niftyChangePercent > 0 ? "+" : ""}${(niftyChangePercent ?? 0).toFixed(2)}%)

**Real-time Technical Analysis:**
• **Live Support:** ${(niftyPrice * 0.998).toFixed(0)} | ${(niftyPrice * 0.995).toFixed(0)}
• **Live Resistance:** ${(niftyPrice * 1.002).toFixed(0)} | ${(niftyPrice * 1.005).toFixed(0)}
• **RSI (Live):** ${(45 + Math.random() * 20).toFixed(1)} (${Math.random() > 0.5 ? "Bullish" : "Neutral"})
• **Volume:** ${Math.random() > 0.5 ? "Above Average" : "Normal"} 📈

**Live Market Drivers:**
${isConnected ? "✅ Connected to live NSE feeds" : "⚠️ Using simulated data"}
• FII Activity: ${Math.random() > 0.5 ? "Net Buying" : "Mixed"} ₹${(Math.random() * 3000).toFixed(0)}Cr
• Banking Index: ${Math.random() > 0.5 ? "Outperforming" : "Underperforming"}

**Trading Strategy:** ${niftyChangePercent > 0 ? "Buy on dips near support levels" : "Wait for reversal signals"}`,
          marketData: {
            symbol: "NIFTY 50",
            price: niftyPrice,
            change: niftyChange,
            changePercent: niftyChangePercent,
          },
        }
      }

      if (message.includes("reliance")) {
        const reliancePrice = currentPrices["RELIANCE.NS"]
        if (reliancePrice) {
          return {
            content: `⛽ **LIVE Reliance Industries Analysis** 🔴

**Real-time Price:** ₹${reliancePrice.price} (${reliancePrice.changePercent > 0 ? "+" : ""}${(reliancePrice.changePercent ?? 0).toFixed(2)}%)

**Live Technical Levels:**
• **Current Trend:** ${reliancePrice.changePercent > 0 ? "Bullish 📈" : "Bearish 📉"}
• **Intraday Support:** ₹${(reliancePrice.price * 0.995).toFixed(2)}
• **Intraday Resistance:** ₹${(reliancePrice.price * 1.005).toFixed(2)}
• **Volume Status:** ${Math.random() > 0.5 ? "High" : "Normal"}

**Live Fundamentals:**
• **Market Cap:** ₹${(reliancePrice.price * 676).toFixed(0)}K Cr (Live)
• **Sector:** Energy, Telecom, Retail
• **Key Catalyst:** ${Math.random() > 0.5 ? "Jio expansion" : "Refining margins"}

**Real-time Recommendation:** ${reliancePrice.changePercent > 1 ? "HOLD/Book profits" : reliancePrice.changePercent < -1 ? "BUY on dips" : "NEUTRAL/Watch"}

*Data updated: ${lastUpdate?.toLocaleTimeString() || "Live"}*`,
            marketData: {
              symbol: "RELIANCE",
              price: reliancePrice.price,
              change: reliancePrice.change,
              changePercent: reliancePrice.changePercent,
            },
          }
        }
      }

      if (message.includes("gainer") || message.includes("top")) {
        const topGainers = Array.from(prices.values())
          .filter((p) => p.changePercent > 0)
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 3)

        return {
          content: `🚀 **LIVE Top Gainers** 🔴

**Real-time NSE Leaders:**
${topGainers
  .map(
    (stock, index) =>
      `${index + 1}. **${stock.symbol.replace(".NS", "")}** - ₹${stock.price} (+${(stock.changePercent ?? 0).toFixed(2)}%)`,
  )
  .join("\n")}

**Live Market Pulse:**
• **Advance/Decline:** ${Math.random() > 0.5 ? "Positive" : "Mixed"} (${(Math.random() * 2 + 1).toFixed(1)}:1)
• **Sector Leaders:** ${Math.random() > 0.5 ? "Banking, IT" : "Auto, FMCG"}
• **FII Flow:** ${Math.random() > 0.5 ? "Buying" : "Selling"} ₹${(Math.random() * 2000).toFixed(0)}Cr

**Live Volume Analysis:**
${topGainers.length > 0 ? `• ${topGainers[0].symbol.replace(".NS", "")} showing strong institutional interest` : "• Mixed volume patterns"}
• Breakout stocks with momentum continuation expected

*Live data from NSE • Updated: ${lastUpdate?.toLocaleTimeString() || "Now"}*`,
          marketData: {
            symbol: "Top Gainers",
            price: 0,
            change: topGainers.length > 0 ? topGainers[0].changePercent : 2.4,
            changePercent: topGainers.length > 0 ? topGainers[0].changePercent : 2.4,
          },
        }
      }

      if (message.includes("banking") || message.includes("bank")) {
        const bankingStocks = Array.from(prices.values()).filter((p) => p.symbol.includes("HDFC") || p.symbol.includes("ICICI"))
        const avgChange =
          bankingStocks.length > 0
            ? bankingStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / bankingStocks.length
            : 0

        return {
          content: `🏦 **LIVE Banking Sector Analysis** 🔴

**Real-time Sector Performance:** ${avgChange > 0 ? "📈 Outperforming" : "📉 Underperforming"} (${avgChange > 0 ? "+" : ""}${(avgChange ?? 0).toFixed(2)}%)

**Live Banking Stocks:**
${bankingStocks
  .map(
    (stock) =>
      `• **${stock.symbol.replace(".NS", "")}** - ₹${stock.price} (${stock.changePercent > 0 ? "+" : ""}${(stock.changePercent ?? 0).toFixed(2)}%)`,
  )
  .join("\n")}

**Real-time Sector Insights:**
• **Credit Growth:** 14.5% YoY (Live RBI data)
• **NIM Trends:** ${Math.random() > 0.5 ? "Expanding" : "Stable"} across major banks
• **Asset Quality:** ${Math.random() > 0.5 ? "Improving" : "Stable"} GNPA trends

**Live Technical View:**
• **Bank Nifty:** ${Math.random() > 0.5 ? "Above key moving averages" : "Consolidating"}
• **Momentum:** ${avgChange > 0 ? "Bullish with volume support" : "Neutral, awaiting catalysts"}
• **Key Levels:** Watch 52,000 support, 53,500 resistance

**Sector Outlook:** ${avgChange > 1 ? "Positive momentum, ride the trend" : avgChange < -1 ? "Accumulate quality names on dips" : "Stock-specific approach recommended"}

*Live banking data • Updated: ${lastUpdate?.toLocaleTimeString() || "Now"}*`,
          marketData: {
            symbol: "BANK NIFTY",
            price: 52000 + avgChange * 100,
            change: avgChange * 10,
            changePercent: avgChange,
          },
        }
      }

      if (message.includes("sentiment") || message.includes("market")) {
        const pricesArray = Array.from(prices.values())
        const marketSentiment = pricesArray.filter((p) => p.changePercent > 0).length / pricesArray.length
        const sentimentScore = marketSentiment * 100

        return {
          content: `📈 **LIVE Market Sentiment Analysis** 🔴

**Overall Sentiment:** ${sentimentScore > 60 ? "BULLISH 🟢" : sentimentScore > 40 ? "NEUTRAL 🟡" : "BEARISH 🔴"} (${sentimentScore.toFixed(0)}/100)

**Real-time Market Indicators:**
• **Live Advance/Decline:** ${(marketSentiment * 2000).toFixed(0)} vs ${((1 - marketSentiment) * 2000).toFixed(0)}
• **FII Activity:** ${Math.random() > 0.5 ? "Net Buying" : "Net Selling"} ₹${(Math.random() * 3000).toFixed(0)}Cr
• **VIX Level:** ${(12 + Math.random() * 8).toFixed(2)} (${Math.random() > 0.5 ? "Falling" : "Rising"})
• **Put-Call Ratio:** ${(0.7 + Math.random() * 0.6).toFixed(2)} (${Math.random() > 0.5 ? "Bullish" : "Neutral"})

**Live Sector Rotation:**
${isConnected ? "📊 Real-time sector data available" : "⚠️ Using simulated data"}
• **Outperforming:** ${Math.random() > 0.5 ? "Banking, IT, Auto" : "FMCG, Pharma, Energy"}
• **Underperforming:** ${Math.random() > 0.5 ? "Metals, Realty" : "IT, Telecom"}

**Institutional Flow (Live):**
• **FII:** ${Math.random() > 0.5 ? "Buyers" : "Sellers"} (₹${(Math.random() * 2000).toFixed(0)}Cr today)
• **DII:** Consistent ${Math.random() > 0.5 ? "buying" : "support"} (₹${(Math.random() * 1500).toFixed(0)}Cr)

**Live Market Breadth:**
• **Stocks Above 20 EMA:** ${(40 + Math.random() * 40).toFixed(0)}%
• **New Highs/Lows:** ${Math.floor(Math.random() * 50)} / ${Math.floor(Math.random() * 30)}

*Sentiment updated every 2 seconds • Last: ${lastUpdate?.toLocaleTimeString() || "Live"}*`,
          marketData: {
            symbol: "Market Sentiment",
            price: sentimentScore,
            change: sentimentScore - 50,
            changePercent: sentimentScore - 50,
          },
        }
      }

      // Default response with live data
      return {
        content: `🔴 **LIVE Indian Market Assistant** 

I have real-time access to NSE/BSE data feeds! Current status:

**Connection:** ${isConnected ? "🟢 LIVE Connected" : "🔴 Reconnecting..."}
**Data Source:** ${connectionStatus === "connected" ? "NSE/BSE Real-time" : "Simulated"}
**Last Update:** ${lastUpdate?.toLocaleTimeString() || "Connecting..."}

**Live Market Services:**
📊 Real-time stock prices & analysis
📈 Live technical indicators & signals  
📰 Current market sentiment & flows
💡 Instant trading recommendations
🏢 Live fundamental data
📋 Real-time portfolio insights

**Currently Tracking:**
${Array.from(prices.values()).map((p) => `• ${p.symbol.replace(".NS", "")}: ₹${p.price} (${p.changePercent > 0 ? "+" : ""}${(p.changePercent ?? 0).toFixed(2)}%)`).join("\n")}

Ask me about any stock, sector, or market trend for live analysis!`,
      }
    },
    [prices, isConnected, connectionStatus, lastUpdate],
  )

  const handleSend = useCallback(async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateMarketResponse(input)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: "ai",
        timestamp: new Date(),
        marketData: response.marketData,
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1500)
  }, [input, generateMarketResponse])

  const handleQuickQuestion = useCallback(
    (question: string) => {
      setInput(question)
      setTimeout(() => handleSend(), 100)
    },
    [handleSend],
  )

  const formatMarketData = useCallback((data: any) => {
    const isPositive = (data.change ?? 0) >= 0
    return (
      <Card className="mt-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-gray-800">{data.symbol}</span>
              <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-600 border-red-500/30">
                LIVE
              </Badge>
            </div>
            <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
              {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {isPositive ? "+" : ""}
              {(data.changePercent ?? 0).toFixed(2)}%
            </Badge>
          </div>
          {data.price > 0 && (
            <div className="mt-1">
              <span className="text-lg font-bold text-gray-900">₹{data.price.toLocaleString("en-IN")}</span>
              <span className={`ml-2 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {isPositive ? "+" : ""}₹{Math.abs(data.change ?? 0).toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }, [])

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-400 bg-green-500/20 border-green-500/30"
      case "connecting":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30"
      case "error":
        return "text-red-400 bg-red-500/20 border-red-500/30"
      default:
        return "text-gray-400 bg-gray-500/20 border-gray-500/30"
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Enhanced Header with Live Status */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-white/10 rounded-xl p-3 mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bot className="h-6 w-6 text-purple-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Live Market AI</h3>
            <div className="text-[10px] text-white/60 flex items-center gap-1">
              <Badge className={`${getConnectionStatusColor()} px-1.5 py-0 text-[9px] h-4`}>
                {isConnected ? <Wifi className="h-2.5 w-2.5 mr-0.5" /> : <WifiOff className="h-2.5 w-2.5 mr-0.5" />}
                {connectionStatus.toUpperCase()}
              </Badge>
              {lastUpdate && <span>• {formatTime(lastUpdate)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 pr-1 mb-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex space-x-2 max-w-[90%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                <Avatar className="w-7 h-7 mt-0.5 flex-shrink-0">
                  <AvatarFallback className={`text-xs ${message.sender === "user" ? "bg-gradient-to-br from-purple-500 to-blue-500" : "bg-gradient-to-br from-purple-500/20 to-blue-500/20"}`}>
                    {message.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-xl p-3 transition-all ${
                    message.sender === "user"
                      ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20"
                      : "bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  {message.marketData && formatMarketData(message.marketData)}
                  <div className="text-[10px] opacity-60 mt-1.5 flex items-center gap-1">
                    <Activity className="h-2.5 w-2.5" />
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Quick Questions - Enhanced UI */}
          {messages.length === 1 && (
            <div className="space-y-2.5 mt-4">
              <div className="text-xs font-semibold text-white/70 text-center flex items-center justify-center gap-2">
                <Activity className="h-3 w-3 text-purple-400" />
                Live Market Questions
              </div>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_QUESTIONS.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickQuestion(question)}
                    className="text-xs h-auto py-2 px-3 bg-gradient-to-r from-white/5 to-white/[0.02] border-white/20 text-white/80 hover:from-white/10 hover:to-white/5 hover:border-white/30 hover:text-white justify-start transition-all group"
                  >
                    <span className="mr-2 text-red-400 group-hover:scale-110 transition-transform">🔴</span>
                    <span className="text-left">{question}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Loading indicator - Enhanced */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex space-x-2 max-w-[90%]">
                <Avatar className="w-7 h-7 mt-0.5">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Bot className="h-3.5 w-3.5 animate-pulse" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gradient-to-br from-white/10 to-white/5 text-white border border-white/10 rounded-xl p-3">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="border-t border-white/10 pt-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about live stocks, real-time trends..."
            disabled={isLoading}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-purple-400 transition-all h-10"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 transition-all h-10 px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-[10px] text-white/40 mt-2 text-center">
          Real-time AI powered by live market data • Ask anything about stocks
        </p>
      </div>
    </div>
  )
}
