# ICICIDirect Breeze API Session Token Setup

## Overview
The ICICIDirect Breeze API requires a two-step authentication process:
1. **Manual Session Token Generation** (via web browser)
2. **API Authentication** (using session token + API secret)

## Step 1: Get Your Session Token

### Method 1: Direct URL
1. Open your web browser
2. Navigate to: `https://api.icicidirect.com/apiuser/login?api_key=hy81732W44w7696#R0m~n20548F0M!60`
3. Log in with your ICICI Direct credentials
4. After successful login, you'll see a session token in the response
5. Copy this session token

### Method 2: Encoded URL (if special characters cause issues)
If your API key has special characters, use the encoded version:
1. Your encoded API key: `hy81732W44w7696%23R0m~n20548F0M%2160`
2. Navigate to: `https://api.icicidirect.com/apiuser/login?api_key=hy81732W44w7696%23R0m~n20548F0M%2160`

## Step 2: Update Environment Variables

Once you have the session token, add it to your `.env.local` file:

```bash
# Session Token (obtained from web interface)
BREEZE_SESSION_TOKEN=your_session_token_here

# Existing credentials
BREEZE_API_KEY=hy81732W44w7696#R0m~n20548F0M!60
BREEZE_API_SECRET=564^4z+`8g85549p3v4e0L85$2JQ2121
```

## Step 3: Authentication Flow

The updated authentication process will be:
1. Use the session token to authenticate with Breeze API
2. Generate API session using session token + API secret
3. Use the generated API session for all subsequent calls

## Important Notes

1. **Session Token Expiry**: Session tokens typically expire after 24 hours and need to be renewed
2. **Manual Process**: The session token generation requires manual login via web browser
3. **Security**: Keep your session token secure and don't share it
4. **Renewal**: You'll need to repeat Step 1 daily or when the token expires

## Next Steps

1. Follow Step 1 to get your session token
2. Add the session token to your `.env.local` file
3. Restart your development server
4. The API should now authenticate successfully

## Troubleshooting

- If you get 403 errors, check if your session token has expired
- Make sure your ICICI Direct account has API access enabled
- Verify all credentials are correctly entered in `.env.local`

## For Developers

The authentication implementation will be updated to:
```typescript
// Generate session using session token
breeze.generate_session(
  api_secret: "your_secret_key",
  session_token: "your_api_session"
)
```