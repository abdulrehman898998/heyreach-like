/**
 * Simple Playwright Test - Basic Browser Functionality
 * Tests if Playwright can launch browser and perform basic operations
 */

import { chromium } from 'playwright';
import path from 'path';

async function testBasicPlaywright() {
  console.log('🧪 Testing basic Playwright functionality...');
  
  let context = null;
  let page = null;
  
  try {
    // Test 1: Basic browser launch
    console.log('\n1️⃣ Testing browser launch...');
    const userDataDir = './test_profile_basic';
    
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser'
    });
    
    page = await context.newPage();
    console.log('✅ Browser launched successfully');
    
    // Test 2: Basic navigation
    console.log('\n2️⃣ Testing basic navigation...');
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Google navigation successful');
    
    // Test 3: Element interaction
    console.log('\n3️⃣ Testing element interaction...');
    const searchBox = page.locator('input[name="q"]');
    if (await searchBox.isVisible({ timeout: 5000 })) {
      await searchBox.fill('test search');
      console.log('✅ Element interaction successful');
    } else {
      console.log('⚠️ Search box not found');
    }
    
    // Test 4: Instagram basic access
    console.log('\n4️⃣ Testing Instagram basic access...');
    await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('instagram.com')) {
      console.log('✅ Instagram access successful');
      
      // Check if login form is visible
      const loginForm = page.locator('input[name="username"]');
      if (await loginForm.isVisible({ timeout: 5000 })) {
        console.log('✅ Instagram login form detected');
      } else {
        console.log('ℹ️ No login form visible (might be logged in or different page)');
      }
    } else {
      console.log('❌ Instagram access failed - redirected to different domain');
    }
    
    // Test 5: Profile URL navigation
    console.log('\n5️⃣ Testing profile URL navigation...');
    try {
      await page.goto('https://www.instagram.com/instagram/', { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log('✅ Profile URL navigation successful');
    } catch (error) {
      console.log(`❌ Profile navigation failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (page) {
      try {
        await page.close();
        console.log('✅ Page closed');
      } catch (e) {
        console.log('⚠️ Error closing page:', e.message);
      }
    }
    
    if (context) {
      try {
        await context.close();
        console.log('✅ Context closed');
      } catch (e) {
        console.log('⚠️ Error closing context:', e.message);
      }
    }
  }
}

// Run the test
testBasicPlaywright()
  .then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });