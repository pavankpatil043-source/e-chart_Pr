"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface LivePrice {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  companyName: string
  source: string
}

interface UseLivePricesOptions {
  symbols: string[]
  updateInterval?: number
  onPriceUpdate?: (symbol: string, price: LivePrice) => void
}

interface UseLivePricesReturn {
  prices: Map<string, LivePrice>
  getPrice: (symbol: string) => LivePrice | null
  isConnected: boolean
  connectionStatus: "connected" | "connecting" | "disconnected" | "error"
  lastUpdate: Date | null
  reconnect: () => void
}

export function useLivePrices({
  symbols,
  updateInterval = 2000,
  onPriceUpdate,
}: UseLivePricesOptions): UseLivePricesReturn {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected" | "error">(
    "disconnected",
  )
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isComponentMountedRef = useRef(true)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchPriceData = useCallback(async (symbol: string): Promise<LivePrice | null> => {
    try {
      const response = await fetch(`/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        return {
          symbol: data.data.symbol,
          price: data.data.price,
          change: data.data.change,
          changePercent: data.data.changePercent,
          volume: data.data.volume,
          high: data.data.high,
          low: data.data.low,
          open: data.data.open,
          companyName: data.data.companyName,
          source: data.data.source,
        }
      }

      return null
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error)
      return null
    }
  }, [])

  const updatePrices = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    const now = Date.now()
    if (now - lastFetchTimeRef.current < 1000) {
      return
    }
    lastFetchTimeRef.current = now

    if (!isComponentMountedRef.current) return

    setConnectionStatus("connecting")

    try {
      const pricePromises = symbols.map((symbol) => fetchPriceData(symbol))
      const results = await Promise.allSettled(pricePromises)

      const newPrices = new Map<string, LivePrice>()
      let successCount = 0

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value) {
          const price = result.value
          newPrices.set(symbols[index], price)
          successCount++

          // Call onPriceUpdate callback
          if (onPriceUpdate) {
            onPriceUpdate(symbols[index], price)
          }
        }
      })

      if (isComponentMountedRef.current) {
        setPrices(newPrices)
        setLastUpdate(new Date())

        if (successCount > 0) {
          setIsConnected(true)
          setConnectionStatus("connected")
        } else {
          setIsConnected(false)
          setConnectionStatus("error")
        }
      }
    } catch (error) {
      console.error("Error updating prices:", error)
      if (isComponentMountedRef.current) {
        setIsConnected(false)
        setConnectionStatus("error")
      }
    }
  }, [symbols, fetchPriceData, onPriceUpdate])

  const reconnect = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    updatePrices()
    intervalRef.current = setInterval(updatePrices, updateInterval)
  }, [updatePrices, updateInterval])

  const getPrice = useCallback(
    (symbol: string): LivePrice | null => {
      return prices.get(symbol) || null
    },
    [prices],
  )

  useEffect(() => {
    isComponentMountedRef.current = true

    // Initial fetch
    updatePrices()

    // Set up interval
    intervalRef.current = setInterval(updatePrices, updateInterval)

    // Cleanup function
    return () => {
      isComponentMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [updatePrices, updateInterval])

  return {
    prices,
    getPrice,
    isConnected,
    connectionStatus,
    lastUpdate,
    reconnect,
  }
}
