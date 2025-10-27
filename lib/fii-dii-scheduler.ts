// FII DII Data Scheduler Service
// Handles automatic data fetching at 7 PM IST on weekdays

import { fiidiiDataFetcher } from './fii-dii-fetcher'
import { format, isWeekend, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns'

export interface SchedulerConfig {
  targetHour: number // 19 for 7 PM
  targetMinute: number // 0 for exact hour
  timezone: string // 'Asia/Kolkata' for IST
  retryAttempts: number
  retryDelayMinutes: number
  enableWeekdaysOnly: boolean
}

export class FIIDIIScheduler {
  private isRunning: boolean = false
  private timeoutId: NodeJS.Timeout | null = null
  private config: SchedulerConfig
  
  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      targetHour: 19, // 7 PM
      targetMinute: 0,
      timezone: 'Asia/Kolkata',
      retryAttempts: 3,
      retryDelayMinutes: 15,
      enableWeekdaysOnly: true,
      ...config
    }
  }

  // Start the scheduler
  start(): void {
    if (this.isRunning) {
      console.log('FII DII Scheduler is already running')
      return
    }

    this.isRunning = true
    console.log(`Starting FII DII Scheduler for ${this.config.targetHour}:${this.config.targetMinute.toString().padStart(2, '0')} IST`)
    
    this.scheduleNextExecution()
  }

  // Stop the scheduler
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    
    this.isRunning = false
    console.log('FII DII Scheduler stopped')
  }

  // Get current scheduler status
  getStatus(): { isRunning: boolean; nextExecution: Date | null; config: SchedulerConfig } {
    return {
      isRunning: this.isRunning,
      nextExecution: this.getNextExecutionTime(),
      config: this.config
    }
  }

  // Calculate next execution time
  private getNextExecutionTime(): Date {
    const now = new Date()
    const istNow = this.convertToIST(now)
    
    // Set target time for today
    let targetTime = setHours(
      setMinutes(
        setSeconds(
          setMilliseconds(istNow, 0), 
          0
        ), 
        this.config.targetMinute
      ), 
      this.config.targetHour
    )

    // If target time has passed for today, schedule for next day
    if (targetTime <= istNow) {
      targetTime = new Date(targetTime.getTime() + 24 * 60 * 60 * 1000)
    }

    // Skip weekends if configured
    if (this.config.enableWeekdaysOnly) {
      while (isWeekend(targetTime)) {
        targetTime = new Date(targetTime.getTime() + 24 * 60 * 60 * 1000)
      }
    }

    return targetTime
  }

  // Schedule the next execution
  private scheduleNextExecution(): void {
    if (!this.isRunning) return

    const nextExecution = this.getNextExecutionTime()
    const now = new Date()
    const delayMs = nextExecution.getTime() - now.getTime()

    console.log(`Next FII DII data fetch scheduled for: ${format(nextExecution, 'yyyy-MM-dd HH:mm:ss')} IST`)
    console.log(`Time until next execution: ${Math.round(delayMs / (1000 * 60))} minutes`)

    this.timeoutId = setTimeout(() => {
      this.executeFetch()
    }, delayMs)
  }

  // Execute the data fetch with retries
  private async executeFetch(): Promise<void> {
    console.log(`Executing scheduled FII DII data fetch at ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`)
    
    let attempt = 1
    let success = false

    while (attempt <= this.config.retryAttempts && !success && this.isRunning) {
      try {
        console.log(`Fetch attempt ${attempt}/${this.config.retryAttempts}`)
        
        const result = await fiidiiDataFetcher.fetchAndStoreData()
        
        if (result.success) {
          success = true
          console.log(`✅ FII DII data fetch successful: ${result.message}`)
          console.log(`📊 Records processed: ${result.recordsProcessed}`)
          
          // Send success notification (if needed)
          await this.sendNotification('SUCCESS', result.message, result.recordsProcessed)
        } else {
          console.warn(`❌ Fetch attempt ${attempt} failed: ${result.message}`)
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Fetch attempt ${attempt} error:`, errorMessage)
      }
      
      // Wait before retry (except for last attempt)
      if (!success && attempt < this.config.retryAttempts) {
        const delayMs = this.config.retryDelayMinutes * 60 * 1000
        console.log(`⏳ Waiting ${this.config.retryDelayMinutes} minutes before retry...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      
      attempt++
    }

    // If all retries failed, send failure notification
    if (!success) {
      const failureMessage = `Failed to fetch FII DII data after ${this.config.retryAttempts} attempts`
      console.error(`🚨 ${failureMessage}`)
      await this.sendNotification('FAILED', failureMessage, 0)
    }

    // Schedule next execution
    this.scheduleNextExecution()
  }

  // Convert date to IST
  private convertToIST(date: Date): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  }

  // Send notification (email, webhook, etc.)
  private async sendNotification(status: 'SUCCESS' | 'FAILED', message: string, recordsProcessed: number): Promise<void> {
    try {
      // This could be extended to send actual notifications
      const notificationData = {
        timestamp: new Date().toISOString(),
        status,
        message,
        recordsProcessed,
        service: 'FII_DII_Scheduler'
      }

      // For now, just log the notification
      console.log('📧 Notification:', JSON.stringify(notificationData, null, 2))

      // TODO: Implement actual notification sending
      // - Email notifications
      // - Slack/Discord webhooks  
      // - SMS alerts
      // - Database logging
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  // Manual trigger (for testing or admin interface)
  async triggerManualFetch(): Promise<{ success: boolean; message: string; recordsProcessed: number }> {
    console.log('🔧 Manual FII DII data fetch triggered')
    
    try {
      const result = await fiidiiDataFetcher.fetchAndStoreData()
      
      await this.sendNotification(
        result.success ? 'SUCCESS' : 'FAILED', 
        `Manual fetch: ${result.message}`, 
        result.recordsProcessed
      )
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Manual fetch error:', errorMessage)
      
      return {
        success: false,
        message: `Manual fetch failed: ${errorMessage}`,
        recordsProcessed: 0
      }
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('Scheduler configuration updated:', this.config)
    
    // Reschedule if running
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }
}

// Singleton instance
export const fiidiiScheduler = new FIIDIIScheduler()

// Auto-start scheduler in production
if (process.env.NODE_ENV === 'production') {
  fiidiiScheduler.start()
  console.log('🚀 FII DII Scheduler auto-started in production mode')
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    console.log('📤 Shutting down FII DII Scheduler...')
    fiidiiScheduler.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('📤 Shutting down FII DII Scheduler...')
    fiidiiScheduler.stop()
    process.exit(0)
  })
}