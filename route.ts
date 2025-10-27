import type { NextRequest } from "next/server"

type Out = { symbol: string; description?: string }[]

function sanitizeSymbol(sym: string) {
  return sym.replace(/(\.NS|\.BO)$/i, "").toUpperCase()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const exchange = (searchParams.get("exchange") || "NSE").toUpperCase()
  const key = process.env.FINNHUB_API_KEY

  if (key) {
    try {
      const url = `https://finnhub.io/api/v1/stock/symbol?exchange=${encodeURIComponent(exchange)}&token=${encodeURIComponent(
        key,
      )}`
      const r = await fetch(url, { cache: "no-store" })
      if (!r.ok) throw new Error("Bad response")
      const json = (await r.json()) as any[]
      const mapped: Out = json
        .map((it) => ({
          symbol: sanitizeSymbol(String(it.symbol ?? it.displaySymbol ?? "").toUpperCase()),
          description: typeof it.description === "string" ? it.description : undefined,
        }))
        .filter((x) => x.symbol && /^[A-Z0-9-]+$/.test(x.symbol))
      const seen = new Set<string>()
      const unique = mapped.filter((x) => {
        if (seen.has(x.symbol)) return false
        seen.add(x.symbol)
        return true
      })
      return Response.json(unique, { headers: { "Cache-Control": "no-store" } })
    } catch {
      // fall through to sample
    }
  }

  const sample: Out =
    exchange === "BSE"
      ? [
          { symbol: "RELIANCE", description: "Reliance Industries" },
          { symbol: "HDFCBANK", description: "HDFC Bank" },
          { symbol: "TCS", description: "Tata Consultancy Services" },
          { symbol: "INFY", description: "Infosys" },
          { symbol: "ITC", description: "ITC" },
        ]
      : [
          { symbol: "RELIANCE", description: "Reliance Industries" },
          { symbol: "HDFCBANK", description: "HDFC Bank" },
          { symbol: "TCS", description: "Tata Consultancy Services" },
          { symbol: "INFY", description: "Infosys" },
          { symbol: "ITC", description: "ITC" },
          { symbol: "SBIN", description: "State Bank of India" },
          { symbol: "ICICIBANK", description: "ICICI Bank" },
          { symbol: "LT", description: "Larsen & Toubro" },
        ]

  return Response.json(sample, { headers: { "Cache-Control": "no-store" } })
}
