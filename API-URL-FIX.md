# API URL Fix Documentation

## Issue
All AI analysis APIs were using hardcoded `http://localhost:3002` which causes `ECONNREFUSED` errors when the server runs on a different port (3000, 3001, 3003, etc.).

## Root Cause
```typescript
fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/...`)
```

When `NEXT_PUBLIC_API_URL` is not set, it defaults to port 3002, but Next.js often runs on 3000, 3001, or 3003.

## Solution
Use relative URLs for internal API-to-API calls in Next.js:

### ❌ Bad (Absolute URL):
```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/yahoo-news?symbol=${symbol}`
)
```

### ✅ Good (Relative URL):
```typescript
const response = await fetch(`/api/yahoo-news?symbol=${symbol}`)
```

### ✅ Better (With Environment Variable Support):
```typescript
const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
const apiUrl = baseUrl ? `${baseUrl}/api/yahoo-news` : `/api/yahoo-news`
const response = await fetch(`${apiUrl}?symbol=${symbol}`)
```

## Files to Fix

1. ✅ **app/api/ai-news-analysis/route.ts** - FIXED
   - Line 42: Changed to relative URL with environment variable fallback

2. ⚠️ **app/api/ai-volume-analysis/route.ts** - NEEDS FIX
   - Line 73: Still uses `localhost:3002`

3. ⚠️ **app/api/ai-pattern-recognition/route.ts** - NEEDS FIX
   - Line 59: Still uses `localhost:3002`

4. ⚠️ **app/api/support-resistance/route.ts** - NEEDS FIX
   - Line 90: Still uses `localhost:3002`

5. ⚠️ **app/api/ai-huggingface-sentiment/route.ts** - NEEDS FIX
   - Line 51: Still uses `localhost:3002`

## Quick Fix Command

To test if port is the issue, set environment variable:
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Permanent Fix

Replace all instances of:
```typescript
`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/...`
```

With:
```typescript
const getApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  return baseUrl ? `${baseUrl}${path}` : path
}

// Usage
const response = await fetch(getApiUrl('/api/yahoo-news?symbol=RELIANCE'))
```

## Why Relative URLs Work Better

In Next.js API routes:
- **Same server**: API routes run on same Next.js server
- **No port issues**: Relative URLs automatically use current port
- **Environment agnostic**: Works in development, staging, production
- **No CORS**: Internal calls don't need CORS configuration

## Testing

After fix, these should all work:
```bash
✅ http://localhost:3000
✅ http://localhost:3001
✅ http://localhost:3002
✅ http://localhost:3003
✅ https://your-domain.com (production)
```

## Alternative: Use Next.js Rewrite

In `next.config.mjs`:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: '/api/:path*',
    },
  ]
}
```

This ensures all API calls stay within the same server context.
