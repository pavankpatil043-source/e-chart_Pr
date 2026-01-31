import { NextRequest, NextResponse } from 'next/server'
import { breezeAPI } from '@/lib/breeze-api'
import { format, subDays, isWeekend } from 'date-fns'

// Cache for FII/DII data
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedData(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() })
}

// Generate sample FII/DII data as fallback
function generateSampleFIIDIIData(days: number): any[] {
  const data = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i)
    
    // Skip weekends
    if (isWeekend(date)) {
      continue
    }
    
    // Generate realistic FII data (in crores)
    const fiiBaseBuy = 3000 + Math.random() * 4000
    const fiiBaseSell = 3000 + Math.random() * 4000
    const marketSentiment = Math.random() - 0.3
    const fiiAdjustment = marketSentiment * 1000
    
    const fiiBuy = Math.max(500, fiiBaseBuy + fiiAdjustment)
    const fiiSell = Math.max(500, fiiBaseSell - fiiAdjustment)
    
    // Generate realistic DII data (counter-cyclical to FII)
    const diiBaseBuy = 2000 + Math.random() * 2500
    const diiBaseSell = 2000 + Math.random() * 2500
    const diiAdjustment = -marketSentiment * 800
    
    const diiBuy = Math.max(300, diiBaseBuy + diiAdjustment)
    const diiSell = Math.max(300, diiBaseSell - diiAdjustment)
    
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      fii: {
        buy: Math.round(fiiBuy),
        sell: Math.round(fiiSell),
        net: Math.round(fiiBuy - fiiSell)
      },
      dii: {
        buy: Math.round(diiBuy),
        sell: Math.round(diiSell),
        net: Math.round(diiBuy - diiSell)
      }
    })
  }
  
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Fetch live FII/DII data from Breeze API
async function fetchLiveFIIDIIData(days: number): Promise<any[] | null> {
  try {
    console.log(`🔄 Fetching live FII/DII data for last ${days} days from Breeze API`)
    
    const data = []
    const promises = []
    
    // Fetch data for each day
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      
      // Skip weekends
      if (isWeekend(date)) {
        continue
      }
      
      const dateString = format(date, 'yyyy-MM-dd')
      promises.push(breezeAPI.getFIIDIIData(dateString))
    }
    
    const results = await Promise.all(promises)
    
    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const dateIndex = days - 1 - i
      const date = subDays(new Date(), dateIndex)
      
      if (isWeekend(date)) continue
      
      if (result) {
        data.push({
          date: result.date,
          fii: {
            buy: result.fii_buy,
            sell: result.fii_sell,
            net: result.fii_net
          },
          dii: {
            buy: result.dii_buy,
            sell: result.dii_sell,
            net: result.dii_net
          }
        })
      }
    }
    
    if (data.length > 0) {
      console.log(`✅ Successfully fetched ${data.length} days of live FII/DII data from Breeze API`)
      return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    
    return null
    
  } catch (error) {
    console.error('❌ Failed to fetch live FII/DII data from Breeze API:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '7d'
    
    // Determine number of days
    const daysMap: { [key: string]: number } = {
      '7d': 10,   // Extra days to account for weekends
      '30d': 42,
      '3mo': 120,
      '6mo': 240
    }
    
    const days = daysMap[period] || 10
    
    // Check cache first
    const cacheKey = `live-fii-dii-${period}`
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        source: 'Breeze API (Cached)',
        timestamp: new Date().toISOString(),
        period: period,
        requestedDays: days
      })
    }

    // Try to fetch live data from Breeze API first
    let fiiDiiData = await fetchLiveFIIDIIData(days)
    let dataSource = 'Breeze API (Live)'
    
    if (!fiiDiiData || fiiDiiData.length === 0) {
      console.log('⚠️ Breeze API unavailable, using sample data')
      fiiDiiData = generateSampleFIIDIIData(days)
      dataSource = 'Fallback Sample Data'
    }
    
    // Cache the result
    setCachedData(cacheKey, fiiDiiData)
    
    // Calculate statistics
    const totalFII = fiiDiiData.reduce((sum: number, item: any) => sum + item.fii.net, 0)
    const totalDII = fiiDiiData.reduce((sum: number, item: any) => sum + item.dii.net, 0)
    const totalNet = totalFII + totalDII
    
    const avgFII = Math.round(totalFII / fiiDiiData.length)
    const avgDII = Math.round(totalDII / fiiDiiData.length)
    
    const fiiFlows = fiiDiiData.map((item: any) => item.fii.net)
    const diiFlows = fiiDiiData.map((item: any) => item.dii.net)
    
    const maxFII = Math.max(...fiiFlows)
    const minFII = Math.min(...fiiFlows)
    const maxDII = Math.max(...diiFlows)
    const minDII = Math.min(...diiFlows)

    return NextResponse.json({
      success: true,
      data: fiiDiiData,
      cached: false,
      source: dataSource,
      timestamp: new Date().toISOString(),
      period: period,
      statistics: {
        totalRecords: fiiDiiData.length,
        fii: {
          total: Math.round(totalFII),
          average: avgFII,
          max: Math.round(maxFII),
          min: Math.round(minFII)
        },
        dii: {
          total: Math.round(totalDII),
          average: avgDII,
          max: Math.round(maxDII),
          min: Math.round(minDII)
        },
        combined: {
          netFlow: Math.round(totalNet),
          trend: totalNet > 0 ? 'POSITIVE' : totalNet < 0 ? 'NEGATIVE' : 'NEUTRAL'
        }
      }
    })

  } catch (error) {
    console.error('❌ Live FII DII API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch FII DII data',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallbackAvailable: true
    }, { status: 500 })
  }
}

// POST endpoint for manual data refresh
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, date } = body

    if (action === 'refresh') {
      // Clear cache and fetch fresh data
      cache.clear()
      
      const targetDate = date || format(new Date(), 'yyyy-MM-dd')
      console.log(`🔄 Manual refresh requested for date: ${targetDate}`)
      
      const liveData = await breezeAPI.getFIIDIIData(targetDate)
      
      if (liveData) {
        const formattedData = {
          date: liveData.date,
          fii: {
            buy: liveData.fii_buy,
            sell: liveData.fii_sell,
            net: liveData.fii_net
          },
          dii: {
            buy: liveData.dii_buy,
            sell: liveData.dii_sell,  
            net: liveData.dii_net
          }
        }
        
        return NextResponse.json({
          success: true,
          data: formattedData,
          source: 'Breeze API (Manual Refresh)',
          timestamp: new Date().toISOString(),
          action: 'refresh'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'Failed to fetch live data for the specified date',
          date: targetDate
        }, { status: 404 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Supported actions: refresh'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Manual FII DII refresh error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process manual refresh',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}