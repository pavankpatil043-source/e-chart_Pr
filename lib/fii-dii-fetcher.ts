// FII DII Data Fetcher Service
// Fetches real institutional investment data from multiple sources

import { FIIDIIDatabase, FIIDIIRecord, FetchLog } from './database'
import { breezeAPI } from './breeze-api'
import { format, isWeekend, getDay } from 'date-fns'

export interface FIIDIIRawData {
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

export class FIIDIIDataFetcher {
  private db: FIIDIIDatabase
  private sources: DataSource[]

  constructor() {
    this.db = new FIIDIIDatabase()
    this.sources = [
      new BreezeDataSource(),
      new NSEDataSource(),
      new MoneyControlDataSource(), 
      new BSEDataSource(),
      new SEBIDataSource()
    ]
  }

  // Main method to fetch and store data
  async fetchAndStoreData(targetDate?: Date): Promise<{ success: boolean; message: string; recordsProcessed: number }> {
    const startTime = Date.now()
    const fetchDate = targetDate || new Date()
    
    // Don't fetch data for weekends
    if (isWeekend(fetchDate)) {
      return {
        success: false,
        message: 'Cannot fetch data for weekends',
        recordsProcessed: 0
      }
    }

    const dateString = format(fetchDate, 'yyyy-MM-dd')
    let recordsProcessed = 0
    let lastError: string | null = null
    
    console.log(`Starting FII DII data fetch for ${dateString}`)

    // Try each data source until we get successful data
    for (const source of this.sources) {
      try {
        console.log(`Attempting to fetch from ${source.getName()}`)
        
        const rawData = await source.fetchData(dateString)
        if (rawData) {
          // Convert and store the data
          const record = this.convertToRecord(rawData, fetchDate)
          await this.db.upsertFIIDIIData(record)
          recordsProcessed = 1
          
          // Log successful fetch
          await this.logFetchOperation({
            scheduledTime: fetchDate,
            executionTime: new Date(),
            status: 'SUCCESS',
            recordsProcessed,
            dataSource: source.getName(),
            executionDurationMs: Date.now() - startTime
          })

          console.log(`Successfully fetched and stored data from ${source.getName()}`)
          return {
            success: true,
            message: `Data successfully fetched from ${source.getName()}`,
            recordsProcessed
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`Failed to fetch from ${source.getName()}: ${lastError}`)
        continue
      }
    }

    // If all sources failed, log the failure
    await this.logFetchOperation({
      scheduledTime: fetchDate,
      executionTime: new Date(),
      status: 'FAILED',
      recordsProcessed: 0,
      errorMessage: lastError || 'All data sources failed',
      dataSource: 'ALL_SOURCES',
      executionDurationMs: Date.now() - startTime
    })

    return {
      success: false,
      message: `Failed to fetch data from all sources. Last error: ${lastError}`,
      recordsProcessed: 0
    }
  }

  // Convert raw data to database record format
  private convertToRecord(rawData: FIIDIIRawData, date: Date): FIIDIIRecord {
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek: getDay(date) || 7, // Sunday = 0, convert to 7
      fiiBuyAmount: rawData.fii.buy,
      fiiSellAmount: rawData.fii.sell,
      fiiNetAmount: rawData.fii.net,
      diiBuyAmount: rawData.dii.buy,
      diiSellAmount: rawData.dii.sell,
      diiNetAmount: rawData.dii.net,
      totalNetFlow: rawData.fii.net + rawData.dii.net,
      dataSource: rawData.source,
      isVerified: true, // Mark as verified since it's from official sources
    }
  }

  private async logFetchOperation(log: Omit<FetchLog, 'id'>): Promise<void> {
    try {
      await this.db.logFetchOperation(log as FetchLog)
    } catch (error) {
      console.error('Failed to log fetch operation:', error)
    }
  }

  // Get stored data for API responses
  async getStoredData(startDate: string, endDate: string): Promise<FIIDIIRecord[]> {
    return await this.db.getFIIDIIData(startDate, endDate)
  }

  // Manual data entry (for admin interface)
  async manualDataEntry(data: Omit<FIIDIIRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      await this.db.upsertFIIDIIData(data)
      console.log(`Manually entered data for ${data.date}`)
      return true
    } catch (error) {
      console.error('Failed to manually enter data:', error)
      return false
    }
  }
}

// Abstract data source interface
abstract class DataSource {
  abstract getName(): string
  abstract fetchData(date: string): Promise<FIIDIIRawData | null>
  
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const defaultOptions: RequestInit = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal,
      ...options
    }
    
    try {
      const response = await fetch(url, defaultOptions)
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }
}

// Breeze API Data Source (Primary)
class BreezeDataSource extends DataSource {
  getName(): string {
    return 'Breeze_API'
  }

  async fetchData(date: string): Promise<FIIDIIRawData | null> {
    try {
      console.log(`Fetching FII DII data from Breeze API for ${date}`)
      
      const breezeData = await breezeAPI.getFIIDIIData(date)
      
      if (breezeData) {
        return {
          date,
          fii: {
            buy: breezeData.fii_buy,
            sell: breezeData.fii_sell,
            net: breezeData.fii_net
          },
          dii: {
            buy: breezeData.dii_buy,
            sell: breezeData.dii_sell,
            net: breezeData.dii_net
          },
          source: this.getName()
        }
      }
      
      return null
    } catch (error) {
      console.error('Breeze API FII DII fetch error:', error)
      return null
    }
  }
}

// NSE Official Data Source
class NSEDataSource extends DataSource {
  getName(): string {
    return 'NSE_Official'
  }

  async fetchData(date: string): Promise<FIIDIIRawData | null> {
    try {
      // NSE API endpoint for FII DII data
      const url = `https://www.nseindia.com/api/fiidiiTradeReact`
      
      const response = await this.makeRequest(url)
      
      if (!response.ok) {
        throw new Error(`NSE API responded with status ${response.status}`)
      }
      
      const data = await response.json()
      
      // Parse NSE response format
      if (data && data.data && Array.isArray(data.data)) {
        const dayData = data.data.find((item: any) => 
          item.date && item.date.includes(date.replace(/-/g, ''))
        )
        
        if (dayData) {
          return {
            date,
            fii: {
              buy: parseFloat(dayData.fiiBuy || 0),
              sell: parseFloat(dayData.fiiSell || 0), 
              net: parseFloat(dayData.fiiNet || 0)
            },
            dii: {
              buy: parseFloat(dayData.diiBuy || 0),
              sell: parseFloat(dayData.diiSell || 0),
              net: parseFloat(dayData.diiNet || 0)
            },
            source: this.getName()
          }
        }
      }
      
      return null
    } catch (error) {
      console.error(`NSE fetch error:`, error)
      return null
    }
  }
}

// MoneyControl Data Source
class MoneyControlDataSource extends DataSource {
  getName(): string {
    return 'MoneyControl'
  }

  async fetchData(date: string): Promise<FIIDIIRawData | null> {
    try {
      // MoneyControl doesn't have a direct API, but we can scrape their FII DII page
      // For production, you'd need to implement web scraping or find their internal API
      console.log('MoneyControl data source not yet implemented')
      return null
    } catch (error) {
      console.error(`MoneyControl fetch error:`, error)
      return null
    }
  }
}

// BSE Data Source
class BSEDataSource extends DataSource {
  getName(): string {
    return 'BSE_Data'
  }

  async fetchData(date: string): Promise<FIIDIIRawData | null> {
    try {
      // BSE API endpoint (if available)
      console.log('BSE data source not yet implemented')
      return null
    } catch (error) {
      console.error(`BSE fetch error:`, error)
      return null
    }
  }
}

// SEBI Data Source
class SEBIDataSource extends DataSource {
  getName(): string {
    return 'SEBI_Data'
  }

  async fetchData(date: string): Promise<FIIDIIRawData | null> {
    try {
      // SEBI publishes data but not via API - would need scraping
      console.log('SEBI data source not yet implemented')
      return null
    } catch (error) {
      console.error(`SEBI fetch error:`, error)
      return null
    }
  }
}

// Singleton instance
export const fiidiiDataFetcher = new FIIDIIDataFetcher()

// Utility function to get latest data for a period
export async function getLatestFIIDIIData(days: number = 30): Promise<FIIDIIRecord[]> {
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(new Date(Date.now() - days * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  
  return await fiidiiDataFetcher.getStoredData(startDate, endDate)
}