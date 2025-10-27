import { NextResponse } from "next/server"

interface NSEStock {
  symbol: string
  name: string
  sector: string
  marketCap: string
  exchange: string
  isin?: string
  industry?: string
}

// Comprehensive NSE stock database
const NSE_STOCKS: NSEStock[] = [
  // Nifty 50 Stocks
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    sector: "Energy",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "INFY.NS",
    name: "Infosys Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "ICICIBANK.NS",
    name: "ICICI Bank Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "HINDUNILVR.NS",
    name: "Hindustan Unilever Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "FMCG",
  },
  {
    symbol: "ITC.NS",
    name: "ITC Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Tobacco & FMCG",
  },
  {
    symbol: "SBIN.NS",
    name: "State Bank of India",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "BHARTIARTL.NS",
    name: "Bharti Airtel Limited",
    sector: "Telecommunication",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Telecom",
  },
  {
    symbol: "KOTAKBANK.NS",
    name: "Kotak Mahindra Bank Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "LT.NS",
    name: "Larsen & Toubro Limited",
    sector: "Construction",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Engineering",
  },
  {
    symbol: "ASIANPAINT.NS",
    name: "Asian Paints Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Paints",
  },
  {
    symbol: "MARUTI.NS",
    name: "Maruti Suzuki India Limited",
    sector: "Automobile",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Auto",
  },
  {
    symbol: "HCLTECH.NS",
    name: "HCL Technologies Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "AXISBANK.NS",
    name: "Axis Bank Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "WIPRO.NS",
    name: "Wipro Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "NESTLEIND.NS",
    name: "Nestle India Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Food Products",
  },
  {
    symbol: "BAJFINANCE.NS",
    name: "Bajaj Finance Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "NBFC",
  },
  {
    symbol: "TATASTEEL.NS",
    name: "Tata Steel Limited",
    sector: "Metals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Steel",
  },
  {
    symbol: "SUNPHARMA.NS",
    name: "Sun Pharmaceutical Industries Limited",
    sector: "Pharmaceuticals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "ULTRACEMCO.NS",
    name: "UltraTech Cement Limited",
    sector: "Construction",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Cement",
  },
  {
    symbol: "ONGC.NS",
    name: "Oil and Natural Gas Corporation Limited",
    sector: "Energy",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "TECHM.NS",
    name: "Tech Mahindra Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "TITAN.NS",
    name: "Titan Company Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Jewelry",
  },
  {
    symbol: "POWERGRID.NS",
    name: "Power Grid Corporation of India Limited",
    sector: "Utilities",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Power",
  },
  {
    symbol: "NTPC.NS",
    name: "NTPC Limited",
    sector: "Utilities",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Power",
  },
  {
    symbol: "JSWSTEEL.NS",
    name: "JSW Steel Limited",
    sector: "Metals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Steel",
  },
  {
    symbol: "TATAMOTORS.NS",
    name: "Tata Motors Limited",
    sector: "Automobile",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Auto",
  },
  {
    symbol: "INDUSINDBK.NS",
    name: "IndusInd Bank Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "HINDALCO.NS",
    name: "Hindalco Industries Limited",
    sector: "Metals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Aluminum",
  },
  {
    symbol: "ADANIENT.NS",
    name: "Adani Enterprises Limited",
    sector: "Conglomerate",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Diversified",
  },
  {
    symbol: "COALINDIA.NS",
    name: "Coal India Limited",
    sector: "Energy",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Mining",
  },
  {
    symbol: "BAJAJFINSV.NS",
    name: "Bajaj Finserv Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Financial Services",
  },
  {
    symbol: "GRASIM.NS",
    name: "Grasim Industries Limited",
    sector: "Textiles",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Cement & Textiles",
  },
  {
    symbol: "BRITANNIA.NS",
    name: "Britannia Industries Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Food Products",
  },
  {
    symbol: "CIPLA.NS",
    name: "Cipla Limited",
    sector: "Pharmaceuticals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "DIVISLAB.NS",
    name: "Divi's Laboratories Limited",
    sector: "Pharmaceuticals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "HEROMOTOCO.NS",
    name: "Hero MotoCorp Limited",
    sector: "Automobile",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Two Wheeler",
  },
  {
    symbol: "DRREDDY.NS",
    name: "Dr. Reddy's Laboratories Limited",
    sector: "Pharmaceuticals",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "EICHERMOT.NS",
    name: "Eicher Motors Limited",
    sector: "Automobile",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Auto",
  },
  {
    symbol: "APOLLOHOSP.NS",
    name: "Apollo Hospitals Enterprise Limited",
    sector: "Healthcare",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Healthcare",
  },
  {
    symbol: "BPCL.NS",
    name: "Bharat Petroleum Corporation Limited",
    sector: "Energy",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "TRENT.NS",
    name: "Trent Limited",
    sector: "Consumer Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Retail",
  },
  {
    symbol: "LTIM.NS",
    name: "LTIMindtree Limited",
    sector: "Information Technology",
    marketCap: "Large",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "ADANIPORTS.NS",
    name: "Adani Ports and Special Economic Zone Limited",
    sector: "Infrastructure",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Ports",
  },
  {
    symbol: "SHRIRAMFIN.NS",
    name: "Shriram Finance Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "NBFC",
  },

  // Mid Cap Stocks
  {
    symbol: "GODREJCP.NS",
    name: "Godrej Consumer Products Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "FMCG",
  },
  {
    symbol: "PIDILITIND.NS",
    name: "Pidilite Industries Limited",
    sector: "Chemicals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Chemicals",
  },
  {
    symbol: "DABUR.NS",
    name: "Dabur India Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "FMCG",
  },
  {
    symbol: "MARICO.NS",
    name: "Marico Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "FMCG",
  },
  {
    symbol: "COLPAL.NS",
    name: "Colgate Palmolive India Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "FMCG",
  },
  {
    symbol: "BERGEPAINT.NS",
    name: "Berger Paints India Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Paints",
  },
  {
    symbol: "MCDOWELL-N.NS",
    name: "United Spirits Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Beverages",
  },
  {
    symbol: "BAJAJ-AUTO.NS",
    name: "Bajaj Auto Limited",
    sector: "Automobile",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Two Wheeler",
  },
  {
    symbol: "MOTHERSON.NS",
    name: "Motherson Sumi Wiring India Limited",
    sector: "Automobile",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Auto Components",
  },
  {
    symbol: "BOSCHLTD.NS",
    name: "Bosch Limited",
    sector: "Automobile",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Auto Components",
  },
  {
    symbol: "MPHASIS.NS",
    name: "Mphasis Limited",
    sector: "Information Technology",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "MINDTREE.NS",
    name: "Mindtree Limited",
    sector: "Information Technology",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "PERSISTENT.NS",
    name: "Persistent Systems Limited",
    sector: "Information Technology",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "COFORGE.NS",
    name: "Coforge Limited",
    sector: "Information Technology",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "LTTS.NS",
    name: "L&T Technology Services Limited",
    sector: "Information Technology",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "IT Services",
  },
  {
    symbol: "BANKBARODA.NS",
    name: "Bank of Baroda",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "PNB.NS",
    name: "Punjab National Bank",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "CANBK.NS",
    name: "Canara Bank",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "FEDERALBNK.NS",
    name: "Federal Bank Limited",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "IDFCFIRSTB.NS",
    name: "IDFC First Bank Limited",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "LUPIN.NS",
    name: "Lupin Limited",
    sector: "Pharmaceuticals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "AUBANK.NS",
    name: "AU Small Finance Bank Limited",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Banking",
  },
  {
    symbol: "BIOCON.NS",
    name: "Biocon Limited",
    sector: "Pharmaceuticals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "TORNTPHARM.NS",
    name: "Torrent Pharmaceuticals Limited",
    sector: "Pharmaceuticals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Pharma",
  },
  {
    symbol: "ALKEM.NS",
    name: "Alkem Laboratories Limited",
    sector: "Pharmaceuticals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Pharma",
  },

  // Small Cap Stocks
  {
    symbol: "DIXON.NS",
    name: "Dixon Technologies India Limited",
    sector: "Consumer Goods",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Electronics",
  },
  {
    symbol: "POLYCAB.NS",
    name: "Polycab India Limited",
    sector: "Infrastructure",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Cables",
  },
  {
    symbol: "CROMPTON.NS",
    name: "Crompton Greaves Consumer Electricals Limited",
    sector: "Consumer Goods",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Electricals",
  },
  {
    symbol: "VOLTAS.NS",
    name: "Voltas Limited",
    sector: "Consumer Goods",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Consumer Durables",
  },
  {
    symbol: "WHIRLPOOL.NS",
    name: "Whirlpool of India Limited",
    sector: "Consumer Goods",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Consumer Durables",
  },
  {
    symbol: "BLUEDART.NS",
    name: "Blue Dart Express Limited",
    sector: "Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Logistics",
  },
  {
    symbol: "DMART.NS",
    name: "Avenue Supermarts Limited",
    sector: "Consumer Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Retail",
  },
  {
    symbol: "NAUKRI.NS",
    name: "Info Edge India Limited",
    sector: "Consumer Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Internet",
  },
  {
    symbol: "ZOMATO.NS",
    name: "Zomato Limited",
    sector: "Consumer Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Food Delivery",
  },
  {
    symbol: "PAYTM.NS",
    name: "One 97 Communications Limited",
    sector: "Financial Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Fintech",
  },
  {
    symbol: "POLICYBZR.NS",
    name: "PB Fintech Limited",
    sector: "Financial Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Fintech",
  },
  {
    symbol: "NYKAA.NS",
    name: "FSN E-Commerce Ventures Limited",
    sector: "Consumer Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "E-commerce",
  },
  {
    symbol: "LICI.NS",
    name: "Life Insurance Corporation of India",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Insurance",
  },
  {
    symbol: "IRCTC.NS",
    name: "Indian Railway Catering and Tourism Corporation Limited",
    sector: "Consumer Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Travel",
  },
  {
    symbol: "CONCOR.NS",
    name: "Container Corporation of India Limited",
    sector: "Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Logistics",
  },
  {
    symbol: "GAIL.NS",
    name: "GAIL India Limited",
    sector: "Energy",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "IOC.NS",
    name: "Indian Oil Corporation Limited",
    sector: "Energy",
    marketCap: "Large",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "HINDPETRO.NS",
    name: "Hindustan Petroleum Corporation Limited",
    sector: "Energy",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Oil & Gas",
  },
  {
    symbol: "SAIL.NS",
    name: "Steel Authority of India Limited",
    sector: "Metals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Steel",
  },
  { symbol: "NMDC.NS", name: "NMDC Limited", sector: "Metals", marketCap: "Mid", exchange: "NSE", industry: "Mining" },
  {
    symbol: "VEDL.NS",
    name: "Vedanta Limited",
    sector: "Metals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Mining",
  },
  {
    symbol: "JINDALSTEL.NS",
    name: "Jindal Steel & Power Limited",
    sector: "Metals",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "Steel",
  },
  {
    symbol: "NATIONALUM.NS",
    name: "National Aluminium Company Limited",
    sector: "Metals",
    marketCap: "Small",
    exchange: "NSE",
    industry: "Aluminum",
  },
  {
    symbol: "RECLTD.NS",
    name: "REC Limited",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "NBFC",
  },
  {
    symbol: "PFC.NS",
    name: "Power Finance Corporation Limited",
    sector: "Financial Services",
    marketCap: "Mid",
    exchange: "NSE",
    industry: "NBFC",
  },
  {
    symbol: "IRFC.NS",
    name: "Indian Railway Finance Corporation Limited",
    sector: "Financial Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "NBFC",
  },
  {
    symbol: "HUDCO.NS",
    name: "Housing and Urban Development Corporation Limited",
    sector: "Financial Services",
    marketCap: "Small",
    exchange: "NSE",
    industry: "NBFC",
  },
]

// Cache for stock data
const cache = new Map<string, { data: NSEStock[]; timestamp: number }>()
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours for stock list

function getCachedStocks(): NSEStock[] | null {
  const cached = cache.get("nse-stocks")
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedStocks(data: NSEStock[]) {
  cache.set("nse-stocks", { data, timestamp: Date.now() })
}

export async function GET() {
  try {
    // Check cache first
    const cachedStocks = getCachedStocks()
    if (cachedStocks) {
      return NextResponse.json({
        success: true,
        data: cachedStocks,
        cached: true,
        count: cachedStocks.length,
        timestamp: new Date().toISOString(),
      })
    }

    // Return the comprehensive stock list
    const stocks = NSE_STOCKS.sort((a, b) => a.name.localeCompare(b.name))

    // Cache the data
    setCachedStocks(stocks)

    // Get unique sectors and market caps for filtering
    const sectors = [...new Set(stocks.map((stock) => stock.sector))].sort()
    const marketCaps = [...new Set(stocks.map((stock) => stock.marketCap))].sort()
    const exchanges = [...new Set(stocks.map((stock) => stock.exchange))].sort()

    return NextResponse.json({
      success: true,
      data: stocks,
      metadata: {
        totalStocks: stocks.length,
        sectors,
        marketCaps,
        exchanges,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching NSE stocks:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch NSE stocks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { filters } = await request.json()

    let filteredStocks = NSE_STOCKS

    // Apply filters
    if (filters?.sector && filters.sector !== "all") {
      filteredStocks = filteredStocks.filter((stock) => stock.sector === filters.sector)
    }

    if (filters?.marketCap && filters.marketCap !== "all") {
      filteredStocks = filteredStocks.filter((stock) => stock.marketCap === filters.marketCap)
    }

    if (filters?.exchange && filters.exchange !== "all") {
      filteredStocks = filteredStocks.filter((stock) => stock.exchange === filters.exchange)
    }

    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredStocks = filteredStocks.filter(
        (stock) =>
          stock.name.toLowerCase().includes(searchTerm) ||
          stock.symbol.toLowerCase().includes(searchTerm) ||
          stock.sector.toLowerCase().includes(searchTerm),
      )
    }

    // Sort by name
    filteredStocks.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      data: filteredStocks,
      count: filteredStocks.length,
      filters: filters,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error filtering NSE stocks:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to filter NSE stocks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
