import { useEffect, useRef, useState } from 'react'

export interface LiveIndicesData {
  timestamp: number
  time: string
  indices: Array<{
    symbol: string
    name: string
    price: number
    change: number
    changePercent: number
    high?: number
    low?: number
    open?: number
    previousClose?: number
  }>
}

export function useLiveIndices(enabled: boolean = true) {
  const [liveIndices, setLiveIndices] = useState<LiveIndicesData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled) return

    console.log(`🔌 Connecting to live indices stream`)

    // Create EventSource connection
    const eventSource = new EventSource(`/api/live-indices`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log(`✅ Connected to live indices stream`)
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLiveIndices(data)
        console.log(`📊 Live indices update received at ${data.time}`)
      } catch (err) {
        console.error('Error parsing live indices data:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error(`❌ Live indices stream error:`, err)
      setIsConnected(false)
      setError('Connection lost. Retrying...')
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }
      }, 5000)
    }

    // Cleanup on unmount
    return () => {
      console.log(`🔌 Disconnecting live indices stream`)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
    }
  }, [enabled])

  return { liveIndices, isConnected, error }
}
