const https = require('https');
const http = require('http');

// Test the corrected Breeze API implementation
async function testBreezeAPI() {
  console.log('🔧 Testing Breeze API with corrected authentication...');
  
  const API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60';
  const SECRET = '564^4z+`8g85549p3v4e0L85$2JQ2121';
  const SESSION_TOKEN = '53256330';
  
  // Test session generation with correct headers
  console.log('\n1️⃣ Testing session generation with appkey header...');
  
  const sessionData = {
    SessionToken: SESSION_TOKEN,
    AppKey: API_KEY
  };
  
  const options = {
    hostname: 'api.icicidirect.com',
    port: 443,
    path: '/breezeapi/api/v1/customerdetails',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-SessionToken': SESSION_TOKEN,
      'appkey': API_KEY  // Using 'appkey' as per official documentation
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📦 Response Body:');
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS! Breeze API authentication working with appkey header!');
          } else {
            console.log('\n❌ Authentication failed. Status:', res.statusCode);
          }
        } catch (e) {
          console.log('Raw response:', data);
        }
        resolve(data);
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
      reject(e);
    });
    
    req.end();
  });
}

// Test market quotes endpoint
async function testMarketQuotes() {
  console.log('\n\n2️⃣ Testing market quotes endpoint...');
  
  const API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60';
  const SESSION_TOKEN = '53256330';
  
  const options = {
    hostname: 'api.icicidirect.com',
    port: 443,
    path: '/breezeapi/api/v1/quotes/?stock_code=RELIANCE&exchange_code=NSE',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-SessionToken': SESSION_TOKEN,
      'appkey': API_KEY  // Using correct header name
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📦 Market Quotes Response:');
        try {
          const jsonData = JSON.parse(data);
          console.log(JSON.stringify(jsonData, null, 2));
          
          if (res.statusCode === 200) {
            console.log('\n✅ Market quotes working! Live data connection established!');
          } else {
            console.log('\n❌ Market quotes failed. Status:', res.statusCode);
          }
        } catch (e) {
          console.log('Raw response:', data);
        }
        resolve(data);
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
      reject(e);
    });
    
    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testBreezeAPI();
    await testMarketQuotes();
    console.log('\n🎉 Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();