"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"
import { cn } from "@/lib/utils"

import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Customized } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

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

  // Recharts wrapper ref for capture
  const svgWrapRef = React.useRef<HTMLDivElement>(null)

  // Capture + analyze (SVG -> PNG)
  async function captureAndAnalyze() {
    if (!svgWrapRef.current) return
    // Compute stats on current data window
    if (data.length === 0) return
    let low = data[0]
    let high = data[0]
    for (const c of data) {
      if (c.low < low.low) low = c
      if (c.high > high.high) high = c
    }

    const svg = svgWrapRef.current.querySelector("svg")
    if (!svg) return

    const rect = (svg as SVGSVGElement).getBoundingClientRect()
    const w = Math.max(320, Math.floor(rect.width))
    const h = Math.max(200, Math.floor(rect.height))

    // Serialize SVG
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute("width", String(w))
    clone.setAttribute("height", String(h))
    clone.setAttribute("viewBox", `0 0 ${w} ${h}`)

    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(clone)
    const svg64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`

    // Draw SVG onto canvas
    const out = document.createElement("canvas")
    out.width = w
    out.height = h
    const ctx = out.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)

    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h)
        resolve()
      }
      img.onerror = () => reject(new Error("SVG draw failed"))
      img.src = svg64
    })

    // Compute pixel coordinates for High/Low using known domains and margins
    const xMin = data[0]?.time ?? 0
    const xMax = data[data.length - 1]?.time ?? 1
    const yMin = data.reduce((a, c) => Math.min(a, c.low), Number.POSITIVE_INFINITY)
    const yMax = data.reduce((a, c) => Math.max(a, c.high), Number.NEGATIVE_INFINITY)

    const innerW = w - (CHART_MARGIN.left + CHART_MARGIN.right)
    const innerH = h - (CHART_MARGIN.top + CHART_MARGIN.bottom)

    function xCoord(t: number) {
      if (xMax === xMin) return CHART_MARGIN.left + innerW / 2
      return CHART_MARGIN.left + ((t - xMin) / (xMax - xMin)) * Math.max(1, innerW)
    }
    function yCoord(price: number) {
      if (yMax === yMin) return CHART_MARGIN.top + ((yMax - price) / (yMax - yMin)) * Math.max(1, innerH)
    }

    // Draw markers
    function drawMarker(x: number, y: number, label: string, color: string) {
      ctx.save()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()

      const text = label
      ctx.font = "bold 13px ui-sans-serif, system-ui, -apple-system"
      const padX = 8
      const textW = ctx.measureText(text).width
      const boxW = textW + padX * 2
      const boxH = 22
      const bx = Math.min(Math.max(6, x + 10), w - boxW - 6)
      const by = Math.min(Math.max(6, y - boxH - 10), h - boxH - 6)
      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ctx.strokeStyle = "rgba(0,0,0,0.2)"
      ctx.lineWidth = 1
      ctx.fillRect(bx, by, boxW, boxH)
      ctx.strokeRect(bx, by, boxW, boxH)
      ctx.fillStyle = color
      ctx.fillText(text, bx + padX, by + boxH - 7)
      ctx.restore()
    }

    const xLow = xCoord(low.time)
    const yLow = yCoord(low.low)
    const xHigh = xCoord(high.time)
    const yHigh = yCoord(high.high)

    drawMarker(xLow, yLow, `Low: ${fmtPrice.format(low.low)}`, "#ef4444")
    drawMarker(xHigh, yHigh, `High: ${fmtPrice.format(high.high)}`, "#10b981")

    const dataUrl = out.toDataURL("image/png")

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

  // Tooltip content (simple)
  const tooltipContent = React.useCallback((props: any) => {
    const p = props?.payload?.[0]?.payload as Candle | undefined
    if (!props.active || !p) return null
    return (
      <div className="rounded-md border bg-white p-2 text-xs shadow-md">
        <div className="font-medium">{new Date(p.time * 1000).toLocaleString()}</div>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          <div>Open</div>
          <div className="font-mono tabular-nums">{p.open.toFixed(2)}</div>
          <div>High</div>
          <div className="font-mono tabular-nums">{p.high.toFixed(2)}</div>
          <div>Low</div>
          <div className="font-mono tabular-nums">{p.low.toFixed(2)}</div>
          <div>Close</div>
          <div className="font-mono tabular-nums">{p.close.toFixed(2)}</div>
        </div>
      </div>
    )
  }, [])

  // Custom candlestick renderer using Recharts' Customized
  function Candles(props: any) {
    const { xAxisMap, yAxisMap, offset } = props
    const xKey = Object.keys(xAxisMap)[0]
    const yKey = Object.keys(yAxisMap)[0]
    const xScale = xAxisMap[xKey].scale
    const yScale = yAxisMap[yKey].scale

    const innerW = (offset?.width ?? 0) || props.chartWidth || 600
    const bodyW = Math.max(3, Math.min(12, (innerW / Math.max(20, data.length)) * 0.7))

    return (
      <g>
        {data.map((d, i) => {
          const x = xScale(d.time)
          const yOpen = yScale(d.open)
          const yClose = yScale(d.close)
          const yHigh = yScale(d.high)
          const yLow = yScale(d.low)
          const up = d.close >= d.open
          const color = up ? "#10b981" : "#ef4444"

          const top = Math.min(yOpen, yClose)
          const height = Math.max(1, Math.abs(yClose - yOpen))

          return (
            <g key={i}>
              {/* Wick */}
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth={1} shapeRendering="crispEdges" />
              {/* Body */}
              <rect
                x={x - bodyW / 2}
                y={top}
                width={bodyW}
                height={height}
                fill={color}
                stroke="none"
                shapeRendering="crispEdges"
                rx={1}
              />
            </g>
          )
        })}
      </g>
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

      {/* Chart (Recharts candlestick) */}
      <div className="h-72 sm:h-80 md:h-[420px] w-full rounded-md border bg-white overflow-hidden">
        <div ref={svgWrapRef} className="h-full w-full overflow-hidden">
          <div className="w-full h-full">
            <ChartContainer
              config={{
                up: { label: "Up", color: "hsl(var(--chart-1))" },
                down: { label: "Down", color: "hsl(var(--chart-5))" },
              }}
              className="h-full w-full max-w-full max-h-full"
            >
              <ComposedChart data={data} margin={CHART_MARGIN}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t) =>
                    new Date(Number(t) * 1000).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[(yMin || 0) - pad || 0, (yMax || 1) + pad || 1]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fontSize: 11 }}
                />
                <ReTooltip content={tooltipContent} />
                <Customized component={<Candles />} />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
