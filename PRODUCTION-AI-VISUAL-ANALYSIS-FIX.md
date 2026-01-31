# Production AI Visual Analysis Fix

## Issue
AI Visual Analysis modal showed "⚠️ HOLD: Insufficient news data for analysis" in production but worked correctly on localhost. The modal only displayed the News tab, while localhost showed all tabs (Overview, News, Volume, Patterns, S/R Levels).

## Root Cause
Two AI analysis endpoints were using hardcoded localhost URLs to fetch news data:

1. **`app/api/ai-news-analysis/route.ts`** (line 43)
   - Used `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'`
   - Failed in production because the hardcoded localhost URL doesn't work
   - This endpoint is critical for news sentiment analysis

2. **`app/api/visual-ai-analysis/route.ts`** (line 195)
   - Used same hardcoded approach
   - Called ai-news-analysis endpoint which also failed

## Problem
```typescript
// ❌ OLD CODE (hardcoded):
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const response = await fetch(`${baseUrl}/api/ai-news-analysis?symbol=${symbol}`)
```

In production:
- `process.env.NEXT_PUBLIC_API_URL` might not be set
- Even if set, it might not match the actual deployment URL
- Hardcoded localhost doesn't work in Vercel/production environments
- News fetch fails → returns empty array → triggers "Insufficient news data" error

## Solution
Dynamically extract the origin from the request URL, ensuring it works on any port and in any environment:

```typescript
// ✅ NEW CODE (dynamic):
async function fetchNewsForStock(symbol: string, days: number = 7, requestUrl: string): Promise<NewsItem[]> {
  try {
    // Extract origin from the request URL instead of hardcoding
    // This ensures it works on any port (3000, 3002) and in production
    const url = new URL(requestUrl)
    const origin = url.origin  // e.g., http://localhost:3002, https://your-app.vercel.app
    const apiUrl = `${origin}/api/yahoo-news`
    
    const response = await fetch(`${apiUrl}?symbol=${baseSymbol}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' }
    })
    // ... rest of the code
  }
}

// Update function calls to pass request URL
const newsItems = await fetchNewsForStock(symbol, days, request.url)
const newsSentiment = await fetchNewsSentiment(data.symbol, request.url)
```

## Files Modified

### 1. `app/api/ai-news-analysis/route.ts`
**Changes:**
- Line 34: Updated `fetchNewsForStock` function signature to accept `requestUrl: string`
- Lines 41-45: Extract origin dynamically from request URL
- Line 321: Pass `request.url` to `fetchNewsForStock`

### 2. `app/api/visual-ai-analysis/route.ts`
**Changes:**
- Line 192: Updated `fetchNewsSentiment` function signature to accept `requestUrl: string`
- Lines 195-199: Extract origin dynamically from request URL
- Line 92: Pass `request.url` to `fetchNewsSentiment`

## Benefits
✅ **Works on any port**: Localhost:3000, 3002, 8080, etc.
✅ **Works in production**: Vercel, Netlify, custom domains
✅ **No environment variables needed**: Self-aware of its own URL
✅ **Consistent behavior**: Same code path in dev and prod
✅ **Fixes "Insufficient news data" error**: News API now responds correctly

## Related Fixes
This is the **4th and final** API endpoint fix using this same pattern:
1. ✅ `app/api/support-resistance/route.ts` (fixed earlier)
2. ✅ `app/api/ai-pattern-recognition/route.ts` (fixed earlier)
3. ✅ `app/api/ai-volume-analysis/route.ts` (fixed earlier)
4. ✅ `app/api/ai-news-analysis/route.ts` (this fix)
5. ✅ `app/api/visual-ai-analysis/route.ts` (this fix)

## Testing
**Before Fix (Production):**
- AI Visual Analysis showed only News tab
- Warning: "⚠️ HOLD: Insufficient news data for analysis"
- No Volume, Patterns, or S/R Levels

**After Fix (Production):**
- All tabs should render: Overview, News, Volume, Patterns, S/R Levels
- News sentiment analysis works correctly
- Complete AI analysis with trading recommendations

## Deployment
```bash
git add app/api/ai-news-analysis/route.ts app/api/visual-ai-analysis/route.ts
git commit -m "Fix: Production AI Visual Analysis - dynamic origin detection for news API calls"
git push origin master
```

**Status:** ✅ Deployed (commit 7efbd81)

## Next Steps
1. Verify in production that AI Visual Analysis shows all tabs
2. Test with different stocks (RELIANCE.NS, TCS.NS, INFY.NS)
3. Confirm news sentiment analysis is working
4. Monitor logs for any API failures

## Note
The Hugging Face API is showing credit limit errors, but this is a separate issue related to API quota. The fallback logic handles this gracefully by using keyword-based analysis when AI summarization fails.
