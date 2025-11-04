import { NextRequest, NextResponse } from "next/server"

// Cache for MoneyControl data
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

interface FIIDIIData {
  date: string
  fii: {
    buy: number
    sell: number
    net: number
  }
  dii: {
    buy: number
    sell: number
    net: number
  }
  source: string
}

/**
 * Fetch FII/DII data from MoneyControl API
 * This uses MoneyControl's internal API endpoint
 */
async function fetchMoneyControlAPI(): Promise<FIIDIIData[]> {
  try {
    console.log("🌐 Fetching FII/DII from MoneyControl API...")

    // Try multiple MoneyControl API endpoints
    const endpoints = [
      "https://priceapi.moneycontrol.com/pricefeed/fiidii/fetchFiiDiiData",
      "https://www.moneycontrol.com/mccode/common/autosuggestion_solr.php?classic=true&query=fiidii",
      "https://api.moneycontrol.com/mcapi/v1/stock/get-fii-dii-data",
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.moneycontrol.com/",
            "Origin": "https://www.moneycontrol.com",
          },
          next: { revalidate: 300 },
        })

        if (!response.ok) continue

        const jsonData = await response.json()
        const data: FIIDIIData[] = []

        // Try to parse the response (structure may vary)
        if (jsonData && Array.isArray(jsonData.data)) {
          jsonData.data.forEach((item: any) => {
            data.push({
              date: item.date || item.tradeDate || item.dt,
              fii: {
                buy: parseFloat(item.fiiBuy || item.fii_buy || 0),
                sell: parseFloat(item.fiiSell || item.fii_sell || 0),
                net: parseFloat(item.fiiNet || item.fii_net || 0),
              },
              dii: {
                buy: parseFloat(item.diiBuy || item.dii_buy || 0),
                sell: parseFloat(item.diiSell || item.dii_sell || 0),
                net: parseFloat(item.diiNet || item.dii_net || 0),
              },
              source: "MoneyControl API",
            })
          })

          if (data.length > 0) {
            console.log(`✅ MoneyControl API: Fetched ${data.length} records from ${endpoint}`)
            return data
          }
        } else if (jsonData && typeof jsonData === 'object') {
          // Try alternate structure
          const keys = Object.keys(jsonData)
          if (keys.length > 0) {
            keys.forEach(dateKey => {
              const item = jsonData[dateKey]
              if (item && typeof item === 'object') {
                data.push({
                  date: dateKey,
                  fii: {
                    buy: parseFloat(item.fiiBuy || item.fii_buy || 0),
                    sell: parseFloat(item.fiiSell || item.fii_sell || 0),
                    net: parseFloat(item.fiiNet || item.fii_net || 0),
                  },
                  dii: {
                    buy: parseFloat(item.diiBuy || item.dii_buy || 0),
                    sell: parseFloat(item.diiSell || item.dii_sell || 0),
                    net: parseFloat(item.diiNet || item.dii_net || 0),
                  },
                  source: "MoneyControl API",
                })
              }
            })

            if (data.length > 0) {
              console.log(`✅ MoneyControl API (alt format): Fetched ${data.length} records`)
              return data
            }
          }
        }
      } catch (err) {
        console.log(`⚠️ Endpoint ${endpoint} failed:`, err)
        continue
      }
    }

    console.log("⚠️ All MoneyControl API endpoints failed")
    return []

  } catch (error) {
    console.error("❌ MoneyControl API error:", error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30d"
    
    // Check cache
    const cacheKey = `moneycontrol-fiidii-${period}`
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("📦 Returning cached MoneyControl data")
      return NextResponse.json({
        success: true,
        data: cached.data,
        metadata: {
          source: "MoneyControl (Cached)",
          cached: true,
          lastUpdated: new Date(cached.timestamp).toISOString(),
        }
      })
    }

    // Fetch from MoneyControl API
    let data = await fetchMoneyControlAPI()

    if (data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Unable to fetch data from MoneyControl - API endpoints not accessible",
        data: [],
        metadata: {
          message: "MoneyControl API may require authentication or different access method",
          fallbackSuggestion: "Using NSE or other sources as primary",
        }
      }, { status: 503 })
    }

    // Filter by period
    const days = parseInt(period.replace(/[^\d]/g, '')) || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoffDate
    })

    // Sort by date (newest first)
    filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Cache the result
    cache.set(cacheKey, { data: filteredData, timestamp: Date.now() })

    return NextResponse.json({
      success: true,
      data: filteredData,
      metadata: {
        source: "MoneyControl",
        period,
        recordCount: filteredData.length,
        lastUpdated: new Date().toISOString(),
      }
    })

  } catch (error) {
    console.error("❌ MoneyControl FII/DII API Error:", error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: [],
      metadata: {
        fallbackSuggestion: "Consider using NSE or other data sources",
      }
    }, { status: 500 })
  }
}
