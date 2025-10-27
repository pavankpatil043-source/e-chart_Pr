"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Building2, TrendingUp, Filter, Star, RefreshCw, CheckCircle, Circle, Zap } from "lucide-react"

interface StockData {
  symbol: string
  name: string
  sector: string
  marketCap: string
  exchange: string
  industry?: string
}

interface EnhancedStockSelectorProps {
  selectedStock: string
  onStockSelect: (symbol: string) => void
  onStockChange: (stock: StockData) => void
}

export function EnhancedStockSelector({ selectedStock, onStockSelect, onStockChange }: EnhancedStockSelectorProps) {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [filteredStocks, setFilteredStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSector, setSelectedSector] = useState("all")
  const [selectedMarketCap, setSelectedMarketCap] = useState("all")
  const [selectedExchange, setSelectedExchange] = useState("all")
  const [favorites, setFavorites] = useState<string[]>([])
  const [metadata, setMetadata] = useState<any>(null)

  // Popular stocks for quick access
  const popularStocks = [
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "BHARTIARTL.NS",
    "ITC.NS",
    "SBIN.NS",
    "LT.NS",
    "ASIANPAINT.NS",
  ]

  const fetchStocks = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/nse-stocks", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      const data = await response.json()

      if (data.success) {
        setStocks(data.data)
        setFilteredStocks(data.data)
        setMetadata(data.metadata)
      }
    } catch (error) {
      console.error("Error fetching stocks:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const applyFilters = useCallback(() => {
    let filtered = stocks

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (stock) =>
          stock.name.toLowerCase().includes(search) ||
          stock.symbol.toLowerCase().includes(search) ||
          stock.sector.toLowerCase().includes(search) ||
          stock.industry?.toLowerCase().includes(search),
      )
    }

    // Sector filter
    if (selectedSector !== "all") {
      filtered = filtered.filter((stock) => stock.sector === selectedSector)
    }

    // Market cap filter
    if (selectedMarketCap !== "all") {
      filtered = filtered.filter((stock) => stock.marketCap === selectedMarketCap)
    }

    // Exchange filter
    if (selectedExchange !== "all") {
      filtered = filtered.filter((stock) => stock.exchange === selectedExchange)
    }

    setFilteredStocks(filtered)
  }, [stocks, searchTerm, selectedSector, selectedMarketCap, selectedExchange])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("stock-favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  const handleStockSelect = (stock: StockData) => {
    onStockSelect(stock.symbol)
    onStockChange(stock)
  }

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol) ? favorites.filter((fav) => fav !== symbol) : [...favorites, symbol]

    setFavorites(newFavorites)
    localStorage.setItem("stock-favorites", JSON.stringify(newFavorites))
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedSector("all")
    setSelectedMarketCap("all")
    setSelectedExchange("all")
  }

  const getMarketCapColor = (marketCap: string) => {
    switch (marketCap) {
      case "Large":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Mid":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Small":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getSectorColor = (sector: string) => {
    const colors = {
      "Financial Services": "bg-blue-500/20 text-blue-400",
      "Information Technology": "bg-purple-500/20 text-purple-400",
      "Consumer Goods": "bg-green-500/20 text-green-400",
      Energy: "bg-red-500/20 text-red-400",
      Healthcare: "bg-pink-500/20 text-pink-400",
      Automobile: "bg-yellow-500/20 text-yellow-400",
      Pharmaceuticals: "bg-indigo-500/20 text-indigo-400",
    }
    return colors[sector as keyof typeof colors] || "bg-gray-500/20 text-gray-400"
  }

  const favoriteStocks = stocks.filter((stock) => favorites.includes(stock.symbol))

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search stocks by name, symbol, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStocks}
            disabled={loading}
            className="text-white/70 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="All Sectors" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">
                All Sectors
              </SelectItem>
              {metadata?.sectors?.map((sector: string) => (
                <SelectItem key={sector} value={sector} className="text-white">
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMarketCap} onValueChange={setSelectedMarketCap}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Market Cap" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">
                All Caps
              </SelectItem>
              {metadata?.marketCaps?.map((cap: string) => (
                <SelectItem key={cap} value={cap} className="text-white">
                  {cap} Cap
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExchange} onValueChange={setSelectedExchange}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Exchange" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">
                All Exchanges
              </SelectItem>
              {metadata?.exchanges?.map((exchange: string) => (
                <SelectItem key={exchange} value={exchange} className="text-white">
                  {exchange}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent"
          >
            <Filter className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>
            Showing {filteredStocks.length} of {stocks.length} stocks
            {searchTerm && ` for "${searchTerm}"`}
          </span>
          <div className="flex items-center space-x-2">
            <Zap className="h-3 w-3 text-green-400" />
            <span className="text-green-400">Live NSE/BSE Data</span>
          </div>
        </div>
      </div>

      {/* Stock Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/10">
          <TabsTrigger value="all" className="text-white data-[state=active]:bg-white/20">
            All Stocks ({filteredStocks.length})
          </TabsTrigger>
          <TabsTrigger value="popular" className="text-white data-[state=active]:bg-white/20">
            Popular ({popularStocks.length})
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-white data-[state=active]:bg-white/20">
            Favorites ({favoriteStocks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-white/50" />
                  <span className="ml-2 text-white/70">Loading stocks...</span>
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No stocks found matching your criteria</p>
                </div>
              ) : (
                filteredStocks.map((stock) => (
                  <Card
                    key={stock.symbol}
                    className={`cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                      selectedStock === stock.symbol
                        ? "bg-blue-500/20 border-blue-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                    onClick={() => handleStockSelect(stock)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex items-center space-x-1">
                              {selectedStock === stock.symbol ? (
                                <CheckCircle className="h-4 w-4 text-blue-400" />
                              ) : (
                                <Circle className="h-4 w-4 text-white/30" />
                              )}
                              <span className="font-semibold text-white text-sm">
                                {stock.symbol.replace(".NS", "")}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleFavorite(stock.symbol)
                              }}
                              className="p-0 h-auto hover:bg-transparent"
                            >
                              <Star
                                className={`h-3 w-3 ${
                                  favorites.includes(stock.symbol) ? "text-yellow-400 fill-yellow-400" : "text-white/30"
                                }`}
                              />
                            </Button>
                          </div>
                          <p className="text-xs text-white/70 mb-2 line-clamp-1">{stock.name}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSectorColor(stock.sector)} variant="secondary">
                              {stock.sector}
                            </Badge>
                            <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                              {stock.marketCap}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                            {stock.exchange}
                          </Badge>
                          {stock.industry && <p className="text-xs text-white/50 mt-1">{stock.industry}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="popular" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {stocks
                .filter((stock) => popularStocks.includes(stock.symbol))
                .map((stock) => (
                  <Card
                    key={stock.symbol}
                    className={`cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                      selectedStock === stock.symbol
                        ? "bg-blue-500/20 border-blue-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                    onClick={() => handleStockSelect(stock)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                            <span className="font-semibold text-white text-sm">{stock.symbol.replace(".NS", "")}</span>
                            <Badge
                              className="bg-orange-500/20 text-orange-400 border-orange-500/30"
                              variant="secondary"
                            >
                              POPULAR
                            </Badge>
                          </div>
                          <p className="text-xs text-white/70 mb-2 line-clamp-1">{stock.name}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSectorColor(stock.sector)} variant="secondary">
                              {stock.sector}
                            </Badge>
                            <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                              {stock.marketCap}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                            {stock.exchange}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {favoriteStocks.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No favorite stocks yet</p>
                  <p className="text-xs mt-1">Click the star icon to add stocks to favorites</p>
                </div>
              ) : (
                favoriteStocks.map((stock) => (
                  <Card
                    key={stock.symbol}
                    className={`cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                      selectedStock === stock.symbol
                        ? "bg-blue-500/20 border-blue-500/50"
                        : "bg-white/5 border-white/10"
                    }`}
                    onClick={() => handleStockSelect(stock)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                            <span className="font-semibold text-white text-sm">{stock.symbol.replace(".NS", "")}</span>
                          </div>
                          <p className="text-xs text-white/70 mb-2 line-clamp-1">{stock.name}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className={getSectorColor(stock.sector)} variant="secondary">
                              {stock.sector}
                            </Badge>
                            <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                              {stock.marketCap}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                            {stock.exchange}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Statistics */}
      {metadata && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">{metadata.totalStocks}</div>
                <div className="text-xs text-white/70">Total Stocks</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{metadata.sectors?.length || 0}</div>
                <div className="text-xs text-white/70">Sectors</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{favoriteStocks.length}</div>
                <div className="text-xs text-white/70">Favorites</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{filteredStocks.length}</div>
                <div className="text-xs text-white/70">Filtered</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
