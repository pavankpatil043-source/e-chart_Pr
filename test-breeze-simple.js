// Test Breeze API session
const testBreezeAuth = async () => {
  const config = {
    apiKey: 'hy81732W44w7696#R0m~n20548F0M!60',
    sessionToken: '53256330',
    baseUrl: 'https://api.icicidirect.com/breezeapi/api/v1'
  };

  console.log('Testing Breeze API with session token:', config.sessionToken);

  try {
    // Test 1: Simple customer details
    const response1 = await fetch(`${config.baseUrl}/customerdetails`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SessionToken': config.sessionToken,
        'X-AppKey': config.apiKey
      }
    });
    
    console.log('Customer Details Response:', response1.status);
    const data1 = await response1.text();
    console.log('Response Body:', data1);

    // Test 2: Simple quote request
    const response2 = await fetch(`${config.baseUrl}/quotes?stock_code=RELIANCE&exchange_code=NSE&product_type=cash`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SessionToken': config.sessionToken,
        'X-AppKey': config.apiKey
      }
    });
    
    console.log('Quote Response:', response2.status);
    const data2 = await response2.text();
    console.log('Quote Body:', data2);

  } catch (error) {
    console.error('Breeze API Test Error:', error);
  }
};

testBreezeAuth();