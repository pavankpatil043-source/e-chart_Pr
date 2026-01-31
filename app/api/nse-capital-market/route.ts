import { NextRequest, NextResponse } from "next/server"

// Cache for capital market data
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes cache

interface CapitalMarketData {
  date: string
  category: string
  buyValue: number
  sellValue: number
  netValue: number
}

export async function GET(request: NextRequest) {
  try {
    console.log("📊 NSE Capital Market FII/DII API called")
    
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7")
    
    const cacheKey = `capital-market-${days}`
    const cached = cache.get(cacheKey)
    
    // Return cached data if available and fresh
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("📦 Returning cached capital market data")
      return NextResponse.json(cached.data)
    }
    
    // Fetch from NSE Capital Market API
    const data = await fetchNSECapitalMarketData(days)
    
    const response = {
      success: true,
      data,
      metadata: {
        source: "NSE India Capital Market",
        days,
        recordCount: data.length,
        lastUpdated: new Date().toISOString()
      }
    }
    
    // Cache the response
    cache.set(cacheKey, { data: response, timestamp: Date.now() })
    
    console.log(`✅ Returning ${data.length} days of capital market data`)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ NSE Capital Market API Error:", error)
    
    return NextResponse.json({
      success: false,
      data: [],
      metadata: {
        source: "Error",
        error: error instanceof Error ? error.message : "Unknown error",
        lastUpdated: new Date().toISOString()
      }
    }, { status: 500 })
  }
}

async function fetchNSECapitalMarketData(days: number): Promise<CapitalMarketData[]> {
  try {
    console.log(`🌐 Fetching ${days} days of capital market data from NSE...`)
    
    // NSE Capital Market URL - this is the official public API
    const url = "https://www.nseindia.com/api/fiidiiTradeReact"
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/market-data/funds-flow-fii-dii',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    }
    
    // First initialize session
    await fetch("https://www.nseindia.com", { headers })
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const allData: CapitalMarketData[] = []
    
    // Fetch data day by day for the requested period
    for (let i = 0; i < days; i++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() - i)
      
      // Skip weekends
      if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
        continue
      }
      
      const dateStr = formatDateForNSE(targetDate)
      const apiUrl = `${url}?index=fii&from=${dateStr}&to=${dateStr}`
      
      console.log(`📅 Fetching: ${dateStr}`)
      
      try {
        const response = await fetch(apiUrl, {
          headers,
          method: 'GET',
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // NSE returns data in this format
          if (Array.isArray(data) && data.length > 0) {
            const dayData = data[0]
            
            // Process FII/FPI data
            if (dayData.category === "FII/FPI *" || dayData.category === "FII/FPI" || dayData.buyValue) {
              allData.push({
                date: formatDateForDisplay(targetDate),
                category: "FII/FPI",
                buyValue: parseFloat(dayData.buyValue || 0),
                sellValue: parseFloat(dayData.sellValue || 0),
                netValue: parseFloat(dayData.netValue || (dayData.buyValue - dayData.sellValue))
              })
            }
            
            // Process DII data
            const diiData = data.find((item: any) => item.category?.includes("DII"))
            if (diiData) {
              allData.push({
                date: formatDateForDisplay(targetDate),
                category: "DII",
                buyValue: parseFloat(diiData.buyValue || 0),
                sellValue: parseFloat(diiData.sellValue || 0),
                netValue: parseFloat(diiData.netValue || (diiData.buyValue - diiData.sellValue))
              })
            }
            
            console.log(`✅ Fetched data for ${dateStr}`)
          }
        }
      } catch (fetchError) {
        console.warn(`⚠️ Failed to fetch ${dateStr}:`, fetchError)
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`✅ Total records fetched: ${allData.length}`)
    return allData
    
  } catch (error) {
    console.error("❌ Error fetching capital market data:", error)
    throw error
  }
}

function formatDateForNSE(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function formatDateForDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}
