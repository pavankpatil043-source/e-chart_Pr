export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ""

    let response = "I'm your trading assistant. How can I help you with stock analysis today?"

    // Simple response logic based on keywords
    if (lastMessage.includes("hi") || lastMessage.includes("hello")) {
      response =
        "Hello! I'm your trading assistant for Indian stock markets (NSE/BSE). I can help with stock analysis, market trends, and trading strategies. What would you like to know?"
    } else if (lastMessage.includes("price") || lastMessage.includes("stock")) {
      response =
        "I can help you analyze stock prices and trends. For real-time data, please check the charts above. What specific stock are you interested in?"
    } else if (lastMessage.includes("buy") || lastMessage.includes("sell")) {
      response =
        "For trading decisions, consider technical indicators, market trends, and risk management. Always do your own research and never invest more than you can afford to lose. What's your trading strategy?"
    } else if (lastMessage.includes("market") || lastMessage.includes("trend")) {
      response =
        "Market trends can be analyzed using the charts above. Look for support/resistance levels, volume patterns, and technical indicators. What timeframe are you analyzing?"
    } else {
      response =
        "I'm here to help with trading analysis, market trends, and stock research for Indian markets. Please feel free to ask specific questions about stocks, technical analysis, or trading strategies."
    }

    return Response.json({
      message: response,
      role: "assistant",
    })
  } catch (error) {
    console.error("Chat API error:", error)

    return Response.json({
      message: "I'm experiencing technical difficulties. Please try again in a moment.",
      role: "assistant",
    })
  }
}
