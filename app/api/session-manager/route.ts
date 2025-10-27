import { NextRequest, NextResponse } from 'next/server'
import { getProductionBreezeManager } from '@/lib/production-breeze-manager'

export async function GET(request: NextRequest) {
  try {
    const manager = getProductionBreezeManager()
    const status = manager.getSessionStatus()
    
    const response = {
      session: {
        active: status.hasSession,
        valid: status.isValid,
        expiresIn: status.expiresIn ? Math.round(status.expiresIn / 1000) : null, // seconds
        expiresAt: status.expiresAt,
        timeToExpiry: status.expiresIn ? formatDuration(status.expiresIn) : null
      },
      configuration: {
        api_key: !!process.env.BREEZE_API_KEY,
        api_secret: !!process.env.BREEZE_API_SECRET,
        user_id: !!process.env.BREEZE_USER_ID,
        password: !!process.env.BREEZE_PASSWORD,
        session_token: !!process.env.BREEZE_SESSION_TOKEN
      },
      status: status.isValid ? 'active' : 'needs_refresh',
      lastChecked: new Date().toISOString()
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check session status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionToken } = body

    const manager = getProductionBreezeManager()

    if (action === 'refresh') {
      console.log('🔄 Manual session refresh requested')
      const newSession = await manager.getValidSession()
      
      if (newSession) {
        return NextResponse.json({
          success: true,
          message: 'Session refreshed successfully',
          sessionActive: true
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Session refresh failed',
          sessionActive: false
        }, { status: 400 })
      }
    }

    if (action === 'update' && sessionToken) {
      console.log('🔄 Manual session update requested')
      manager.updateSessionToken(sessionToken)
      
      return NextResponse.json({
        success: true,
        message: 'Session token updated successfully',
        sessionActive: true
      })
    }

    return NextResponse.json({
      error: 'Invalid action. Use "refresh" or "update"'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process session action',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else {
    return `${minutes}m`
  }
}