"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Building2, Factory, Smartphone, Pill, Car, Zap, RefreshCw, Star, Filter } from "lucide-react"

interface Stock {
  symbol: string
  name: string
  sector: string
  marketCap: string
  exchange: string
}

interface StockSelectorProps {
  selectedStock: string
  onStockSelect: (symbol: string) => void
  onStockChange?: (stock: Stock) => void
}

const SECTOR_ICONS: { [key: string]: any } = {
  Banking: Building2,
  "IT Services": Smartphone,
  Pharmaceuticals: Pill,
  Automobile: Car,
  Energy: Zap,
  "Oil & Gas": Factory,
  FMCG: Factory,
  Steel: Factory,
  Metals: Factory,
  Telecom: Smartphone,
  Default: Building2,
}

const POPULAR_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "BHARTIARTL.NS",
  "ITC.NS",
  "SBIN.NS",
  "LT.NS",
  "HCLTECH.NS",
]

export function EnhancedStockSelector({ selectedStock, onStockSelect, onStockChange }: StockSelectorProps) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSector, setSelectedSector] = useState("all")
  const [selectedMarketCap, setSelectedMarketCap] = useState("all")
  const [selectedExchange, setSelectedExchange] = useState("nse")
  const [error, setError] = useState<string | null>(null)

  // Fetch stocks from API
  const fetchStocks = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        exchange: selectedExchange,
        ...(selectedSector !== "all" && { sector: selectedSector }),
        ...(selectedMarketCap !== "all" && { marketCap: selectedMarketCap }),
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/nse-stocks?${params}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setStocks(data.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error("Error fetching stocks:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch stocks")

      // Fallback to popular stocks
      const fallbackStocks: Stock[] = POPULAR_STOCKS.map((symbol) => ({
        symbol,
        name: symbol.replace(".NS", "") + " Limited",
        sector: "Unknown",
        marketCap: "Large",
        exchange: "NSE",
      }))
      setStocks(fallbackStocks)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchStocks()
  }, [selectedExchange, selectedSector, selectedMarketCap])

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        fetchStocks()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  // Get unique sectors and market caps
  const sectors = useMemo(() => {
    const uniqueSectors = [...new Set(stocks.map((stock) => stock.sector))].sort()
    return uniqueSectors
  }, [stocks])

  const marketCaps = useMemo(() => {
    const uniqueMarketCaps = [...new Set(stocks.map((stock) => stock.marketCap))].sort()
    return uniqueMarketCaps
  }, [stocks])

  // Filter stocks based on search and filters
  const filteredStocks = useMemo(() => {
    return stocks.filter((stock) => {
      const matchesSearch =
        searchTerm === "" ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.sector.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })
  }, [stocks, searchTerm])

  // Group stocks by sector
  const stocksBySector = useMemo(() => {
    const grouped: { [key: string]: Stock[] } = {}
    filteredStocks.forEach((stock) => {
      if (!grouped[stock.sector]) {
        grouped[stock.sector] = []
      }
      grouped[stock.sector].push(stock)
    })
    return grouped
  }, [filteredStocks])

  // Popular stocks from the filtered list
  const popularStocks = useMemo(() => {
    return filteredStocks.filter((stock) => POPULAR_STOCKS.includes(stock.symbol)).slice(0, 10)
  }, [filteredStocks])

  const handleStockSelect = (stock: Stock) => {
    onStockSelect(stock.symbol)
    if (onStockChange) {
      onStockChange(stock)
    }
  }

  const getSectorIcon = (sector: string) => {
    const IconComponent = SECTOR_ICONS[sector] || SECTOR_ICONS.Default
    return <IconComponent className="h-4 w-4" />
  }

  const getMarketCapColor = (marketCap: string) => {
    switch (marketCap.toLowerCase()) {
      case "large":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "mid":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "small":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <Card className="w-full bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Stock Selector</span>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {filteredStocks.length} stocks
            </Badge>
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
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search stocks by name, symbol, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={selectedExchange} onValueChange={setSelectedExchange}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Exchange" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="nse" className="text-white hover:bg-slate-700">
                  NSE
                </SelectItem>
                <SelectItem value="bse" className="text-white hover:bg-slate-700">
                  BSE
                </SelectItem>
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  All Exchanges
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  All Sectors
                </SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector} className="text-white hover:bg-slate-700">
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
                <SelectItem value="all" className="text-white hover:bg-slate-700">
                  All Caps
                </SelectItem>
                {marketCaps.map((cap) => (
                  <SelectItem key={cap} value={cap} className="text-white hover:bg-slate-700">
                    {cap} Cap
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">{error}</div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-white/70">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading stocks...</span>
            </div>
          </div>
        )}

        {/* Stock Lists */}
        {!loading && (
          <Tabs defaultValue="popular" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/10">
              <TabsTrigger value="popular" className="text-white data-[state=active]:bg-white/20">
                <Star className="h-4 w-4 mr-1" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="sectors" className="text-white data-[state=active]:bg-white/20">
                <Filter className="h-4 w-4 mr-1" />
                By Sector
              </TabsTrigger>
              <TabsTrigger value="all" className="text-white data-[state=active]:bg-white/20">
                <Building2 className="h-4 w-4 mr-1" />
                All Stocks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {popularStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/10 ${
                        selectedStock === stock.symbol
                          ? "bg-blue-500/20 border-blue-500/50"
                          : "bg-white/5 border-white/10"
                      }`}
                      onClick={() => handleStockSelect(stock)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getSectorIcon(stock.sector)}
                          <div>
                            <h4 className="font-medium text-white text-sm">
                              {stock.symbol.replace(".NS", "").replace(".BO", "")}
                            </h4>
                            <p className="text-xs text-white/70 line-clamp-1">{stock.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                            {stock.marketCap}
                          </Badge>
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            {stock.exchange}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sectors" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {Object.entries(stocksBySector).map(([sector, sectorStocks]) => (
                    <div key={sector}>
                      <div className="flex items-center space-x-2 mb-2">
                        {getSectorIcon(sector)}
                        <h3 className="font-medium text-white text-sm">{sector}</h3>
                        <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                          {sectorStocks.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 ml-6">
                        {sectorStocks.slice(0, 5).map((stock) => (
                          <div
                            key={stock.symbol}
                            className={`p-2 rounded border cursor-pointer transition-all hover:bg-white/10 ${
                              selectedStock === stock.symbol
                                ? "bg-blue-500/20 border-blue-500/50"
                                : "bg-white/5 border-white/10"
                            }`}
                            onClick={() => handleStockSelect(stock)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-white text-xs">
                                  {stock.symbol.replace(".NS", "").replace(".BO", "")}
                                </h4>
                                <p className="text-xs text-white/50 line-clamp-1">{stock.name}</p>
                              </div>
                              <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                                {stock.marketCap}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {sectorStocks.length > 5 && (
                          <p className="text-xs text-white/50 ml-2">+{sectorStocks.length - 5} more stocks</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/10 ${
                        selectedStock === stock.symbol
                          ? "bg-blue-500/20 border-blue-500/50"
                          : "bg-white/5 border-white/10"
                      }`}
                      onClick={() => handleStockSelect(stock)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getSectorIcon(stock.sector)}
                          <div>
                            <h4 className="font-medium text-white text-sm">
                              {stock.symbol.replace(".NS", "").replace(".BO", "")}
                            </h4>
                            <p className="text-xs text-white/70 line-clamp-1">{stock.name}</p>
                            <p className="text-xs text-white/50">{stock.sector}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getMarketCapColor(stock.marketCap)} variant="secondary">
                            {stock.marketCap}
                          </Badge>
                          <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                            {stock.exchange}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* No Results */}
        {!loading && filteredStocks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/70">No stocks found matching your criteria</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setSelectedSector("all")
                setSelectedMarketCap("all")
              }}
              className="mt-2 text-white/70 hover:text-white"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
