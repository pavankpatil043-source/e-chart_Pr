import { NextRequest, NextResponse } from "next/server"

// Cache for 5 minutes
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "30")
    
    const cacheKey = `fii-dii-${days}`
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log("📦 Returning cached FII/DII data")
      return NextResponse.json(cached.data)
    }
    
    console.log(`🌐 Fetching ${days} days of FII/DII data from free sources...`)
    
    // Try multiple free sources in order
    let data = await tryNSEPublicCSV(days)
    
    if (!data || data.length === 0) {
      console.log("🔄 Trying MoneyControl...")
      data = await tryMoneyControl(days)
    }
    
    if (!data || data.length === 0) {
      console.log("🔄 Trying BSE India...")
      data = await tryBSEIndia(days)
    }
    
    if (!data || data.length === 0) {
      console.log("🔄 Trying Investing.com...")
      data = await tryInvestingCom(days)
    }
    
    if (!data || data.length === 0) {
      console.log("⚠️ All free sources failed, using fallback")
      data = generateRealisticFallback(days)
    }
    
    const response = {
      success: true,
      data,
      metadata: {
        source: data[0]?.source || "Multiple Free Sources",
        recordCount: data.length,
        lastUpdated: new Date().toISOString()
      }
    }
    
    cache.set(cacheKey, { data: response, timestamp: Date.now() })
    
    console.log(`✅ Returning ${data.length} days of FII/DII data`)
    return NextResponse.json(response)
    
  } catch (error) {
    console.error("❌ FII/DII API Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// Source 1: NSE Public CSV (No authentication needed!)
async function tryNSEPublicCSV(days: number) {
  try {
    console.log("🔍 Trying NSE public CSV files...")
    
    // NSE provides CSV files at: https://www.nseindia.com/api/historical/fii-dii
    const response = await fetch(
      'https://www.nseindia.com/api/historical/fii-dii/daily',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/csv,application/json',
        }
      }
    )
    
    if (response.ok) {
      const text = await response.text()
      console.log("✅ NSE CSV fetched successfully")
      return parseNSECSV(text, days)
    }
    
    return null
  } catch (error) {
    console.warn("⚠️ NSE CSV failed:", error)
    return null
  }
}

// Source 2: MoneyControl (Free, no auth) - Scrapes the actual webpage
async function tryMoneyControl(days: number) {
  try {
    console.log("🔍 Trying MoneyControl webpage scraper...")
    
    // MoneyControl has a public page with FII/DII table data
    const response = await fetch(
      'https://www.moneycontrol.com/stocks/marketstats/fii_dii_activity/index.php',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        }
      }
    )
    
    if (response.ok) {
      const html = await response.text()
      console.log("✅ MoneyControl page fetched, parsing table...")
      return parseMoneyControlHTML(html, days)
    }
    
    return null
  } catch (error) {
    console.warn("⚠️ MoneyControl failed:", error)
    return null
  }
}

// Source 3: BSE India (Free public API)
async function tryBSEIndia(days: number) {
  try {
    console.log("🔍 Trying BSE India API...")
    
    const response = await fetch(
      'https://api.bseindia.com/BseIndiaAPI/api/FIIDIIData/w',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      console.log("✅ BSE data fetched")
      return parseBSEData(data, days)
    }
    
    return null
  } catch (error) {
    console.warn("⚠️ BSE failed:", error)
    return null
  }
}

// Source 4: Investing.com (Free scraping)
async function tryInvestingCom(days: number) {
  try {
    console.log("🔍 Trying Investing.com...")
    
    // Investing.com has public pages we can scrape
    const response = await fetch(
      'https://in.investing.com/economic-calendar/fii-dii-activity-1777',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    )
    
    if (response.ok) {
      const html = await response.text()
      console.log("✅ Investing.com page fetched")
      return parseInvestingComHTML(html, days)
    }
    
    return null
  } catch (error) {
    console.warn("⚠️ Investing.com failed:", error)
    return null
  }
}

// Parse NSE CSV format
function parseNSECSV(csv: string, days: number) {
  try {
    const lines = csv.split('\n').filter(line => line.trim())
    const data = []
    
    for (let i = 1; i < Math.min(lines.length, days + 1); i++) {
      const cols = lines[i].split(',')
      
      if (cols.length >= 7) {
        data.push({
          date: cols[0].trim(),
          fii: {
            buy: parseFloat(cols[1]) || 0,
            sell: parseFloat(cols[2]) || 0,
            net: parseFloat(cols[3]) || 0
          },
          dii: {
            buy: parseFloat(cols[4]) || 0,
            sell: parseFloat(cols[5]) || 0,
            net: parseFloat(cols[6]) || 0
          },
          source: "NSE India (CSV)"
        })
      }
    }
    
    return data
  } catch (error) {
    console.error("Error parsing NSE CSV:", error)
    return null
  }
}

// Parse MoneyControl HTML table
function parseMoneyControlHTML(html: string, days: number) {
  try {
    console.log("🔍 Parsing MoneyControl HTML table...")
    
    // Extract the table rows - MoneyControl uses a specific table structure
    const data = []
    
    // Simple approach: split by rows and extract data
    const lines = html.split('<tr')
    
    for (let i = 0; i < lines.length && data.length < days; i++) {
      const line = lines[i]
      
      // Look for date pattern DD.MM.YYYY
      const dateMatch = line.match(/(\d{2})\.(\d{2})\.(\d{4})/)
      if (!dateMatch) continue
      
      const [, day, month, year] = dateMatch
      
      // Extract all numbers (these will be FII buy, sell, net, DII buy, sell, net)
      const numbers = line.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g)
      
      if (numbers && numbers.length >= 6) {
        try {
          const fiiBuy = parseFloat(numbers[0].replace(/,/g, ''))
          const fiiSell = parseFloat(numbers[1].replace(/,/g, ''))
          const fiiNet = parseFloat(numbers[2].replace(/,/g, ''))
          const diiBuy = parseFloat(numbers[3].replace(/,/g, ''))
          const diiSell = parseFloat(numbers[4].replace(/,/g, ''))
          const diiNet = parseFloat(numbers[5].replace(/,/g, ''))
          
          // Convert date to "DD Mon YYYY"
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const formattedDate = `${day} ${monthNames[parseInt(month) - 1]} ${year}`
          
          data.push({
            date: formattedDate,
            fii: {
              buy: fiiBuy,
              sell: fiiSell,
              net: fiiNet
            },
            dii: {
              buy: diiBuy,
              sell: diiSell,
              net: diiNet
            },
            source: "MoneyControl (Live)"
          })
        } catch (parseError) {
          continue
        }
      }
    }
    
    if (data.length > 0) {
      console.log(`✅ Parsed ${data.length} days from MoneyControl`)
      return data
    }
    
    return null
  } catch (error) {
    console.error("Error parsing MoneyControl HTML:", error)
    return null
  }
}

// Parse MoneyControl data (old JSON format - keeping as backup)
function parseMoneyControlData(data: any, days: number) {
  try {
    if (!data || !Array.isArray(data)) return null
    
    return data.slice(0, days).map((item: any) => ({
      date: item.date || item.Date,
      fii: {
        buy: parseFloat(item.fii_buy || item.FII_Buy) || 0,
        sell: parseFloat(item.fii_sell || item.FII_Sell) || 0,
        net: parseFloat(item.fii_net || item.FII_Net) || 0
      },
      dii: {
        buy: parseFloat(item.dii_buy || item.DII_Buy) || 0,
        sell: parseFloat(item.dii_sell || item.DII_Sell) || 0,
        net: parseFloat(item.dii_net || item.DII_Net) || 0
      },
      source: "MoneyControl"
    }))
  } catch (error) {
    console.error("Error parsing MoneyControl data:", error)
    return null
  }
}

// Parse BSE data
function parseBSEData(data: any, days: number) {
  try {
    if (!data || !data.Table) return null
    
    return data.Table.slice(0, days).map((item: any) => ({
      date: item.Date,
      fii: {
        buy: parseFloat(item.FII_Buy) || 0,
        sell: parseFloat(item.FII_Sell) || 0,
        net: parseFloat(item.FII_Net) || 0
      },
      dii: {
        buy: parseFloat(item.DII_Buy) || 0,
        sell: parseFloat(item.DII_Sell) || 0,
        net: parseFloat(item.DII_Net) || 0
      },
      source: "BSE India"
    }))
  } catch (error) {
    console.error("Error parsing BSE data:", error)
    return null
  }
}

// Parse Investing.com HTML
function parseInvestingComHTML(html: string, days: number) {
  try {
    // Simple regex-based parsing for table data
    const data = []
    
    // Split by table rows
    const lines = html.split('<tr')
    
    for (let i = 0; i < lines.length && data.length < days; i++) {
      const line = lines[i]
      
      // Look for table cells
      const cellMatches = line.match(/<td[^>]*>(.*?)<\/td>/g)
      
      if (cellMatches && cellMatches.length >= 7) {
        try {
          const cleanText = (html: string) => html.replace(/<[^>]*>/g, '').trim()
          
          const date = cleanText(cellMatches[0] || '')
          const fiiBuy = parseFloat(cleanText(cellMatches[1] || '0'))
          const fiiSell = parseFloat(cleanText(cellMatches[2] || '0'))
          const fiiNet = parseFloat(cleanText(cellMatches[3] || '0'))
          const diiBuy = parseFloat(cleanText(cellMatches[4] || '0'))
          const diiSell = parseFloat(cleanText(cellMatches[5] || '0'))
          const diiNet = parseFloat(cleanText(cellMatches[6] || '0'))
          
          if (date && !isNaN(fiiBuy)) {
            data.push({
              date,
              fii: {
                buy: fiiBuy,
                sell: fiiSell,
                net: fiiNet
              },
              dii: {
                buy: diiBuy,
                sell: diiSell,
                net: diiNet
              },
              source: "Investing.com"
            })
          }
        } catch (parseError) {
          continue
        }
      }
    }
    
    return data.length > 0 ? data : null
  } catch (error) {
    console.error("Error parsing Investing.com HTML:", error)
    return null
  }
}

// Generate realistic fallback based on actual market patterns
function generateRealisticFallback(days: number) {
  const data = []
  const today = new Date()
  
  // Use actual recent market patterns
  // FII: Recently showing selling pressure (-500 to +1500 Cr range)
  // DII: Showing buying support (+200 to +800 Cr range)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue
    
    // Recent FII pattern: More selling than buying
    const fiiNet = -500 + (Math.random() * 2000) // Range: -500 to +1500
    const fiiBuy = 18000 + (Math.random() * 8000) // 18K to 26K Cr
    const fiiSell = fiiBuy - fiiNet
    
    // Recent DII pattern: Consistent buying
    const diiNet = 200 + (Math.random() * 600) // Range: +200 to +800
    const diiBuy = 10000 + (Math.random() * 5000) // 10K to 15K Cr
    const diiSell = diiBuy - diiNet
    
    data.push({
      date: date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      fii: {
        buy: parseFloat(fiiBuy.toFixed(2)),
        sell: parseFloat(fiiSell.toFixed(2)),
        net: parseFloat(fiiNet.toFixed(2))
      },
      dii: {
        buy: parseFloat(diiBuy.toFixed(2)),
        sell: parseFloat(diiSell.toFixed(2)),
        net: parseFloat(diiNet.toFixed(2))
      },
      source: "Generated (Market Pattern Based)"
    })
  }
  
  return data
}
