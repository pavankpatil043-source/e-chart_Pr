import { NextRequest } from 'next/server'

// This API route handles WebSocket upgrade for live price streaming
// Note: Next.js doesn't natively support WebSocket in API routes
// We'll use a polling-based approach with Server-Sent Events (SSE) instead
// For true WebSocket, you'd need a separate Node.js server

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'RELIANCE.NS'
  
  // Create a ReadableStream for Server-Sent Events
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`🔴 Live stream started for ${symbol}`)
      
      // Function to fetch and send price updates
      const sendUpdate = async () => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
            { cache: 'no-store' }
          )
          
          const data = await response.json()
          const result = data?.chart?.result?.[0]
          
          if (result) {
            const meta = result.meta
            const quote = result.indicators?.quote?.[0]
            const timestamps = result.timestamp
            
            if (timestamps && timestamps.length > 0) {
              const lastIndex = timestamps.length - 1
              
              const liveData = {
                symbol,
                timestamp: timestamps[lastIndex] * 1000,
                price: meta.regularMarketPrice || quote.close[lastIndex],
                open: quote.open[lastIndex],
                high: quote.high[lastIndex],
                low: quote.low[lastIndex],
                close: quote.close[lastIndex],
                volume: quote.volume[lastIndex],
                previousClose: meta.previousClose,
                change: meta.regularMarketPrice - meta.previousClose,
                changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
                marketState: meta.marketState,
                time: new Date().toLocaleString('en-IN', { 
                  timeZone: 'Asia/Kolkata',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })
              }
              
              // Send data as Server-Sent Event
              const message = `data: ${JSON.stringify(liveData)}\n\n`
              controller.enqueue(encoder.encode(message))
              console.log(`📊 Sent update for ${symbol}: ₹${liveData.price.toFixed(2)}`)
            }
          }
        } catch (error) {
          console.error('Error fetching live data:', error)
        }
      }
      
      // Send initial update
      await sendUpdate()
      
      // Set up interval for updates every 5 seconds (safe for Yahoo Finance)
      // 720 requests/hour per stock - well below 2,000/hour limit
      const intervalId = setInterval(async () => {
        // Only poll during market hours (9:15 AM - 3:30 PM IST)
        const now = new Date()
        const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
        const hour = istTime.getHours()
        const minute = istTime.getMinutes()
        const day = istTime.getDay()
        
        // Check if it's a weekday and during market hours
        const isWeekday = day >= 1 && day <= 5
        const isMarketHours = (hour === 9 && minute >= 15) || 
                             (hour > 9 && hour < 15) || 
                             (hour === 15 && minute <= 30)
        
        if (isWeekday && isMarketHours) {
          await sendUpdate()
        } else {
          // Send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        }
      }, 5000) // 5 seconds - optimal balance between responsiveness and safety
      
      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔴 Live stream stopped for ${symbol}`)
        clearInterval(intervalId)
        controller.close()
      })
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
