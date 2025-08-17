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
      nse: "available" | "unavailable" | "unknown"
      yahoo_finance: "available" | "unavailable" | "unknown"
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
let performanceCache = {
  requests: 0,
  errors: 0,
  lastReset: Date.now(),
}

// Helper function to check external API status
async function checkExternalAPI(url: string, timeout = 5000): Promise<"available" | "unavailable"> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok ? "available" : "unavailable"
  } catch (error) {
    return "unavailable"
  }
}

// Helper function to get system metrics
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
      usage: Math.round((cpuUsage.user + cpuUsage.system) / 1000000), // Convert to percentage approximation
    },
    disk: {
      used: 0, // Would need additional library for disk usage
      total: 0,
      percentage: 0,
    },
  }
}

// Helper function to calculate performance metrics
function getPerformanceMetrics() {
  const now = Date.now()
  const timeDiff = now - performanceCache.lastReset
  const minutesDiff = timeDiff / (1000 * 60)

  // Reset cache every hour
  if (timeDiff > 3600000) {
    performanceCache = {
      requests: 0,
      errors: 0,
      lastReset: now,
    }
  }

  return {
    response_time: Math.random() * 100 + 50, // Simulated response time
    requests_per_minute: minutesDiff > 0 ? Math.round(performanceCache.requests / minutesDiff) : 0,
    error_rate: performanceCache.requests > 0 ? (performanceCache.errors / performanceCache.requests) * 100 : 0,
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Increment request counter
    performanceCache.requests++

    // Check external APIs in parallel
    const [nseStatus, yahooStatus, alphaVantageStatus] = await Promise.allSettled([
      checkExternalAPI("https://www.nseindia.com"),
      checkExternalAPI("https://finance.yahoo.com"),
      checkExternalAPI("https://www.alphavantage.co"),
    ])

    // Get system metrics
    const systemMetrics = getSystemMetrics()
    const performanceMetrics = getPerformanceMetrics()

    // Determine overall health status
    const externalAPIsHealthy =
      [nseStatus, yahooStatus, alphaVantageStatus].filter(
        (result) => result.status === "fulfilled" && result.value === "available",
      ).length >= 2

    const memoryHealthy = systemMetrics.memory.percentage < 90
    const overallHealthy = externalAPIsHealthy && memoryHealthy

    const healthStatus: HealthStatus = {
      status: overallHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "unknown", // Would check actual database connection
        redis: "unknown", // Would check actual Redis connection
        external_apis: {
          nse: nseStatus.status === "fulfilled" ? nseStatus.value : "unknown",
          yahoo_finance: yahooStatus.status === "fulfilled" ? yahooStatus.value : "unknown",
          alpha_vantage: alphaVantageStatus.status === "fulfilled" ? alphaVantageStatus.value : "unknown",
        },
      },
      system: systemMetrics,
      performance: {
        ...performanceMetrics,
        response_time: Date.now() - startTime,
      },
    }

    // Return appropriate status code
    const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 207 : 503

    return NextResponse.json(healthStatus, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    performanceCache.errors++

    const errorStatus: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: "unknown",
        redis: "unknown",
        external_apis: {
          nse: "unknown",
          yahoo_finance: "unknown",
          alpha_vantage: "unknown",
        },
      },
      system: {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
      },
      performance: {
        response_time: Date.now() - startTime,
        requests_per_minute: 0,
        error_rate: 100,
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

// Handle HEAD requests for simple health checks
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}
