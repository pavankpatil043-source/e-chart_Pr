"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface WebSocketMessage {
  type: string
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: number
}

interface UseWebSocketOptions {
  url: string
  symbols: string[]
  onMessage?: (data: WebSocketMessage) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket({
  url,
  symbols,
  onMessage,
  onError,
  onConnect,
  onDisconnect,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "disconnected",
  )
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus("connecting")

    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus("connected")
        setReconnectAttempts(0)
        onConnect?.()

        // Subscribe to symbols
        if (symbols.length > 0) {
          wsRef.current?.send(
            JSON.stringify({
              type: "subscribe",
              symbols: symbols,
            }),
          )
        }

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }))
          }
        }, 30000)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "price_update" && onMessage) {
            onMessage(data)
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus("disconnected")
        onDisconnect?.()

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }

        // Attempt reconnection
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1)
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current.onerror = (error) => {
        setConnectionStatus("error")
        onError?.(error)
      }
    } catch (error) {
      setConnectionStatus("error")
      console.error("WebSocket connection error:", error)
    }
  }, [
    url,
    symbols,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    reconnectInterval,
    maxReconnectAttempts,
    reconnectAttempts,
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    setConnectionStatus("disconnected")
  }, [])

  const subscribe = useCallback((newSymbols: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "subscribe",
          symbols: newSymbols,
        }),
      )
    }
  }, [])

  const unsubscribe = useCallback((symbolsToRemove: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "unsubscribe",
          symbols: symbolsToRemove,
        }),
      )
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionStatus,
    reconnectAttempts,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  }
}
