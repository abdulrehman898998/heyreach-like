/**
 * Instagram-Specific Test
 * Tests Instagram login flow and common issues
 */

import { chromium } from 'playwright';

async function testInstagramSpecific() {
  console.log('🧪 Testing Instagram-specific functionality...');
  
  let context = null;
  let page = null;
  
  try {
    // Use persistent context like our bot
    const userDataDir = './test_profile_instagram';
    
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=site-per-process'
      ]
    });
    
    page = await context.newPage();
    
    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    });
    
    console.log('✅ Browser setup complete');
    
    // Test 1: Instagram homepage
    console.log('\n1️⃣ Testing Instagram homepage access...');
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    
    // Test 2: Login page access
    console.log('\n2️⃣ Testing login page access...');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log(`Login page URL: ${page.url()}`);
    
    // Check for login form elements
    const usernameField = page.locator('input[name="username"]');
    const passwordField = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log(`Username field visible: ${await usernameField.isVisible({ timeout: 5000 })}`);
    console.log(`Password field visible: ${await passwordField.isVisible({ timeout: 5000 })}`);
    console.log(`Submit button visible: ${await submitButton.isVisible({ timeout: 5000 })}`);
    
    // Test 3: Profile URL patterns
    console.log('\n3️⃣ Testing different profile URL patterns...');
    
    const testUrls = [
      'https://www.instagram.com/instagram/',
      'https://www.instagram.com/cristiano/',
      'https://www.instagram.com/selenagomez/'
    ];
    
    for (const url of testUrls) {
      try {
        console.log(`Testing: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        console.log(`✅ Success: ${page.url()}`);
        
        // Check for common elements
        const profilePic = page.locator('img[alt*="profile picture"], img[alt*="Photo"]').first();
        const followButton = page.locator('button:has-text("Follow"), button:has-text("Message")').first();
        
        console.log(`  Profile pic found: ${await profilePic.isVisible({ timeout: 3000 })}`);
        console.log(`  Action button found: ${await followButton.isVisible({ timeout: 3000 })}`);
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
      
      await page.waitForTimeout(2000); // Brief pause between tests
    }
    
    // Test 4: Search functionality
    console.log('\n4️⃣ Testing search functionality...');
    try {
      await page.goto('https://www.instagram.com/explore/search/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
      if (await searchInput.isVisible({ timeout: 5000 })) {
        console.log('✅ Search input found');
        await searchInput.fill('test');
        console.log('✅ Search input interaction successful');
      } else {
        console.log('❌ Search input not found');
      }
    } catch (error) {
      console.log(`❌ Search test failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Instagram test failed: ${error.message}`);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (page) await page.close().catch(console.error);
    if (context) await context.close().catch(console.error);
  }
}

// Run the test
testInstagramSpecific()
  .then(() => {
    console.log('\n🎉 Instagram test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Instagram test crashed:', error);
    process.exit(1);
  });