"use client"

import { useState, useEffect, useRef } from "react"

interface LivePriceData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  timestamp: number
}

export function useRealTimePrices(symbols: string[], intervalMs: number = 3000) {
  const [prices, setPrices] = useState<Record<string, LivePriceData>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrices = async () => {
    try {
      setIsConnected(false)
      const promises = symbols.map(async (symbol) => {
        const nsSymbol = symbol.includes(".NS") ? symbol : `${symbol}.NS`
        const response = await fetch(`/api/yahoo-quote?symbol=${nsSymbol}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (!response.ok) throw new Error(`Failed to fetch ${symbol}`)
        
        const data = await response.json()
        if (data.success && data.data) {
          return {
            symbol: symbol,
            price: data.data.price || 0,
            change: data.data.change || 0,
            changePercent: data.data.changePercent || 0,
            volume: data.data.volume || 0,
            high: data.data.high || data.data.price * 1.02,
            low: data.data.low || data.data.price * 0.98,
            open: data.data.open || data.data.price * 0.999,
            timestamp: Date.now()
          }
        }
        return null
      })

      const results = await Promise.allSettled(promises)
      const newPrices: Record<string, LivePriceData> = {}
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          newPrices[symbols[index]] = result.value
        }
      })

      if (Object.keys(newPrices).length > 0) {
        setPrices(prev => ({ ...prev, ...newPrices }))
        setLastUpdate(new Date())
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Error fetching real-time prices:", error)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    if (symbols.length === 0) return

    // Initial fetch
    fetchPrices()

    // Set up interval for continuous updates
    intervalRef.current = setInterval(fetchPrices, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [symbols.join(','), intervalMs])

  const refreshPrices = () => {
    fetchPrices()
  }

  return {
    prices,
    isConnected,
    lastUpdate,
    refreshPrices
  }
}