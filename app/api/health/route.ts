import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()

    // Basic system information
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || "development",
    }

    // Check external API connectivity
    const externalChecks = await Promise.allSettled([
      // Yahoo Finance API check
      fetch("https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS", {
        method: "GET",
        headers: { "User-Agent": "EChart-Trading-Platform" },
        signal: AbortSignal.timeout(5000),
      }).then((res) => ({ yahoo: res.ok })),

      // NSE API check (mock endpoint)
      fetch("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050", {
        method: "GET",
        headers: { "User-Agent": "EChart-Trading-Platform" },
        signal: AbortSignal.timeout(5000),
      }).then((res) => ({ nse: res.ok })),
    ])

    const apiStatus = externalChecks.reduce(
      (acc, result) => {
        if (result.status === "fulfilled") {
          return { ...acc, ...result.value }
        }
        return acc
      },
      { yahoo: false, nse: false },
    )

    // Performance metrics
    const responseTime = Date.now() - startTime

    // Health status determination
    const isHealthy = responseTime < 1000 && systemInfo.memory.heapUsed < 500 * 1024 * 1024 // 500MB

    const healthData = {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: systemInfo.timestamp,
      version: "1.0.0",
      environment: systemInfo.env,
      system: {
        uptime: systemInfo.uptime,
        nodeVersion: systemInfo.nodeVersion,
        platform: systemInfo.platform,
        arch: systemInfo.arch,
        pid: systemInfo.pid,
        memory: {
          used: Math.round(systemInfo.memory.heapUsed / 1024 / 1024), // MB
          total: Math.round(systemInfo.memory.heapTotal / 1024 / 1024), // MB
          external: Math.round(systemInfo.memory.external / 1024 / 1024), // MB
        },
      },
      performance: {
        responseTime: `${responseTime}ms`,
        memoryUsage: `${Math.round((systemInfo.memory.heapUsed / systemInfo.memory.heapTotal) * 100)}%`,
      },
      external: {
        apis: apiStatus,
        database: "not_configured", // Would check database if configured
        cache: "not_configured", // Would check Redis if configured
      },
      features: {
        liveData: process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA === "true",
        aiChat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true",
        notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
        portfolio: process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO === "true",
      },
    }

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Health check error:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      },
    )
  }
}

// Support HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}
