import { type NextRequest, NextResponse } from "next/server"

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded"
  timestamp: string
  version: string
  uptime: number
  environment: string
  services: {
    database: "connected" | "disconnected" | "unknown"
    cache: "connected" | "disconnected" | "unknown"
    external_apis: "available" | "unavailable" | "unknown"
  }
  performance: {
    memory_usage: number
    cpu_usage: number
    response_time: number
  }
  features: {
    live_data: boolean
    ai_chat: boolean
    notifications: boolean
    portfolio: boolean
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get system information
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Check environment variables
    const environment = process.env.NODE_ENV || "development"
    const version = process.env.npm_package_version || "1.0.0"

    // Feature flags
    const features = {
      live_data: process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA === "true",
      ai_chat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true",
      notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
      portfolio: process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO === "true",
    }

    // Check external services (simplified)
    const services = {
      database: "unknown" as const,
      cache: "unknown" as const,
      external_apis: "available" as const,
    }

    // Calculate performance metrics
    const responseTime = Date.now() - startTime
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)

    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version,
      uptime: Math.round(uptime),
      environment,
      services,
      performance: {
        memory_usage: memoryUsageMB,
        cpu_usage: 0, // Simplified - would need additional monitoring
        response_time: responseTime,
      },
      features,
    }

    // Determine overall health status
    if (responseTime > 1000) {
      healthStatus.status = "degraded"
    }

    if (memoryUsageMB > 512) {
      healthStatus.status = "degraded"
    }

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Health check failed:", error)

    const errorStatus: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: 0,
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "disconnected",
        cache: "disconnected",
        external_apis: "unavailable",
      },
      performance: {
        memory_usage: 0,
        cpu_usage: 0,
        response_time: Date.now() - startTime,
      },
      features: {
        live_data: false,
        ai_chat: false,
        notifications: false,
        portfolio: false,
      },
    }

    return NextResponse.json(errorStatus, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}

export async function HEAD(request: NextRequest) {
  // Simple health check for load balancers
  return new NextResponse(null, { status: 200 })
}
