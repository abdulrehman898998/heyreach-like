// Temporary test script for specific login credentials
import { InstagramBot } from './src/lib/instagramBot.js';

async function testSpecificLogin() {
  console.log('🔥 Testing Instagram bot login with specific credentials...');
  
  const testAccount = {
    username: 'hassan26711',
    password: 'hassan@123',
    // Add twofa if needed: twofa: 'YOUR_TOTP_SECRET'
  };

  try {
    console.log('🚀 Creating bot instance...');
    const bot = new InstagramBot(testAccount, {
      headless: false, // Visible for testing
      slowMo: 100
    });
    
    console.log('🔄 Initializing and logging in...');
    const initResult = await bot.initialize();
    
    if (initResult.success) {
      console.log('✅ Login successful!');
      
      console.log('🔥 Performing a quick warmup activity...');
      const warmupResult = await bot.performWarmupActivity();
      console.log(`🎯 Warmup result: ${warmupResult.success ? 'Success' : 'Failed'}`);
      console.log(`📊 Activity: ${warmupResult.activityType}`);
      console.log(`📝 Message: ${warmupResult.message}`);
      
      console.log('⏳ Keeping browser open for 20 seconds to observe...');
      await new Promise(resolve => setTimeout(resolve, 20000));
    } else {
      console.error('❌ Login failed:', initResult.message);
      console.log('⏳ Keeping browser open for 10 seconds to show error...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('🔒 Closing bot...');
    await bot.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testSpecificLogin();
