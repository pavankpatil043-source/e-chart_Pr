/**
 * Breeze API Session Token Generator Helper
 * 
 * This script helps you get a fresh session token from ICICI Direct
 * Follow the steps below to generate and update your session token
 */

const readline = require('readline')
const { exec } = require('child_process')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('\n🔐 Breeze API Session Token Generator\n')
console.log('=' .repeat(60))
console.log('\n📋 Steps to Generate Session Token:\n')
console.log('1. I will open the ICICI Direct API portal in your browser')
console.log('2. Login with your ICICI Direct credentials')
console.log('3. After successful login, you will see a session token')
console.log('4. Copy the session token')
console.log('5. Come back here and paste it\n')
console.log('=' .repeat(60))

const API_KEY = 'hy81732W44w7696#R0m~n20548F0M!60'
const ENCODED_API_KEY = 'hy81732W44w7696%23R0m~n20548F0M%2160'
const LOGIN_URL = `https://api.icicidirect.com/apiuser/login?api_key=${ENCODED_API_KEY}`

console.log('\n🔗 Login URL:')
console.log(LOGIN_URL)
console.log('\n')

rl.question('Press ENTER to open the ICICI Direct login portal in your browser... ', () => {
  console.log('\n🌐 Opening browser...\n')
  
  // Open browser based on OS
  const command = process.platform === 'win32' 
    ? `start "" "${LOGIN_URL}"`
    : process.platform === 'darwin'
    ? `open "${LOGIN_URL}"`
    : `xdg-open "${LOGIN_URL}"`
  
  exec(command, (error) => {
    if (error) {
      console.log('❌ Could not open browser automatically.')
      console.log('📋 Please manually open this URL in your browser:')
      console.log(LOGIN_URL)
    } else {
      console.log('✅ Browser opened! Please login to get your session token.')
    }
    
    console.log('\n' + '=' .repeat(60))
    console.log('\n⏳ After logging in, you will see something like:')
    console.log('   "Session Token: 12345678"')
    console.log('\n📋 Copy that token and paste it here:\n')
    
    rl.question('Enter your session token: ', (sessionToken) => {
      const token = sessionToken.trim()
      
      if (!token) {
        console.log('\n❌ No token entered. Please run the script again.\n')
        rl.close()
        return
      }
      
      console.log('\n✅ Session token received!\n')
      console.log('=' .repeat(60))
      console.log('\n📝 Now updating your .env.local file...\n')
      
      // Read and update .env.local
      const fs = require('fs')
      const path = require('path')
      const envPath = path.join(__dirname, '.env.local')
      
      try {
        let envContent = fs.readFileSync(envPath, 'utf8')
        
        // Replace the session token
        const tokenRegex = /BREEZE_SESSION_TOKEN=.*/
        if (tokenRegex.test(envContent)) {
          envContent = envContent.replace(tokenRegex, `BREEZE_SESSION_TOKEN=${token}`)
        } else {
          envContent += `\nBREEZE_SESSION_TOKEN=${token}\n`
        }
        
        fs.writeFileSync(envPath, envContent, 'utf8')
        
        console.log('✅ .env.local updated successfully!')
        console.log('\n' + '=' .repeat(60))
        console.log('\n🎉 Setup Complete!\n')
        console.log('Next steps:')
        console.log('1. Restart your development server (Ctrl+C then npm run dev)')
        console.log('2. Visit: http://localhost:3000/session-manager')
        console.log('3. Verify the session is active\n')
        console.log('💡 Session token expires in 24 hours')
        console.log('   You can regenerate it anytime using this script\n')
        
      } catch (error) {
        console.log('❌ Error updating .env.local:', error.message)
        console.log('\n📝 Please manually update .env.local:')
        console.log(`   BREEZE_SESSION_TOKEN=${token}\n`)
      }
      
      rl.close()
    })
  })
})

rl.on('close', () => {
  process.exit(0)
})