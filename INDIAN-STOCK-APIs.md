# Indian Stock Market Live Data APIs

## Current Implementation: Multi-Source Fallback System

The application now uses a **smart multi-source approach** that tries multiple APIs in order:

### 1. NSE India Official API (Primary) ⭐
- **URL**: `https://www.nseindia.com/api/quote-equity?symbol=SYMBOL`
- **Pros**: 
  - Most reliable for Indian stocks
  - Real-time NSE data
  - Free (no API key needed)
  - Official source
- **Cons**:
  - Requires proper headers (User-Agent, Referer)
  - May block requests if not properly configured
  - CORS issues in browser
- **Status**: ✅ Implemented as PRIMARY source

### 2. Yahoo Finance API (Secondary)
- **URL**: `https://query1.finance.yahoo.com/v8/finance/chart/SYMBOL.NS`
- **Pros**:
  - Good coverage of Indian stocks
  - No API key needed
  - Historical data available
- **Cons**:
  - Rate limiting
  - Sometimes returns old/cached data
  - Unreliable for tick-by-tick updates
- **Status**: ✅ Implemented as FALLBACK

### 3. Alpha Vantage (Tertiary)
- **URL**: `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SYMBOL.BSE`
- **Pros**:
  - Reliable API
  - Good documentation
  - Free tier available
- **Cons**:
  - Requires API key
  - Limited to 5 calls/minute (free tier)
  - Uses BSE symbols
- **Status**: ✅ Implemented (requires API key in .env)
- **Setup**: Add `ALPHA_VANTAGE_API_KEY=your_key` to `.env.local`
- **Get Key**: https://www.alphavantage.co/support/#api-key

---

## Professional Paid APIs (Recommended for Production)

### 1. Upstox API (Best for Indian Market) 🏆
- **Website**: https://upstox.com/developer/
- **Pricing**: Free with trading account, Pro plans available
- **Features**:
  - Real-time tick-by-tick data
  - WebSocket support
  - Historical data
  - NSE, BSE, MCX coverage
  - Order placement APIs
- **Setup**:
  ```javascript
  // Requires OAuth authentication
  const response = await fetch('https://api.upstox.com/v2/market-quote/quotes', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    },
    params: {
      symbol: 'NSE_EQ|INE002A01018' // ISIN format
    }
  })
  ```

### 2. Zerodha Kite Connect (Popular Choice) 🏆
- **Website**: https://kite.trade/
- **Pricing**: ₹2,000/month per app
- **Features**:
  - Real-time streaming data
  - WebSocket API
  - Historical data
  - Complete trading APIs
  - Excellent documentation
- **Setup**:
  ```javascript
  const KiteConnect = require("kiteconnect").KiteConnect
  const kc = new KiteConnect({api_key: "your_api_key"})
  
  // Get quote
  kc.getQuote(["NSE:RELIANCE"])
  ```

### 3. IIFL Markets API
- **Website**: https://www.iiflsecurities.com/
- **Pricing**: Varies by plan
- **Features**:
  - Real-time data
  - NSE, BSE, MCX
  - Historical data
  - Good for Indian market

### 4. Finnhub (International but supports NSE)
- **Website**: https://finnhub.io/
- **Pricing**: Free tier: 60 calls/min, Paid from $0
- **Features**:
  - Real-time quotes
  - WebSocket support
  - Global coverage including NSE
- **Setup**:
  ```javascript
  const response = await fetch(
    'https://finnhub.io/api/v1/quote?symbol=RELIANCE.NS&token=YOUR_API_KEY'
  )
  ```
- **Get Key**: https://finnhub.io/register

### 5. Polygon.io
- **Website**: https://polygon.io/
- **Pricing**: Free tier available, Starter $199/month
- **Features**:
  - Real-time and delayed data
  - WebSocket streaming
  - Historical data
  - Good Indian stock coverage

---

## Free Alternatives (Limited)

### 1. IEX Cloud
- **Website**: https://iexcloud.io/
- **Pricing**: Free tier: 50,000 messages/month
- **Note**: Limited Indian stock coverage

### 2. Twelve Data
- **Website**: https://twelvedata.com/
- **Pricing**: Free: 800 API calls/day
- **Features**: Some Indian stock support

### 3. Marketstack
- **Website**: https://marketstack.com/
- **Pricing**: Free: 100 calls/month
- **Features**: Limited real-time, mostly EOD data

---

## Implementation Recommendations

### For Development/Testing
1. ✅ Use our multi-source system (NSE India → Yahoo → Alpha Vantage)
2. ✅ Add Alpha Vantage API key for better reliability
3. ✅ Cache aggressively (5-10 seconds for real-time feel)

### For Production
1. 🏆 **Best Choice**: Upstox or Zerodha Kite Connect
   - Most reliable for Indian markets
   - Real tick-by-tick data
   - WebSocket support for live updates
   
2. **Budget Option**: Finnhub
   - Good free tier
   - International platform
   - WebSocket support
   
3. **Hybrid Approach**:
   - Use NSE India for free real-time quotes
   - Use Upstox/Zerodha for historical data and charts
   - Implement WebSocket for live tickers

---

## Current API Endpoint Logic

```typescript
// app/api/multi-source-quote/route.ts
1. Try NSE India Official (fastest, most accurate)
   ↓ fails
2. Try Yahoo Finance (good fallback)
   ↓ fails
3. Try Alpha Vantage (if API key available)
   ↓ fails
4. Return market close prices (accurate but not real-time)
```

---

## WebSocket Implementation (For True Tick-by-Tick)

For real tick-by-tick data, you need WebSocket connection:

```typescript
// Example with Upstox WebSocket
import { WebSocket } from 'ws'

const ws = new WebSocket('wss://api.upstox.com/v2/feed/market-data-feed')

ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    keys: ['NSE_EQ|INE002A01018'] // Reliance
  }))
})

ws.on('message', (data) => {
  const quote = JSON.parse(data)
  // Update chart in real-time
  updateChart(quote)
})
```

---

## Next Steps

1. **Immediate**: The multi-source API is now active - prices should be stable
2. **Short-term**: Get Alpha Vantage free API key for better reliability
3. **Long-term**: Consider Upstox/Zerodha for production deployment

---

## Environment Variables Setup

Create `.env.local` file:

```bash
# Alpha Vantage (Free)
ALPHA_VANTAGE_API_KEY=your_key_here

# Finnhub (Free tier)
FINNHUB_API_KEY=your_key_here

# For Production:
# UPSTOX_API_KEY=your_key
# UPSTOX_API_SECRET=your_secret
# ZERODHA_API_KEY=your_key
# ZERODHA_API_SECRET=your_secret
```

Get free API keys:
- Alpha Vantage: https://www.alphavantage.co/support/#api-key
- Finnhub: https://finnhub.io/register
