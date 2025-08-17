"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Newspaper, Clock, Globe, AlertCircle } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  sentiment: "positive" | "negative" | "neutral"
  category: string
  region: string
  imageUrl?: string
}

interface EnhancedNewsPanelProps {
  className?: string
}

export function EnhancedNewsPanel({ className }: EnhancedNewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSentiment, setSelectedSentiment] = useState("all")
  const [dataSource, setDataSource] = useState<string>("")

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: "25",
        ...(selectedCategory !== "all" && { category: selectedCategory }),
        ...(selectedSentiment !== "all" && { sentiment: selectedSentiment }),
      })

      const response = await fetch(`/api/financial-news?${params}`, {
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
        setDataSource(data.source || "Unknown")
      } else {
        throw new Error("Invalid news data structure")
      }
    } catch (err) {
      console.error("Error fetching news:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch news")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()

    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedCategory, selectedSentiment])

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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Banking: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      Technology: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      Pharmaceuticals: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      Automotive: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      Energy: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      Market: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
      Policy: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
    return colors[category] || "bg-slate-500/20 text-slate-400 border-slate-500/30"
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

  const getUniqueCategories = () => {
    const categories = [...new Set(news.map((item) => item.category))].sort()
    return categories
  }

  const filteredNews = news.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    const matchesSentiment = selectedSentiment === "all" || item.sentiment === selectedSentiment
    return matchesCategory && matchesSentiment
  })

  const newsBySentiment = {
    positive: news.filter((item) => item.sentiment === "positive"),
    negative: news.filter((item) => item.sentiment === "negative"),
    neutral: news.filter((item) => item.sentiment === "neutral"),
  }

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-5 w-5" />
            <span>Financial News</span>
            <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
              LIVE
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {dataSource && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Globe className="h-3 w-3 mr-1" />
                {dataSource.includes("API") ? "LIVE API" : "CURATED"}
              </Badge>
            )}
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
        </CardTitle>

        {/* Filters */}
        <div className="flex items-center space-x-2 mt-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">
                All Categories
              </SelectItem>
              {getUniqueCategories().map((category) => (
                <SelectItem key={category} value={category} className="text-white hover:bg-slate-700">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
            <SelectTrigger className="w-28 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">
                All
              </SelectItem>
              <SelectItem value="positive" className="text-white hover:bg-slate-700">
                Positive
              </SelectItem>
              <SelectItem value="negative" className="text-white hover:bg-slate-700">
                Negative
              </SelectItem>
              <SelectItem value="neutral" className="text-white hover:bg-slate-700">
                Neutral
              </SelectItem>
            </SelectContent>
          </Select>

          {lastUpdate && (
            <span className="text-xs text-white/50 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error State */}
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

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

        {/* News Content */}
        {!loading && news.length > 0 && (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/10">
              <TabsTrigger value="all" className="text-white data-[state=active]:bg-white/20">
                All ({filteredNews.length})
              </TabsTrigger>
              <TabsTrigger value="positive" className="text-white data-[state=active]:bg-white/20">
                <TrendingUp className="h-3 w-3 mr-1" />
                Positive ({newsBySentiment.positive.length})
              </TabsTrigger>
              <TabsTrigger value="negative" className="text-white data-[state=active]:bg-white/20">
                <TrendingDown className="h-3 w-3 mr-1" />
                Negative ({newsBySentiment.negative.length})
              </TabsTrigger>
              <TabsTrigger value="neutral" className="text-white data-[state=active]:bg-white/20">
                Neutral ({newsBySentiment.neutral.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredNews.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => window.open(item.url, "_blank")}
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
                          <Badge className={getCategoryColor(item.category)} variant="secondary">
                            {item.category}
                          </Badge>
                          <Badge className={getSentimentColor(item.sentiment)} variant="secondary">
                            {item.sentiment}
                          </Badge>
                          <span className="text-xs text-white/50">{item.source}</span>
                        </div>
                        <span className="text-xs text-white/50">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="positive" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {newsBySentiment.positive.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors cursor-pointer group"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white group-hover:text-green-300 transition-colors line-clamp-2 flex-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                        </div>
                      </div>

                      <p className="text-xs text-white/70 mb-2 line-clamp-2">{item.summary}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(item.category)} variant="secondary">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-white/50">{item.source}</span>
                        </div>
                        <span className="text-xs text-white/50">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="negative" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {newsBySentiment.negative.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer group"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white group-hover:text-red-300 transition-colors line-clamp-2 flex-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <TrendingDown className="h-3 w-3 text-red-400" />
                          <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                        </div>
                      </div>

                      <p className="text-xs text-white/70 mb-2 line-clamp-2">{item.summary}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(item.category)} variant="secondary">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-white/50">{item.source}</span>
                        </div>
                        <span className="text-xs text-white/50">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="neutral" className="mt-4">
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {newsBySentiment.neutral.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer group"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-white group-hover:text-yellow-300 transition-colors line-clamp-2 flex-1">
                          {item.title}
                        </h4>
                        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                          <div className="h-3 w-3 rounded-full bg-yellow-400" />
                          <ExternalLink className="h-3 w-3 text-white/40 group-hover:text-white/70" />
                        </div>
                      </div>

                      <p className="text-xs text-white/70 mb-2 line-clamp-2">{item.summary}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(item.category)} variant="secondary">
                            {item.category}
                          </Badge>
                          <span className="text-xs text-white/50">{item.source}</span>
                        </div>
                        <span className="text-xs text-white/50">{formatTimeAgo(item.publishedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* No Results */}
        {!loading && filteredNews.length === 0 && news.length > 0 && (
          <div className="text-center py-8">
            <p className="text-white/70">No news found matching your filters</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory("all")
                setSelectedSentiment("all")
              }}
              className="mt-2 text-white/70 hover:text-white"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-white/50 text-center mt-4">
          Auto-refreshes every 5 minutes • Indian Financial Market News
        </div>
      </CardContent>
    </Card>
  )
}
