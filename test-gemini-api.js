// Test Gemini API directly
const API_KEY = 'AIzaSyDjmBpELXZXu7T5U8NSePqiXFCBn9_SgM4'

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
  console.log('Listing available models...\n')
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (response.ok) {
      console.log('✅ Available models:')
      data.models?.forEach(model => {
        console.log(`  - ${model.name}`)
        console.log(`    Methods: ${model.supportedGenerationMethods?.join(', ')}`)
      })
    } else {
      console.log('❌ Failed to list models:', data.error?.message)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

async function testGeminiAPI() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`
  
  console.log('Testing Gemini API...')
  console.log('URL:', url.replace(API_KEY, 'API_KEY_HIDDEN'))
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say hello in 5 words'
          }]
        }]
      })
    })
    
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! API key is working!')
      console.log('Generated text:', data.candidates?.[0]?.content?.parts?.[0]?.text)
    } else {
      console.log('\n❌ FAILED!')
      console.log('Error:', data.error?.message || 'Unknown error')
    }
  } catch (error) {
    console.error('\n❌ Network error:', error.message)
  }
}

listModels().then(() => {
  console.log('\n' + '='.repeat(50) + '\n')
  return testGeminiAPI()
})
