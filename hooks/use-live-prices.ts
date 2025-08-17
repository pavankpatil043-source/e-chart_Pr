"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface LivePrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
  high?: number
  low?: number
  open?: number
  companyName?: string
  source?: string
}

interface UseLivePricesOptions {
  symbols: string[]
  updateInterval?: number
  onPriceUpdate?: (symbol: string, price: LivePrice) => void
}

export function useLivePrices({ symbols, updateInterval = 2000, onPriceUpdate }: UseLivePricesOptions) {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Use refs to prevent infinite loops
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)
  const lastUpdateTimeRef = useRef<number>(0)

  // Fetch real price data from API
  const fetchPriceData = useCallback(async (symbol: string): Promise<LivePrice | null> => {
    try {
      const response = await fetch(`/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.quote) {
        return {
          symbol: data.quote.symbol,
          price: data.quote.price,
          change: data.quote.change,
          changePercent: data.quote.pChange,
          volume: data.quote.volume,
          timestamp: Date.now(),
          high: data.quote.dayHigh,
          low: data.quote.dayLow,
          open: data.quote.open,
          companyName: data.quote.companyName,
          source: data.source,
        }
      }

      return null
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return null
    }
  }, [])

  const updatePrices = useCallback(async () => {
    // Prevent too frequent updates
    const now = Date.now()
    if (now - lastUpdateTimeRef.current < updateInterval - 100) {
      return
    }
    lastUpdateTimeRef.current = now

    if (!isComponentMountedRef.current) return

    try {
      setConnectionStatus("connecting")

      // Fetch prices for all symbols
      const pricePromises = symbols.map((symbol) => fetchPriceData(symbol))
      const priceResults = await Promise.allSettled(pricePromises)

      const newPrices = new Map<string, LivePrice>()
      let successCount = 0

      priceResults.forEach((result, index) => {
        const symbol = symbols[index]

        if (result.status === "fulfilled" && result.value) {
          newPrices.set(symbol, result.value)
          onPriceUpdate?.(symbol, result.value)
          successCount++
        } else {
          // Keep existing price if fetch failed
          const existingPrice = prices.get(symbol)
          if (existingPrice) {
            newPrices.set(symbol, {
              ...existingPrice,
              timestamp: now,
            })
          }
        }
      })

      if (isComponentMountedRef.current) {
        setPrices(newPrices)
        setLastUpdate(new Date())
        setIsConnected(successCount > 0)
        setConnectionStatus(successCount > 0 ? "connected" : "error")
      }
    } catch (error) {
      console.error("Error updating prices:", error)
      if (isComponentMountedRef.current) {
        setConnectionStatus("error")
        setIsConnected(false)
      }
    }
  }, [symbols, fetchPriceData, onPriceUpdate, updateInterval, prices])

  const connect = useCallback(async () => {
    if (!isComponentMountedRef.current) return

    setConnectionStatus("connecting")

    try {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Initial price fetch
      await updatePrices()

      // Start regular updates
      intervalRef.current = setInterval(() => {
        if (isComponentMountedRef.current) {
          updatePrices()
        }
      }, updateInterval)

      if (isComponentMountedRef.current) {
        setIsConnected(true)
        setConnectionStatus("connected")
      }
    } catch (error) {
      console.error("Connection error:", error)
      if (isComponentMountedRef.current) {
        setConnectionStatus("error")
        setIsConnected(false)
      }
    }
  }, [updateInterval, updatePrices])

  const disconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(() => {
      if (isComponentMountedRef.current) {
        connect()
      }
    }, 1000)
  }, [connect, disconnect])

  useEffect(() => {
    isComponentMountedRef.current = true

    if (symbols.length > 0) {
      connect()
    }

    return () => {
      isComponentMountedRef.current = false
      disconnect()
    }
  }, [symbols.join(",")]) // Only depend on symbols string to prevent infinite loops

  const getPrice = useCallback(
    (symbol: string): LivePrice | null => {
      return prices.get(symbol) || null
    },
    [prices],
  )

  const getAllPrices = useCallback((): LivePrice[] => {
    return Array.from(prices.values())
  }, [prices])

  return {
    prices: getAllPrices(),
    getPrice,
    isConnected,
    connectionStatus,
    lastUpdate,
    connect,
    disconnect,
    reconnect,
  }
}
