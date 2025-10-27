"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, ExternalLink, TrendingUp, Clock, Globe, AlertCircle, Activity } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  category: string
  sentiment: "positive" | "negative" | "neutral"
  relatedSymbols: string[]
  imageUrl?: string
}

// Mock news data for demo
const generateMockNews = (): NewsItem[] => {
  const mockNews = [
    {
      id: "1",
      title: "Reliance Industries reports strong Q3 earnings, beats estimates",
      summary:
        "The oil-to-telecom conglomerate posted a net profit of ₹18,549 crore for the quarter ended December 2024.",
      url: "#",
      source: "Economic Times",
      publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      category: "Earnings",
      sentiment: "positive" as const,
      relatedSymbols: ["RELIANCE"],
    },
    {
      id: "2",
      title: "TCS announces major cloud partnership with Microsoft",
      summary:
        "The IT giant will leverage Microsoft's Azure platform to deliver enhanced digital transformation services.",
      url: "#",
      source: "Business Standard",
      publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      category: "IT",
      sentiment: "positive" as const,
      relatedSymbols: ["TCS"],
    },
    {
      id: "3",
      title: "HDFC Bank faces regulatory scrutiny over lending practices",
      summary: "RBI raises concerns about the bank's risk management framework in the retail lending segment.",
      url: "#",
      source: "Mint",
      publishedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      category: "Banking",
      sentiment: "negative" as const,
      relatedSymbols: ["HDFCBANK"],
    },
    {
      id: "4",
      title: "Nifty 50 closes higher amid positive global cues",
      summary: "The benchmark index gained 1.2% to close at 19,847 points, led by gains in IT and banking stocks.",
      url: "#",
      source: "CNBC TV18",
      publishedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      category: "Market",
      sentiment: "positive" as const,
      relatedSymbols: ["NIFTY"],
    },
    {
      id: "5",
      title: "Infosys wins multi-million dollar deal from European client",
      summary:
        "The five-year contract is expected to generate revenue of over $500 million for the IT services company.",
      url: "#",
      source: "Reuters",
      publishedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      category: "IT",
      sentiment: "positive" as const,
      relatedSymbols: ["INFY"],
    },
    {
      id: "6",
      title: "ITC shares fall on cigarette tax hike concerns",
      summary: "Investors worry about potential impact of higher taxes on the company's tobacco business.",
      url: "#",
      source: "Financial Express",
      publishedAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      category: "FMCG",
      sentiment: "negative" as const,
      relatedSymbols: ["ITC"],
    },
  ]

  return mockNews
}

export function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connected")

  // Fetch news data
  const fetchNews = async () => {
    setIsLoading(true)
    setError(null)
    setConnectionStatus("connecting")

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockNews = generateMockNews()
      setNews(mockNews)
      setConnectionStatus("connected")
      setLastUpdate(new Date())

      console.log(`Loaded ${mockNews.length} news items`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch news"
      console.error("Error fetching news:", errorMessage)
      setError(errorMessage)
      setConnectionStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh news every 60 seconds
  useEffect(() => {
    console.log("Setting up news auto-refresh...")

    // Initial fetch
    fetchNews()

    // Set up interval for auto-refresh every 60 seconds
    const interval = setInterval(() => {
      console.log("Auto-refresh news triggered...")
      fetchNews()
    }, 60000)

    return () => {
      console.log("Cleaning up news auto-refresh...")
      clearInterval(interval)
    }
  }, [])

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date()
      const publishedDate = new Date(dateString)
      const diffInMinutes = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "Just now"
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    } catch {
      return "Unknown"
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-300 border-green-400/30"
      case "negative":
        return "bg-red-500/20 text-red-300 border-red-400/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/30"
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3" />
      case "negative":
        return <TrendingUp className="h-3 w-3 rotate-180" />
      default:
        return <Globe className="h-3 w-3" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "earnings":
        return "bg-blue-500/20 text-blue-300 border-blue-400/30"
      case "it":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
      case "banking":
        return "bg-orange-500/20 text-orange-300 border-orange-400/30"
      case "market":
        return "bg-purple-500/20 text-purple-300 border-purple-400/30"
      case "fmcg":
        return "bg-green-500/20 text-green-300 border-green-400/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/30"
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "text-green-400"
      case "connecting":
        return "text-yellow-400"
      case "error":
        return "text-red-400"
      default:
        return "text-gray-400"
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Live Updates"
      case "connecting":
        return "Connecting"
      case "error":
        return "Connection Error"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Market News</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <Activity
                className={`h-3 w-3 ${getConnectionStatusColor()} ${connectionStatus === "connected" ? "animate-pulse" : ""}`}
              />
              <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNews}
              disabled={isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          <span>•</span>
          <span>Auto-refresh: 60s</span>
          {news.length > 0 && (
            <>
              <span>•</span>
              <span>{news.length} articles</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoading && news.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-orange-400" />
              <p className="font-medium text-white">Loading market news...</p>
              <p className="text-sm text-gray-400">Fetching latest updates</p>
            </div>
          </div>
        ) : error && news.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 mb-2 font-medium">Failed to load news</p>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <Button
                onClick={fetchNews}
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : news.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="space-y-0">
              {news.map((item, index) => (
                <div key={item.id}>
                  <div className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm leading-tight line-clamp-2 text-white">{item.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 h-6 w-6 p-0 text-gray-400 hover:text-white"
                            onClick={() => window.open(item.url, "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>

                        {item.summary && (
                          <p className="text-xs text-gray-300 line-clamp-2 mb-3 leading-relaxed">{item.summary}</p>
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs px-2 py-0 ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs px-2 py-0 flex items-center gap-1 ${getSentimentColor(item.sentiment)}`}
                            >
                              {getSentimentIcon(item.sentiment)}
                              {item.sentiment}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(item.publishedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-medium">{item.source}</span>

                          {item.relatedSymbols && item.relatedSymbols.length > 0 && (
                            <div className="flex items-center gap-1">
                              {item.relatedSymbols.slice(0, 3).map((symbol) => (
                                <Badge
                                  key={symbol}
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0 bg-white/10 text-gray-300"
                                >
                                  {symbol}
                                </Badge>
                              ))}
                              {item.relatedSymbols.length > 3 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-white/10 text-gray-300">
                                  +{item.relatedSymbols.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {index < news.length - 1 && <Separator className="border-white/10" />}
                </div>
              ))}

              {isLoading && news.length > 0 && (
                <div className="p-4 border-t border-white/10">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Refreshing news...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">No news available</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNews}
                className="mt-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load News
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
