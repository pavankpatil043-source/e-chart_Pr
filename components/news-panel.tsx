"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  sentiment: "positive" | "negative" | "neutral"
  category?: string
  region?: string
}

export function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/yahoo-news", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.articles)) {
        setNews(data.articles)
        setLastUpdate(new Date())
      } else {
        throw new Error("Invalid news data structure")
      }
    } catch (err) {
      console.error("Error fetching news:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch news")

      // Set curated Indian regional news as fallback
      setNews(getCuratedIndianNews())
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }

  const getCuratedIndianNews = (): NewsItem[] => {
    return [
      {
        id: "1",
        title: "Nifty 50 Hits New High Amid Strong Banking Sector Performance",
        summary:
          "Indian benchmark indices surge as banking stocks lead the rally with HDFC Bank and ICICI Bank gaining over 3%.",
        url: "#",
        source: "NSE Market Update",
        publishedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        sentiment: "positive",
        category: "Banking",
        region: "National",
      },
      {
        id: "2",
        title: "Gujarat Chemical Sector Shows Strong Q3 Results",
        summary:
          "Major chemical companies in Gujarat report robust quarterly earnings with improved margins and export growth.",
        url: "#",
        source: "Regional Business News",
        publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sentiment: "positive",
        category: "Chemicals",
        region: "Gujarat",
      },
      {
        id: "3",
        title: "Karnataka IT Exports Reach Record High",
        summary:
          "Bangalore-based IT companies report 15% growth in export revenues, boosting regional economic indicators.",
        url: "#",
        source: "Tech Business Today",
        publishedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        sentiment: "positive",
        category: "Technology",
        region: "Karnataka",
      },
      {
        id: "4",
        title: "Tamil Nadu Textile Stocks Under Pressure",
        summary: "Regional textile manufacturers face headwinds due to rising cotton prices and export challenges.",
        url: "#",
        source: "Textile Industry Report",
        publishedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        sentiment: "negative",
        category: "Textiles",
        region: "Tamil Nadu",
      },
      {
        id: "5",
        title: "Maharashtra Auto Sector Sees Mixed Performance",
        summary:
          "Pune and Aurangabad auto clusters show varied results with two-wheeler segment outperforming four-wheelers.",
        url: "#",
        source: "Auto Industry Weekly",
        publishedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
        sentiment: "neutral",
        category: "Automotive",
        region: "Maharashtra",
      },
      {
        id: "6",
        title: "West Bengal Tea Auction Prices Rise 12%",
        summary:
          "Kolkata tea auctions witness significant price increases driven by quality improvements and export demand.",
        url: "#",
        source: "Commodity Market News",
        publishedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        sentiment: "positive",
        category: "Commodities",
        region: "West Bengal",
      },
      {
        id: "7",
        title: "Rajasthan Mining Stocks Gain on Policy Changes",
        summary: "New state mining policies boost investor confidence in Rajasthan-based mineral extraction companies.",
        url: "#",
        source: "Mining Sector Update",
        publishedAt: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
        sentiment: "positive",
        category: "Mining",
        region: "Rajasthan",
      },
      {
        id: "8",
        title: "Kerala Spice Exports Face Logistics Challenges",
        summary:
          "Kochi port congestion affects spice export schedules, impacting regional agricultural commodity prices.",
        url: "#",
        source: "Agricultural Trade News",
        publishedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        sentiment: "negative",
        category: "Agriculture",
        region: "Kerala",
      },
    ]
  }

  useEffect(() => {
    fetchNews()

    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3 text-green-400" />
      case "negative":
        return <TrendingDown className="h-3 w-3 text-red-400" />
      default:
        return <div className="h-3 w-3 rounded-full bg-yellow-400" />
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "negative":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      if (diffInMinutes < 1) return "Just now"
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    } catch {
      return "Recently"
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            REGIONAL INDIA
          </Badge>
          {loading && (
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              Updating...
            </Badge>
          )}
          {lastUpdate && <span className="text-xs text-white/50">Updated {lastUpdate.toLocaleTimeString()}</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchNews}
          disabled={loading}
          className="text-white/70 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-2">
          <p className="text-red-400 text-xs mb-2">API Error - Using Curated News</p>
        </div>
      )}

      {/* News Items */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors line-clamp-2 flex-1">
                {item.title}
              </h4>
              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                {getSentimentIcon(item.sentiment)}
                <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-white/70" />
              </div>
            </div>

            <p className="text-xs text-white/70 mb-2 line-clamp-2">{item.summary}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className={`text-xs ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment}
                </Badge>
                {item.region && (
                  <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {item.region}
                  </Badge>
                )}
                <span className="text-xs text-white/50">{item.source}</span>
              </div>
              <span className="text-xs text-white/50">{formatTimeAgo(item.publishedAt)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && news.length === 0 && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 rounded-lg bg-white/5">
              <div className="h-4 bg-white/10 rounded mb-2"></div>
              <div className="h-3 bg-white/5 rounded mb-1"></div>
              <div className="h-3 bg-white/5 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-white/50 text-center">
        Auto-refreshes every 5 minutes • Indian Regional Market News
      </div>
    </div>
  )
}
