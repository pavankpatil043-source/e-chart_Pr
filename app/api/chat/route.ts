import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Generate contextual response based on message content
    let response = ""
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("nifty") || lowerMessage.includes("index")) {
      response = `📊 **Nifty 50 Analysis**

Current Level: 24,850.25 (+125.50, +0.51%)

**Technical Outlook:**
• Support: 24,700 | 24,550
• Resistance: 24,950 | 25,100
• RSI: 58.2 (Neutral-Bullish)
• MACD: Positive crossover

**Market View:** Bullish momentum with good volume support. Breakout above 24,950 could target 25,100 levels.`
    } else if (lowerMessage.includes("stock") || lowerMessage.includes("buy")) {
      response = `💎 **Top Stock Picks**

**Large Cap:**
• TCS - ₹4,156 (Target: ₹4,350)
• HDFC Bank - ₹1,678 (Target: ₹1,750)
• Reliance - ₹2,387 (Target: ₹2,450)

**Mid Cap:**
• Bajaj Finance - ₹6,845
• Asian Paints - ₹2,934

**Sectors to Watch:** Banking, IT, Auto showing strength.`
    } else if (lowerMessage.includes("market") || lowerMessage.includes("sentiment")) {
      response = `📈 **Market Sentiment**

**Overall:** BULLISH 🟢

**Key Factors:**
• FII Buying: ₹2,340 Cr
• DII Support: ₹1,890 Cr
• VIX: 13.45 (-8.2%)
• Advance/Decline: 1.5x

**Outlook:** Positive momentum expected to continue with selective stock picking opportunities.`
    } else {
      response = `I'm your Indian Stock Market AI Assistant! 🇮🇳

I can help you with:
📊 Market analysis (Nifty, Sensex, sectors)
📈 Stock recommendations and targets
📰 Market news and sentiment
💡 Trading strategies and insights

What would you like to know about the Indian markets today?`
    }

    return NextResponse.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ success: false, error: "Failed to process chat message" }, { status: 500 })
  }
}
