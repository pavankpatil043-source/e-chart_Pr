import { type NextRequest, NextResponse } from "next/server"

// Popular NSE stocks with descriptions
const NSE_SYMBOLS = [
  { symbol: "RELIANCE", description: "Reliance Industries Limited" },
  { symbol: "TCS", description: "Tata Consultancy Services Limited" },
  { symbol: "HDFCBANK", description: "HDFC Bank Limited" },
  { symbol: "INFY", description: "Infosys Limited" },
  { symbol: "HINDUNILVR", description: "Hindustan Unilever Limited" },
  { symbol: "ICICIBANK", description: "ICICI Bank Limited" },
  { symbol: "KOTAKBANK", description: "Kotak Mahindra Bank Limited" },
  { symbol: "BHARTIARTL", description: "Bharti Airtel Limited" },
  { symbol: "ITC", description: "ITC Limited" },
  { symbol: "SBIN", description: "State Bank of India" },
  { symbol: "ASIANPAINT", description: "Asian Paints Limited" },
  { symbol: "MARUTI", description: "Maruti Suzuki India Limited" },
  { symbol: "AXISBANK", description: "Axis Bank Limited" },
  { symbol: "LT", description: "Larsen & Toubro Limited" },
  { symbol: "HCLTECH", description: "HCL Technologies Limited" },
  { symbol: "WIPRO", description: "Wipro Limited" },
  { symbol: "ULTRACEMCO", description: "UltraTech Cement Limited" },
  { symbol: "ONGC", description: "Oil & Natural Gas Corporation Limited" },
  { symbol: "TATAMOTORS", description: "Tata Motors Limited" },
  { symbol: "POWERGRID", description: "Power Grid Corporation of India Limited" },
  { symbol: "NESTLEIND", description: "Nestle India Limited" },
  { symbol: "NTPC", description: "NTPC Limited" },
  { symbol: "TECHM", description: "Tech Mahindra Limited" },
  { symbol: "TITAN", description: "Titan Company Limited" },
  { symbol: "SUNPHARMA", description: "Sun Pharmaceutical Industries Limited" },
  { symbol: "BAJFINANCE", description: "Bajaj Finance Limited" },
  { symbol: "JSWSTEEL", description: "JSW Steel Limited" },
  { symbol: "TATASTEEL", description: "Tata Steel Limited" },
  { symbol: "COALINDIA", description: "Coal India Limited" },
  { symbol: "INDUSINDBK", description: "IndusInd Bank Limited" },
  { symbol: "GRASIM", description: "Grasim Industries Limited" },
  { symbol: "BAJAJFINSV", description: "Bajaj Finserv Limited" },
  { symbol: "DRREDDY", description: "Dr. Reddys Laboratories Limited" },
  { symbol: "EICHERMOT", description: "Eicher Motors Limited" },
  { symbol: "CIPLA", description: "Cipla Limited" },
  { symbol: "BRITANNIA", description: "Britannia Industries Limited" },
  { symbol: "DIVISLAB", description: "Divis Laboratories Limited" },
  { symbol: "HEROMOTOCO", description: "Hero MotoCorp Limited" },
  { symbol: "ADANIPORTS", description: "Adani Ports and Special Economic Zone Limited" },
  { symbol: "SHREECEM", description: "Shree Cement Limited" },
  { symbol: "APOLLOHOSP", description: "Apollo Hospitals Enterprise Limited" },
  { symbol: "BPCL", description: "Bharat Petroleum Corporation Limited" },
  { symbol: "HINDALCO", description: "Hindalco Industries Limited" },
  { symbol: "UPL", description: "UPL Limited" },
  { symbol: "TATACONSUM", description: "Tata Consumer Products Limited" },
  { symbol: "VEDL", description: "Vedanta Limited" },
  { symbol: "GODREJCP", description: "Godrej Consumer Products Limited" },
  { symbol: "SBILIFE", description: "SBI Life Insurance Company Limited" },
  { symbol: "HDFCLIFE", description: "HDFC Life Insurance Company Limited" },
  { symbol: "BAJAJ-AUTO", description: "Bajaj Auto Limited" },
  { symbol: "M&M", description: "Mahindra & Mahindra Limited" },
]

// Popular BSE stocks (many overlap with NSE)
const BSE_SYMBOLS = [
  { symbol: "RELIANCE", description: "Reliance Industries Limited" },
  { symbol: "TCS", description: "Tata Consultancy Services Limited" },
  { symbol: "HDFCBANK", description: "HDFC Bank Limited" },
  { symbol: "INFY", description: "Infosys Limited" },
  { symbol: "HINDUNILVR", description: "Hindustan Unilever Limited" },
  { symbol: "ICICIBANK", description: "ICICI Bank Limited" },
  { symbol: "KOTAKBANK", description: "Kotak Mahindra Bank Limited" },
  { symbol: "BHARTIARTL", description: "Bharti Airtel Limited" },
  { symbol: "ITC", description: "ITC Limited" },
  { symbol: "SBIN", description: "State Bank of India" },
  { symbol: "ASIANPAINT", description: "Asian Paints Limited" },
  { symbol: "MARUTI", description: "Maruti Suzuki India Limited" },
  { symbol: "AXISBANK", description: "Axis Bank Limited" },
  { symbol: "LT", description: "Larsen & Toubro Limited" },
  { symbol: "HCLTECH", description: "HCL Technologies Limited" },
  { symbol: "WIPRO", description: "Wipro Limited" },
  { symbol: "ULTRACEMCO", description: "UltraTech Cement Limited" },
  { symbol: "ONGC", description: "Oil & Natural Gas Corporation Limited" },
  { symbol: "TATAMOTORS", description: "Tata Motors Limited" },
  { symbol: "POWERGRID", description: "Power Grid Corporation of India Limited" },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exchange = searchParams.get("exchange")?.toUpperCase() || "NSE"

    // Return symbols based on exchange
    const symbols = exchange === "BSE" ? BSE_SYMBOLS : NSE_SYMBOLS

    return NextResponse.json(symbols)
  } catch (error) {
    console.error("Symbols API error:", error)
    return NextResponse.json({ error: "Failed to fetch symbols" }, { status: 500 })
  }
}
