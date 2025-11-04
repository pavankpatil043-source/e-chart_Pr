import { useEffect, useRef, useState } from 'react'

export interface LivePriceData {
  symbol: string
  timestamp: number
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  previousClose: number
  change: number
  changePercent: number
  marketState: string
  time: string
}

export function useLivePrice(symbol: string, enabled: boolean = true) {
  const [liveData, setLiveData] = useState<LivePriceData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !symbol) return

    console.log(`🔌 Connecting to live stream for ${symbol}`)

    // Create EventSource connection
    const eventSource = new EventSource(`/api/live-websocket?symbol=${symbol}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log(`✅ Connected to live stream for ${symbol}`)
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLiveData(data)
        console.log(`📊 Live update: ${data.symbol} @ ₹${data.price.toFixed(2)}`)
      } catch (err) {
        console.error('Error parsing live data:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error(`❌ Live stream error for ${symbol}:`, err)
      setIsConnected(false)
      setError('Connection lost. Retrying...')
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }
      }, 5000)
    }

    // Cleanup on unmount or symbol change
    return () => {
      console.log(`🔌 Disconnecting live stream for ${symbol}`)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
    }
  }, [symbol, enabled])

  return { liveData, isConnected, error }
}
