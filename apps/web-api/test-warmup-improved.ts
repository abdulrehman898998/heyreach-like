// Test script for the improved account warmup system
import { AccountWarmup } from './src/lib/accountWarmup.js';

async function testImprovedWarmup() {
  console.log('🔥 Testing improved account warmup system...');
  
  // Test account data (replace with real credentials for testing)
  const testAccount = {
    id: 1,
    username: 'test_username', // Replace with actual username
    password: 'test_password', // Replace with actual password
    // twofa: 'TOTP_SECRET_HERE', // Add if 2FA is enabled
    home_country: 'US',
    home_city: 'New York',
    assigned_proxy_id: null,
    session_label: 'test-warmup-session',
    cookies_encrypted: null,
    status: 'warming'
  };

  try {
    console.log('🚀 Creating warmup instance...');
    const warmup = new AccountWarmup(testAccount, null); // No proxy for testing
    
    console.log('🔄 Starting warmup session (initial phase)...');
    await warmup.runWarmupSession('initial');
    
    console.log('✅ Warmup session completed successfully!');
    console.log('');
    console.log('🎯 What the improved warmup system does:');
    console.log('  ✅ Ensures proper login before starting activities');
    console.log('  ✅ Natural browsing and scrolling on explore page');
    console.log('  ✅ Liking posts with human-like behavior');
    console.log('  ✅ Viewing stories with realistic timing');
    console.log('  ✅ Watching reels for appropriate durations');
    console.log('  ✅ Adding comments with natural language');
    console.log('  ✅ Realistic delays between all activities');
    console.log('  ❌ NO direct messaging (moved to separate campaigns)');
    console.log('  ❌ NO following (too risky for warmup)');
    
  } catch (error) {
    console.error('❌ Warmup test failed:', error);
  }
  
  process.exit(0);
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testImprovedWarmup();
}
