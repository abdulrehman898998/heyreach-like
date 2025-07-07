#!/usr/bin/env node

/**
 * Test if Chromium is properly installed and ready
 */

const { chromium } = require('playwright');

async function testBrowserReady() {
  console.log('Testing Chromium Installation...\n');

  try {
    console.log('1. Launching browser...');
    const browser = await chromium.launch({ 
      headless: false,
      timeout: 10000 
    });
    
    console.log('✅ Browser launched successfully');
    
    console.log('2. Creating new page...');
    const page = await browser.newPage();
    console.log('✅ Page created successfully');
    
    console.log('3. Testing navigation...');
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });
    console.log('✅ Navigation working');
    
    console.log('4. Closing browser...');
    await browser.close();
    console.log('✅ Browser closed properly');
    
    console.log('\n🎉 Chromium is fully installed and ready!');
    console.log('✅ Visual mode enabled (headless: false)');
    console.log('✅ All browser operations functional');
    
  } catch (error) {
    console.error('\n❌ Browser test failed:', error.message);
    
    if (error.message.includes('Executable doesn\'t exist')) {
      console.log('💡 Running: npx playwright install chromium');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Browser launch timeout - may need system restart');
    }
  }
}

testBrowserReady().catch(console.error);