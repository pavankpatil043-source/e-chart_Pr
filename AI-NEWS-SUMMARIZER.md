# AI News Summarization Feature

## Overview
This feature enhances your Financial News panel with AI-powered capabilities:
- **3-line AI summaries** of long articles using Hugging Face
- **Market Impact Score** (0-100) rating how news affects the market
- **Stock-Specific Impact** detection - identifies which stocks are mentioned
- **Expand/Collapse** toggle to show full article details

## Features

### 1. AI-Powered Summaries
- Uses **Facebook's BART model** (facebook/bart-large-cnn) for news summarization
- Automatically generates concise 3-line summaries
- Falls back to first 3 sentences if AI is unavailable
- Displayed with purple highlight in news cards

### 2. Market Impact Score (0-100)
The system analyzes news content and calculates an impact score based on:

**High Impact Keywords** (+15 points each):
- `rate cut`, `rate hike`, `interest rate`, `RBI`, `Reserve Bank`
- `policy change`, `regulation`, `ban`, `SEBI`
- `merger`, `acquisition`, `quarterly results`, `earnings`
- `profit warning`, `loss`, `bankruptcy`, `scandal`, `fraud`
- `crash`, `surge`, `record high`, `record low`, `crisis`

**Medium Impact Keywords** (+8 points each):
- `growth`, `expansion`, `investment`, `launch`, `partnership`
- `revenue`, `sales`, `forecast`, `outlook`, `guidance`
- `upgrade`, `downgrade`, `target price`, `recommendation`

**Low Impact Keywords** (+3 points each):
- `appointment`, `resignation`, `dividend`, `bonus`, `split`
- `meeting`, `conference`, `announcement`, `statement`

**Sentiment Boost**:
- Positive sentiment: +10 points
- Negative sentiment: +15 points (negative news often has higher impact)

**Score Ranges**:
- **0-49**: Low Impact (Blue badge)
- **50-74**: Medium Impact (Orange badge)
- **75-100**: High Impact (Red badge)

### 3. Stock Detection
Automatically detects mentions of 20+ major Indian stocks:
- Reliance, TCS, HDFC Bank, Infosys, ICICI Bank
- HUL, ITC, SBI, Bharti Airtel, Kotak Bank
- L&T, Axis Bank, Asian Paints, Maruti Suzuki
- Wipro, Ultratech, Bajaj Finance, Tata Steel
- Sun Pharma, Tech Mahindra

Shows up to 3 affected stocks in badges, with "+X" for additional stocks.

## Setup

### Step 1: Get Hugging Face API Key
1. Go to [https://huggingface.co](https://huggingface.co)
2. Create a free account (if you don't have one)
3. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
4. Click **"New Token"**
5. Give it a name (e.g., "News Summarizer")
6. Select **"Read"** access
7. Click **"Generate"**
8. Copy your API key

### Step 2: Add API Key to Environment
1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your Hugging Face API key:
```bash
HUGGINGFACE_API_KEY=hf_your_actual_api_key_here
```

### Step 3: Restart Server
```bash
npm run dev
```

## API Endpoint

### POST /api/summarize-news

**Request:**
```json
{
  "articles": [
    {
      "id": "article-1",
      "title": "RBI Announces Interest Rate Cut",
      "description": "The Reserve Bank of India has announced a 0.25% cut in repo rates...",
      "sentiment": "positive"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "article-1",
      "summary": "RBI cuts repo rate by 0.25%. Expected to boost economic growth. Markets react positively.",
      "marketImpactScore": 85,
      "affectedStocks": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS"]
    }
  ]
}
```

## UI Changes

### News Card Layout
Each news article now shows:

1. **Article Title** (same as before)
2. **AI Summary** (new - purple highlighted box with ✨ Sparkles icon)
3. **Market Impact** (new):
   - 🎯 Target icon
   - Impact level: Low/Medium/High
   - Numeric score (0-100)
4. **Affected Stocks** (new):
   - 📊 Chart icon
   - Up to 3 stock badges
   - "+X more" if additional stocks detected
5. **Expand/Collapse Button** (new):
   - Shows full article description when expanded
6. **Category & Sentiment Badges** (same as before)
7. **Source & Time** (same as before)

### Example Display
```
📰 NSE Nifty 50 Shows Strong Performance
✨ AI Summary
│ Nifty 50 index gains 2.5% today. Banking and IT sectors
│ lead the rally. Market sentiment remains positive.
│
🎯 Impact: High (82) 📊 Stocks: RELIANCE, TCS, HDFC
▼ Show Full Article

[Category: Market] [🟢 Positive]
Economic Times • 2h ago
```

## How It Works

1. **News Fetch**: When news is loaded, articles are fetched from `/api/financial-news`
2. **Auto-Summarize**: System automatically calls `/api/summarize-news` with all articles
3. **Batch Processing**: Articles are processed in batches of 3 to avoid rate limits
4. **AI Analysis**: For each article:
   - Hugging Face generates summary
   - Keywords are analyzed for impact score
   - Stock names are detected in text
5. **UI Update**: News panel updates with summaries, scores, and stocks
6. **Expand on Demand**: Click "Show Full Article" to see original description

## Performance

- **Batch Size**: 3 articles per batch
- **Delay Between Batches**: 500ms
- **Processing Time**: ~2-3 seconds per batch
- **Total Time**: ~5-10 seconds for 10-15 articles
- **Cache**: Summaries are cached in component state (not re-fetched on re-render)

## Fallbacks

If AI summarization fails:
1. Falls back to extracting first 3 sentences from description
2. If no sentences, truncates description to 150 characters
3. Market impact score still calculated from keywords
4. Stock detection still works

## Cost

- **Hugging Face API**: FREE for up to 30,000 API calls per month
- **Model**: facebook/bart-large-cnn (free tier)
- **Usage**: ~10-20 calls per news panel load (depends on article count)
- **Estimate**: Can handle thousands of news loads per month for free

## Console Logs

Watch for these logs in browser console:
```
🤖 Starting AI summarization for 10 articles...
✅ AI summarization complete: 10 summaries
```

In server terminal:
```
🤖 Summarizing 10 articles...
✅ Successfully summarized 10 articles
```

## Troubleshooting

### Issue: No summaries appearing
**Solution**: Check that you've added `HUGGINGFACE_API_KEY` to `.env.local` and restarted server

### Issue: "Rate limit exceeded"
**Solution**: Free tier has limits. Wait a few minutes or upgrade to paid tier

### Issue: Summaries are just truncated text
**Solution**: This is the fallback - check console for API errors

### Issue: No stocks detected
**Solution**: Stock detection only works for 20 major Indian companies listed in the code

### Issue: Impact scores seem wrong
**Solution**: Scores are keyword-based. Can adjust keywords in `/api/summarize-news/route.ts`

## Customization

### Add More Stocks
Edit `/app/api/summarize-news/route.ts`:
```typescript
const INDIAN_STOCKS = [
  { symbol: "ADANIENT.NS", names: ["adani enterprises", "adani"] },
  // Add more...
]
```

### Adjust Impact Keywords
Edit the `MARKET_IMPACT_KEYWORDS` object in the same file.

### Change Summary Length
Modify the Hugging Face parameters:
```typescript
parameters: {
  max_length: 100,  // Change to 150 for longer summaries
  min_length: 30,   // Change to 50 for more detail
}
```

### Use Different AI Model
Replace `facebook/bart-large-cnn` with:
- `sshleifer/distilbart-cnn-12-6` (faster, slightly lower quality)
- `google/pegasus-xsum` (extreme summarization - very concise)

## Next Steps

Potential enhancements:
1. **Cache Summaries in Database**: Avoid re-processing same articles
2. **Real-time Summarization**: Summarize as articles load (streaming)
3. **Multi-language Support**: Detect and handle Hindi/regional news
4. **Sentiment Re-analysis**: Use AI to re-calculate sentiment from summary
5. **Click to Trade**: Add "Trade" button for detected stocks
6. **Impact Predictions**: Predict stock price movement based on news impact

## Files Modified

1. `app/api/summarize-news/route.ts` - New API endpoint
2. `components/enhanced-news-panel.tsx` - Enhanced UI with AI features
3. `.env.example` - Added HUGGINGFACE_API_KEY

## Support

If you encounter issues:
1. Check console logs (browser + server)
2. Verify API key is valid
3. Test API directly: `curl -X POST http://localhost:3000/api/summarize-news`
4. Check Hugging Face status: https://status.huggingface.co

---

**Built with ❤️ using Hugging Face and Next.js**
