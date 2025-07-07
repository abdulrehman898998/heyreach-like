#!/usr/bin/env node

/**
 * Complete System Readiness Check
 */

async function checkSystemReady() {
  console.log('🔍 SocialBot Pro System Readiness Check\n');

  const checks = {
    database: false,
    browser: false,
    googleSheets: false,
    instagramAccount: false,
    webhooks: false
  };

  // 1. Database Check
  try {
    const response = await fetch('http://localhost:5000/api/auth/user');
    checks.database = response.status === 401 || response.status === 200; // Either unauthorized or valid response
    console.log(`✅ Database: ${checks.database ? 'Connected' : 'Failed'}`);
  } catch (error) {
    console.log('❌ Database: Connection failed');
  }

  // 2. Google Sheets Check
  try {
    const response = await fetch('http://localhost:5000/api/google-sheets');
    if (response.status === 401) {
      console.log('🔑 Google Sheets: Need authentication');
    } else {
      const sheets = await response.json();
      checks.googleSheets = Array.isArray(sheets);
      console.log(`✅ Google Sheets: ${checks.googleSheets ? 'Ready' : 'Failed'}`);
    }
  } catch (error) {
    console.log('❌ Google Sheets: API failed');
  }

  // 3. Browser Check
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true, timeout: 5000 });
    await browser.close();
    checks.browser = true;
    console.log('✅ Browser: Chromium ready');
  } catch (error) {
    if (error.message.includes('Executable doesn\'t exist')) {
      console.log('⏳ Browser: Still installing...');
    } else {
      console.log('❌ Browser: Launch failed');
    }
  }

  // 4. Webhook Check
  try {
    const response = await fetch('http://localhost:5000/api/webhooks/instagram?hub.mode=subscribe&hub.challenge=test&hub.verify_token=instagram_webhook_verify_token');
    const challenge = await response.text();
    checks.webhooks = challenge === 'test';
    console.log(`✅ Webhooks: ${checks.webhooks ? 'Ready' : 'Failed'}`);
  } catch (error) {
    console.log('❌ Webhooks: Test failed');
  }

  // Summary
  const readyCount = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  
  console.log(`\n📊 System Status: ${readyCount}/${totalChecks} components ready\n`);

  if (readyCount === totalChecks) {
    console.log('🎉 System is 100% ready for automation!');
    console.log('• All components operational');
    console.log('• Ready to start campaigns');
    console.log('• Visual browser mode enabled');
  } else {
    console.log('⏳ System preparing...');
    if (!checks.browser) console.log('• Waiting for browser installation');
    if (!checks.googleSheets) console.log('• Need Google Sheets authentication');
    if (!checks.instagramAccount) console.log('• Need Instagram account setup');
  }
}

checkSystemReady().catch(console.error);