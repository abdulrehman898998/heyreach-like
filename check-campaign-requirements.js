/**
 * Campaign Requirements Checker
 * Verifies all requirements are met before starting automation
 */

import { chromium } from 'playwright';

async function checkCampaignRequirements() {
    console.log('🔍 Checking campaign requirements...\n');
    
    const requirements = {
        browser: false,
        secrets: false,
        proxy: false,
        accounts: false
    };
    
    // 1. Check Browser Installation
    console.log('1. Browser Installation:');
    try {
        const browser = await chromium.launch({ headless: true });
        await browser.close();
        requirements.browser = true;
        console.log('   ✅ Chromium browser installed and working');
    } catch (error) {
        console.log('   ❌ Chromium browser issue:', error.message);
        if (error.message.includes('Executable doesn\'t exist')) {
            console.log('   💡 Solution: Contact support for browser installation');
        }
    }
    
    // 2. Check Required Secrets
    console.log('\n2. Required Secrets:');
    const requiredSecrets = ['META_APP_ID', 'META_APP_SECRET'];
    
    for (const secret of requiredSecrets) {
        if (process.env[secret]) {
            console.log(`   ✅ ${secret} configured`);
            requirements.secrets = true;
        } else {
            console.log(`   ❌ ${secret} missing`);
            requirements.secrets = false;
        }
    }
    
    if (!requirements.secrets) {
        console.log('   💡 Solution: Add META_APP_ID and META_APP_SECRET for Instagram webhooks');
    }
    
    // 3. Check Proxy Connection
    console.log('\n3. Proxy Connection:');
    try {
        const testProxy = 'http://abdul123-zone-resi:rehmanwallah123@79d78e2b508d3771.ika.na.pyproxy.io:16666';
        const browser = await chromium.launch({
            headless: true,
            proxy: { server: testProxy }
        });
        
        const page = await browser.newPage();
        await page.goto('https://httpbin.org/ip', { timeout: 10000 });
        const ip = await page.textContent('body');
        const ipData = JSON.parse(ip);
        
        await browser.close();
        requirements.proxy = true;
        console.log(`   ✅ Proxy working (IP: ${ipData.origin})`);
    } catch (error) {
        console.log('   ⚠️  Proxy test failed:', error.message);
        console.log('   💡 Proxy is optional but recommended for better success rates');
    }
    
    // 4. Check Account Configuration
    console.log('\n4. Account Requirements:');
    console.log('   📝 Instagram account username/password required');
    console.log('   📝 2FA secret recommended for better security');
    console.log('   📝 Google Sheets with target profiles required');
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Browser: ${requirements.browser ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   Secrets: ${requirements.secrets ? '✅ Ready' : '❌ Not Ready'}`);
    console.log(`   Proxy: ${requirements.proxy ? '✅ Working' : '⚠️  Optional'}`);
    console.log('   Accounts: 📝 Manual verification required');
    
    const readyCount = Object.values(requirements).filter(Boolean).length;
    console.log(`\n🎯 System Status: ${readyCount}/3 core requirements met`);
    
    if (requirements.browser && requirements.secrets) {
        console.log('✅ System ready for automation!');
    } else {
        console.log('❌ Please fix the issues above before starting campaigns');
    }
}

checkCampaignRequirements().catch(console.error);