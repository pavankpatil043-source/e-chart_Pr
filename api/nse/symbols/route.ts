import { NextResponse } from "next/server"

// Mock NSE symbols data
const NSE_SYMBOLS = [
  { symbol: "RELIANCE", companyName: "Reliance Industries Limited", sector: "Oil & Gas" },
  { symbol: "TCS", companyName: "Tata Consultancy Services Limited", sector: "IT Services" },
  { symbol: "HDFCBANK", companyName: "HDFC Bank Limited", sector: "Banking" },
  { symbol: "INFY", companyName: "Infosys Limited", sector: "IT Services" },
  { symbol: "ITC", companyName: "ITC Limited", sector: "FMCG" },
  { symbol: "SBIN", companyName: "State Bank of India", sector: "Banking" },
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel Limited", sector: "Telecom" },
  { symbol: "KOTAKBANK", companyName: "Kotak Mahindra Bank Limited", sector: "Banking" },
  { symbol: "LT", companyName: "Larsen & Toubro Limited", sector: "Construction" },
  { symbol: "ASIANPAINT", companyName: "Asian Paints Limited", sector: "Paints" },
  { symbol: "MARUTI", companyName: "Maruti Suzuki India Limited", sector: "Automobile" },
  { symbol: "HCLTECH", companyName: "HCL Technologies Limited", sector: "IT Services" },
  { symbol: "AXISBANK", companyName: "Axis Bank Limited", sector: "Banking" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank Limited", sector: "Banking" },
  { symbol: "WIPRO", companyName: "Wipro Limited", sector: "IT Services" },
  { symbol: "NESTLEIND", companyName: "Nestle India Limited", sector: "FMCG" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever Limited", sector: "FMCG" },
  { symbol: "BAJFINANCE", companyName: "Bajaj Finance Limited", sector: "NBFC" },
  { symbol: "TATASTEEL", companyName: "Tata Steel Limited", sector: "Steel" },
  { symbol: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Limited", sector: "Pharma" },
]

export async function GET() {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    return NextResponse.json({
      success: true,
      data: NSE_SYMBOLS,
      count: NSE_SYMBOLS.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in NSE symbols API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch symbols",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
