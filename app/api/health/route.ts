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
    external_apis: {
      yahoo_finance: "available" | "unavailable" | "unknown"
      nse: "available" | "unavailable" | "unknown"
      alpha_vantage: "available" | "unavailable" | "unknown"
    }
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
  performance: {
    response_time: number
    requests_per_minute: number
    error_rate: number
  }
}

// Cache for performance metrics
const performanceCache = {
  requests: 0,
  errors: 0,
  lastReset: Date.now(),
}

async function checkDatabaseConnection(): Promise<"connected" | "disconnected" | "unknown"> {
  try {
    // If DATABASE_URL is configured, attempt connection
    if (process.env.DATABASE_URL) {
      // This would be replaced with actual database connection check
      // For now, return unknown since we don't have a database configured
      return "unknown"
    }
    return "unknown"
  } catch (error) {
    console.error("Database health check failed:", error)
    return "disconnected"
  }
}

async function checkRedisConnection(): Promise<"connected" | "disconnected" | "unknown"> {
  try {
    // If REDIS_URL is configured, attempt connection
    if (process.env.REDIS_URL) {
      // This would be replaced with actual Redis connection check
      return "unknown"
    }
    return "unknown"
  } catch (error) {
    console.error("Redis health check failed:", error)
    return "disconnected"
  }
}

async function checkExternalAPI(url: string): Promise<"available" | "unavailable" | "unknown"> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "EChart-HealthCheck/1.0",
      },
    })

    clearTimeout(timeoutId)

    if (response.ok || response.status === 405) {
      // 405 Method Not Allowed is also OK
      return "available"
    }
    return "unavailable"
  } catch (error) {
    console.error(`External API health check failed for ${url}:`, error)
    return "unavailable"
  }
}

function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()

  return {
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    cpu: {
      usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to milliseconds
    },
    disk: {
      used: 0, // Would need additional library to get disk usage
      total: 0,
      percentage: 0,
    },
  }
}

function updatePerformanceMetrics(isError = false) {
  const now = Date.now()

  // Reset counters every minute
  if (now - performanceCache.lastReset > 60000) {
    performanceCache.requests = 0
    performanceCache.errors = 0
    performanceCache.lastReset = now
  }

  performanceCache.requests++
  if (isError) {
    performanceCache.errors++
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    updatePerformanceMetrics()

    // Check all services in parallel
    const [databaseStatus, redisStatus, yahooStatus, nseStatus, alphaVantageStatus] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
      checkExternalAPI("https://query1.finance.yahoo.com"),
      checkExternalAPI("https://www.nseindia.com"),
      checkExternalAPI("https://www.alphavantage.co"),
    ])

    const systemMetrics = getSystemMetrics()
    const responseTime = Date.now() - startTime

    // Calculate performance metrics
    const requestsPerMinute = performanceCache.requests
    const errorRate = performanceCache.requests > 0 ? (performanceCache.errors / performanceCache.requests) * 100 : 0

    // Determine overall health status
    let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy"

    // Check if any critical services are down
    if (databaseStatus === "disconnected" || redisStatus === "disconnected") {
      overallStatus = "unhealthy"
    } else if (
      yahooStatus === "unavailable" ||
      nseStatus === "unavailable" ||
      alphaVantageStatus === "unavailable" ||
      systemMetrics.memory.percentage > 90 ||
      errorRate > 5
    ) {
      overallStatus = "degraded"
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: databaseStatus,
        redis: redisStatus,
        external_apis: {
          yahoo_finance: yahooStatus,
          nse: nseStatus,
          alpha_vantage: alphaVantageStatus,
        },
      },
      system: systemMetrics,
      performance: {
        response_time: responseTime,
        requests_per_minute: requestsPerMinute,
        error_rate: Math.round(errorRate * 100) / 100,
      },
    }

    // Set appropriate HTTP status code
    const httpStatus = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    updatePerformanceMetrics(true)
    console.error("Health check error:", error)

    const errorResponse: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "unknown",
        redis: "unknown",
        external_apis: {
          yahoo_finance: "unknown",
          nse: "unknown",
          alpha_vantage: "unknown",
        },
      },
      system: getSystemMetrics(),
      performance: {
        response_time: Date.now() - startTime,
        requests_per_minute: performanceCache.requests,
        error_rate: 100,
      },
    }

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
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
