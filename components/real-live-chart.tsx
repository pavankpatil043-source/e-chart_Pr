"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  BarChart3,
  Wifi,
  WifiOff,
  Maximize,
  Minimize,
} from "lucide-react"
import { NIFTY_50_STOCKS, POPULAR_NIFTY_STOCKS, toBaseSymbol } from "@/lib/nifty-50-stocks"
import { createChart, ColorType, CrosshairMode, type IChartApi } from "lightweight-charts"
import { useLivePrice } from "@/hooks/use-live-price"

interface StockData {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  companyName: string
  sector: string
  source: string
}

interface ChartDataPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  time: string
}

const TIMEFRAMES = [
  // Intraday intervals - Yahoo Finance limits: 60 days for 5m/15m/30m, 730 days for 1h
  { value: "1d-5m", label: "5min", fullLabel: "60 Days (5min)", interval: "5m", range: "60d" },
  { value: "1d-15m", label: "15min", fullLabel: "60 Days (15min)", interval: "15m", range: "60d" },
  { value: "1d-30m", label: "30min", fullLabel: "60 Days (30min)", interval: "30m", range: "60d" },
  { value: "1d-1h", label: "1hr", fullLabel: "2 Years (1 hour)", interval: "1h", range: "730d" },
  // Multi-day views - Maximum available data
  { value: "5d", label: "5D", fullLabel: "5 Days", interval: "15m", range: "5d" },
  { value: "1mo", label: "1M", fullLabel: "2 Years (1 hour)", interval: "1h", range: "730d" },
  { value: "3mo", label: "3M", fullLabel: "2 Years (1 day)", interval: "1d", range: "730d" },
  { value: "6mo", label: "6M", fullLabel: "2 Years (1 day)", interval: "1d", range: "730d" },
  { value: "1y", label: "1Y", fullLabel: "5 Years (1 week)", interval: "1wk", range: "5y" },
]

interface RealLiveChartProps {
  onStockChange?: (stock: { symbol: string; name: string; sector: string }) => void
  onTimeframeChange?: (timeframe: string) => void
  onDataUpdate?: (data: {
    price: number
    previousClose: number
    change: number
    changePercent: number
    high: number
    low: number
    volume: number
  }) => void
}

export default function RealLiveChart({ onStockChange, onTimeframeChange, onDataUpdate }: RealLiveChartProps = {}) {
  const [selectedStock, setSelectedStock] = useState(POPULAR_NIFTY_STOCKS[0])
  const [timeframe, setTimeframe] = useState("1mo")
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [fullChartData, setFullChartData] = useState<ChartDataPoint[]>([]) // Store complete data
  const [loading, setLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [srLevels, setSRLevels] = useState<Array<{ price: number; type: 'support' | 'resistance'; strength: string }>>([])
  const [detectedPatterns, setDetectedPatterns] = useState<Array<{
    pattern: string
    type: 'bullish' | 'bearish' | 'neutral' | 'reversal'
    confidence: number
    points?: Array<{ x: number; y: number; price: number; time: string }>
    startIndex?: number
    endIndex?: number
  }>>([])
  const [showPatterns, setShowPatterns] = useState(true)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMarketOpen, setIsMarketOpen] = useState(false)
  
  // Chart interaction states
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; offset: number } | null>(null)
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null)
  
  // TradingView Lightweight Charts refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const volumeContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const volumeChartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const timeframeRef = useRef<string>(timeframe) // Track current timeframe for formatters
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Live price WebSocket connection
  const { liveData, isConnected: isLiveConnected } = useLivePrice(selectedStock.symbol, true)

  // NSE/BSE Holiday list for 2025 (update annually)
  const MARKET_HOLIDAYS_2025 = [
    { date: '2025-01-26', name: 'Republic Day' },
    { date: '2025-03-14', name: 'Holi' },
    { date: '2025-03-31', name: 'Id-Ul-Fitr' },
    { date: '2025-04-10', name: 'Mahavir Jayanti' },
    { date: '2025-04-14', name: 'Dr. Ambedkar Jayanti' },
    { date: '2025-04-18', name: 'Good Friday' },
    { date: '2025-05-01', name: 'Maharashtra Day' },
    { date: '2025-06-07', name: 'Bakri Id' },
    { date: '2025-08-15', name: 'Independence Day' },
    { date: '2025-08-27', name: 'Ganesh Chaturthi' },
    { date: '2025-10-02', name: 'Gandhi Jayanti' },
    { date: '2025-10-21', name: 'Diwali (Laxmi Pujan)' },
    { date: '2025-10-22', name: 'Diwali (Balipratipada)' },
    { date: '2025-11-05', name: 'Guru Nanak Jayanti' },
    { date: '2025-12-25', name: 'Christmas' },
  ]

  // Check if market is open based on day, time, and holidays
  const checkMarketStatus = () => {
    const now = new Date()
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    
    const dayOfWeek = istTime.getDay() // 0 = Sunday, 6 = Saturday
    const hours = istTime.getHours()
    const minutes = istTime.getMinutes()
    const currentTime = hours * 60 + minutes // Convert to minutes since midnight
    
    // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
    const marketOpen = 9 * 60 + 15  // 9:15 AM = 555 minutes
    const marketClose = 15 * 60 + 30 // 3:30 PM = 930 minutes
    
    // Check if it's a weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }
    
    // Check if it's a holiday
    const dateString = istTime.toISOString().split('T')[0]
    if (MARKET_HOLIDAYS_2025.some(h => h.date === dateString)) {
      return false
    }
    
    // Check if within trading hours
    if (currentTime >= marketOpen && currentTime <= marketClose) {
      return true
    }
    
    return false
  }

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setIsMarketOpen(checkMarketStatus())
    }
    
    updateMarketStatus() // Initial check
    const interval = setInterval(updateMarketStatus, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [])

  // Fetch live price data from multiple sources
  const fetchStockPrice = async (symbol: string) => {
    try {
      const response = await fetch(`/api/multi-source-quote?symbol=${symbol}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
          
          // Only update if we get real data, not simulation
          if (!data.source || !data.source.includes('Simulation')) {
            const stockDataObj = {
              symbol: toBaseSymbol(symbol),
              price: data.price,
              change: data.change,
              changePercent: data.changePercent,
              volume: data.volume || 0,
              high: data.high || data.price,
              low: data.low || data.price,
              open: data.open || data.price,
              previousClose: data.previousClose || (data.price - data.change),
              companyName: stock?.name || data.companyName || toBaseSymbol(symbol),
              sector: stock?.sector || "Unknown",
              source: data.source || "Yahoo Finance"
            }
            
            setStockData(stockDataObj)
            
            // Notify parent component with stock data for AI analysis
            if (onDataUpdate) {
              onDataUpdate({
                price: stockDataObj.price,
                previousClose: stockDataObj.previousClose,
                change: stockDataObj.change,
                changePercent: stockDataObj.changePercent,
                high: stockDataObj.high,
                low: stockDataObj.low,
                volume: stockDataObj.volume
              })
            }
            
            setIsConnected(true)
            setLastUpdate(new Date())
            console.log(`✅ Real price for ${symbol}: ₹${data.price} from ${data.source}`)
          } else {
            console.warn(`⚠️ Got simulated data for ${symbol}, waiting for real data`)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching stock price:", error)
      setIsConnected(false)
    }
  }

  // Fetch chart data
  const fetchChartData = async (symbol: string, range: string) => {
    try {
      setLoading(true)
      setChartError(null)
      
      const tf = TIMEFRAMES.find(t => t.value === range)
      const apiRange = tf?.range || range // Use explicit range from config or fallback to range param
      console.log(`📊 Fetching chart data for ${symbol} (${apiRange} / ${tf?.interval})...`)
      
      // Use reliable-yahoo-chart API for better data quality
      const response = await fetch(
        `/api/reliable-yahoo-chart?symbol=${symbol}&range=${apiRange}&interval=${tf?.interval || '5m'}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }
      )
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data && Array.isArray(result.data)) {
          // Determine if this is an intraday chart (5min, 15min, 30min, 1hr)
          const isIntradayChart = ['1d-5m', '1d-15m', '1d-30m', '1d-1h'].includes(range)
          
          // Debug: Log first and last data points
          if (result.data.length > 0) {
            const firstItem = result.data[0]
            const lastItem = result.data[result.data.length - 1]
            console.log('🔍 First data point:', {
              timestamp: firstItem.timestamp,
              date: new Date(firstItem.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              open: firstItem.open,
              high: firstItem.high,
              low: firstItem.low,
              close: firstItem.close
            })
            console.log('🔍 Last data point:', {
              timestamp: lastItem.timestamp,
              date: new Date(lastItem.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
              open: lastItem.open,
              high: lastItem.high,
              low: lastItem.low,
              close: lastItem.close
            })
            console.log(`📊 Price range: ₹${Math.min(...result.data.map((d: any) => d.low))} - ₹${Math.max(...result.data.map((d: any) => d.high))}`)
          }
          
          const formattedData = result.data.map((item: any) => {
            // Yahoo Finance returns timestamps in milliseconds, already in UTC
            // For Indian stocks, we need to convert to IST (UTC+5:30)
            const date = new Date(item.timestamp)
            let timeLabel = ''
            
            if (isIntradayChart) {
              // Intraday: Show time in HH:MM format (e.g., 09:15, 09:20, 09:25)
              // Force IST timezone for Indian stocks
              timeLabel = date.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false, // Use 24-hour format for consistency
                timeZone: 'Asia/Kolkata' // Explicitly use IST timezone
              })
            } else {
              // Daily/Weekly: Show date (e.g., 28 Oct, 27 Oct)
              timeLabel = date.toLocaleDateString('en-IN', { 
                day: 'numeric',
                month: 'short',
                timeZone: 'Asia/Kolkata'
              })
            }
            
            return {
              timestamp: item.timestamp,
              open: item.open || item.close || 0,
              high: item.high || item.close || 0,
              low: item.low || item.close || 0,
              close: item.close || 0,
              volume: item.volume || 0,
              time: timeLabel
            }
          })
          
          // Validate data
          const validData = formattedData.filter((d: any) => 
            d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
          )
          
          if (validData.length === 0) {
            console.error('❌ No valid OHLC data found')
            setChartError("Invalid chart data")
            return
          }
          
          setFullChartData(validData) // Store complete dataset
          setChartData(validData) // Display all data initially
          setZoomLevel(1) // Reset zoom
          setPanOffset(0) // Reset pan
          console.log(`✅ Got ${validData.length} valid candles from ${result.source}`)
          console.log(`   Sample candle:`, validData[0])
        } else {
          console.error('❌ No chart data in response')
          setChartError("No chart data available")
        }
      } else {
        console.error('❌ Chart API error:', response.status)
        setChartError("Failed to load chart data")
      }
    } catch (error) {
      console.error("Error fetching chart data:", error)
      setChartError("Chart loading error")
    } finally {
      setLoading(false)
    }
  }

  // Initialize TradingView Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Create main price chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
        fontSize: 12,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#758696',
          style: 3, // Dashed
          labelBackgroundColor: '#4682B4',
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: 3, // Dashed
          labelBackgroundColor: '#4682B4',
        },
      },
      grid: {
        vertLines: { 
          color: "#1e293b",
          style: 1,
          visible: true,
        },
        horzLines: { 
          color: "#1e293b",
          style: 1,
          visible: true,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2B2B43',
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        visible: true,
        tickMarkFormatter: (time: any) => {
          // Like TradingView: X-axis always shows dates (MMM DD format)
          // Time is only shown in the crosshair tooltip
          const date = new Date(time * 1000)
          const dateStr = date.toLocaleString('en-IN', { 
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: '2-digit'
          })
          return dateStr
        },
      },
      localization: {
        locale: 'en-IN',
        priceFormatter: (price: any) => {
          return '₹' + price.toFixed(2)
        },
        timeFormatter: (time: any) => {
          const date = new Date(time * 1000)
          const tf = timeframeRef.current || timeframe
          
          // For very short timeframes, show date + time in crosshair
          // For longer timeframes, show just date
          const showTime = tf.includes('5m') || tf.includes('15m') || tf.includes('30m') || tf === '5d'
          
          if (showTime) {
            // Crosshair for intraday: "Nov 04, 10:30"
            const dateTimeStr = date.toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
            return dateTimeStr
          } else {
            // Crosshair for daily/weekly: "Nov 04, 2024"
            const dateStr = date.toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata',
              month: 'short',
              day: '2-digit',
              year: 'numeric'
            })
            return dateStr
          }
        },
      },
      rightPriceScale: {
        borderColor: "#2B2B43",
        visible: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
        alignLabels: true,
        mode: 0, // Normal mode
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

  // Initialize volume chart
  useEffect(() => {
    if (!volumeContainerRef.current) return

    const volumeChart = createChart(volumeContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
      },
      width: volumeContainerRef.current.clientWidth,
      height: volumeContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      timeScale: {
        visible: false,
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
    })

    volumeChartRef.current = volumeChart

    // Create histogram series for volume
    const volumeSeries = (volumeChart as any).addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    })

    volumeSeriesRef.current = volumeSeries

    // Handle resize
    const handleResize = () => {
      if (volumeContainerRef.current) {
        volumeChart.applyOptions({
          width: volumeContainerRef.current.clientWidth,
          height: volumeContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      volumeChart.remove()
    }
  }, [])

  // Update timeframe ref and chart formatters when timeframe changes
  useEffect(() => {
    timeframeRef.current = timeframe
    console.log('📅 Timeframe changed to:', timeframe)
    
    // Update the chart's time scale formatter
    if (chartRef.current) {
      chartRef.current.applyOptions({
        timeScale: {
          tickMarkFormatter: (time: any) => {
            const date = new Date(time * 1000)
            
            // Like TradingView: Always show dates on X-axis (MMM DD format)
            // Time is only shown in the crosshair tooltip
            const dateStr = date.toLocaleString('en-IN', { 
              timeZone: 'Asia/Kolkata',
              month: 'short',
              day: '2-digit'
            })
            return dateStr
          }
        }
      })
    }
  }, [timeframe])

  // Update chart data when chartData changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) {
      console.log('⚠️ Chart series not initialized yet')
      return
    }
    
    if (chartData.length === 0) {
      console.log('⚠️ No chart data to display')
      // Clear the chart when no data
      candlestickSeriesRef.current.setData([])
      volumeSeriesRef.current.setData([])
      return
    }

    console.log(`📊 Updating chart with ${chartData.length} data points`)

    // Format data for TradingView Lightweight Charts
    // Time must be in UNIX timestamp (seconds)
    // The timestamps from the API are already in the correct timezone
    const formattedCandleData = chartData.map((d) => ({
      time: Math.floor(d.timestamp / 1000) as any, // Convert milliseconds to seconds
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))
    
    // Sort by time to ensure proper rendering
    formattedCandleData.sort((a, b) => a.time - b.time)

    const formattedVolumeData = chartData.map((d) => ({
      time: Math.floor(d.timestamp / 1000) as any, // Convert milliseconds to seconds
      value: d.volume,
      color: d.close >= d.open ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)",
    }))
    
    // Sort by time to ensure proper rendering
    formattedVolumeData.sort((a, b) => a.time - b.time)

    console.log(`📊 First candle:`, {
      ...formattedCandleData[0],
      date: new Date(formattedCandleData[0].time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    })
    console.log(`📊 Last candle:`, {
      ...formattedCandleData[formattedCandleData.length - 1],
      date: new Date(formattedCandleData[formattedCandleData.length - 1].time * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    })
    console.log(`📊 Total candles being set:`, formattedCandleData.length)

    // Set data with error handling
    try {
      candlestickSeriesRef.current.setData(formattedCandleData)
      volumeSeriesRef.current.setData(formattedVolumeData)
      console.log('✅ Chart data set successfully')
    } catch (error) {
      console.error('❌ Error setting chart data:', error)
      return
    }

    // Add support/resistance markers
    if (srLevels.length > 0 && chartRef.current) {
      srLevels.forEach((level) => {
        const line = candlestickSeriesRef.current.createPriceLine({
          price: level.price,
          color: level.type === 'support' ? '#10b981' : '#ef4444',
          lineWidth: level.strength === 'strong' ? 2 : 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `${level.type === 'support' ? 'S' : 'R'}: ₹${level.price.toFixed(2)}`,
        })
      })
    }

    // Fit content to view after a short delay to ensure rendering is complete
    setTimeout(() => {
      if (chartRef.current && formattedCandleData.length > 0) {
        chartRef.current.timeScale().fitContent()
        console.log('✅ Chart fitted to content')
      }
      if (volumeChartRef.current && formattedVolumeData.length > 0) {
        volumeChartRef.current.timeScale().fitContent()
      }
    }, 100)
  }, [chartData, srLevels])

  // Update chart with live price data
  useEffect(() => {
    console.log('🔍 Live update effect triggered:', {
      hasLiveData: !!liveData,
      hasCandlestickSeries: !!candlestickSeriesRef.current,
      isConnected: isLiveConnected,
      timeframe,
      liveDataPrice: liveData?.price
    })
    
    if (!liveData || !candlestickSeriesRef.current || !isLiveConnected) {
      console.log('⚠️ Skipping update - missing requirements')
      return
    }
    
    // Only update on intraday timeframes (5m, 15m, 30m, 1h)
    // Prevents "Cannot update oldest data" error on daily/weekly charts
    const isIntradayTimeframe = timeframe.includes('5m') || 
                                timeframe.includes('15m') || 
                                timeframe.includes('30m') ||
                                timeframe.includes('1h')
    
    console.log(`🎯 Timeframe check: ${timeframe}, Is intraday: ${isIntradayTimeframe}`)
    
    if (!isIntradayTimeframe) {
      console.log(`⏭️ Skipping live update on ${timeframe} (not intraday)`)
      return
    }

    console.log(`📊 Live price update: ${liveData.symbol} @ ₹${liveData.price.toFixed(2)}`)
    console.log(`📊 Candle data:`, {
      time: new Date(liveData.timestamp).toLocaleString(),
      timestamp: liveData.timestamp,
      timestampSeconds: Math.floor(liveData.timestamp / 1000),
      open: liveData.open,
      high: liveData.high,
      low: liveData.low,
      close: liveData.price,
      volume: liveData.volume
    })
    
    // Update the last candle with live data
    const lastCandle = {
      time: Math.floor(liveData.timestamp / 1000) as any,
      open: liveData.open,
      high: liveData.high,
      low: liveData.low,
      close: liveData.price,
    }

    try {
      candlestickSeriesRef.current.update(lastCandle)
      console.log('✅ Chart candle updated successfully')
      
      // Update volume
      if (volumeSeriesRef.current) {
        const volumeColor = liveData.price >= liveData.open ? '#10b98180' : '#ef444480'
        volumeSeriesRef.current.update({
          time: Math.floor(liveData.timestamp / 1000) as any,
          value: liveData.volume,
          color: volumeColor,
        })
        console.log('✅ Volume updated successfully')
      }
    } catch (error) {
      console.error('❌ Error updating live price:', error)
    }
  }, [liveData, isLiveConnected, timeframe])

  // Update stock info panel with live price data (ALWAYS, regardless of timeframe)
  useEffect(() => {
    if (!liveData) return

    console.log('💰 Updating price display with live data:', {
      symbol: liveData.symbol,
      price: liveData.price,
      high: liveData.high,
      low: liveData.low,
      volume: liveData.volume
    })

    // Update stockData with latest live prices
    setStockData(prev => prev ? {
      ...prev,
      price: liveData.price,
      change: liveData.change,
      changePercent: liveData.changePercent,
      high: liveData.high,
      low: liveData.low,
      open: liveData.open,
      volume: liveData.volume,
    } : null)

    // Notify parent component of price update
    if (onDataUpdate) {
      onDataUpdate({
        price: liveData.price,
        previousClose: liveData.previousClose,
        change: liveData.change,
        changePercent: liveData.changePercent,
        high: liveData.high,
        low: liveData.low,
        volume: liveData.volume,
      })
    }
  }, [liveData])

  // Legacy draw functions - kept for pattern overlay if needed
  const drawChart = () => {
    // Now handled by TradingView Lightweight Charts
  }

  const drawVolumeChart = () => {
    // Now handled by TradingView Lightweight Charts
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartData.length > 0) {
        drawChart()
        drawVolumeChart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [chartData])

  // Handle chart resize when maximized state changes
  useEffect(() => {
    if (isMaximized) {
      // Move charts to fullscreen container
      const fullscreenContainer = document.getElementById('fullscreen-chart-container')
      if (fullscreenContainer && chartContainerRef.current && volumeContainerRef.current) {
        // Append chart containers to fullscreen modal
        fullscreenContainer.appendChild(chartContainerRef.current)
        fullscreenContainer.appendChild(volumeContainerRef.current)
        
        // Update chart sizes for fullscreen
        if (chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          })
        }
        if (volumeChartRef.current) {
          volumeChartRef.current.applyOptions({
            width: volumeContainerRef.current.clientWidth,
            height: volumeContainerRef.current.clientHeight,
          })
        }
      }
    } else {
      // Move charts back to normal container
      const normalContainer = document.querySelector('[data-chart-parent]')
      if (normalContainer && chartContainerRef.current && volumeContainerRef.current) {
        normalContainer.appendChild(chartContainerRef.current)
        normalContainer.appendChild(volumeContainerRef.current)
        
        // Update chart sizes for normal view
        if (chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: 500,
          })
        }
        if (volumeChartRef.current) {
          volumeChartRef.current.applyOptions({
            width: volumeContainerRef.current.clientWidth,
            height: 100,
          })
        }
      }
    }
  }, [isMaximized])

  // Fetch data when stock or timeframe changes
  useEffect(() => {
    console.log(`🔄 Effect triggered - Stock: ${selectedStock?.symbol}, Timeframe: ${timeframe}`)
    if (selectedStock) {
      console.log(`   → Fetching data for ${selectedStock.symbol}...`)
      
      // Set loading state immediately
      setLoading(true)
      setChartError(null)
      
      // Clear previous data before fetching new stock data
      setChartData([])
      setFullChartData([])
      setStockData(null) // Clear stock data to show loading state
      
      // Fetch data immediately (no delay)
      const fetchData = async () => {
        try {
          // Fetch stock price and chart data in parallel for faster loading
          await Promise.all([
            fetchStockPrice(selectedStock.symbol),
            fetchChartData(selectedStock.symbol, timeframe)
          ])
          console.log(`✅ Data loaded for ${selectedStock.symbol}`)
        } catch (error) {
          console.error(`❌ Error loading data for ${selectedStock.symbol}:`, error)
          setChartError("Failed to load chart data")
        }
      }
      
      fetchData()
      
      // ✅ REMOVED REDUNDANT POLLING: SSE stream already updates stock price every 5s
      // No need for setInterval - useLivePrice hook provides real-time updates
    }

    // ✅ Cleanup no longer needed (no interval to clear)
    return () => {}
  }, [selectedStock, timeframe])

  const handleStockChange = (symbol: string) => {
    const stock = NIFTY_50_STOCKS.find(s => s.symbol === symbol)
    if (stock) {
      setSelectedStock(stock)
      // Notify parent component about stock change
      if (onStockChange) {
        onStockChange(stock)
      }
    }
  }

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    // Notify parent component about timeframe change
    if (onTimeframeChange) {
      onTimeframeChange(newTimeframe)
    }
  }
  
  // Fetch S/R levels
  const fetchSRLevels = async (symbol: string, tf: string) => {
    try {
      console.log(`📏 Fetching S/R levels for ${symbol} (${tf})...`)
      const response = await fetch(`/api/support-resistance?symbol=${symbol}&timeframe=${tf}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.levels) {
          const levels = result.data.levels.slice(0, 8) // Top 8 levels
          setSRLevels(levels)
          console.log(`✅ Loaded ${levels.length} S/R levels:`, levels)
        } else {
          console.warn(`⚠️ No S/R levels found`)
          setSRLevels([])
        }
      }
    } catch (error) {
      console.error("Error fetching S/R levels:", error)
      setSRLevels([])
    }
  }

  // Fetch pattern data and map to chart coordinates
  const fetchPatternData = async (symbol: string, tf: string) => {
    try {
      console.log(`🔍 Fetching patterns for ${symbol} (${tf})...`)
      const response = await fetch(`/api/ai-pattern-recognition?symbol=${symbol}&timeframe=${tf}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.detectedPatterns) {
          // Map patterns with high confidence (>60%) and significance
          const significantPatterns = result.data.detectedPatterns
            .filter((p: any) => p.confidence > 60 && p.significance !== 'low')
            .slice(0, 3) // Top 3 most significant patterns
          
          const mappedPatterns = significantPatterns.map((p: any) => ({
            pattern: p.pattern,
            type: p.type,
            confidence: p.confidence,
            points: [], // Will be calculated during rendering
            startIndex: 0,
            endIndex: chartData.length - 1
          }))
          
          setDetectedPatterns(mappedPatterns)
          console.log(`✅ Detected ${significantPatterns.length} significant patterns:`, significantPatterns.map((p: any) => `${p.pattern} (${p.confidence}%)`))
        } else {
          console.warn(`⚠️ No patterns detected`)
          setDetectedPatterns([])
        }
      }
    } catch (error) {
      console.error("Error fetching patterns:", error)
      setDetectedPatterns([])
    }
  }

  // Notify parent on initial mount
  useEffect(() => {
    if (onStockChange && selectedStock) {
      onStockChange(selectedStock)
    }
    if (onTimeframeChange && timeframe) {
      onTimeframeChange(timeframe)
    }
  }, [])

  // Fetch S/R levels when stock or timeframe changes
  useEffect(() => {
    if (selectedStock) {
      fetchSRLevels(selectedStock.symbol, timeframe)
      fetchPatternData(selectedStock.symbol, timeframe)
    }
  }, [selectedStock, timeframe])

  const handleRefresh = () => {
    if (selectedStock) {
      fetchStockPrice(selectedStock.symbol)
      fetchChartData(selectedStock.symbol, timeframe)
      fetchSRLevels(selectedStock.symbol, timeframe)
      fetchPatternData(selectedStock.symbol, timeframe)
    }
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : ""
    return `${sign}${change.toFixed(2)}`
  }

  const formatPercentage = (percent: number) => {
    const sign = percent >= 0 ? "+" : ""
    return `${sign}${percent.toFixed(2)}%`
  }

  return (
    <>
      {/* Fullscreen Chart Popup Modal */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
          {/* Modal Container */}
          <div className="w-full h-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStock.name}</h3>
                  <p className="text-sm text-slate-400">{selectedStock.symbol} • {TIMEFRAMES.find(tf => tf.value === timeframe)?.fullLabel}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700 text-white hover:bg-slate-800"
                onClick={() => setIsMaximized(false)}
              >
                <Minimize className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>

            {/* Chart Content - Full Height - This is where charts will be moved */}
            <div id="fullscreen-chart-container" className="flex-1 p-6 overflow-hidden flex flex-col gap-3">
              {/* Charts will be dynamically moved here when maximized */}
              {loading && (
                <div className="absolute inset-6 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                  <div className="flex items-center space-x-2 text-white">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading chart data...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Normal View */}
      <div className="space-y-4">
      {/* Controls Bar - Always Visible at Top */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-4 shadow-lg">
        <style jsx>{`
          #fullscreen-chart-container > div:first-child {
            flex: 1;
            min-height: 0;
          }
          #fullscreen-chart-container > div:last-child {
            height: 150px !important;
          }
        `}</style>
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Stock Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">Stock Chart</span>
            </div>
            
            <Select value={selectedStock.symbol} onValueChange={handleStockChange}>
              <SelectTrigger className="w-72 h-10 bg-slate-800/80 border-slate-600 text-white hover:bg-slate-700 hover:border-slate-500 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-96 overflow-y-auto">
                {NIFTY_50_STOCKS.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol} className="text-white hover:bg-slate-700">
                    <div className="flex flex-col">
                      <span className="font-medium">{stock.baseSymbol}</span>
                      <span className="text-xs text-slate-400">{stock.sector}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right: Timeframe Buttons and Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Timeframe Buttons */}
            <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
              {TIMEFRAMES.map((tf) => (
                <Button
                  key={tf.value}
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1 h-8 text-xs font-medium transition-all ${
                    timeframe === tf.value
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                  onClick={() => handleTimeframeChange(tf.value)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>

            <Button
              variant={showPatterns ? "default" : "outline"}
              size="sm"
              className={showPatterns ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-700 text-white hover:bg-slate-800"}
              onClick={() => setShowPatterns(!showPatterns)}
            >
              <Activity className="h-4 w-4 mr-2" />
              {showPatterns ? "Hide" : "Show"} Patterns
              {detectedPatterns.length > 0 && (
                <Badge className="ml-2 bg-white/20 text-white text-xs">{detectedPatterns.length}</Badge>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-white hover:bg-slate-800"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-white hover:bg-slate-800"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isMaximized ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Live Price Display */}
      {stockData && (
        <Card className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {stockData.companyName}
                  </h3>
                  <div className="flex items-center space-x-2 text-slate-400 text-xs">
                    <span>{stockData.symbol}</span>
                    <span>•</span>
                    <span className="text-slate-500">{stockData.sector}</span>
                    <span>•</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                      NSE
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {formatPrice(stockData.price)}
                </div>
                <div className={`flex items-center justify-end text-sm font-medium ${
                  stockData.change >= 0 ? "text-green-400" : "text-red-400"
                }`}>
                  {stockData.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 mr-1" />
                  )}
                  {formatChange(stockData.change)} ({formatPercentage(stockData.changePercent)})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 pt-3 mt-3 border-t border-slate-700/50">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Prev Close</p>
                <p className="text-xs font-semibold text-white">{formatPrice(stockData.previousClose)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Open</p>
                <p className="text-xs font-semibold text-white">{formatPrice(stockData.open)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">High</p>
                <p className="text-xs font-semibold text-green-400">{formatPrice(stockData.high)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Low</p>
                <p className="text-xs font-semibold text-red-400">{formatPrice(stockData.low)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 mb-0.5">Volume</p>
                <p className="text-xs font-semibold text-white">
                  {stockData.volume > 0 ? (stockData.volume / 1000000).toFixed(2) + 'M' : '0'}
                </p>
              </div>
            </div>

            {lastUpdate && (
              <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Data source: {stockData.source}</span>
                <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candlestick Chart */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Live Candlestick Chart
              {isLiveConnected && isMarketOpen && (
                <Badge variant="default" className="bg-red-600 hover:bg-red-600 animate-pulse ml-2">
                  <div className="h-2 w-2 rounded-full bg-white mr-1.5 animate-ping"></div>
                  LIVE
                </Badge>
              )}
              {isLiveConnected && !isMarketOpen && (
                <Badge variant="secondary" className="bg-slate-600 ml-2">
                  Connected
                </Badge>
              )}
            </div>
            {chartError && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {chartError}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="relative" data-chart-parent>
            <div
              ref={chartContainerRef}
              className="w-full bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg"
              style={{ height: "500px" }}
            />
            
            <div
              ref={volumeContainerRef}
              className="w-full bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-lg mt-2"
              style={{ height: "100px" }}
            />
            
            {loading && !isMaximized && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-2 text-white">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading chart data...</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detected Patterns Legend */}
      {detectedPatterns.length > 0 && (
        <Card className="bg-purple-900/20 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Detected Chart Patterns ({detectedPatterns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {detectedPatterns.map((pattern, idx) => {
                const isBullish = pattern.type === 'bullish'
                const isBearish = pattern.type === 'bearish'
                const bgColor = isBullish ? 'bg-green-500/10 border-green-500/30' : 
                               isBearish ? 'bg-red-500/10 border-red-500/30' : 
                               'bg-yellow-500/10 border-yellow-500/30'
                const textColor = isBullish ? 'text-green-400' : 
                                 isBearish ? 'text-red-400' : 
                                 'text-yellow-400'
                const icon = isBullish ? '↗' : isBearish ? '↘' : '↔'
                
                return (
                  <div key={idx} className={`p-3 rounded-lg border ${bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-lg font-bold ${textColor}`}>{icon}</span>
                      <Badge variant="outline" className="text-xs">
                        {pattern.confidence}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-white mb-1">{pattern.pattern}</p>
                    <p className="text-xs text-slate-400 capitalize">{pattern.type} signal</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 p-2 bg-slate-800/50 rounded text-xs text-slate-400 flex items-start gap-2">
              <span className="text-purple-400">ℹ️</span>
              <span>
                Pattern shapes are highlighted on the chart. Green = Bullish (buy signal), Red = Bearish (sell signal).
                Use these patterns along with S/R levels and AI analysis to make informed trading decisions.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
    </>
  )
}
