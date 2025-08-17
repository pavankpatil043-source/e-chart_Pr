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
      nse_api: "available" | "unavailable" | "unknown"
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
  features: {
    live_data: boolean
    ai_chat: boolean
    notifications: boolean
    portfolio: boolean
  }
  performance: {
    response_time: number
    requests_per_minute: number
    error_rate: number
  }
}

// Simulate system metrics (in production, use actual system monitoring)
function getSystemMetrics() {
  const memoryUsage = process.memoryUsage()

  return {
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    },
    cpu: {
      usage: Math.round(Math.random() * 100), // Simulated CPU usage
    },
    disk: {
      used: 1024, // Simulated disk usage in MB
      total: 10240, // Simulated total disk in MB
      percentage: 10,
    },
  }
}

// Check external API availability
async function checkExternalAPIs() {
  const apis = {
    yahoo_finance: "unknown" as const,
    nse_api: "unknown" as const,
  }

  try {
    // Check Yahoo Finance API (simulated)
    const yahooResponse = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })
    apis.yahoo_finance = yahooResponse.ok ? "available" : "unavailable"
  } catch {
    apis.yahoo_finance = "unavailable"
  }

  try {
    // Check NSE API availability (simulated)
    // In production, replace with actual NSE API endpoint
    apis.nse_api = "available" // Simulated as available
  } catch {
    apis.nse_api = "unavailable"
  }

  return apis
}

// Check database connectivity
async function checkDatabase() {
  try {
    // In production, implement actual database health check
    // Example: await db.raw('SELECT 1')
    return "connected" as const
  } catch {
    return "disconnected" as const
  }
}

// Check Redis connectivity
async function checkRedis() {
  try {
    // In production, implement actual Redis health check
    // Example: await redis.ping()
    return "connected" as const
  } catch {
    return "disconnected" as const
  }
}

// Get feature flags from environment
function getFeatureFlags() {
  return {
    live_data: process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA === "true",
    ai_chat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true",
    notifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
    portfolio: process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO === "true",
  }
}

// Calculate performance metrics
function getPerformanceMetrics() {
  return {
    response_time: Math.round(Math.random() * 100 + 50), // Simulated response time in ms
    requests_per_minute: Math.round(Math.random() * 1000 + 100), // Simulated RPM
    error_rate: Math.round(Math.random() * 5), // Simulated error rate percentage
  }
}

// Determine overall health status
function determineHealthStatus(
  services: HealthStatus["services"],
  system: HealthStatus["system"],
): HealthStatus["status"] {
  // Check if any critical services are down
  if (services.database === "disconnected") {
    return "unhealthy"
  }

  // Check system resources
  if (system.memory.percentage > 90 || system.cpu.usage > 95) {
    return "degraded"
  }

  // Check external APIs
  const externalApisDown = Object.values(services.external_apis).filter((status) => status === "unavailable").length
  if (externalApisDown >= 2) {
    return "degraded"
  }

  return "healthy"
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Gather all health information
    const [externalAPIs, databaseStatus, redisStatus] = await Promise.all([
      checkExternalAPIs(),
      checkDatabase(),
      checkRedis(),
    ])

    const systemMetrics = getSystemMetrics()
    const featureFlags = getFeatureFlags()
    const performanceMetrics = getPerformanceMetrics()

    const services = {
      database: databaseStatus,
      redis: redisStatus,
      external_apis: externalAPIs,
    }

    const healthStatus: HealthStatus = {
      status: determineHealthStatus(services, systemMetrics),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services,
      system: systemMetrics,
      features: featureFlags,
      performance: {
        ...performanceMetrics,
        response_time: Date.now() - startTime,
      },
    }

    // Set appropriate HTTP status code based on health
    const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503

    return NextResponse.json(healthStatus, {
      status: statusCode,
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
          yahoo_finance: "unknown",
          nse_api: "unknown",
        },
      },
      system: {
        memory: { used: 0, total: 0, percentage: 0 },
        cpu: { usage: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
      },
      features: getFeatureFlags(),
      performance: {
        response_time: Date.now() - startTime,
        requests_per_minute: 0,
        error_rate: 100,
      },
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

// Handle HEAD requests for simple health checks
export async function HEAD() {
  try {
    const systemMetrics = getSystemMetrics()

    // Simple health check - just verify the service is responding
    if (systemMetrics.memory.percentage < 95) {
      return new NextResponse(null, { status: 200 })
    } else {
      return new NextResponse(null, { status: 503 })
    }
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
