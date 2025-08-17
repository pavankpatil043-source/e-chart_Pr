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
  const connectionIdRef = useRef<string>(Math.random().toString(36).substring(7))
  const isComponentMountedRef = useRef(true)
  const lastUpdateTimeRef = useRef<number>(0)

  // Base prices for simulation
  const basePricesRef = useRef<Map<string, number>>(
    new Map([
      ["RELIANCE.NS", 2450.75],
      ["TCS.NS", 3890.2],
      ["HDFCBANK.NS", 1685.3],
      ["INFY.NS", 1456.85],
      ["ITC.NS", 462.15],
      ["SBIN.NS", 598.4],
      ["BHARTIARTL.NS", 912.65],
      ["KOTAKBANK.NS", 1798.9],
      ["LT.NS", 2856.75],
      ["ASIANPAINT.NS", 3124.5],
      ["MARUTI.NS", 9500.25],
      ["HCLTECH.NS", 1234.6],
      ["AXISBANK.NS", 1098.45],
      ["ICICIBANK.NS", 945.8],
      ["WIPRO.NS", 398.75],
    ]),
  )

  // Price storage for continuity
  const priceStorageRef = useRef<Map<string, { price: number; trend: number }>>(new Map())

  const generateLivePrice = useCallback((symbol: string): LivePrice => {
    const basePrice = basePricesRef.current.get(symbol) || 1000

    if (!priceStorageRef.current.has(symbol)) {
      priceStorageRef.current.set(symbol, {
        price: basePrice,
        trend: Math.random() > 0.5 ? 1 : -1,
      })
    }

    const stored = priceStorageRef.current.get(symbol)!

    // Generate realistic price movement
    const volatility = 0.001 // 0.1% volatility
    const randomFactor = (Math.random() - 0.5) * 2
    const trendFactor = stored.trend * 0.2

    const priceChange = stored.price * volatility * (randomFactor + trendFactor)
    const newPrice = Math.max(stored.price + priceChange, basePrice * 0.95)

    // Update trend occasionally
    if (Math.random() < 0.1) {
      stored.trend = Math.random() > 0.5 ? 1 : -1
    }

    const change = newPrice - basePrice
    const changePercent = (change / basePrice) * 100

    stored.price = newPrice

    return {
      symbol,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 10000) / 100,
      volume: Math.floor(Math.random() * 2000000) + 1000000,
      timestamp: Date.now(),
      high: newPrice * (1 + Math.random() * 0.02),
      low: newPrice * (1 - Math.random() * 0.02),
      open: basePrice * (1 + (Math.random() - 0.5) * 0.01),
    }
  }, [])

  const updatePrices = useCallback(() => {
    // Prevent too frequent updates
    const now = Date.now()
    if (now - lastUpdateTimeRef.current < updateInterval - 100) {
      return
    }
    lastUpdateTimeRef.current = now

    if (!isComponentMountedRef.current) return

    const newPrices = new Map<string, LivePrice>()

    symbols.forEach((symbol) => {
      const livePrice = generateLivePrice(symbol)
      newPrices.set(symbol, livePrice)
      onPriceUpdate?.(symbol, livePrice)
    })

    setPrices(newPrices)
    setLastUpdate(new Date())
  }, [symbols, generateLivePrice, onPriceUpdate, updateInterval])

  const connect = useCallback(async () => {
    if (!isComponentMountedRef.current) return

    setConnectionStatus("connecting")

    try {
      // Simulate connection to live data feed
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!isComponentMountedRef.current) return

      // Subscribe to symbols
      const response = await fetch("/api/websocket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscribe",
          symbols,
          connectionId: connectionIdRef.current,
        }),
      })

      if (response.ok && isComponentMountedRef.current) {
        setIsConnected(true)
        setConnectionStatus("connected")

        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }

        // Start price updates
        intervalRef.current = setInterval(() => {
          if (isComponentMountedRef.current) {
            updatePrices()
          }
        }, updateInterval)

        // Initial price fetch
        updatePrices()
      } else {
        throw new Error("Failed to subscribe to symbols")
      }
    } catch (error) {
      console.error("Connection error:", error)
      if (isComponentMountedRef.current) {
        setConnectionStatus("error")
        setIsConnected(false)
      }
    }
  }, [symbols, updateInterval, updatePrices])

  const disconnect = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    try {
      await fetch("/api/websocket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unsubscribe",
          symbols,
          connectionId: connectionIdRef.current,
        }),
      })
    } catch (error) {
      console.error("Disconnect error:", error)
    }

    setIsConnected(false)
    setConnectionStatus("disconnected")
  }, [symbols])

  const reconnect = useCallback(() => {
    disconnect().then(() => {
      setTimeout(() => {
        if (isComponentMountedRef.current) {
          connect()
        }
      }, 2000)
    })
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
