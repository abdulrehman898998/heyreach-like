// Test script for login with fresh browser context
import { chromium } from 'playwright';

async function testFreshLogin() {
  console.log('🔥 Testing Instagram login with fresh browser context...');
  
  try {
    const browser = await chromium.launch({ headless: false, slowMo: 100 });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🌐 Navigating to Instagram login...');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('⏳ Waiting for form fields...');
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await page.waitForSelector('input[name="password"]', { timeout: 15000 });
    
    console.log('📝 Filling credentials...');
    await page.fill('input[name="username"]', 'hassan26711');
    await page.fill('input[name="password"]', 'hassan@123');
    
    console.log('🖱️ Submitting form...');
    await page.click('button[type="submit"]');
    
    console.log('⏳ Waiting for login to complete...');
    try {
      await page.waitForSelector('svg[aria-label="Home"]', { timeout: 30000 });
      console.log('✅ Login appears successful!');
    } catch (e) {
      console.error('❌ Login may have failed or timed out');
    }
    
    console.log('⏳ Keeping browser open for 20 seconds to observe...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testFreshLogin();
