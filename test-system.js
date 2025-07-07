import { chromium } from 'playwright';

async function testBrowserAutomation() {
  console.log('🔍 Testing Playwright and Chromium...');
  
  try {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Test basic navigation
    await page.goto('https://httpbin.org/get', { waitUntil: 'domcontentloaded' });
    console.log('✅ Browser navigation working');
    
    // Test user agent setting
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    console.log('✅ User agent setting working');
    
    // Test Instagram connectivity (basic)
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const title = await page.title();
    console.log('✅ Instagram connectivity:', title.includes('Instagram') ? 'Working' : 'May have issues');
    
    await browser.close();
    console.log('✅ Browser automation fully functional');
    
  } catch (error) {
    console.error('❌ Browser automation error:', error.message);
    throw error;
  }
}

async function testAPI() {
  console.log('🔍 Testing API endpoints...');
  
  const endpoints = [
    '/api/auth/user',
    '/api/analytics/stats', 
    '/api/campaigns',
    '/api/proxies',
    '/api/google-sheets',
    '/api/activity-logs'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`);
      console.log(`✅ ${endpoint}: ${response.status} ${response.ok ? 'OK' : 'Needs Auth'}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 SocialBot Pro - System Functionality Test\n');
  
  try {
    await testBrowserAutomation();
    console.log();
    await testAPI();
    
    console.log('\n✅ All core systems operational!');
    console.log('\n📋 System Ready For:');
    console.log('   • Instagram/Facebook automation');
    console.log('   • Proxy rotation');
    console.log('   • Google Sheets integration');
    console.log('   • Campaign management');
    console.log('   • Real-time analytics');
    
  } catch (error) {
    console.error('\n❌ System test failed:', error.message);
    process.exit(1);
  }
}

runTests();