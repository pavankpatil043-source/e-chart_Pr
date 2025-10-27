import { type NextRequest, NextResponse } from "next/server"

interface Message {
  role: "user" | "assistant"
  content: string
}

const TRADING_RESPONSES = [
  "Based on current market trends, I'd recommend focusing on technical analysis patterns like support and resistance levels.",
  "The NSE data shows strong momentum in banking stocks. Consider monitoring HDFC Bank and ICICI Bank for potential opportunities.",
  "Market volatility is currently elevated. Risk management through proper position sizing is crucial in this environment.",
  "The recent FII inflows suggest positive sentiment. However, keep an eye on global cues and crude oil prices.",
  "Technical indicators like RSI and MACD can provide valuable insights for entry and exit points in your trades.",
  "Current market conditions favor a cautious approach. Consider using stop-losses and taking partial profits.",
  "The IT sector is showing mixed signals. Monitor US market conditions as they significantly impact Indian IT stocks.",
  "Sectoral rotation is evident in the current market. Diversification across sectors can help manage risk.",
]

function generateTradingResponse(userMessage: string): string {
  const message = userMessage.toLowerCase()

  if (message.includes("reliance") || message.includes("ril")) {
    return "Reliance Industries is showing strong fundamentals with its diversified business model. The stock has good support around ₹2,400 levels. Monitor oil prices and retail segment performance for directional moves."
  }

  if (message.includes("tcs") || message.includes("infosys") || message.includes("it")) {
    return "IT stocks are currently facing headwinds due to US recession fears. However, companies with strong digital transformation capabilities like TCS and Infosys may outperform. Watch for Q3 earnings guidance."
  }

  if (message.includes("bank") || message.includes("hdfc") || message.includes("icici")) {
    return "Banking stocks are benefiting from strong credit growth and improving asset quality. HDFC Bank and ICICI Bank show good technical setups. Monitor RBI policy decisions and NIM trends."
  }

  if (message.includes("nifty") || message.includes("market") || message.includes("index")) {
    return "Nifty is trading near all-time highs with strong FII support. Key resistance at 19,900 and support at 19,600. Global cues and earnings season will drive near-term direction."
  }

  if (message.includes("buy") || message.includes("sell") || message.includes("trade")) {
    return "For any trading decision, consider: 1) Technical levels (support/resistance), 2) Volume confirmation, 3) Risk-reward ratio, 4) Market sentiment. Always use stop-losses and position sizing."
  }

  if (message.includes("analysis") || message.includes("technical")) {
    return "Technical analysis involves studying price patterns, volume, and indicators. Key tools include moving averages, RSI, MACD, and support/resistance levels. Combine with fundamental analysis for better decisions."
  }

  // Return a random trading-related response for other queries
  return TRADING_RESPONSES[Math.floor(Math.random() * TRADING_RESPONSES.length)]
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]

    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "Last message must be from user" }, { status: 400 })
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000))

    const response = generateTradingResponse(lastMessage.content)

    return NextResponse.json({
      content: response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
