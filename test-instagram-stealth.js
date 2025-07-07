/**
 * Instagram Stealth Test - Using patterns from working local code
 * Tests if we can bypass Instagram's bot detection
 */

import { chromium } from 'playwright';

async function testInstagramStealth() {
  console.log('🥷 Testing Instagram with stealth patterns...');
  
  let context = null;
  let page = null;
  
  try {
    // Use exact patterns from working local code
    const userDataDir = './test_profile_stealth';
    
    const launchOptions = {
      headless: false,
      ignoreHTTPSErrors: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    };
    
    // Updated browser launch method - launchPersistentContext returns a context directly
    context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    page = await context.newPage();
    
    // Set user agent exactly like local code
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    });

    console.log('✅ Stealth browser setup complete');
    
    // Setup popup handlers first like local code
    console.log('\n🔧 Setting up popup handlers...');
    await page.addLocatorHandler(
      page.locator('div[role="dialog"] button:has-text("Not Now")'),
      async () => {
        console.log('🔄 Auto-handling popup...');
        await page.locator('div[role="dialog"] button:has-text("Not Now")').click();
      }
    );
    
    // Test 1: Start with homepage first
    console.log('\n1️⃣ Testing homepage access...');
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Homepage access successful');
    await page.waitForTimeout(3000);
    
    // Test 2: Try login page with delay
    console.log('\n2️⃣ Testing login page with human-like behavior...');
    await page.waitForTimeout(2000 + Math.random() * 3000); // Random delay like human
    
    try {
      await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('✅ Login page access successful');
      
      // Check login form
      const loginForm = await page.locator('input[name="username"]').isVisible({ timeout: 10000 });
      console.log(`Login form visible: ${loginForm}`);
      
    } catch (error) {
      console.log(`❌ Login page failed: ${error.message}`);
      
      // Try alternative approach - search for login
      console.log('Trying alternative login approach...');
      await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Look for login link
      const loginLink = page.locator('a:has-text("Log in"), a[href*="login"]').first();
      if (await loginLink.isVisible({ timeout: 5000 })) {
        console.log('Found login link, clicking...');
        await loginLink.click();
        await page.waitForTimeout(3000);
        
        const loginForm = await page.locator('input[name="username"]').isVisible({ timeout: 5000 });
        console.log(`Alternative login form visible: ${loginForm}`);
      }
    }
    
    // Test 3: Profile navigation with search method
    console.log('\n3️⃣ Testing profile access via search...');
    try {
      // Go back to homepage first
      await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Try search approach
      const searchIcon = page.locator('svg[aria-label*="Search"], a[href*="explore"]').first();
      if (await searchIcon.isVisible({ timeout: 5000 })) {
        console.log('Found search/explore, clicking...');
        await searchIcon.click();
        await page.waitForTimeout(2000);
        
        // Try to search for a user
        const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
        if (await searchInput.isVisible({ timeout: 5000 })) {
          console.log('✅ Search method works - can find users this way');
        }
      }
      
    } catch (error) {
      console.log(`Search test failed: ${error.message}`);
    }
    
    // Test 4: Direct profile with different method
    console.log('\n4️⃣ Testing direct profile with JavaScript navigation...');
    try {
      // Use JavaScript navigation instead of page.goto
      await page.evaluate(() => {
        window.location.href = 'https://www.instagram.com/instagram/';
      });
      await page.waitForTimeout(5000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/instagram/')) {
        console.log('✅ JavaScript navigation works!');
      } else {
        console.log(`JavaScript navigation redirected to: ${currentUrl}`);
      }
      
    } catch (error) {
      console.log(`JavaScript navigation failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Stealth test failed: ${error.message}`);
  } finally {
    console.log('\n🧹 Cleaning up...');
    if (page) await page.close().catch(console.error);
    if (context) await context.close().catch(console.error);
  }
}

testInstagramStealth()
  .then(() => {
    console.log('\n🎉 Stealth test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Stealth test crashed:', error);
    process.exit(1);
  });