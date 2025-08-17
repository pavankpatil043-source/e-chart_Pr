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

export function useLivePrices({ symbols, updateInterval = 3000, onPriceUpdate }: UseLivePricesOptions) {
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
  const retryCountRef = useRef<number>(0)
  const maxRetries = 3

  // Fetch price data with enhanced error handling
  const fetchPriceData = useCallback(async (symbol: string): Promise<LivePrice | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      const response = await fetch(`/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
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
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.warn(`Request timeout for ${symbol}`)
        } else {
          console.warn(`Error fetching price for ${symbol}:`, error.message)
        }
      }
      return null
    }
  }, [])

  const updatePrices = useCallback(async () => {
    // Prevent too frequent updates
    const now = Date.now()
    if (now - lastUpdateTimeRef.current < updateInterval - 500) {
      return
    }
    lastUpdateTimeRef.current = now

    if (!isComponentMountedRef.current) return

    try {
      setConnectionStatus("connecting")

      // Fetch prices for all symbols with staggered requests to avoid rate limiting
      const priceResults: (LivePrice | null)[] = []

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i]

        // Add small delay between requests to avoid rate limiting
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        const priceData = await fetchPriceData(symbol)
        priceResults.push(priceData)
      }

      const newPrices = new Map<string, LivePrice>()
      let successCount = 0

      priceResults.forEach((result, index) => {
        const symbol = symbols[index]

        if (result) {
          newPrices.set(symbol, result)
          onPriceUpdate?.(symbol, result)
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

        if (successCount > 0) {
          setIsConnected(true)
          setConnectionStatus("connected")
          retryCountRef.current = 0 // Reset retry count on success
        } else {
          retryCountRef.current++
          if (retryCountRef.current >= maxRetries) {
            setConnectionStatus("error")
            setIsConnected(false)
          } else {
            setConnectionStatus("connecting")
          }
        }
      }
    } catch (error) {
      console.error("Error updating prices:", error)
      if (isComponentMountedRef.current) {
        retryCountRef.current++
        if (retryCountRef.current >= maxRetries) {
          setConnectionStatus("error")
          setIsConnected(false)
        }
      }
    }
  }, [symbols, fetchPriceData, onPriceUpdate, updateInterval, prices])

  const connect = useCallback(async () => {
    if (!isComponentMountedRef.current) return

    setConnectionStatus("connecting")
    retryCountRef.current = 0

    try {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      // Initial price fetch
      await updatePrices()

      // Start regular updates with increased interval to avoid rate limiting
      intervalRef.current = setInterval(
        () => {
          if (isComponentMountedRef.current) {
            updatePrices()
          }
        },
        Math.max(updateInterval, 3000),
      ) // Minimum 3 seconds between updates

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
    retryCountRef.current = 0
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(() => {
      if (isComponentMountedRef.current) {
        connect()
      }
    }, 2000) // Wait 2 seconds before reconnecting
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
