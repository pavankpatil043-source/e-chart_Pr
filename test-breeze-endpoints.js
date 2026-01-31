// Test Breeze API endpoints to debug the 403 errors
// This will help us understand what's working and what's not

const BREEZE_API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60'
const BREEZE_API_SECRET = '564^4z+`8g85549p3v4e0L85$2JQ2121'
const BREEZE_SESSION_TOKEN = '53256330'
const BREEZE_BASE_URL = 'https://api.icicidirect.com/breezeapi/api/v1'

async function testBreezeEndpoints() {
  console.log('🔄 Testing Breeze API endpoints with session token...')
  
  const headers = {
    'Content-Type': 'application/json',
    'X-SessionToken': BREEZE_SESSION_TOKEN,
    'apikey': BREEZE_API_KEY
  }

  // Test 1: Customer details
  try {
    console.log('\n1. Testing customer details...')
    const response = await fetch(`${BREEZE_BASE_URL}/customer/details`, {
      method: 'GET',
      headers
    })
    
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Customer details working!', data.success ? 'Success' : 'Got response')
    } else {
      const text = await response.text()
      console.log('❌ Customer details failed:', text.substring(0, 200))
    }
  } catch (error) {
    console.error('❌ Customer details error:', error.message)
  }

  // Test 2: Simple quotes
  try {
    console.log('\n2. Testing quotes endpoint...')
    const response = await fetch(`${BREEZE_BASE_URL}/quotes?stock_code=RELIANCE&exchange_code=NSE&product_type=cash`, {
      method: 'GET',
      headers
    })
    
    console.log(`Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Quotes working!', data.success ? 'Success' : 'Got response')
    } else {
      const text = await response.text()
      console.log('❌ Quotes failed:', text.substring(0, 200))
    }
  } catch (error) {
    console.error('❌ Quotes error:', error.message)
  }

  // Test 3: Try different header formats
  try {
    console.log('\n3. Testing alternative header format...')
    const altHeaders = {
      'Content-Type': 'application/json',
      'X-API-KEY': BREEZE_API_KEY,
      'X-SESSION-TOKEN': BREEZE_SESSION_TOKEN
    }
    
    const response = await fetch(`${BREEZE_BASE_URL}/quotes?stock_code=RELIANCE&exchange_code=NSE&product_type=cash`, {
      method: 'GET',
      headers: altHeaders
    })
    
    console.log(`Alt Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Alt headers working!', data.success ? 'Success' : 'Got response')
    } else {
      const text = await response.text()
      console.log('❌ Alt headers failed:', text.substring(0, 200))
    }
  } catch (error) {
    console.error('❌ Alt headers error:', error.message)
  }

  // Test 4: Try generating new session
  try {
    console.log('\n4. Testing session generation...')
    const sessionResponse = await fetch(`${BREEZE_BASE_URL}/customer/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'SessionToken': BREEZE_SESSION_TOKEN,
        'AppKey': BREEZE_API_KEY
      })
    })
    
    console.log(`Session Status: ${sessionResponse.status}`)
    const sessionText = await sessionResponse.text()
    console.log('Session Response:', sessionText.substring(0, 300))
  } catch (error) {
    console.error('❌ Session generation error:', error.message)
  }

  console.log('\n🏁 Breeze API testing complete!')
}

// Run the test
testBreezeEndpoints().catch(console.error)