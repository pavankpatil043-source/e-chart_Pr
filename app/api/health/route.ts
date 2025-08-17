import { type NextRequest, NextResponse } from "next/server"

interface HealthStatus {
  status: "healthy" | "unhealthy"
  timestamp: string
  uptime: number
  environment: string
  version: string
  services: {
    database: "connected" | "disconnected" | "not_configured"
    redis: "connected" | "disconnected" | "not_configured"
    external_apis: "operational" | "degraded" | "down"
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

// Simple in-memory metrics (in production, use Redis or database)
let requestCount = 0
let errorCount = 0
const startTime = Date.now()

export async function GET(request: NextRequest) {
  const start = Date.now()
  requestCount++

  try {
    // Get system information
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    // Check external services
    const servicesStatus = await checkServices()

    // Calculate performance metrics
    const responseTime = Date.now() - start
    const requestsPerMinute = Math.round((requestCount / (uptime / 60)) * 100) / 100
    const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0

    const healthStatus: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      services: servicesStatus,
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        cpu: {
          usage: await getCPUUsage(),
        },
        disk: {
          used: 0, // Would need fs.statSync in real implementation
          total: 0,
          percentage: 0,
        },
      },
      performance: {
        response_time: responseTime,
        requests_per_minute: requestsPerMinute,
        error_rate: Math.round(errorRate * 100) / 100,
      },
    }

    // Determine overall health status
    if (
      servicesStatus.external_apis === "down" ||
      healthStatus.system.memory.percentage > 90 ||
      healthStatus.system.cpu.usage > 90 ||
      errorRate > 10
    ) {
      healthStatus.status = "unhealthy"
    }

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    errorCount++
    console.error("Health check error:", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        uptime: process.uptime(),
      },
      { status: 503 },
    )
  }
}

async function checkServices() {
  const services = {
    database: "not_configured" as const,
    redis: "not_configured" as const,
    external_apis: "operational" as const,
  }

  // Check database connection
  if (process.env.DATABASE_URL) {
    try {
      // In a real app, you'd check actual database connection
      services.database = "connected"
    } catch {
      services.database = "disconnected"
    }
  }

  // Check Redis connection
  if (process.env.REDIS_URL) {
    try {
      // In a real app, you'd check actual Redis connection
      services.redis = "connected"
    } catch {
      services.redis = "disconnected"
    }
  }

  // Check external APIs
  try {
    // Test a simple external API call
    const response = await fetch("https://httpstat.us/200", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      services.external_apis = "degraded"
    }
  } catch {
    services.external_apis = "down"
  }

  return services
}

async function getCPUUsage(): Promise<number> {
  // Simple CPU usage calculation
  // In production, you might want to use a more sophisticated method
  const startUsage = process.cpuUsage()

  return new Promise((resolve) => {
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage)
      const totalUsage = endUsage.user + endUsage.system
      const percentage = (totalUsage / 1000000) * 100 // Convert to percentage
      resolve(Math.min(Math.round(percentage * 100) / 100, 100))
    }, 100)
  })
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
