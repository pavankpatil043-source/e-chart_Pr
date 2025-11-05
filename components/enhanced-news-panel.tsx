"use client"

// Historical News Panel with 4-day date range filtering and grouping

import React, { useState, useEffect, useCallback, useRef } from "react"
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  BarChart3,
  Calendar,
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
  summary?: string
  summaryType?: 'ai' | 'fallback' // Track if AI-generated or fallback
  marketImpactScore?: number
  affectedStocks?: string[]
  expanded?: boolean
  summarizing?: boolean
}

// Helper function to clean HTML and create instant preview
function cleanTextForPreview(text: string): string {
  if (!text) return ""
  
  return text
    .replace(/<[^>]*>/g, " ") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/\s+/g, " ") // Normalize spaces
    .trim()
}

// Helper function to create instant smart summary
function createInstantSummary(title: string, description: string): string {
  const cleanTitle = cleanTextForPreview(title)
  const cleanDesc = cleanTextForPreview(description)
  
  // If title is good (10-30 words), use it
  const titleWords = cleanTitle.split(/\s+/)
  if (titleWords.length >= 10 && titleWords.length <= 35) {
    return cleanTitle + (cleanTitle.endsWith('.') ? '' : '.')
  }
  
  // Otherwise combine title + first sentence
  const firstSentence = cleanDesc.split(/[.!?]/)[0] || cleanDesc.substring(0, 100)
  const combined = `${cleanTitle}. ${firstSentence}`.trim()
  const words = combined.split(/\s+/)
  
  if (words.length > 35) {
    return words.slice(0, 32).join(' ') + '...'
  }
  
  return combined + (combined.endsWith('.') ? '' : '.')
}

// Helper function to check if article is related to a stock
function isArticleRelatedToStock(article: NewsArticle, stockSymbol: string): boolean {
  // Remove .NS or .BO suffix for matching
  const cleanSymbol = stockSymbol.replace(/\.(NS|BO)$/i, "").toLowerCase()
  
  // Check if stock is in affectedStocks array
  if (article.affectedStocks && article.affectedStocks.length > 0) {
    return article.affectedStocks.some(stock => 
      stock.toLowerCase().includes(cleanSymbol)
    )
  }
  
  // Fallback: check title and description
  const searchText = `${article.title} ${article.description}`.toLowerCase()
  return searchText.includes(cleanSymbol)
}

interface EnhancedNewsPanelProps {
  stockSymbol?: string // Optional: filter news by specific stock
}

export function EnhancedNewsPanel({ stockSymbol }: EnhancedNewsPanelProps = {}) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedSentiment, setSelectedSentiment] = useState("all")
  const [metadata, setMetadata] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filterByStock, setFilterByStock] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: string; to: string; days: number } | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch last 4 days of historical news
      // Add timestamp to force fresh data and bypass ALL caching layers
      const timestamp = Date.now()
      let response = await fetch(`/api/live-indian-news?category=${selectedCategory}&sentiment=${selectedSentiment}&days=4&_t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      })
      
      // Fallback to original API if needed
      if (!response.ok) {
        response = await fetch(`/api/financial-news?category=${selectedCategory}&sentiment=${selectedSentiment}&_t=${timestamp}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        })
      }
      
      const data = await response.json()

      if (data.success) {
        const articlesWithState = data.data.map((article: NewsArticle) => ({
          ...article,
          expanded: false,
          summarizing: false,
        }))
        setArticles(articlesWithState)
        
        // Apply stock filter if needed
        const filtered = filterByStock && stockSymbol 
          ? articlesWithState.filter((article: NewsArticle) => 
              isArticleRelatedToStock(article, stockSymbol)
            )
          : articlesWithState
        
        setFilteredArticles(filtered)
        setMetadata(data.metadata)
        setLastUpdate(new Date())
        
        // Store date range info if available
        if (data.metadata?.dateRange || data.dateRange) {
          setDateRange(data.metadata?.dateRange || data.dateRange)
        }
        
        // SMART STRATEGY: Show instant fallback, then upgrade to AI in background
        summarizeArticlesWithFallback(filtered)
      }
    } catch (error) {
      console.error("Error fetching news:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSentiment])

  // SMART SUMMARIZATION: Instant fallback → Background AI upgrade
  const summarizeArticlesWithFallback = useCallback(async (articlesToSummarize: NewsArticle[]) => {
    try {
      console.log("🚀 FAST TRACK: Showing instant fallback summaries...")
      
      // STEP 1: Immediately show client-side smart summaries (0ms latency)
      const articlesWithFallback = articlesToSummarize.map(article => ({
        ...article,
        summary: createInstantSummary(article.title, article.description),
        summaryType: 'fallback' as const,
      }))
      
      // Update UI immediately with fallback summaries
      setArticles((prev) =>
        prev.map((article) => {
          const fallback = articlesWithFallback.find(a => a.id === article.id)
          return fallback || article
        })
      )
      
      setFilteredArticles((prev) =>
        prev.map((article) => {
          const fallback = articlesWithFallback.find(a => a.id === article.id)
          return fallback || article
        })
      )
      
      console.log("✅ Instant fallback summaries shown to user")
      
      // STEP 2: Start AI summarization in background with 2-second timeout
      console.log("🤖 Starting background AI upgrade (30s timeout)...")
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log("⏱️ AI timeout reached, keeping fallback summaries")
        controller.abort()
      }, 30000) // 30 second timeout for AI
      
      try {
        const response = await fetch("/api/summarize-news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articles: articlesToSummarize }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const data = await response.json()

        if (data.success && data.data.length > 0) {
          console.log("✅ AI upgrade complete! Replacing", data.data.length, "summaries")
          
          // STEP 3: Smoothly upgrade fallback → AI summaries
          setArticles((prev) =>
            prev.map((article) => {
              const aiSummary = data.data.find((s: any) => s.id === article.id)
              if (aiSummary && aiSummary.summaryType === 'ai') {
                // Only upgrade if AI summary is actually better
                return {
                  ...article,
                  summary: aiSummary.summary,
                  summaryType: aiSummary.summaryType,
                  marketImpactScore: aiSummary.marketImpactScore,
                  affectedStocks: aiSummary.affectedStocks,
                }
              }
              return article // Keep fallback if AI didn't improve it
            })
          )
          
          setFilteredArticles((prev) =>
            prev.map((article) => {
              const aiSummary = data.data.find((s: any) => s.id === article.id)
              if (aiSummary && aiSummary.summaryType === 'ai') {
                return {
                  ...article,
                  summary: aiSummary.summary,
                  summaryType: aiSummary.summaryType,
                  marketImpactScore: aiSummary.marketImpactScore,
                  affectedStocks: aiSummary.affectedStocks,
                }
              }
              return article
            })
          )
          
          console.log("🎉 UI upgraded with AI summaries!")
        } else {
          console.log("ℹ️ No AI summaries available, keeping fallback")
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.log("⏱️ AI summarization timed out, fallback summaries remain")
        } else {
          console.error("❌ AI summarization failed:", fetchError)
          console.log("ℹ️ Fallback summaries are still displayed")
        }
      }
      
    } catch (error) {
      console.error("❌ Summarization error:", error)
    }
  }, [])

  // Legacy function kept for compatibility (now just calls new smart function)
  const summarizeArticles = useCallback(async (articlesToSummarize: NewsArticle[]) => {
    return summarizeArticlesWithFallback(articlesToSummarize)
  }, [summarizeArticlesWithFallback])

  // Toggle expand/collapse for article
  const toggleExpand = (articleId: string) => {
    setFilteredArticles((prev) =>
      prev.map((article) =>
        article.id === articleId ? { ...article, expanded: !article.expanded } : article
      )
    )
  }

  // Get impact color based on score
  const getImpactColor = (score?: number) => {
    if (!score) return "bg-gray-500/20 text-gray-400"
    if (score >= 75) return "bg-red-500/20 text-red-400"
    if (score >= 50) return "bg-orange-500/20 text-orange-400"
    return "bg-blue-500/20 text-blue-400"
  }

  const getImpactLabel = (score?: number) => {
    if (!score) return "Low"
    if (score >= 75) return "High"
    if (score >= 50) return "Medium"
    return "Low"
  }

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  useEffect(() => {
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNews])

  // Re-filter articles when stock filter toggle changes
  useEffect(() => {
    if (filterByStock && stockSymbol) {
      setFilteredArticles(articles.filter(article => 
        isArticleRelatedToStock(article, stockSymbol)
      ))
    } else {
      setFilteredArticles(articles)
    }
  }, [filterByStock, stockSymbol, articles])

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
  
  const getDateLabel = (dateString: string) => {
    const articleDate = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    // Reset time to compare dates only
    articleDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    yesterday.setHours(0, 0, 0, 0)
    
    if (articleDate.getTime() === today.getTime()) return "Today"
    if (articleDate.getTime() === yesterday.getTime()) return "Yesterday"
    
    const diffDays = Math.floor((today.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 2) return "2 days ago"
    if (diffDays === 3) return "3 days ago"
    
    return articleDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }


  const sentimentCounts = {
    positive: articles.filter((a) => a.sentiment === "positive").length,
    negative: articles.filter((a) => a.sentiment === "negative").length,
    neutral: articles.filter((a) => a.sentiment === "neutral").length,
  }
  
  // Group articles by date for better organization
  const groupedArticles = filteredArticles.reduce((groups: Record<string, NewsArticle[]>, article) => {
    const dateLabel = getDateLabel(article.publishedAt)
    if (!groups[dateLabel]) {
      groups[dateLabel] = []
    }
    groups[dateLabel].push(article)
    return groups
  }, {})
  
  // Sort date groups (Today, Yesterday, 2 days ago, etc.)
  const sortedDateLabels = Object.keys(groupedArticles).sort((a, b) => {
    const order = ['Today', 'Yesterday', '2 days ago', '3 days ago']
    const aIndex = order.indexOf(a)
    const bIndex = order.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return 0
  })

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Compact Header with Live Status */}
      <div className="flex items-center justify-between bg-gradient-to-r from-orange-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-xl p-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Newspaper className="h-6 w-6 text-orange-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Financial News</h3>
            <p className="text-[10px] text-white/60 flex items-center gap-1">
              <span className="inline-block w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              Live Updates • {lastUpdate && lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {dateRange && (
                <>
                  {" • "}
                  <span className="text-purple-400 font-semibold">Last {dateRange.days} Days</span>
                </>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchNews}
          disabled={loading}
          className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0 rounded-full"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Sentiment Cards - Compact */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30 hover:from-green-500/30 transition-all cursor-pointer">
          <CardContent className="p-2.5">
            <div className="flex flex-col items-center space-y-1">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-lg font-bold text-green-400">{sentimentCounts.positive}</span>
              <div className="text-[10px] text-white/70 font-medium">Positive</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/30 hover:from-red-500/30 transition-all cursor-pointer">
          <CardContent className="p-2.5">
            <div className="flex flex-col items-center space-y-1">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-lg font-bold text-red-400">{sentimentCounts.negative}</span>
              <div className="text-[10px] text-white/70 font-medium">Negative</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 hover:from-yellow-500/30 transition-all cursor-pointer">
          <CardContent className="p-2.5">
            <div className="flex flex-col items-center space-y-1">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-lg font-bold text-yellow-400">{sentimentCounts.neutral}</span>
              <div className="text-[10px] text-white/70 font-medium">Neutral</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - More Compact */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-xs hover:bg-white/15 transition-colors">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">
                All Categories
              </SelectItem>
              {metadata?.categories?.map((category: string) => (
                <SelectItem key={category} value={category} className="text-white text-xs">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 text-xs hover:bg-white/15 transition-colors">
              <SelectValue placeholder="All Sentiment" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="all" className="text-white text-xs">
                All Sentiment
              </SelectItem>
              <SelectItem value="positive" className="text-white text-xs">
                Positive
              </SelectItem>
              <SelectItem value="negative" className="text-white text-xs">
                Negative
              </SelectItem>
              <SelectItem value="neutral" className="text-white text-xs">
                Neutral
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Stock Filter Toggle */}
        {stockSymbol && (
          <Button
            variant={filterByStock ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterByStock(!filterByStock)}
            className={`w-full h-9 text-xs transition-all ${
              filterByStock 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0" 
                : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Target className="h-3.5 w-3.5 mr-1.5" />
            {filterByStock ? `Showing ${stockSymbol.replace(/\.(NS|BO)$/i, "")} News Only` : `Filter by ${stockSymbol.replace(/\.(NS|BO)$/i, "")}`}
          </Button>
        )}
      </div>

      {/* News List - Smooth Custom Scrolling */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin pr-3"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="space-y-2.5 pb-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
              <span className="text-sm text-white/70">Fetching latest news...</span>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Newspaper className="h-12 w-12 mx-auto text-white/30" />
              <p className="text-sm text-white/50">No news articles found</p>
            </div>
          ) : (
            <>
              {sortedDateLabels.map((dateLabel) => (
                <div key={dateLabel} className="space-y-2.5">
                  {/* Date Group Header */}
                  <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-500/20 to-orange-500/20 backdrop-blur-md border-b border-white/10 px-3 py-2 rounded-lg">
                    <h4 className="text-xs font-bold text-white/90 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-purple-400" />
                      {dateLabel}
                      <span className="ml-auto text-white/50 font-normal">
                        {groupedArticles[dateLabel].length} {groupedArticles[dateLabel].length === 1 ? 'article' : 'articles'}
                      </span>
                    </h4>
                  </div>
                  
                  {/* Articles for this date */}
                  {groupedArticles[dateLabel].map((article) => (
              <Card 
                key={article.id} 
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:from-white/10 hover:to-white/5 hover:border-white/20 transition-all cursor-pointer group"
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    {/* Title with Action */}
                    <div className="flex items-start gap-2">
                      <h4 className="text-sm font-semibold text-white line-clamp-2 flex-1 leading-snug group-hover:text-orange-300 transition-colors">
                        {article.title}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="p-1 h-auto text-white/40 hover:text-orange-400 hover:bg-orange-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <a href={article.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>

                    {/* Summary Display - Always shows (instant fallback → AI upgrade) */}
                    {article.summary ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className={`h-3 w-3 ${article.summaryType === 'ai' ? 'text-purple-400' : 'text-blue-400'}`} />
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                            article.summaryType === 'ai' ? 'text-purple-400' : 'text-blue-400'
                          }`}>
                            {article.summaryType === 'ai' ? 'AI SUMMARY' : 'SMART SUMMARY'}
                          </span>
                        </div>
                        <p className={`text-xs text-white/90 leading-relaxed rounded-lg p-2.5 shadow-sm transition-all duration-300 ${
                          article.summaryType === 'ai' 
                            ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30'
                            : 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30'
                        }`}>
                          {article.summary}
                        </p>
                      </div>
                    ) : (
                      /* Rare case: News just loaded, instant fallback not yet applied */
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />
                          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                            Loading Summary...
                          </span>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-2.5 shadow-sm">
                          <p className="text-xs text-white/75 leading-relaxed italic">
                            {createInstantSummary(article.title, article.description)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Market Impact & Affected Stocks */}
                    {article.marketImpactScore !== undefined && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3 w-3 text-orange-400" />
                          <span className="text-[10px] text-white/50">Impact:</span>
                          <Badge className={`${getImpactColor(article.marketImpactScore)} border text-[10px] px-1.5 py-0.5`}>
                            {getImpactLabel(article.marketImpactScore)} ({article.marketImpactScore})
                          </Badge>
                        </div>
                        
                        {article.affectedStocks && article.affectedStocks.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <BarChart3 className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] text-white/50">Stocks:</span>
                            {article.affectedStocks.slice(0, 3).map((stock) => (
                              <Badge key={stock} className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[9px] px-1.5 py-0.5">
                                {stock.replace(".NS", "")}
                              </Badge>
                            ))}
                            {article.affectedStocks.length > 3 && (
                              <span className="text-[10px] text-white/40">+{article.affectedStocks.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expand/Collapse Button */}
                    {article.summary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(article.id)}
                        className="w-full text-[10px] text-white/50 hover:text-white hover:bg-white/5 h-6 gap-1"
                      >
                        {article.expanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Hide Full Article
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show Full Article
                          </>
                        )}
                      </Button>
                    )}

                    {/* Full Description (Expanded) */}
                    {article.expanded && (
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-white/70 leading-relaxed">
                          {cleanTextForPreview(article.description)}
                        </p>
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`${getCategoryColor(article.category)} border text-[10px] px-1.5 py-0.5`} variant="secondary">
                        {article.category}
                      </Badge>
                      <Badge className={`${getSentimentColor(article.sentiment)} border text-[10px] px-1.5 py-0.5 flex items-center gap-1`} variant="secondary">
                        {getSentimentIcon(article.sentiment)}
                        <span className="capitalize">{article.sentiment}</span>
                      </Badge>
                    </div>

                    {/* Footer Meta */}
                    <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" />
                        <span className="font-medium">{article.source}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{formatTimeAgo(article.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
