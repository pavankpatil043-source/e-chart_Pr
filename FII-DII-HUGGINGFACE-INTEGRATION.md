# FII/DII Enhanced Integration with Hugging Face AI

## Overview
This document describes the enhanced FII/DII (Foreign and Domestic Institutional Investor) data integration with AI-powered analysis using Hugging Face models.

## Features Implemented

### 1. Enhanced API Endpoint: `/api/fii-dii-enhanced`
A comprehensive API that fetches 30-day (or custom period) FII/DII historical data with optional AI analysis.

**Endpoint**: `GET /api/fii-dii-enhanced`

**Query Parameters**:
- `days` (optional): Number of days to fetch (default: 30)
  - Options: 7, 30, 60, 90
- `analyze` (optional): Set to `true` to include AI analysis
  - Example: `/api/fii-dii-enhanced?days=30&analyze=true`

**Response Structure**:
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-10-28",
      "fii": {
        "buy": 5234.56,
        "sell": 4890.23,
        "net": 344.33
      },
      "dii": {
        "buy": 3456.78,
        "sell": 3234.12,
        "net": 222.66
      }
    }
  ],
  "aiAnalysis": {
    "summary": "AI-generated market analysis...",
    "metrics": {
      "totalFIINet": 1234.56,
      "totalDIINet": 987.65,
      "avgFIINet": 41.15,
      "avgDIINet": 32.92,
      "fiiBuyingDays": 18,
      "fiiSellingDays": 12,
      "diiBuyingDays": 20,
      "diiSellingDays": 10,
      "recentFIINet": 234.56,
      "recentDIINet": 123.45
    },
    "sentiment": {
      "fii": "bullish",
      "dii": "bullish",
      "overall": "bullish"
    }
  },
  "metadata": {
    "source": "NSE India + AI Enhanced",
    "days": 30,
    "recordCount": 30,
    "lastUpdated": "2025-10-28T17:00:00.000Z",
    "hasAIAnalysis": true
  }
}
```

### 2. AI Analysis Using Hugging Face

**Model Used**: `mistralai/Mistral-7B-Instruct-v0.2`

**Analysis Includes**:
1. **Overall Market Sentiment**: Bullish or Bearish assessment from FII/DII flows
2. **Investor Comparison**: Which investor group is more aggressive
3. **Trend Analysis**: Recent 5-day trend vs 30-day trend
4. **Market Direction**: Predictions based on institutional flows
5. **Actionable Insights**: Key takeaways for traders

**AI Prompt Structure**:
```
Analyze this FII/DII (Foreign and Domestic Institutional Investor) data for Indian stock market:

Period: 30 days
FII Total Net Flow: ₹1234.56 Cr
DII Total Net Flow: ₹987.65 Cr
FII Average Daily: ₹41.15 Cr
DII Average Daily: ₹32.92 Cr

FII: 18 buying days, 12 selling days
DII: 20 buying days, 10 selling days

Recent 5-day trend:
FII Net: ₹234.56 Cr
DII Net: ₹123.45 Cr

Provide a concise analysis covering:
1. Overall market sentiment from FII/DII flows
2. Which investor group is more bullish/bearish
3. Recent trend reversal or continuation
4. What this means for market direction
5. Key insight for traders
```

### 3. Enhanced UI Component: `FIIDIIDataPanelEnhanced`

**Location**: `components/fii-dii-data-panel-enhanced.tsx`

**Features**:
- **Interactive Bar Chart**: 
  - Hover to see detailed daily data
  - Blue bars for FII, Amber bars for DII
  - Green for net buying, Red for net selling
  - Tooltip shows exact values on hover

- **Summary Cards**:
  - FII Net Flow with trend indicator
  - DII Net Flow with trend indicator  
  - Total Net Flow (combined)
  - Average daily flows

- **Two Tabs**:
  1. **Candlestick Chart**: Visual representation of flows
  2. **Flow Summary**: Tabular view of recent 7 days

- **AI Analysis Section**:
  - "Analyze with AI" button
  - Displays sentiment badges (Bullish/Bearish)
  - Shows detailed AI-generated insights
  - Presents key metrics in grid format

**Color Scheme**:
- **FII (Foreign)**: Blue (`#3B82F6`)
- **DII (Domestic)**: Amber (`#FBBF24`)
- **Positive Flow**: Green (`#22C55E`)
- **Negative Flow**: Red (`#EF4444`)
- **AI Section**: Purple gradient (`from-purple-500/10 to-indigo-500/10`)

### 4. Data Sources (Fallback Chain)

1. **Primary**: NSE India (`/api/nse-fiidii`)
2. **Secondary**: MoneyControl (`/api/moneycontrol-fiidii`)
3. **Tertiary**: Realistic fallback data with wave patterns

**Fallback Data Generation**:
- Creates realistic FII/DII flows using sine wave patterns
- Adds volatility using random variations
- Ensures weekends are skipped
- Generates data that mimics real market behavior

## Implementation Details

### API File Structure
```
app/
  api/
    fii-dii-enhanced/
      route.ts          # Main API endpoint
```

### Component Files
```
components/
  fii-dii-data-panel-enhanced.tsx    # Enhanced UI component
  ui/
    skeleton.tsx                      # Loading skeleton component
```

### Key Functions

#### `fetch30DaysFIIDIIData(days: number)`
Fetches historical FII/DII data from multiple sources with fallback.

#### `analyzeFIIDIIWithAI(data: FIIDIIDataPoint[])`
Uses Hugging Face Mistral model to analyze FII/DII flows and generate insights.

#### `generateFallbackData(days: number)`
Creates realistic fallback data when APIs are unavailable.

#### `drawBarChart()`
Renders interactive canvas-based bar chart with hover effects.

## Usage Examples

### 1. Fetch 30-day data without AI
```bash
curl http://localhost:3002/api/fii-dii-enhanced?days=30
```

### 2. Fetch 30-day data with AI analysis
```bash
curl "http://localhost:3002/api/fii-dii-enhanced?days=30&analyze=true"
```

### 3. Using in React Component
```tsx
const fetchFIIDIIData = async (includeAI: boolean = false) => {
  const response = await fetch(
    `/api/fii-dii-enhanced?days=30&analyze=${includeAI}`
  )
  const result = await response.json()
  
  if (result.success) {
    setFiiDiiData(result.data)
    if (result.aiAnalysis) {
      setAiAnalysis(result.aiAnalysis)
    }
  }
}
```

## Environment Variables Required

```bash
# Hugging Face API Key for AI Analysis
HUGGINGFACE_API_KEY=hf_your_key_here
```

Get your free API key at: https://huggingface.co/settings/tokens

## Caching Strategy

- **Cache Duration**: 5 minutes (300 seconds)
- **Cache Key**: `fii-dii-enhanced-${days}`
- **Benefits**: Reduces API calls and speeds up repeated requests

## Performance Optimization

1. **Parallel Data Fetching**: Multiple source attempts happen sequentially but quickly
2. **Canvas Rendering**: High-performance chart rendering
3. **Selective AI Analysis**: AI only runs when requested
4. **Smart Caching**: Reduces redundant API calls

## Error Handling

### If NSE API Fails
- Falls back to MoneyControl
- If both fail, generates realistic fallback data
- **User Impact**: Minimal, always shows data

### If Hugging Face API Fails
- Returns basic sentiment analysis without AI
- Shows "AI analysis unavailable" message
- **User Impact**: No AI insights, but data still visible

### If All Sources Fail
- Generates realistic fallback data with trends
- Shows warning message
- **User Impact**: Can still see patterns and trends

## Testing Checklist

- [x] API endpoint responds correctly
- [x] 30-day data fetching works
- [x] AI analysis integration with Hugging Face
- [x] Interactive bar chart with hover effects
- [x] Summary cards display correct totals
- [x] Sentiment badges show correct colors
- [x] Fallback data generation works
- [x] Caching mechanism functions properly
- [x] Error handling for failed API calls
- [x] UI responsiveness on different screens

## Production Deployment Notes

### Required Environment Variables (Vercel)
```bash
HUGGINGFACE_API_KEY=your_production_key_here
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Monitoring
- Check Hugging Face API usage at: https://huggingface.co/settings/billing
- Free tier: 30,000 API calls per month
- Monitor for rate limiting

### Performance Tips
1. Use caching aggressively (already implemented)
2. Lazy load AI analysis (only when button clicked)
3. Consider serverless function timeout limits (default 10s on Vercel)

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: WebSocket integration for live FII/DII flows
2. **Historical Comparison**: Compare current period with previous period
3. **Sector-wise FII/DII**: Break down flows by sectors
4. **Export Data**: Allow downloading data as CSV/Excel
5. **Alerts**: Notify when FII/DII flows cross thresholds
6. **More AI Models**: Try GPT-4 or Claude for richer analysis
7. **Technical Indicators**: Add RSI, MACD based on FII/DII flows

### UI Enhancements
1. **Dark/Light Mode Toggle**: Better theme support
2. **Mobile Optimization**: Improve touch interactions
3. **Print View**: Optimize for printing reports
4. **Share Feature**: Share insights on social media

## Troubleshooting

### "Cannot find module '@/components/ui/skeleton'"
**Solution**: Run TypeScript compiler or restart dev server
```bash
npm run dev
```

### "Hugging Face API timeout"
**Solution**: 
- Check API key is valid
- Try again (may be model loading)
- Use fallback analysis (already implemented)

### "No data displayed"
**Solution**:
- Check network console for API errors
- Verify NSE/MoneyControl APIs are accessible
- Fallback data should still appear

### Chart not interactive
**Solution**:
- Ensure canvas is rendering (check browser console)
- Try refreshing the page
- Check browser compatibility (modern browsers only)

## Support & Documentation

- **Hugging Face Docs**: https://huggingface.co/docs/api-inference
- **NSE India**: https://www.nseindia.com
- **MoneyControl**: https://www.moneycontrol.com

## License

This feature is part of the e-chart trading platform. All rights reserved.

---

**Last Updated**: October 28, 2025
**Version**: 1.0.0
**Author**: AI Trading Platform Team
