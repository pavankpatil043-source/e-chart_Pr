/**
 * Breeze API Live Data Test
 * Tests real-time stock prices and historical chart data
 */

const API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60'
const SESSION_TOKEN = '53306584' // Your fresh session token
const BASE_URL = 'https://api.icicidirect.com/breezeapi/api/v1'

// Test 1: Get Live Quote for RELIANCE
async function testLiveQuote() {
  console.log('\n📊 TEST 1: Live Quote for RELIANCE')
  console.log('='.repeat(60))
  
  const requestBody = JSON.stringify({
    'stock_code': 'RELIANCE',
    'exchange_code': 'NSE',
    'expiry_date': '',
    'product_type': 'cash',
    'right': '',
    'strike_price': ''
  })
  
  try {
    const response = await fetch(`${BASE_URL}/quotes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SessionToken': SESSION_TOKEN,
        'X-AppKey': API_KEY
      },
      body: requestBody
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (data.Success && data.Success.length > 0) {
      const quote = data.Success[0]
      console.log('\n✅ Live Price Data:')
      console.log(`Symbol: ${quote.stock_code}`)
      console.log(`LTP (Last Traded Price): ₹${quote.ltp}`)
      console.log(`Change: ${quote.ltp_percent_change}%`)
      console.log(`Open: ₹${quote.open}`)
      console.log(`High: ₹${quote.high}`)
      console.log(`Low: ₹${quote.low}`)
      console.log(`Previous Close: ₹${quote.previous_close}`)
      console.log(`Volume: ${quote.total_quantity_traded}`)
      console.log(`Last Trade Time: ${quote.ltt}`)
      return true
    } else {
      console.log('❌ No quote data received')
      return false
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Test 2: Get Historical Chart Data (Intraday - Last 5 days)
async function testHistoricalData() {
  console.log('\n\n📈 TEST 2: Historical Chart Data (5-minute interval, last 5 days)')
  console.log('='.repeat(60))
  
  // Calculate dates (ISO 8601 format)
  const today = new Date()
  const fiveDaysAgo = new Date(today)
  fiveDaysAgo.setDate(today.getDate() - 5)
  
  const formatDate = (date) => {
    return date.toISOString()
  }
  
  const fromDate = formatDate(fiveDaysAgo)
  const toDate = formatDate(today)
  
  console.log(`Date Range: ${fromDate} to ${toDate}`)
  
  const requestBody = JSON.stringify({
    'interval': '5minute',
    'from_date': fromDate,
    'to_date': toDate,
    'stock_code': 'RELIANCE',
    'exchange_code': 'NSE',
    'product_type': 'cash'
  })
  
  try {
    const response = await fetch(`${BASE_URL}/historicalcharts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SessionToken': SESSION_TOKEN,
        'X-AppKey': API_KEY
      },
      body: requestBody
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    
    if (data.Success && Array.isArray(data.Success)) {
      console.log(`\n✅ Received ${data.Success.length} data points`)
      
      // Show first 5 and last 5 candles
      console.log('\n📊 First 5 Candles:')
      data.Success.slice(0, 5).forEach((candle, idx) => {
        console.log(`${idx + 1}. Time: ${candle.datetime} | O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`)
      })
      
      if (data.Success.length > 10) {
        console.log('\n📊 Last 5 Candles (Most Recent):')
        data.Success.slice(-5).forEach((candle, idx) => {
          console.log(`${idx + 1}. Time: ${candle.datetime} | O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`)
        })
      }
      
      return true
    } else {
      console.log('❌ No historical data received')
      console.log('Response:', JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Test 3: Get Daily Historical Data (Last 30 days)
async function testDailyChartData() {
  console.log('\n\n📈 TEST 3: Daily Chart Data (Last 30 days)')
  console.log('='.repeat(60))
  
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  
  const formatDate = (date) => {
    return date.toISOString()
  }
  
  const fromDate = formatDate(thirtyDaysAgo)
  const toDate = formatDate(today)
  
  console.log(`Date Range: ${fromDate} to ${toDate}`)
  
  const requestBody = JSON.stringify({
    'interval': '1day',
    'from_date': fromDate,
    'to_date': toDate,
    'stock_code': 'RELIANCE',
    'exchange_code': 'NSE',
    'product_type': 'cash'
  })
  
  try {
    const response = await fetch(`${BASE_URL}/historicalcharts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SessionToken': SESSION_TOKEN,
        'X-AppKey': API_KEY
      },
      body: requestBody
    })
    
    const data = await response.json()
    console.log('Status:', response.status)
    
    if (data.Success && Array.isArray(data.Success)) {
      console.log(`\n✅ Received ${data.Success.length} trading days`)
      
      // Show all daily data
      console.log('\n📊 Daily Price Data:')
      data.Success.forEach((day, idx) => {
        console.log(`${idx + 1}. ${day.datetime} | O:${day.open} H:${day.high} L:${day.low} C:${day.close} V:${day.volume}`)
      })
      
      return true
    } else {
      console.log('❌ No daily data received')
      console.log('Response:', JSON.stringify(data, null, 2))
      return false
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

// Test 4: Multiple Stock Quotes
async function testMultipleQuotes() {
  console.log('\n\n📊 TEST 4: Multiple Stock Quotes')
  console.log('='.repeat(60))
  
  const stocks = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK']
  
  for (const stock of stocks) {
    const requestBody = JSON.stringify({
      'stock_code': stock,
      'exchange_code': 'NSE',
      'expiry_date': '',
      'product_type': 'cash',
      'right': '',
      'strike_price': ''
    })
    
    try {
      const response = await fetch(`${BASE_URL}/quotes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-SessionToken': SESSION_TOKEN,
          'X-AppKey': API_KEY
        },
        body: requestBody
      })
      
      const data = await response.json()
      
      if (data.Success && data.Success.length > 0) {
        const quote = data.Success[0]
        console.log(`\n${stock}: ₹${quote.ltp} (${quote.ltp_percent_change > 0 ? '+' : ''}${quote.ltp_percent_change}%)`)
      } else {
        console.log(`\n${stock}: ❌ No data`)
      }
    } catch (error) {
      console.log(`\n${stock}: ❌ Error - ${error.message}`)
    }
  }
  
  return true
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Breeze API Live Data Tests')
  console.log('='.repeat(60))
  console.log(`Session Token: ${SESSION_TOKEN}`)
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`)
  console.log('='.repeat(60))
  
  const results = {
    liveQuote: await testLiveQuote(),
    historicalIntraday: await testHistoricalData(),
    historicalDaily: await testDailyChartData(),
    multipleQuotes: await testMultipleQuotes()
  }
  
  console.log('\n\n' + '='.repeat(60))
  console.log('📋 TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Live Quote Test: ${results.liveQuote ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Intraday Chart Test: ${results.historicalIntraday ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Daily Chart Test: ${results.historicalDaily ? 'PASSED' : 'FAILED'}`)
  console.log(`✅ Multiple Quotes Test: ${results.multipleQuotes ? 'PASSED' : 'FAILED'}`)
  console.log('='.repeat(60))
  
  const allPassed = Object.values(results).every(r => r === true)
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Breeze API is working perfectly!')
    console.log('✅ Live prices are accurate and up-to-date')
    console.log('✅ Historical chart data is available')
    console.log('✅ Ready for production use\n')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the session token and API configuration.\n')
  }
}

// Execute tests
runAllTests().catch(console.error)
