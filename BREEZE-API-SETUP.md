# ICICIDirect Breeze API Integration Guide

## 🚀 Complete Live Data Setup

Your trading platform is now configured to use **ICICIDirect Breeze API** for all live market data! This provides real-time Indian stock market data including:

- ✅ **Live Stock Quotes** (RELIANCE, TCS, HDFC, INFY, etc.)
- ✅ **Real-time FII/DII Data** 
- ✅ **Historical Charts** with candlestick data
- ✅ **Indian Market Indices** (Nifty, Bank Nifty, Sensex)
- ✅ **Intraday & Historical Data**

## 📋 Setup Steps

### 1. **Get Breeze API Credentials**

1. **Open ICICIDirect Account** (if you don't have one)
   - Visit: https://www.icicidirect.com/
   - Complete account opening process

2. **Apply for API Access**
   - Login to ICICIDirect
   - Go to **API Services** section
   - Apply for **Breeze API** access
   - Get your `API Key` and `API Secret`

### 2. **Configure Environment Variables**

1. **Copy Environment Template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Add Your Breeze API Credentials** in `.env.local`:
   ```env
   BREEZE_API_KEY=your_actual_api_key_here
   BREEZE_API_SECRET=your_actual_api_secret_here
   BREEZE_BASE_URL=https://api.icicidirect.com/breezeapi/api/v1
   ```

### 3. **API Endpoints Available**

Your application now has these live data endpoints:

#### **Stock Quotes** 🏦
```bash
# Single stock quote
GET /api/breeze-quote?symbol=RELIANCE&exchange=NSE

# Batch quotes  
POST /api/breeze-quote
Body: { "symbols": ["RELIANCE", "TCS", "HDFCBANK"], "exchange": "NSE" }
```

#### **Historical Charts** 📊  
```bash
GET /api/breeze-chart?symbol=RELIANCE&range=1mo&interval=1d
```

#### **Market Indices** 📈
```bash
GET /api/breeze-indices
```

#### **FII/DII Data** 💰
```bash
GET /api/fii-dii-data?period=7d
# Now fetches from Breeze API as primary source
```

### 4. **Frontend Integration**

Your components automatically use the new APIs:

- **Stock Selector**: Uses `/api/breeze-quote` for live prices
- **Charts**: Uses `/api/breeze-chart` for candlestick data  
- **FII/DII Panel**: Uses Breeze as primary data source
- **Market Overview**: Uses `/api/breeze-indices` for indices

## 🔧 **Features & Benefits**

### **Real-time Data** ⚡
- Live stock prices updated every few seconds
- Real institutional money flow (FII/DII) data
- Accurate market indices with minimal delay

### **Fallback System** 🛡️  
- If Breeze API is unavailable, uses simulated data
- Seamless experience even during API downtime
- Clear indicators when using fallback data

### **Rate Limiting** ⏱️
- Built-in rate limiting to prevent API abuse
- Intelligent caching to minimize API calls
- Optimized for production use

### **Error Handling** 🔍
- Comprehensive error logging
- Automatic retry mechanisms  
- Graceful degradation to backup data

## 📊 **Data Sources Priority**

1. **Primary**: ICICIDirect Breeze API (Live Data)
2. **Secondary**: Yahoo Finance API (Backup)  
3. **Fallback**: Simulated Data (Offline mode)

## 🔐 **Security Best Practices**

- ✅ API credentials stored in environment variables only
- ✅ Rate limiting to prevent abuse
- ✅ Request logging for monitoring
- ✅ No credentials exposed in frontend code

## 📈 **Performance Optimization**

- **Caching**: 10-30 second cache for live data
- **Batch Requests**: Multiple stocks in single API call
- **Connection Pooling**: Efficient API connections
- **Background Updates**: Non-blocking data fetches

## 🧪 **Testing Your Setup**

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test API endpoints**:
   ```bash
   # Test stock quote
   curl http://localhost:3000/api/breeze-quote?symbol=RELIANCE
   
   # Test chart data
   curl http://localhost:3000/api/breeze-chart?symbol=TCS&range=1d
   
   # Test indices
   curl http://localhost:3000/api/breeze-indices
   ```

3. **Check browser console** for data source indicators:
   - `"source": "Breeze API (Live)"` = Real data ✅
   - `"source": "Fallback Data (Simulated)"` = Backup data ⚠️

## 🚨 **Troubleshooting**

### **No Live Data Showing**
1. Check `.env.local` has correct API credentials
2. Verify Breeze API key is active and has permissions
3. Check browser console for authentication errors

### **"Fallback Data" Warning**
1. Verify internet connection
2. Check Breeze API server status
3. Confirm API key hasn't expired

### **Rate Limit Errors**
1. Reduce refresh frequency in components
2. Check if multiple instances are running
3. Contact ICICIDirect for higher limits if needed

## 📱 **Supported Instruments**

- **Equities**: NSE & BSE stocks
- **Indices**: Nifty 50, Bank Nifty, Sensex, etc.
- **FII/DII**: Institutional investment flows
- **Futures**: F&O data (if enabled in account)

## 🎯 **Next Steps**

1. **Get your Breeze API credentials** from ICICIDirect
2. **Add them to `.env.local`** 
3. **Restart the development server**
4. **Enjoy real-time Indian market data!** 🎉

Your trading platform now has professional-grade live data integration, giving you the same data quality used by trading professionals and institutions!

---

**Need Help?** Check the Breeze API documentation at ICICIDirect or review the error logs in your browser console for specific issues.