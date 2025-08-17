"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ExternalLink,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Newspaper,
  AlertCircle,
  CheckCircle,
  XCircle,
  Globe,
} from "lucide-react"

interface NewsArticle {
  id: string
  title: string
  description: string
  url: string
  source: string
  publishedAt: string
  sentiment: "positive" | "negative" | "neutral"
  category: string
  imageUrl?: string
  author?: string
}

export function EnhancedNewsPanel() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSentiment, setSelectedSentiment] = useState("all")
  const [metadata, setMetadata] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/financial-news?category=${selectedCategory}&sentiment=${selectedSentiment}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      const data = await response.json()

      if (data.success) {
        setArticles(data.data)
        setFilteredArticles(data.data)
        setMetadata(data.metadata)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSentiment])

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3 text-green-400" />
      case "negative":
        return <TrendingDown className="h-3 w-3 text-red-400" />
      default:
        return <Minus className="h-3 w-3 text-yellow-400" />
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
    const colors = {
      Banking: "bg-blue-500/20 text-blue-400",
      Technology: "bg-purple-500/20 text-purple-400",
      Market: "bg-green-500/20 text-green-400",
      Policy: "bg-red-500/20 text-red-400",
      Healthcare: "bg-pink-500/20 text-pink-400",
      Energy: "bg-orange-500/20 text-orange-400",
      Automobile: "bg-yellow-500/20 text-yellow-400",
    }
    return colors[category as keyof typeof colors] || "bg-gray-500/20 text-gray-400"
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const publishedDate = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const sentimentCounts = {
    positive: articles.filter((a) => a.sentiment === "positive").length,
    negative: articles.filter((a) => a.sentiment === "negative").length,
    neutral: articles.filter((a) => a.sentiment === "neutral").length,
  }

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-5 w-5 text-orange-400" />
          <div>
            <h3 className="font-semibold text-white">Financial News</h3>
            <p className="text-xs text-white/70">{lastUpdate && `Updated ${lastUpdate.toLocaleTimeString()}`}</p>
          </div>
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

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">
              All Categories
            </SelectItem>
            {metadata?.categories?.map((category: string) => (
              <SelectItem key={category} value={category} className="text-white">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
          <SelectTrigger className="bg-white/10 border-white/20 text-white text-xs">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">
              All Sentiment
            </SelectItem>
            <SelectItem value="positive" className="text-white">
              Positive
            </SelectItem>
            <SelectItem value="negative" className="text-white">
              Negative
            </SelectItem>
            <SelectItem value="neutral" className="text-white">
              Neutral
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sentiment Overview */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-400" />
                <span className="text-xs font-medium text-green-400">{sentimentCounts.positive}</span>
              </div>
              <div className="text-xs text-white/70">Positive</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <XCircle className="h-3 w-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">{sentimentCounts.negative}</span>
              </div>
              <div className="text-xs text-white/70">Negative</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1">
                <AlertCircle className="h-3 w-3 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">{sentimentCounts.neutral}</span>
              </div>
              <div className="text-xs text-white/70">Neutral</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* News Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10">
          <TabsTrigger value="all" className="text-white data-[state=active]:bg-white/20 text-xs">
            All ({filteredArticles.length})
          </TabsTrigger>
          <TabsTrigger value="positive" className="text-white data-[state=active]:bg-white/20 text-xs">
            Positive ({sentimentCounts.positive})
          </TabsTrigger>
          <TabsTrigger value="negative" className="text-white data-[state=active]:bg-white/20 text-xs">
            Negative ({sentimentCounts.negative})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-white/50" />
                  <span className="ml-2 text-white/70">Loading news...</span>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Newspaper className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No news articles found</p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <Card key={article.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between space-x-2">
                          <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">{article.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="p-1 h-auto text-white/50 hover:text-white"
                          >
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>

                        <p className="text-xs text-white/70 line-clamp-2">{article.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className={getCategoryColor(article.category)} variant="secondary">
                              {article.category}
                            </Badge>
                            <Badge className={getSentimentColor(article.sentiment)} variant="secondary">
                              {getSentimentIcon(article.sentiment)}
                              <span className="ml-1 capitalize">{article.sentiment}</span>
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-white/50">
                          <div className="flex items-center space-x-1">
                            <Globe className="h-3 w-3" />
                            <span>{article.source}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="positive" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {articles
                .filter((article) => article.sentiment === "positive")
                .map((article) => (
                  <Card
                    key={article.id}
                    className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between space-x-2">
                          <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">{article.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="p-1 h-auto text-white/50 hover:text-white"
                          >
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>

                        <p className="text-xs text-white/70 line-clamp-2">{article.description}</p>

                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(article.category)} variant="secondary">
                            {article.category}
                          </Badge>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30" variant="secondary">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Positive
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-white/50">
                          <div className="flex items-center space-x-1">
                            <Globe className="h-3 w-3" />
                            <span>{article.source}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="negative" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {articles
                .filter((article) => article.sentiment === "negative")
                .map((article) => (
                  <Card
                    key={article.id}
                    className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between space-x-2">
                          <h4 className="text-sm font-medium text-white line-clamp-2 flex-1">{article.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="p-1 h-auto text-white/50 hover:text-white"
                          >
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>

                        <p className="text-xs text-white/70 line-clamp-2">{article.description}</p>

                        <div className="flex items-center space-x-2">
                          <Badge className={getCategoryColor(article.category)} variant="secondary">
                            {article.category}
                          </Badge>
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30" variant="secondary">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Negative
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-white/50">
                          <div className="flex items-center space-x-1">
                            <Globe className="h-3 w-3" />
                            <span>{article.source}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeAgo(article.publishedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* News Statistics */}
      {metadata && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-bold text-white">{metadata.totalArticles || articles.length}</div>
                <div className="text-xs text-white/70">Total Articles</div>
              </div>
              <div>
                <div className="text-sm font-bold text-white">{metadata.sources?.length || 0}</div>
                <div className="text-xs text-white/70">News Sources</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
