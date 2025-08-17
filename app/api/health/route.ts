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
  features: {
    live_data: boolean
    ai_chat: boolean
    notifications: boolean
    portfolio: boolean
    analytics: boolean
  }
}

// Mock function to check database connectivity
async function checkDatabase(): Promise<"connected" | "disconnected" | "unknown"> {
  try {
    // In a real application, you would check your database connection here
    // For now, we'll simulate based on environment variables
    if (process.env.DATABASE_URL) {
      // Simulate database check
      return "connected"
    }
    return "unknown"
  } catch (error) {
    console.error("Database health check failed:", error)
    return "disconnected"
  }
}

// Mock function to check Redis connectivity
async function checkRedis(): Promise<"connected" | "disconnected" | "unknown"> {
  try {
    // In a real application, you would check your Redis connection here
    if (process.env.REDIS_URL) {
      // Simulate Redis check
      return "connected"
    }
    return "unknown"
  } catch (error) {
    console.error("Redis health check failed:", error)
    return "disconnected"
  }
}

// Function to check external API availability
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

// Function to get system metrics
function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()

  return {
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    cpu: {
      usage: Math.round(Math.random() * 100), // Mock CPU usage
    },
    disk: {
      used: 1024, // Mock disk usage in MB
      total: 10240, // Mock total disk in MB
      percentage: 10,
    },
  }
}

// Function to get performance metrics
function getPerformanceMetrics() {
  return {
    response_time: Math.round(Math.random() * 100 + 50), // Mock response time in ms
    requests_per_minute: Math.round(Math.random() * 1000 + 100), // Mock RPM
    error_rate: Math.round(Math.random() * 5 * 100) / 100, // Mock error rate percentage
  }
}

// Function to get feature flags
function getFeatureFlags() {
  return {
    live_data: process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA === "true",
    ai_chat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true",
    notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
    portfolio: process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO === "true",
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check all services in parallel
    const [databaseStatus, redisStatus, nseStatus, yahooStatus, alphaVantageStatus] = await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkExternalAPI("https://www.nseindia.com"),
      checkExternalAPI("https://finance.yahoo.com"),
      checkExternalAPI("https://www.alphavantage.co"),
    ])

    const responseTime = Date.now() - startTime
    const systemMetrics = getSystemMetrics()
    const performanceMetrics = getPerformanceMetrics()
    const featureFlags = getFeatureFlags()

    // Determine overall health status
    let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy"

    if (databaseStatus === "disconnected" || redisStatus === "disconnected") {
      overallStatus = "unhealthy"
    } else if (
      nseStatus === "unavailable" ||
      yahooStatus === "unavailable" ||
      alphaVantageStatus === "unavailable" ||
      systemMetrics.memory.percentage > 90 ||
      performanceMetrics.error_rate > 5
    ) {
      overallStatus = "degraded"
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        database: databaseStatus,
        redis: redisStatus,
        external_apis: {
          nse: nseStatus,
          yahoo_finance: yahooStatus,
          alpha_vantage: alphaVantageStatus,
        },
      },
      system: systemMetrics,
      performance: {
        ...performanceMetrics,
        response_time: responseTime,
      },
      features: featureFlags,
    }

    // Set appropriate HTTP status code based on health
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
    console.error("Health check failed:", error)

    const errorHealthStatus: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
      system: getSystemMetrics(),
      performance: {
        response_time: Date.now() - startTime,
        requests_per_minute: 0,
        error_rate: 100,
      },
      features: getFeatureFlags(),
    }

    return NextResponse.json(errorHealthStatus, {
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
