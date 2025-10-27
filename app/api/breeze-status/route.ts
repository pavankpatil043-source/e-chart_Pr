import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const hasApiKey = !!process.env.BREEZE_API_KEY
    const hasApiSecret = !!process.env.BREEZE_API_SECRET
    const hasSessionToken = !!process.env.BREEZE_SESSION_TOKEN

    const status = {
      configuration: {
        api_key: hasApiKey ? '✅ Configured' : '❌ Missing',
        api_secret: hasApiSecret ? '✅ Configured' : '❌ Missing',
        session_token: hasSessionToken ? '✅ Configured' : '❌ Missing - REQUIRED',
      },
      setup_complete: hasApiKey && hasApiSecret && hasSessionToken,
      next_steps: [] as string[]
    }

    if (!hasApiKey) {
      status.next_steps.push('Add BREEZE_API_KEY to .env.local')
    }
    if (!hasApiSecret) {
      status.next_steps.push('Add BREEZE_API_SECRET to .env.local')
    }
    if (!hasSessionToken) {
      status.next_steps.push('Get session token from: https://api.icicidirect.com/apiuser/login?api_key=' + encodeURIComponent(process.env.BREEZE_API_KEY || ''))
      status.next_steps.push('Add BREEZE_SESSION_TOKEN to .env.local')
      status.next_steps.push('Visit /breeze-setup.html for step-by-step instructions')
    }

    if (status.setup_complete) {
      status.next_steps.push('🎉 Breeze API is ready! Test with /api/live-fii-dii')
    }

    return NextResponse.json(status, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check Breeze API status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}