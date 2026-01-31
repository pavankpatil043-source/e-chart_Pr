"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import { createChart, ColorType, CrosshairMode, type IChartApi } from "lightweight-charts"

type Candle = {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type SymbolInfo = { symbol: string; description?: string }

const fmtPrice = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})
const fmtVol = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const TIMEFRAMES = [
  { key: "1m", label: "1m", points: 240, intervalMs: 60_000 },
  { key: "5m", label: "5m", points: 240, intervalMs: 5 * 60_000 },
  { key: "15m", label: "15m", points: 200, intervalMs: 15 * 60_000 },
  { key: "1h", label: "1h", points: 200, intervalMs: 60 * 60_000 },
] as const
const EXCHANGES = ["NSE", "BSE"] as const

const CHART_MARGIN = { top: 8, right: 12, bottom: 20, left: 8 }

export function LiveChart() {
  const [tf, setTf] = React.useState<(typeof TIMEFRAMES)[number]>(TIMEFRAMES[0])
  const [exchange, setExchange] = React.useState<(typeof EXCHANGES)[number]>("NSE")
  const [symbol, setSymbol] = React.useState("RELIANCE")
  const [symbols, setSymbols] = React.useState<SymbolInfo[]>([])
  const [query, setQuery] = React.useState("")

  const [data, setData] = React.useState<Candle[]>([])
  const esRef = React.useRef<EventSource | null>(null)

  const latest = data[data.length - 1]
  const prev = data[data.length - 2]
  const isUp = latest ? latest.close >= (prev?.close ?? latest.open) : true
  const windowHigh = data.length > 0 ? data.reduce((acc, p) => Math.max(acc, p.high), Number.NEGATIVE_INFINITY) : 0
  const windowLow = data.length > 0 ? data.reduce((acc, p) => Math.min(acc, p.low), Number.POSITIVE_INFINITY) : 0
  const changeAbs = latest && prev ? latest.close - prev.close : 0
  const changePct = latest && prev ? (changeAbs / prev.close) * 100 : 0

  // Load symbols per exchange
  React.useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(`/api/symbols?exchange=${exchange}`)
        const list = (await res.json()) as SymbolInfo[]
        if (!active) return
        setSymbols(list)
        if (!list.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase())) {
          setSymbol(exchange === "NSE" ? "RELIANCE" : "RELIANCE")
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [exchange])

  // Subscribe to SSE candles
  React.useEffect(() => {
    setData([])
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const url = new URL("/api/ohlc", window.location.origin)
    url.searchParams.set("symbol", symbol.toUpperCase())
    url.searchParams.set("exchange", exchange)
    url.searchParams.set("intervalMs", String(tf.intervalMs))
    url.searchParams.set("points", String(tf.points))

    const es = new EventSource(url.toString())
    esRef.current = es

    es.onmessage = (ev) => {
      try {
        const c: Candle = JSON.parse(ev.data)
        setData((arr) => [...arr, c].slice(-tf.points))
      } catch {
        // ignore
      }
    }

    es.onerror = () => {
      es.close()
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null
          setTf((prev) => ({ ...prev }))
        }
      }, 1000)
    }

    return () => {
      es.close()
    }
  }, [symbol, tf, exchange])

  const filtered = React.useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return symbols.slice(0, 200)
    return symbols
      .filter(
        (s) => s.symbol.toUpperCase().includes(q) || (s.description ? s.description.toUpperCase().includes(q) : false),
      )
      .slice(0, 200)
  }, [symbols, query])

  // TradingView Lightweight Charts refs
  const chartContainerRef = React.useRef<HTMLDivElement>(null)
  const chartRef = React.useRef<IChartApi | null>(null)
  const candlestickSeriesRef = React.useRef<any>(null)

  // Initialize TradingView Lightweight Chart
  React.useEffect(() => {
    if (!chartContainerRef.current) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#333",
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      grid: {
        vertLines: { color: "#e0e0e0" },
        horzLines: { color: "#e0e0e0" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    // Create candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    })

    candlestickSeriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [])

  // Update chart data
  React.useEffect(() => {
    if (!candlestickSeriesRef.current) return

    const formattedData = data.map((d) => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candlestickSeriesRef.current.setData(formattedData)

    // Fit content to view
    if (chartRef.current && formattedData.length > 0) {
      chartRef.current.timeScale().fitContent()
    }
  }, [data])

  // Capture + analyze
  async function captureAndAnalyze() {
    if (!chartContainerRef.current) return
    // Compute stats on current data window
    if (data.length === 0) return
    let low = data[0]
    let high = data[0]
    for (const c of data) {
      if (c.low < low.low) low = c
      if (c.high > high.high) high = c
    }

    // Take screenshot using canvas
    const canvas = document.createElement("canvas")
    const rect = chartContainerRef.current.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Fill white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Get chart snapshot
    if (chartRef.current) {
      try {
        const snapshot = chartRef.current.takeScreenshot()
        if (snapshot) {
          const img = new Image()
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0)
              resolve()
            }
            img.onerror = () => reject(new Error("Image load failed"))
            img.src = snapshot.toDataURL()
          })
        }
      } catch (err) {
        console.error("Screenshot failed:", err)
      }
    }

    const dataUrl = canvas.toDataURL("image/png")

    // Notify chat
    window.dispatchEvent(
      new CustomEvent("echart:screenshot-analyzed", {
        detail: {
          image: dataUrl,
          exchange,
          symbol,
          timeframe: tf.label,
          stats: {
            low: { price: low.low, time: low.time },
            high: { price: high.high, time: high.time },
          },
        },
      }),
    )
  }

  // X/Y domains
  const xDomain: [number, number] = data.length > 0 ? [data[0].time, data[data.length - 1].time] : [0, 1]
  const yMin = data.length > 0 ? data.reduce((a, c) => Math.min(a, c.low), Number.POSITIVE_INFINITY) : 0
  const yMax = data.length > 0 ? data.reduce((a, c) => Math.max(a, c.high), Number.NEGATIVE_INFINITY) : 1
  const pad = (yMax - yMin) * 0.02

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar with price/details */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-semibold tabular-nums">{latest ? fmtPrice.format(latest.close) : "$0.00"}</div>
          <Badge
            variant="secondary"
            className={cn("text-xs font-medium", isUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}
            aria-live="polite"
          >
            {changeAbs >= 0 ? "+" : ""}
            {changeAbs.toFixed(2)} ({changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}%)
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <div>
            <span className="mr-1">High:</span>
            <span className="font-medium text-foreground">{fmtPrice.format(windowHigh || 0)}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div>
            <span className="mr-1">Low:</span>
            <span className="font-medium text-foreground">{fmtPrice.format(windowLow || 0)}</span>
          </div>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <div className="hidden sm:block">
            <span className="mr-1">Vol:</span>
            <span className="font-medium text-foreground">{fmtVol.format(latest?.volume ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 relative z-10">
        <Select value={exchange} onValueChange={(v) => setExchange(v as (typeof EXCHANGES)[number])}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent>
            {EXCHANGES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${exchange} symbols...`}
            className="w-[220px]"
          />
          <Select value={symbol} onValueChange={(v) => setSymbol(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {filtered.length === 0 ? (
                <SelectItem value={symbol} disabled>
                  No matches
                </SelectItem>
              ) : (
                filtered.map((s) => (
                  <SelectItem key={s.symbol} value={s.symbol}>
                    <span className="font-medium">{s.symbol}</span>
                    {s.description ? <span className="ml-2 text-muted-foreground text-xs">{s.description}</span> : null}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {TIMEFRAMES.map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={t.key === tf.key ? "default" : "secondary"}
              className={cn(
                "rounded-full",
                t.key === tf.key
                  ? "bg-neutral-900 hover:bg-neutral-800"
                  : "bg-neutral-100 text-foreground hover:bg-neutral-200",
              )}
              onClick={() => setTf(t)}
              aria-pressed={t.key === tf.key}
              aria-label={`Set timeframe to ${t.label}`}
            >
              {t.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={captureAndAnalyze}
            title="Capture chart, mark High/Low, and send to chat"
            className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span className="ml-1 hidden sm:inline">Capture & analyze</span>
          </Button>
        </div>
      </div>

      {/* Chart (TradingView Lightweight Charts) */}
      <div className="h-72 sm:h-80 md:h-[420px] w-full rounded-md border bg-white overflow-hidden">
        <div ref={chartContainerRef} className="h-full w-full" />
      </div>
    </div>
  )
}
