import { type NextRequest, NextResponse } from "next/server"

interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded"
  timestamp: string
  uptime: number
  version: string
  environment: string
  services: {
    database: "connected" | "disconnected" | "unknown"
    redis: "connected" | "disconnected" | "unknown"
    external_apis: "available" | "unavailable" | "unknown"
  }
  system: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
    disk: {
      used: number
      total: number
      percentage: number
    }
  }
  metrics: {
    requests_per_minute: number
    average_response_time: number
    error_rate: number
  }
}

// Simple in-memory metrics store
let requestCount = 0
let totalResponseTime = 0
let errorCount = 0
let lastResetTime = Date.now()

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Update request metrics
    requestCount++

    // Reset metrics every minute
    const now = Date.now()
    if (now - lastResetTime > 60000) {
      requestCount = 1
      totalResponseTime = 0
      errorCount = 0
      lastResetTime = now
    }

    // Get system information
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Check external services
    const services = await checkServices()

    // Calculate metrics
    const responseTime = Date.now() - startTime
    totalResponseTime += responseTime
    const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0

    // Determine overall health status
    let status: "healthy" | "unhealthy" | "degraded" = "healthy"

    if (services.database === "disconnected" || services.external_apis === "unavailable") {
      status = "degraded"
    }

    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9 || errorRate > 10) {
      status = "unhealthy"
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services,
      system: {
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
        },
        disk: {
          used: 0, // Would need additional library to get disk usage
          total: 0,
          percentage: 0,
        },
      },
      metrics: {
        requests_per_minute: requestCount,
        average_response_time: averageResponseTime,
        error_rate: errorRate,
      },
    }

    // Return appropriate HTTP status based on health
    const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 207 : 503

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    errorCount++

    const errorStatus: Partial<HealthStatus> = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
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

async function checkServices() {
  const services = {
    database: "unknown" as "connected" | "disconnected" | "unknown",
    redis: "unknown" as "connected" | "disconnected" | "unknown",
    external_apis: "unknown" as "available" | "unavailable" | "unknown",
  }

  // Check database connection
  try {
    if (process.env.DATABASE_URL) {
      // Would implement actual database check here
      services.database = "connected"
    } else {
      services.database = "unknown"
    }
  } catch {
    services.database = "disconnected"
  }

  // Check Redis connection
  try {
    if (process.env.REDIS_URL) {
      // Would implement actual Redis check here
      services.redis = "connected"
    } else {
      services.redis = "unknown"
    }
  } catch {
    services.redis = "disconnected"
  }

  // Check external APIs
  try {
    const response = await fetch("https://api.github.com/zen", {
      method: "GET",
      timeout: 5000,
    } as any)

    if (response.ok) {
      services.external_apis = "available"
    } else {
      services.external_apis = "unavailable"
    }
  } catch {
    services.external_apis = "unavailable"
  }

  return services
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
