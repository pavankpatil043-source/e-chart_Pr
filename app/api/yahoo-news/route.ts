import { NextResponse } from "next/server"

interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  sentiment: "positive" | "negative" | "neutral"
  category: string
  region: string
}

const generateIndianNews = (): NewsArticle[] => {
  const newsTemplates = [
    {
      title: "Nifty 50 Surges to Fresh All-Time High on Strong FII Inflows",
      summary:
        "Indian benchmark indices hit record levels as foreign institutional investors pump in ₹3,200 crores, boosting market sentiment across sectors.",
      source: "Economic Times",
      sentiment: "positive" as const,
      category: "Market",
      region: "National",
    },
    {
      title: "RBI Keeps Repo Rate Unchanged at 6.5%, Maintains Hawkish Stance",
      summary:
        "Reserve Bank of India maintains status quo on policy rates while signaling continued focus on inflation management and growth balance.",
      source: "Business Standard",
      sentiment: "neutral" as const,
      category: "Policy",
      region: "National",
    },
    {
      title: "Reliance Industries Q3 Earnings Beat Street Estimates",
      summary:
        "RIL reports 15% YoY growth in consolidated net profit driven by strong performance in petrochemicals and retail segments.",
      source: "Moneycontrol",
      sentiment: "positive" as const,
      category: "Earnings",
      region: "Maharashtra",
    },
    {
      title: "IT Stocks Under Pressure on US Client Spending Concerns",
      summary:
        "Major IT services companies including TCS, Infosys decline 2-4% amid worries over reduced technology spending by US clients.",
      source: "CNBC-TV18",
      sentiment: "negative" as const,
      category: "Technology",
      region: "Karnataka",
    },
    {
      title: "Banking Sector Shows Resilience with Strong NII Growth",
      summary:
        "Private sector banks report robust net interest income growth in Q3, with HDFC Bank and ICICI Bank leading the charge.",
      source: "Mint",
      sentiment: "positive" as const,
      category: "Banking",
      region: "National",
    },
    {
      title: "Auto Sector Rally Continues on Festive Season Demand",
      summary:
        "Automobile manufacturers gain 3-6% as October sales numbers exceed expectations, driven by strong rural demand.",
      source: "BloombergQuint",
      sentiment: "positive" as const,
      category: "Automotive",
      region: "National",
    },
    {
      title: "Crude Oil Price Volatility Impacts OMC Stocks",
      summary:
        "Oil marketing companies face margin pressure as Brent crude touches $87/barrel, affecting refining margins.",
      source: "Reuters India",
      sentiment: "negative" as const,
      category: "Energy",
      region: "National",
    },
    {
      title: "Pharma Exports Surge 18% in H1FY24 on Global Demand",
      summary:
        "Indian pharmaceutical companies benefit from strong international demand, with generic drug exports leading growth.",
      source: "Financial Express",
      sentiment: "positive" as const,
      category: "Pharmaceuticals",
      region: "National",
    },
    {
      title: "Gujarat Chemical Hub Reports Strong Quarterly Performance",
      summary:
        "Chemical companies in Gujarat industrial belt report improved margins and capacity utilization in Q3 results.",
      source: "Chemical Weekly",
      sentiment: "positive" as const,
      category: "Chemicals",
      region: "Gujarat",
    },
    {
      title: "Tamil Nadu Textile Industry Faces Export Headwinds",
      summary:
        "Textile manufacturers in Tirupur and Coimbatore report challenges due to rising cotton prices and global demand slowdown.",
      source: "Textile Today",
      sentiment: "negative" as const,
      category: "Textiles",
      region: "Tamil Nadu",
    },
  ]

  return newsTemplates.map((template, index) => ({
    id: `news-${Date.now()}-${index}`,
    ...template,
    url: `https://example.com/news/${index}`,
    publishedAt: new Date(Date.now() - Math.random() * 3600000 * 6).toISOString(), // Random time within last 6 hours
  }))
}

export async function GET() {
  try {
    // Generate fresh Indian market news
    const articles = generateIndianNews()
      .sort(() => Math.random() - 0.5) // Shuffle articles
      .slice(0, 8) // Return 8 articles

    return NextResponse.json({
      success: true,
      articles,
      timestamp: Date.now(),
      source: "Indian Market News Aggregator",
      totalResults: articles.length,
    })
  } catch (error) {
    console.error("Error generating news:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch news",
        articles: [],
      },
      { status: 500 },
    )
  }
}
