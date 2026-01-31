// NSE Website Scraper for FII/DII Data
// Scrapes real-time institutional investment data from NSE India

import { format, subDays, isWeekend } from "date-fns"

export interface NSEFIIDIIData {
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
  lastUpdated: string
}

export class NSEScraper {
  private baseUrl = "https://www.nseindia.com"
  private fiidiiUrl = "https://www.nseindia.com/api/fiidiiTradeReact"
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.nseindia.com/market-data/live-market-indices',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  }

  // Initialize session by visiting NSE homepage first
  private async initializeSession(): Promise<void> {
    try {
      console.log("🔄 Initializing NSE session...")
      await fetch(this.baseUrl, {
        headers: {
          ...this.headers,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }
      })
      
      // Wait a moment to establish session
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log("✅ NSE session initialized")
    } catch (error) {
      console.warn("⚠️ Failed to initialize NSE session:", error)
    }
  }

  // Fetch FII/DII data from NSE API
  async fetchFIIDIIData(date?: string): Promise<NSEFIIDIIData | null> {
    try {
      console.log("🌐 Fetching FII/DII data from NSE...")
      
      // Initialize session first
      await this.initializeSession()
      
      const targetDate = date || format(new Date(), 'dd-MM-yyyy')
      console.log(`📅 Target date: ${targetDate}`)
      
      // Construct the FII/DII API URL
      const apiUrl = `${this.fiidiiUrl}?index=fii&from=${targetDate}&to=${targetDate}`
      
      console.log(`🔗 Fetching from: ${apiUrl}`)
      
      const response = await fetch(apiUrl, {
        headers: this.headers,
        method: 'GET',
      })

      if (!response.ok) {
        console.error(`❌ NSE API request failed: ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json()
      console.log("📊 Raw NSE response:", JSON.stringify(data, null, 2))

      return await this.parseNSEResponse(data, targetDate)
      
    } catch (error) {
      console.error("❌ Error fetching FII/DII data from NSE:", error)
      return null
    }
  }

  // Parse NSE API response
  private async parseNSEResponse(data: any, date: string): Promise<NSEFIIDIIData | null> {
    try {
      if (!data || !Array.isArray(data)) {
        console.log("📊 Trying alternative NSE endpoints...")
        return await this.tryAlternativeEndpoints(date)
      }

      // NSE returns array of daily data
      const latestData = data[0] || data[data.length - 1]
      
      if (!latestData) {
        console.warn("⚠️ No FII/DII data found in NSE response")
        return null
      }

      console.log("🔍 Parsing NSE data:", latestData)

      // Parse FII data (amounts in crores)
      const fiiPurchase = this.parseAmount(latestData.fiiPurchase || latestData.fiiBuy || 0)
      const fiiSales = this.parseAmount(latestData.fiiSales || latestData.fiiSell || 0)
      const fiiNet = fiiPurchase - fiiSales

      // Parse DII data (amounts in crores)  
      const diiPurchase = this.parseAmount(latestData.diiPurchase || latestData.diiBuy || 0)
      const diiSales = this.parseAmount(latestData.diiSales || latestData.diiSell || 0)
      const diiNet = diiPurchase - diiSales

      const result: NSEFIIDIIData = {
        date: this.formatDateForOutput(date),
        fii: {
          buy: fiiPurchase,
          sell: fiiSales,
          net: fiiNet
        },
        dii: {
          buy: diiPurchase,
          sell: diiSales,
          net: diiNet
        },
        source: "NSE India (Live)",
        lastUpdated: new Date().toISOString()
      }

      console.log("✅ Successfully parsed NSE FII/DII data:", result)
      return result

    } catch (error) {
      console.error("❌ Error parsing NSE response:", error)
      return null
    }
  }

  // Try alternative NSE endpoints for FII/DII data
  private async tryAlternativeEndpoints(date: string): Promise<NSEFIIDIIData | null> {
    const alternativeUrls = [
      "https://www.nseindia.com/api/fiidii-trade-react-data",
      "https://www.nseindia.com/api/fii-dii-data", 
      "https://www.nseindia.com/market-data/fii-dii-data",
      "https://www.nseindia.com/api/market-data-pre-open?key=FIIDII"
    ]

    for (const url of alternativeUrls) {
      try {
        console.log(`🔄 Trying alternative endpoint: ${url}`)
        
        const response = await fetch(url, {
          headers: this.headers,
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`📊 Alternative endpoint data:`, data)
          
          // Try to parse this alternative format
          if (data && (data.fiiDiiData || data.data || data.records)) {
            return this.parseAlternativeFormat(data, date)
          }
        }
      } catch (error) {
        console.warn(`⚠️ Alternative endpoint ${url} failed:`, error)
      }
    }

    return null
  }

  // Parse alternative NSE data formats
  private parseAlternativeFormat(data: any, date: string): NSEFIIDIIData | null {
    try {
      const records = data.fiiDiiData || data.data || data.records || []
      
      if (!Array.isArray(records) || records.length === 0) {
        return null
      }

      const latest = records[0]
      
      return {
        date: this.formatDateForOutput(date),
        fii: {
          buy: this.parseAmount(latest.fii_purchase || latest.fiiBuy || 0),
          sell: this.parseAmount(latest.fii_sales || latest.fiiSell || 0),
          net: this.parseAmount(latest.fii_net || 0)
        },
        dii: {
          buy: this.parseAmount(latest.dii_purchase || latest.diiBuy || 0),
          sell: this.parseAmount(latest.dii_sales || latest.diiSell || 0),
          net: this.parseAmount(latest.dii_net || 0)
        },
        source: "NSE India (Alternative)",
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error("❌ Error parsing alternative format:", error)
      return null
    }
  }

  // Parse amount string to number (handles crores, lakhs, etc.)
  private parseAmount(amount: any): number {
    if (typeof amount === 'number') {
      return Math.round(amount * 100) / 100 // Round to 2 decimals
    }
    
    if (typeof amount === 'string') {
      // Remove commas, currency symbols, and extra spaces
      let cleanAmount = amount.replace(/[,₹\s]/g, '')
      
      // Handle negative amounts
      const isNegative = cleanAmount.includes('-') || cleanAmount.includes('(')
      cleanAmount = cleanAmount.replace(/[-()]/g, '')
      
      // Parse the number
      const parsed = parseFloat(cleanAmount) || 0
      return isNegative ? -parsed : parsed
    }
    
    return 0
  }

  // Format date for output (YYYY-MM-DD)
  private formatDateForOutput(dateStr: string): string {
    try {
      // Handle DD-MM-YYYY format from NSE
      if (dateStr.includes('-') && dateStr.length === 10) {
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}` // Convert to YYYY-MM-DD
        }
      }
      return dateStr
    } catch (error) {
      return format(new Date(), 'yyyy-MM-dd')
    }
  }

  // Get historical data for multiple days
  async fetchHistoricalData(days: number = 30): Promise<NSEFIIDIIData[]> {
    const results: NSEFIIDIIData[] = []
    
    console.log(`📈 Fetching ${days} days of historical FII/DII data from NSE...`)
    
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i)
      
      // Skip weekends
      if (isWeekend(date)) {
        continue
      }
      
      const dateStr = format(date, 'dd-MM-yyyy')
      const data = await this.fetchFIIDIIData(dateStr)
      
      if (data) {
        results.push(data)
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`✅ Fetched ${results.length} days of FII/DII data`)
    return results.reverse() // Return chronological order
  }
}

// Export singleton instance
export const nseScraper = new NSEScraper()