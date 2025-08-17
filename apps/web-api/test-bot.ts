// Test script for the improved Instagram bot
import { InstagramBot } from './src/lib/instagramBot.js';

async function testBot() {
  console.log('🔥 Testing improved Instagram bot...');
  
  // Test account data - REPLACE WITH REAL CREDENTIALS FOR ACTUAL TESTING
  const testAccount = {
    username: 'hassan26711', // ⚠️ REPLACE with your actual Instagram username
    password: 'hassan@123', // ⚠️ REPLACE with your actual Instagram password
    // twofa: 'TOTP_SECRET_HERE' // ⚠️ Add if 2FA is enabled
  };

  // Proxy configuration for Pakistan (residential IP) - REPLACE WITH REAL PROXY
  const proxyConfig = {
    server: 'http://brd.superproxy.io:22225',
    username: 'brd-customer-your_zone-residential-country-pk',
    password: 'your_password'
  };

  // NOTE: For accounts from Pakistan, use a matching IP proxy to avoid Instagram blocks or different page structures.
  // Update the above with real proxy details from Bright Data or similar service.

  // Check if using dummy credentials
  if (testAccount.username === 'test_username' || testAccount.password === 'test_password') {
    console.log('⚠️  WARNING: Using dummy credentials!');
    console.log('📝 To test actual login, update the credentials in this file:');
    console.log('   username: your_instagram_username');
    console.log('   password: your_instagram_password');
    console.log('   twofa: your_2fa_secret (if enabled)');
    console.log('\nThe bot will open Instagram but won\'t log in with dummy credentials.');
    console.log('Browser will close in 10 seconds...');
  }

  try {
    console.log('🚀 Creating bot instance with Pakistan proxy...');
    const bot = new InstagramBot(testAccount, {
      headless: false,
      proxy: proxyConfig
    });

    console.log('🔄 Initializing bot...');
    const initResult = await bot.initialize();
    console.log(`📝 Initialization result: ${initResult.message}`);

    if (initResult.success) {
      console.log('✅ Bot initialized successfully!');
      // You can add more test actions here
    }

    console.log('⏳ Keeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log('🔄 Closing bot...');
    await bot.close();

    console.log('✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testBot();
