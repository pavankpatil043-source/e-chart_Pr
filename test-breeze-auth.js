// Test script to debug Breeze API authentication
// This will help us understand the correct authentication flow

const BREEZE_API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60'
const BREEZE_API_SECRET = '564^4z+`8g85549p3v4e0L85$2JQ2121'
const BREEZE_BASE_URL = 'https://api.icicidirect.com/breezeapi/api/v1'

async function testBreezeAuth() {
  console.log('🔄 Testing Breeze API Authentication...')
  
  // Method 1: Standard session endpoint
  try {
    console.log('Testing standard session endpoint...')
    const response = await fetch(`${BREEZE_BASE_URL}/customer/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': BREEZE_API_KEY
      },
      body: JSON.stringify({
        'api_secret': BREEZE_API_SECRET
      })
    })
    
    console.log(`Status: ${response.status}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))
    
    const text = await response.text()
    console.log(`Response: ${text}`)
    
    if (response.ok) {
      const data = JSON.parse(text)
      console.log('✅ Authentication successful!')
      console.log('Session data:', data)
      return data
    }
  } catch (error) {
    console.error('❌ Standard auth failed:', error)
  }
  
  // Method 2: Alternative authentication
  try {
    console.log('Testing alternative auth method...')
    const response = await fetch(`${BREEZE_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'api_key': BREEZE_API_KEY,
        'api_secret': BREEZE_API_SECRET
      })
    })
    
    console.log(`Alt Status: ${response.status}`)
    const text = await response.text()
    console.log(`Alt Response: ${text}`)
    
  } catch (error) {
    console.error('❌ Alternative auth failed:', error)
  }
  
  // Method 3: Check if we need user credentials instead of API credentials
  try {
    console.log('Testing user login method...')
    const response = await fetch(`${BREEZE_BASE_URL}/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'user_id': BREEZE_API_KEY,
        'password': BREEZE_API_SECRET
      })
    })
    
    console.log(`User Status: ${response.status}`)
    const text = await response.text()
    console.log(`User Response: ${text}`)
    
  } catch (error) {
    console.error('❌ User login failed:', error)
  }
}

// Run the test
testBreezeAuth().catch(console.error)