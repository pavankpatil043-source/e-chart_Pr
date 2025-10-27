# Production Session Management for Breeze API

## Overview

This document explains the production-grade session management system that automatically handles Breeze API session token expiration and refresh.

## 🚀 Key Features

### 1. **Automatic Session Refresh**
- Monitors session token validity continuously
- Refreshes tokens automatically 15 minutes before expiration
- Prevents service disruption from expired sessions

### 2. **Health Monitoring**
- Background health checks every 5 minutes
- Validates session status proactively
- Logs session health metrics

### 3. **Retry Logic with Exponential Backoff**
- Attempts authentication up to 3 times on failure
- Exponential backoff delays: 2s, 4s, 8s
- Graceful degradation to fallback data sources

### 4. **Manual Management Interface**
- Web-based session manager dashboard
- Real-time session status monitoring
- Manual session refresh and token update capabilities

## 📁 Architecture

```
lib/
  └── production-breeze-manager.ts  # Core session management singleton

app/api/
  ├── session-manager/
  │   └── route.ts                  # Session management API endpoints
  └── breeze-live-price/
      └── route.ts                  # Updated to use production manager

components/
  └── session-manager.tsx           # Admin dashboard UI

app/
  └── session-manager/
      └── page.tsx                  # Dashboard page route
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Required for basic API access
BREEZE_API_KEY=your_api_key
BREEZE_API_SECRET=your_api_secret
BREEZE_SESSION_TOKEN=your_current_token

# Optional: For automatic session refresh (production)
BREEZE_USER_ID=your_icici_user_id
BREEZE_PASSWORD=your_icici_password
```

### Session Lifecycle Parameters

```typescript
// Session expires 24 hours from creation
SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000

// Refresh 15 minutes before expiration
REFRESH_BUFFER_MS = 15 * 60 * 1000

// Health check every 5 minutes
HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000

// Retry up to 3 times with exponential backoff
MAX_RETRY_ATTEMPTS = 3
```

## 💻 Usage

### 1. Access the Session Manager Dashboard

Navigate to: **http://localhost:3000/session-manager**

The dashboard shows:
- ✅ Session status (active/needs refresh)
- ⏰ Time until expiration
- 🔧 Configuration status (which env variables are set)
- 🔄 Manual refresh controls
- 📝 Manual token update form

### 2. Using the Production Manager in Your Code

```typescript
import { getProductionBreezeManager } from '@/lib/production-breeze-manager'

// Get the singleton instance
const manager = getProductionBreezeManager()

// Get a valid session token (automatically refreshes if needed)
const sessionToken = await manager.getValidSession()

if (sessionToken) {
  // Use the token for API calls
  const breezeAPI = new BreezeAPIService({
    apiKey: process.env.BREEZE_API_KEY,
    apiSecret: process.env.BREEZE_API_SECRET,
    sessionToken
  })
  
  const quotes = await breezeAPI.getQuotes(['RELIANCE'], 'NSE')
}
```

### 3. API Endpoints

#### GET `/api/session-manager`
Returns current session status:

```json
{
  "session": {
    "active": true,
    "valid": true,
    "expiresIn": 85200,  // seconds
    "expiresAt": "2025-10-12T18:30:00.000Z",
    "timeToExpiry": "23h 40m"
  },
  "configuration": {
    "api_key": true,
    "api_secret": true,
    "user_id": false,
    "password": false,
    "session_token": true
  },
  "status": "active",
  "lastChecked": "2025-10-11T18:50:00.000Z"
}
```

#### POST `/api/session-manager`
Manual session management:

**Refresh Session:**
```json
{
  "action": "refresh"
}
```

**Update Token:**
```json
{
  "action": "update",
  "sessionToken": "new_session_token_here"
}
```

## 🔄 How It Works

### Automatic Session Lifecycle

1. **Initialization**
   - Production manager starts as singleton on first API call
   - Loads session token from environment variable
   - Calculates expiration time (24 hours from now)

2. **Active Monitoring**
   - Health check runs every 5 minutes
   - Validates session status
   - Logs session health metrics

3. **Pre-emptive Refresh**
   - When session has < 15 minutes remaining:
     - Attempts automatic refresh using credentials
     - Retries up to 3 times with exponential backoff
     - Falls back to manual token update if automatic fails

4. **Graceful Degradation**
   - If session refresh fails, API falls back to Yahoo Finance
   - User sees "Fallback Data" badge in UI
   - Service remains operational while session issues are resolved

### Session Validation Flow

```
API Request
    ↓
getValidSession()
    ↓
Is session valid? ───YES──→ Return token
    ↓ NO
Attempt refresh
    ↓
Success? ───YES──→ Return new token
    ↓ NO
Return null
    ↓
Fall back to Yahoo Finance
```

## 🛠️ Production Deployment

### Step 1: Configure Environment Variables

```bash
# Production .env
BREEZE_API_KEY=your_production_api_key
BREEZE_API_SECRET=your_production_api_secret

# Option A: Manual token management (requires daily updates)
BREEZE_SESSION_TOKEN=get_fresh_token_daily

# Option B: Automatic token management (recommended)
BREEZE_USER_ID=your_icici_user_id
BREEZE_PASSWORD=your_icici_password
```

### Step 2: Set Up Monitoring

```typescript
// Add to your monitoring/logging service
import { getProductionBreezeManager } from '@/lib/production-breeze-manager'

// Check session health
const manager = getProductionBreezeManager()
const status = manager.getSessionStatus()

// Alert if session is invalid
if (!status.isValid) {
  sendAlert('Breeze session is invalid or expiring soon')
}
```

### Step 3: Configure Alerts

Set up alerts for:
- ⚠️ Session expires in < 30 minutes
- ❌ Session refresh failed
- ⚠️ Falling back to Yahoo Finance data
- ✅ Session successfully refreshed

## 🔐 Security Best Practices

1. **Never commit credentials to version control**
   - Use `.env.local` for local development
   - Use secure secret management in production (AWS Secrets Manager, Azure Key Vault, etc.)

2. **Rotate session tokens regularly**
   - Even with automatic refresh, rotate credentials monthly
   - Use the dashboard to verify token validity

3. **Monitor session access**
   - Log all session refresh attempts
   - Alert on repeated failures
   - Track which services are using the session

4. **Implement rate limiting**
   - Prevent session token abuse
   - Already implemented in live price endpoint (60 requests/minute)

## 📊 Monitoring Dashboard

The session manager dashboard (`/session-manager`) provides:

### Real-Time Status
- 🟢 Active: Session is valid and working
- 🔴 Needs Refresh: Session expired or expiring soon
- 🟡 Warning: Session valid but approaching expiration

### Configuration Check
Shows which environment variables are configured:
- ✅ Green checkmark: Variable is set
- ❌ Red X: Variable is missing

### Manual Controls
- 🔄 **Refresh Session**: Manually trigger session refresh
- 📝 **Update Token**: Paste new session token from ICICI portal

## 🐛 Troubleshooting

### Session Keeps Expiring

**Symptoms:** Dashboard shows "needs_refresh" status

**Solutions:**
1. Add `BREEZE_USER_ID` and `BREEZE_PASSWORD` to `.env.local` for automatic refresh
2. Manually update token daily from ICICI portal
3. Check if credentials are correct

### Automatic Refresh Fails

**Symptoms:** Console logs show "Session refresh failed"

**Solutions:**
1. Verify `BREEZE_USER_ID` and `BREEZE_PASSWORD` are correct
2. Check ICICI account status (not locked, 2FA configured)
3. Update session token manually through dashboard
4. Review Breeze API documentation for authentication changes

### Data Shows "Fallback" Badge

**Symptoms:** UI shows Yahoo Finance data instead of Breeze

**Solutions:**
1. Check session status in dashboard
2. Refresh session manually
3. Verify API credentials are correct
4. Check Breeze API service status

## 🎯 Benefits in Production

### Before (Manual Session Management)
- ❌ Service breaks when session expires
- ❌ Requires manual token updates daily
- ❌ No visibility into session health
- ❌ No graceful degradation

### After (Production Session Manager)
- ✅ Automatic session refresh
- ✅ Pre-emptive expiration handling
- ✅ Real-time session monitoring
- ✅ Graceful fallback to Yahoo Finance
- ✅ Admin dashboard for manual control
- ✅ Comprehensive logging and alerts

## 📈 Performance Impact

- **Memory:** ~1KB for singleton instance
- **CPU:** Negligible (health checks every 5 minutes)
- **Network:** 1 request per 24 hours (automatic refresh)
- **Latency:** +0ms (async background processing)

## 🔗 Related Documentation

- [Breeze API Setup Guide](./BREEZE-SESSION-SETUP.md)
- [Yahoo Finance Fallback System](./YAHOO-FINANCE-INTEGRATION.md)
- [API Rate Limiting](./API-RATE-LIMITING.md)

## 📝 Changelog

### v1.0.0 (October 11, 2025)
- ✅ Initial production session manager implementation
- ✅ Automatic session refresh with retry logic
- ✅ Health monitoring system
- ✅ Web-based admin dashboard
- ✅ Integration with live price endpoints
- ✅ Graceful fallback to Yahoo Finance

---

**Need Help?** Check the dashboard at `/session-manager` or review console logs for detailed session information.
