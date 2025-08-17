import { NextResponse } from "next/server"

// Comprehensive NSE stock list with sectors and market cap info
const NSE_STOCKS = [
  // Nifty 50 stocks
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services Limited",
    sector: "IT Services",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", sector: "Banking", marketCap: "Large", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Limited", sector: "Banking", marketCap: "Large", exchange: "NSE" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", sector: "Telecom", marketCap: "Large", exchange: "NSE" },
  { symbol: "ITC.NS", name: "ITC Limited", sector: "FMCG", marketCap: "Large", exchange: "NSE" },
  { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking", marketCap: "Large", exchange: "NSE" },
  { symbol: "LT.NS", name: "Larsen & Toubro Limited", sector: "Construction", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "HCLTECH.NS",
    name: "HCL Technologies Limited",
    sector: "IT Services",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Limited", sector: "Paints", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "MARUTI.NS",
    name: "Maruti Suzuki India Limited",
    sector: "Automobile",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "KOTAKBANK.NS",
    name: "Kotak Mahindra Bank Limited",
    sector: "Banking",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "AXISBANK.NS", name: "Axis Bank Limited", sector: "Banking", marketCap: "Large", exchange: "NSE" },
  { symbol: "WIPRO.NS", name: "Wipro Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },
  { symbol: "NESTLEIND.NS", name: "Nestle India Limited", sector: "FMCG", marketCap: "Large", exchange: "NSE" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Limited", sector: "FMCG", marketCap: "Large", exchange: "NSE" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Limited", sector: "NBFC", marketCap: "Large", exchange: "NSE" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel Limited", sector: "Steel", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "SUNPHARMA.NS",
    name: "Sun Pharmaceutical Industries Limited",
    sector: "Pharma",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "ONGC.NS",
    name: "Oil and Natural Gas Corporation Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "NTPC.NS", name: "NTPC Limited", sector: "Power", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "POWERGRID.NS",
    name: "Power Grid Corporation of India Limited",
    sector: "Power",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "COALINDIA.NS", name: "Coal India Limited", sector: "Mining", marketCap: "Large", exchange: "NSE" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement Limited", sector: "Cement", marketCap: "Large", exchange: "NSE" },
  { symbol: "TITAN.NS", name: "Titan Company Limited", sector: "Consumer Goods", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "BAJAJFINSV.NS",
    name: "Bajaj Finserv Limited",
    sector: "Financial Services",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "TECHM.NS", name: "Tech Mahindra Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries Limited", sector: "Metals", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "ADANIENT.NS",
    name: "Adani Enterprises Limited",
    sector: "Diversified",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel Limited", sector: "Steel", marketCap: "Large", exchange: "NSE" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Limited", sector: "Banking", marketCap: "Large", exchange: "NSE" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp Limited", sector: "Automobile", marketCap: "Large", exchange: "NSE" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries Limited", sector: "FMCG", marketCap: "Large", exchange: "NSE" },
  { symbol: "CIPLA.NS", name: "Cipla Limited", sector: "Pharma", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "DRREDDY.NS",
    name: "Dr. Reddy's Laboratories Limited",
    sector: "Pharma",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors Limited", sector: "Automobile", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "GRASIM.NS",
    name: "Grasim Industries Limited",
    sector: "Diversified",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra Limited", sector: "Automobile", marketCap: "Large", exchange: "NSE" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories Limited", sector: "Pharma", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "APOLLOHOSP.NS",
    name: "Apollo Hospitals Enterprise Limited",
    sector: "Healthcare",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "BPCL.NS",
    name: "Bharat Petroleum Corporation Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "TATACONSUM.NS",
    name: "Tata Consumer Products Limited",
    sector: "FMCG",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Limited", sector: "Automobile", marketCap: "Large", exchange: "NSE" },
  { symbol: "SHRIRAMFIN.NS", name: "Shriram Finance Limited", sector: "NBFC", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "ADANIPORTS.NS",
    name: "Adani Ports and Special Economic Zone Limited",
    sector: "Infrastructure",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "LTIM.NS", name: "LTIMindtree Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },

  // Additional popular NSE stocks
  {
    symbol: "GODREJCP.NS",
    name: "Godrej Consumer Products Limited",
    sector: "FMCG",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "PIDILITIND.NS",
    name: "Pidilite Industries Limited",
    sector: "Chemicals",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "DABUR.NS", name: "Dabur India Limited", sector: "FMCG", marketCap: "Large", exchange: "NSE" },
  { symbol: "MARICO.NS", name: "Marico Limited", sector: "FMCG", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "COLPAL.NS",
    name: "Colgate Palmolive (India) Limited",
    sector: "FMCG",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "BERGEPAINT.NS",
    name: "Berger Paints India Limited",
    sector: "Paints",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "SIEMENS.NS", name: "Siemens Limited", sector: "Industrial", marketCap: "Large", exchange: "NSE" },
  { symbol: "ABB.NS", name: "ABB India Limited", sector: "Industrial", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "HAVELLS.NS",
    name: "Havells India Limited",
    sector: "Consumer Goods",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "VOLTAS.NS", name: "Voltas Limited", sector: "Consumer Goods", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "WHIRLPOOL.NS",
    name: "Whirlpool of India Limited",
    sector: "Consumer Goods",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto Limited", sector: "Automobile", marketCap: "Large", exchange: "NSE" },
  { symbol: "TVSMOTOR.NS", name: "TVS Motor Company Limited", sector: "Automobile", marketCap: "Mid", exchange: "NSE" },
  { symbol: "ASHOKLEY.NS", name: "Ashok Leyland Limited", sector: "Automobile", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "MOTHERSON.NS",
    name: "Motherson Sumi Wiring India Limited",
    sector: "Auto Components",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "BOSCHLTD.NS", name: "Bosch Limited", sector: "Auto Components", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "EXIDEIND.NS",
    name: "Exide Industries Limited",
    sector: "Auto Components",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "AMBUJACEM.NS", name: "Ambuja Cements Limited", sector: "Cement", marketCap: "Large", exchange: "NSE" },
  { symbol: "ACC.NS", name: "ACC Limited", sector: "Cement", marketCap: "Large", exchange: "NSE" },
  { symbol: "SHREECEM.NS", name: "Shree Cement Limited", sector: "Cement", marketCap: "Large", exchange: "NSE" },
  { symbol: "RAMCOCEM.NS", name: "The Ramco Cements Limited", sector: "Cement", marketCap: "Mid", exchange: "NSE" },
  { symbol: "JINDALSTEL.NS", name: "Jindal Steel & Power Limited", sector: "Steel", marketCap: "Mid", exchange: "NSE" },
  { symbol: "SAIL.NS", name: "Steel Authority of India Limited", sector: "Steel", marketCap: "Mid", exchange: "NSE" },
  { symbol: "NMDC.NS", name: "NMDC Limited", sector: "Mining", marketCap: "Large", exchange: "NSE" },
  { symbol: "VEDL.NS", name: "Vedanta Limited", sector: "Metals", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "NATIONALUM.NS",
    name: "National Aluminium Company Limited",
    sector: "Metals",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "LUPIN.NS", name: "Lupin Limited", sector: "Pharma", marketCap: "Large", exchange: "NSE" },
  { symbol: "BIOCON.NS", name: "Biocon Limited", sector: "Pharma", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "TORNTPHARM.NS",
    name: "Torrent Pharmaceuticals Limited",
    sector: "Pharma",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "AUROPHARMA.NS", name: "Aurobindo Pharma Limited", sector: "Pharma", marketCap: "Large", exchange: "NSE" },
  { symbol: "CADILAHC.NS", name: "Cadila Healthcare Limited", sector: "Pharma", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "GLENMARK.NS",
    name: "Glenmark Pharmaceuticals Limited",
    sector: "Pharma",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "MPHASIS.NS", name: "Mphasis Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },
  { symbol: "MINDTREE.NS", name: "Mindtree Limited", sector: "IT Services", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "PERSISTENT.NS",
    name: "Persistent Systems Limited",
    sector: "IT Services",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "COFORGE.NS", name: "Coforge Limited", sector: "IT Services", marketCap: "Mid", exchange: "NSE" },
  { symbol: "L&TFH.NS", name: "L&T Finance Holdings Limited", sector: "NBFC", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "CHOLAFIN.NS",
    name: "Cholamandalam Investment and Finance Company Limited",
    sector: "NBFC",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "MUTHOOTFIN.NS", name: "Muthoot Finance Limited", sector: "NBFC", marketCap: "Mid", exchange: "NSE" },
  { symbol: "MANAPPURAM.NS", name: "Manappuram Finance Limited", sector: "NBFC", marketCap: "Small", exchange: "NSE" },
  { symbol: "FEDERALBNK.NS", name: "Federal Bank Limited", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  { symbol: "BANDHANBNK.NS", name: "Bandhan Bank Limited", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  { symbol: "IDFCFIRSTB.NS", name: "IDFC First Bank Limited", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  { symbol: "PNB.NS", name: "Punjab National Bank", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  { symbol: "BANKBARODA.NS", name: "Bank of Baroda", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  { symbol: "CANBK.NS", name: "Canara Bank", sector: "Banking", marketCap: "Mid", exchange: "NSE" },
  {
    symbol: "IOC.NS",
    name: "Indian Oil Corporation Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "NSE",
  },
  {
    symbol: "HINDPETRO.NS",
    name: "Hindustan Petroleum Corporation Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "GAIL.NS", name: "GAIL (India) Limited", sector: "Oil & Gas", marketCap: "Large", exchange: "NSE" },
  { symbol: "PETRONET.NS", name: "Petronet LNG Limited", sector: "Oil & Gas", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "ADANIGREEN.NS",
    name: "Adani Green Energy Limited",
    sector: "Renewable Energy",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "ADANITRANS.NS", name: "Adani Transmission Limited", sector: "Power", marketCap: "Large", exchange: "NSE" },
  { symbol: "TATAPOWER.NS", name: "Tata Power Company Limited", sector: "Power", marketCap: "Large", exchange: "NSE" },
  { symbol: "TORNTPOWER.NS", name: "Torrent Power Limited", sector: "Power", marketCap: "Mid", exchange: "NSE" },
  { symbol: "JSPL.NS", name: "Jindal Steel & Power Limited", sector: "Steel", marketCap: "Mid", exchange: "NSE" },
  { symbol: "RPOWER.NS", name: "Reliance Power Limited", sector: "Power", marketCap: "Small", exchange: "NSE" },
  {
    symbol: "SUZLON.NS",
    name: "Suzlon Energy Limited",
    sector: "Renewable Energy",
    marketCap: "Small",
    exchange: "NSE",
  },
  {
    symbol: "IRCTC.NS",
    name: "Indian Railway Catering and Tourism Corporation Limited",
    sector: "Travel & Tourism",
    marketCap: "Mid",
    exchange: "NSE",
  },
  { symbol: "ZOMATO.NS", name: "Zomato Limited", sector: "Consumer Services", marketCap: "Large", exchange: "NSE" },
  {
    symbol: "NYKAA.NS",
    name: "FSN E-Commerce Ventures Limited",
    sector: "E-commerce",
    marketCap: "Large",
    exchange: "NSE",
  },
  { symbol: "PAYTM.NS", name: "One 97 Communications Limited", sector: "Fintech", marketCap: "Large", exchange: "NSE" },
  { symbol: "POLICYBZR.NS", name: "PB Fintech Limited", sector: "Fintech", marketCap: "Mid", exchange: "NSE" },
]

// BSE stocks (additional to NSE)
const BSE_STOCKS = [
  {
    symbol: "RELIANCE.BO",
    name: "Reliance Industries Limited",
    sector: "Oil & Gas",
    marketCap: "Large",
    exchange: "BSE",
  },
  {
    symbol: "TCS.BO",
    name: "Tata Consultancy Services Limited",
    sector: "IT Services",
    marketCap: "Large",
    exchange: "BSE",
  },
  { symbol: "HDFCBANK.BO", name: "HDFC Bank Limited", sector: "Banking", marketCap: "Large", exchange: "BSE" },
  { symbol: "INFY.BO", name: "Infosys Limited", sector: "IT Services", marketCap: "Large", exchange: "BSE" },
  { symbol: "ICICIBANK.BO", name: "ICICI Bank Limited", sector: "Banking", marketCap: "Large", exchange: "BSE" },
  // Add more BSE specific stocks here
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const exchange = searchParams.get("exchange") || "all"
    const sector = searchParams.get("sector")
    const marketCap = searchParams.get("marketCap")
    const search = searchParams.get("search")

    let stocks = [...NSE_STOCKS]

    if (exchange === "bse") {
      stocks = BSE_STOCKS
    } else if (exchange === "all") {
      stocks = [...NSE_STOCKS, ...BSE_STOCKS]
    }

    // Filter by sector
    if (sector && sector !== "all") {
      stocks = stocks.filter((stock) => stock.sector.toLowerCase().includes(sector.toLowerCase()))
    }

    // Filter by market cap
    if (marketCap && marketCap !== "all") {
      stocks = stocks.filter((stock) => stock.marketCap.toLowerCase() === marketCap.toLowerCase())
    }

    // Search filter
    if (search) {
      const searchTerm = search.toLowerCase()
      stocks = stocks.filter(
        (stock) =>
          stock.name.toLowerCase().includes(searchTerm) ||
          stock.symbol.toLowerCase().includes(searchTerm) ||
          stock.sector.toLowerCase().includes(searchTerm),
      )
    }

    // Sort by name
    stocks.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      data: stocks,
      count: stocks.length,
      filters: {
        exchange,
        sector,
        marketCap,
        search,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Error in nse-stocks API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
