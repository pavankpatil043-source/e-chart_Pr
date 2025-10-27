// API endpoint for FII DII data management and scheduler control
import { NextRequest, NextResponse } from 'next/server'
import { fiidiiScheduler } from '@/lib/fii-dii-scheduler'
import { fiidiiDataFetcher } from '@/lib/fii-dii-fetcher'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        // Get scheduler status
        const status = fiidiiScheduler.getStatus()
        return NextResponse.json({
          success: true,
          scheduler: status,
          timestamp: new Date().toISOString()
        })

      case 'logs':
        // Get recent fetch logs (this would require implementing log retrieval)
        return NextResponse.json({
          success: true,
          message: 'Log retrieval not yet implemented',
          logs: []
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: status, logs'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('FII DII admin API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'manual-fetch':
        // Trigger manual data fetch
        console.log('Manual FII DII data fetch requested')
        const fetchResult = await fiidiiScheduler.triggerManualFetch()
        
        return NextResponse.json({
          success: fetchResult.success,
          message: fetchResult.message,
          recordsProcessed: fetchResult.recordsProcessed,
          timestamp: new Date().toISOString()
        })

      case 'start-scheduler':
        // Start the scheduler
        fiidiiScheduler.start()
        
        return NextResponse.json({
          success: true,
          message: 'FII DII scheduler started',
          status: fiidiiScheduler.getStatus()
        })

      case 'stop-scheduler':
        // Stop the scheduler
        fiidiiScheduler.stop()
        
        return NextResponse.json({
          success: true,
          message: 'FII DII scheduler stopped',
          status: fiidiiScheduler.getStatus()
        })

      case 'update-config':
        // Update scheduler configuration
        try {
          const body = await request.json()
          fiidiiScheduler.updateConfig(body)
          
          return NextResponse.json({
            success: true,
            message: 'Scheduler configuration updated',
            config: fiidiiScheduler.getStatus().config
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'Invalid configuration data'
          }, { status: 400 })
        }

      case 'manual-entry':
        // Manual data entry
        try {
          const body = await request.json()
          const { date, fii, dii } = body
          
          if (!date || !fii || !dii) {
            return NextResponse.json({
              success: false,
              message: 'Missing required fields: date, fii, dii'
            }, { status: 400 })
          }
          
          const success = await fiidiiDataFetcher.manualDataEntry({
            date,
            dayOfWeek: new Date(date).getDay() || 7,
            fiiBuyAmount: fii.buy,
            fiiSellAmount: fii.sell,
            fiiNetAmount: fii.net,
            diiBuyAmount: dii.buy,
            diiSellAmount: dii.sell,
            diiNetAmount: dii.net,
            totalNetFlow: fii.net + dii.net,
            dataSource: 'MANUAL_ENTRY',
            isVerified: false // Manual entries need verification
          })
          
          return NextResponse.json({
            success,
            message: success ? 'Data entered successfully' : 'Failed to enter data'
          })
          
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'Invalid data format'
          }, { status: 400 })
        }

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Supported actions: manual-fetch, start-scheduler, stop-scheduler, update-config, manual-entry'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('FII DII admin API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS if needed
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}