/**
 * Nifty 50 Stocks Configuration
 * Complete list of all Nifty 50 constituent stocks with proper Yahoo Finance symbols
 * Updated as of 2024
 */

export interface StockInfo {
  symbol: string // Yahoo Finance symbol (with .NS suffix)
  name: string
  sector: string
  baseSymbol: string // NSE symbol (without .NS)
}

export const NIFTY_50_STOCKS: StockInfo[] = [
  { symbol: "ADANIPORTS.NS", name: "Adani Ports and Special Economic Zone Ltd", sector: "Logistics", baseSymbol: "ADANIPORTS" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", sector: "Consumer Goods", baseSymbol: "ASIANPAINT" },
  { symbol: "AXISBANK.NS", name: "Axis Bank Ltd", sector: "Banking", baseSymbol: "AXISBANK" },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto Ltd", sector: "Automobile", baseSymbol: "BAJAJ-AUTO" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", sector: "Financial Services", baseSymbol: "BAJFINANCE" },
  { symbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Ltd", sector: "Financial Services", baseSymbol: "BAJAJFINSV" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", sector: "Telecom", baseSymbol: "BHARTIARTL" },
  { symbol: "BPCL.NS", name: "Bharat Petroleum Corporation Ltd", sector: "Oil & Gas", baseSymbol: "BPCL" },
  { symbol: "BRITANNIA.NS", name: "Britannia Industries Ltd", sector: "FMCG", baseSymbol: "BRITANNIA" },
  { symbol: "CIPLA.NS", name: "Cipla Ltd", sector: "Pharma", baseSymbol: "CIPLA" },
  { symbol: "COALINDIA.NS", name: "Coal India Ltd", sector: "Mining", baseSymbol: "COALINDIA" },
  { symbol: "DIVISLAB.NS", name: "Divi's Laboratories Ltd", sector: "Pharma", baseSymbol: "DIVISLAB" },
  { symbol: "DRREDDY.NS", name: "Dr. Reddy's Laboratories Ltd", sector: "Pharma", baseSymbol: "DRREDDY" },
  { symbol: "EICHERMOT.NS", name: "Eicher Motors Ltd", sector: "Automobile", baseSymbol: "EICHERMOT" },
  { symbol: "GRASIM.NS", name: "Grasim Industries Ltd", sector: "Cement & Construction", baseSymbol: "GRASIM" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies Ltd", sector: "IT Services", baseSymbol: "HCLTECH" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", sector: "Banking", baseSymbol: "HDFCBANK" },
  { symbol: "HDFCLIFE.NS", name: "HDFC Life Insurance Company Ltd", sector: "Insurance", baseSymbol: "HDFCLIFE" },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp Ltd", sector: "Automobile", baseSymbol: "HEROMOTOCO" },
  { symbol: "HINDALCO.NS", name: "Hindalco Industries Ltd", sector: "Metals", baseSymbol: "HINDALCO" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", sector: "FMCG", baseSymbol: "HINDUNILVR" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", sector: "Banking", baseSymbol: "ICICIBANK" },
  { symbol: "INDUSINDBK.NS", name: "IndusInd Bank Ltd", sector: "Banking", baseSymbol: "INDUSINDBK" },
  { symbol: "INFY.NS", name: "Infosys Ltd", sector: "IT Services", baseSymbol: "INFY" },
  { symbol: "ITC.NS", name: "ITC Ltd", sector: "FMCG", baseSymbol: "ITC" },
  { symbol: "JSWSTEEL.NS", name: "JSW Steel Ltd", sector: "Metals", baseSymbol: "JSWSTEEL" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", sector: "Banking", baseSymbol: "KOTAKBANK" },
  { symbol: "LT.NS", name: "Larsen & Toubro Ltd", sector: "Infrastructure", baseSymbol: "LT" },
  { symbol: "M&M.NS", name: "Mahindra & Mahindra Ltd", sector: "Automobile", baseSymbol: "M&M" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki India Ltd", sector: "Automobile", baseSymbol: "MARUTI" },
  { symbol: "NESTLEIND.NS", name: "Nestle India Ltd", sector: "FMCG", baseSymbol: "NESTLEIND" },
  { symbol: "NTPC.NS", name: "NTPC Ltd", sector: "Power", baseSymbol: "NTPC" },
  { symbol: "ONGC.NS", name: "Oil and Natural Gas Corporation Ltd", sector: "Oil & Gas", baseSymbol: "ONGC" },
  { symbol: "POWERGRID.NS", name: "Power Grid Corporation of India Ltd", sector: "Power", baseSymbol: "POWERGRID" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", sector: "Oil & Gas", baseSymbol: "RELIANCE" },
  { symbol: "SBILIFE.NS", name: "SBI Life Insurance Company Ltd", sector: "Insurance", baseSymbol: "SBILIFE" },
  { symbol: "SBIN.NS", name: "State Bank of India", sector: "Banking", baseSymbol: "SBIN" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Ltd", sector: "Pharma", baseSymbol: "SUNPHARMA" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", sector: "Automobile", baseSymbol: "TATAMOTORS" },
  { symbol: "TATASTEEL.NS", name: "Tata Steel Ltd", sector: "Metals", baseSymbol: "TATASTEEL" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services Ltd", sector: "IT Services", baseSymbol: "TCS" },
  { symbol: "TECHM.NS", name: "Tech Mahindra Ltd", sector: "IT Services", baseSymbol: "TECHM" },
  { symbol: "TITAN.NS", name: "Titan Company Ltd", sector: "Consumer Goods", baseSymbol: "TITAN" },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement Ltd", sector: "Cement & Construction", baseSymbol: "ULTRACEMCO" },
  { symbol: "UPL.NS", name: "UPL Ltd", sector: "Chemicals", baseSymbol: "UPL" },
  { symbol: "WIPRO.NS", name: "Wipro Ltd", sector: "IT Services", baseSymbol: "WIPRO" },
]

// Helper function to get stock by base symbol
export function getStockByBaseSymbol(baseSymbol: string): StockInfo | undefined {
  return NIFTY_50_STOCKS.find(stock => stock.baseSymbol === baseSymbol)
}

// Helper function to get stock by Yahoo symbol
export function getStockByYahooSymbol(symbol: string): StockInfo | undefined {
  return NIFTY_50_STOCKS.find(stock => stock.symbol === symbol)
}

// Helper function to convert base symbol to Yahoo symbol
export function toYahooSymbol(baseSymbol: string): string {
  const stock = getStockByBaseSymbol(baseSymbol)
  return stock ? stock.symbol : `${baseSymbol}.NS`
}

// Helper function to convert Yahoo symbol to base symbol
export function toBaseSymbol(yahooSymbol: string): string {
  const stock = getStockByYahooSymbol(yahooSymbol)
  return stock ? stock.baseSymbol : yahooSymbol.replace('.NS', '')
}

// Get popular stocks (top 10 by market cap typically)
export const POPULAR_NIFTY_STOCKS = [
  "RELIANCE.NS",
  "TCS.NS",
  "HDFCBANK.NS",
  "INFY.NS",
  "ICICIBANK.NS",
  "BHARTIARTL.NS",
  "ITC.NS",
  "SBIN.NS",
  "LT.NS",
  "HCLTECH.NS",
].map(symbol => getStockByYahooSymbol(symbol)!).filter(Boolean)
