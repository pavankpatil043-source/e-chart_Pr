import { NextResponse } from "next/server"

const NSE_SYMBOLS = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd" },
  { symbol: "INFY", name: "Infosys Ltd" },
  { symbol: "ITC", name: "ITC Ltd" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd" },
  { symbol: "LT", name: "Larsen & Toubro Ltd" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd" },
  { symbol: "MARUTI", name: "Maruti Suzuki India Ltd" },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd" },
  { symbol: "WIPRO", name: "Wipro Ltd" },
]

const BSE_SYMBOLS = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd" },
  { symbol: "INFY", name: "Infosys Ltd" },
  { symbol: "ITC", name: "ITC Ltd" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd" },
  { symbol: "LT", name: "Larsen & Toubro Ltd" },
  { symbol: "ASIANPAINT", name: "Asian Paints Ltd" },
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        NSE: NSE_SYMBOLS,
        BSE: BSE_SYMBOLS,
      },
    })
  } catch (error) {
    console.error("Error fetching symbols:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch symbols" }, { status: 500 })
  }
}
