import { NextRequest } from 'next/server'

// Live streaming endpoint for Indian indices (Nifty 50, Bank Nifty, etc.)
// Updates every 5 seconds during market hours

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      console.log(`📊 Live indices stream started`)
      
      // Function to fetch and send indices updates
      const sendUpdate = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/indian-indices`,
            { cache: 'no-store' }
          )
          
          const data = await response.json()
          
          if (data.success && data.data) {
            const liveIndices = {
              timestamp: Date.now(),
              time: new Date().toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }),
              indices: data.data
            }
            
            // Send data as Server-Sent Event
            const message = `data: ${JSON.stringify(liveIndices)}\n\n`
            controller.enqueue(encoder.encode(message))
            console.log(`📊 Sent indices update at ${liveIndices.time}`)
          }
        } catch (error) {
          console.error('Error fetching live indices:', error)
        }
      }
      
      // Send initial update
      await sendUpdate()
      
      // Set up interval for updates every 5 seconds
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
      }, 5000) // 5 seconds
      
      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`📊 Live indices stream stopped`)
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
