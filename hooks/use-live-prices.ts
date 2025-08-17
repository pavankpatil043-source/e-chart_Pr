"use client"

import { useState, useEffect, useCallback } from "react"

interface StockQuote {
  symbol: string
  companyName: string
  price: number
  lastPrice: number
  change: number
  pChange: number
  volume: number
  marketCap: number
  peRatio: number
  dayHigh: number
  dayLow: number
  open: number
  previousClose: number
  lastUpdateTime: string
}

interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  pChange: number
  isPositive: boolean
  lastUpdate: number
  source: string
}

interface LivePricesState {
  quotes: { [symbol: string]: StockQuote }
  indices: MarketIndex[]
  loading: boolean
  error: string | null
  lastUpdate: number
  connectionStatus: "connected" | "disconnected" | "connecting"
  dataSource: string
}

const DEFAULT_SYMBOLS = [
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

export function useLivePrices(symbols: string[] = DEFAULT_SYMBOLS) {
  const [state, setState] = useState<LivePricesState>({
    quotes: {},
    indices: [],
    loading: true,
    error: null,
    lastUpdate: 0,
    connectionStatus: "connecting",
    dataSource: "Unknown",
  })

  // Fetch individual stock quote with enhanced error handling
  const fetchQuote = useCallback(async (symbol: string): Promise<StockQuote | null> => {
    try {
      const response = await fetch(`/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.quote) {
        return data.quote
      } else {
        throw new Error(data.error || "Failed to fetch quote")
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }, [])

  // Fetch market indices with enhanced error handling
  const fetchIndices = useCallback(async (): Promise<{ indices: MarketIndex[]; source: string }> => {
    try {
      const response = await fetch("/api/indian-indices", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.indices) {
        return {
          indices: data.indices,
          source: data.source || "Unknown",
        }
      } else {
        throw new Error(data.error || "Failed to fetch indices")
      }
    } catch (error) {
      console.error("Error fetching indices:", error)
      return {
        indices: [],
        source: "Error",
      }
    }
  }, [])

  // Fetch all data with staggered requests to avoid rate limiting
  const fetchAllData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, connectionStatus: "connecting" }))

    try {
      // Fetch indices first
      const { indices, source: indicesSource } = await fetchIndices()

      // Fetch quotes with staggered delays to avoid rate limiting
      const quotePromises = symbols.map(
        (symbol, index) =>
          new Promise<{ symbol: string; quote: StockQuote | null }>((resolve) => {
            setTimeout(async () => {
              const quote = await fetchQuote(symbol)
              resolve({ symbol, quote })
            }, index * 200) // 200ms delay between requests
          }),
      )

      // Wait for all quote requests with timeout
      const timeoutPromise = new Promise<{ symbol: string; quote: StockQuote | null }[]>((_, reject) =>
        setTimeout(() => reject(new Error("Quotes fetch timeout")), 30000),
      )

      let quoteResults: { symbol: string; quote: StockQuote | null }[] = []
      let quotesSource = "Unknown"

      try {
        quoteResults = await Promise.race([Promise.all(quotePromises), timeoutPromise])
      } catch (error) {
        console.warn("Quotes fetch timed out or failed:", error)
      }

      // Process quote results
      const newQuotes: { [symbol: string]: StockQuote } = {}
      let successfulQuotes = 0

      quoteResults.forEach(({ symbol, quote }) => {
        if (quote) {
          newQuotes[symbol] = quote
          successfulQuotes++
        }
      })

      // Determine overall data source and connection status
      const hasRealData = successfulQuotes > 0 || indices.length > 0
      const isSimulated =
        indicesSource.includes("Simulation") ||
        Object.values(newQuotes).some((q) => q.lastUpdateTime.includes("Simulation"))

      quotesSource = successfulQuotes > 0 ? (isSimulated ? "Enhanced Simulation" : "Yahoo Finance API") : "No Data"

      const overallSource = indices.length > 0 ? indicesSource : quotesSource
      const connectionStatus: "connected" | "disconnected" | "connecting" = hasRealData ? "connected" : "disconnected"

      setState((prev) => ({
        ...prev,
        quotes: newQuotes,
        indices,
        loading: false,
        error: successfulQuotes === 0 && indices.length === 0 ? "Failed to fetch any data" : null,
        lastUpdate: Date.now(),
        connectionStatus,
        dataSource: overallSource,
      }))
    } catch (error) {
      console.error("Error in fetchAllData:", error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        connectionStatus: "disconnected",
        dataSource: "Error",
      }))
    }
  }, [symbols, fetchQuote, fetchIndices])

  // Refresh single quote
  const refreshQuote = useCallback(
    async (symbol: string) => {
      try {
        const quote = await fetchQuote(symbol)
        if (quote) {
          setState((prev) => ({
            ...prev,
            quotes: {
              ...prev.quotes,
              [symbol]: quote,
            },
            lastUpdate: Date.now(),
            error: null,
          }))
        }
      } catch (error) {
        console.error(`Error refreshing quote for ${symbol}:`, error)
      }
    },
    [fetchQuote],
  )

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchAllData()
  }, [fetchAllData])

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchAllData()

    // Set up periodic updates with longer intervals to respect rate limits
    const interval = setInterval(() => {
      fetchAllData()
    }, 4000) // 4 seconds between full updates

    return () => clearInterval(interval)
  }, [fetchAllData])

  // Return state and utility functions
  return {
    ...state,
    refresh,
    refreshQuote,
    isConnected: state.connectionStatus === "connected",
    isLoading: state.loading,
    hasError: !!state.error,
  }
}

export type { StockQuote, MarketIndex, LivePricesState }
