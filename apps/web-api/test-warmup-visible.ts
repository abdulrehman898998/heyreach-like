// Test script to trigger warmup with visible browser
import { AccountWarmup } from './src/lib/accountWarmup.js'

async function testVisibleWarmup() {
  console.log('🔥 Starting visible warmup test...')
  
  // Test account data
  const testAccount = {
    id: 1,
    username: 'hassan26711',
    home_country: 'US',
    home_city: 'New York',
    assigned_proxy_id: null,
    session_label: 'test-session',
    cookies_encrypted: null,
    status: 'warming'
  }

  try {
    console.log('🚀 Launching browser (VISIBLE MODE)...')
    const warmup = new AccountWarmup(testAccount, null)
    
    // Initialize - this will open a visible browser window
    await warmup.initialize()
    console.log('✅ Browser opened! You should see Instagram loading...')
    
    // Wait a bit to let you see it
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Run a short warmup session
    console.log('🔄 Starting warmup activities...')
    await warmup.performNaturalBrowsing()
    
    console.log('✅ Warmup test completed! Browser should have shown Instagram automation.')
    
    // Keep browser open for 30 seconds so you can see it
    console.log('⏳ Keeping browser open for 30 seconds...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
  } catch (error) {
    console.error('❌ Warmup test failed:', error)
  }
  
  process.exit(0)
}

testVisibleWarmup()
