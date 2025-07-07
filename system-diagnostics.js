/**
 * System Diagnostics - Complete system check with solutions
 */

import { chromium } from 'playwright';

async function runSystemDiagnostics() {
    console.log('🔍 Running complete system diagnostics...\n');
    
    const results = {
        browser: { status: false, message: '', solution: '' },
        secrets: { status: false, message: '', solution: '' },
        proxy: { status: false, message: '', solution: '' },
        automation: { status: false, message: '', solution: '' }
    };
    
    // 1. Browser Test
    console.log('1. Testing Browser Installation...');
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://httpbin.org/ip', { timeout: 10000 });
        await browser.close();
        
        results.browser = {
            status: true,
            message: 'Chromium browser installed and working',
            solution: ''
        };
        console.log('   ✅ Browser test passed');
    } catch (error) {
        results.browser = {
            status: false,
            message: 'Browser not installed or not working',
            solution: 'Run: npx playwright install chromium'
        };
        console.log('   ❌ Browser test failed:', error.message);
    }
    
    // 2. Secrets Test
    console.log('\n2. Testing Required Secrets...');
    const hasMetaAppId = !!process.env.META_APP_ID;
    const hasMetaAppSecret = !!process.env.META_APP_SECRET;
    
    if (hasMetaAppId && hasMetaAppSecret) {
        results.secrets = {
            status: true,
            message: 'All required secrets configured',
            solution: ''
        };
        console.log('   ✅ META_APP_ID and META_APP_SECRET configured');
    } else {
        results.secrets = {
            status: false,
            message: 'Missing Instagram webhook secrets',
            solution: 'Add META_APP_ID and META_APP_SECRET in environment'
        };
        console.log('   ❌ Missing secrets:', {
            META_APP_ID: hasMetaAppId ? 'OK' : 'MISSING',
            META_APP_SECRET: hasMetaAppSecret ? 'OK' : 'MISSING'
        });
    }
    
    // 3. Proxy Test
    console.log('\n3. Testing Proxy Configuration...');
    try {
        if (results.browser.status) {
            const proxyServer = 'http://abdul123-zone-resi:rehmanwallah123@79d78e2b508d3771.ika.na.pyproxy.io:16666';
            const browser = await chromium.launch({
                headless: true,
                proxy: { server: proxyServer }
            });
            
            const page = await browser.newPage();
            await page.goto('https://httpbin.org/ip', { timeout: 10000 });
            const content = await page.textContent('body');
            const ipData = JSON.parse(content);
            await browser.close();
            
            results.proxy = {
                status: true,
                message: `Proxy working (IP: ${ipData.origin})`,
                solution: ''
            };
            console.log(`   ✅ Proxy test passed (IP: ${ipData.origin})`);
        } else {
            throw new Error('Browser not available for proxy test');
        }
    } catch (error) {
        results.proxy = {
            status: false,
            message: 'Proxy test failed (optional)',
            solution: 'Proxy is optional but recommended for better automation success'
        };
        console.log('   ⚠️  Proxy test failed (this is optional)');
    }
    
    // 4. Basic Automation Test
    console.log('\n4. Testing Basic Automation...');
    if (results.browser.status) {
        try {
            const browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });
            
            await page.goto('https://www.instagram.com/', { timeout: 15000 });
            const title = await page.title();
            await browser.close();
            
            results.automation = {
                status: true,
                message: 'Basic Instagram connectivity working',
                solution: ''
            };
            console.log('   ✅ Instagram connectivity test passed');
        } catch (error) {
            results.automation = {
                status: false,
                message: 'Instagram connectivity issues',
                solution: 'Check network connection and proxy settings'
            };
            console.log('   ❌ Instagram connectivity failed:', error.message);
        }
    } else {
        results.automation = {
            status: false,
            message: 'Cannot test - browser not available',
            solution: 'Fix browser installation first'
        };
        console.log('   ❌ Cannot test automation - browser not available');
    }
    
    // Summary and Solutions
    console.log('\n📊 SYSTEM DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([component, result]) => {
        const status = result.status ? '✅ PASS' : '❌ FAIL';
        console.log(`${component.toUpperCase().padEnd(12)} ${status} - ${result.message}`);
        if (result.solution) {
            console.log(`${''.padEnd(15)} 💡 ${result.solution}`);
        }
    });
    
    const passCount = Object.values(results).filter(r => r.status).length;
    console.log(`\n🎯 OVERALL STATUS: ${passCount}/4 components working`);
    
    if (passCount >= 2) {
        console.log('✅ System ready for basic automation testing');
    } else {
        console.log('❌ System needs configuration before automation will work');
    }
    
    // Next Steps
    console.log('\n📋 NEXT STEPS:');
    if (!results.browser.status) {
        console.log('1. Install browser: npx playwright install chromium');
    }
    if (!results.secrets.status) {
        console.log('2. Configure Instagram webhook secrets (META_APP_ID, META_APP_SECRET)');
    }
    if (results.browser.status && results.secrets.status) {
        console.log('1. Add Instagram account credentials in the web interface');
        console.log('2. Create Google Sheets with target profiles');
        console.log('3. Start a campaign to test automation');
    }
}

runSystemDiagnostics().catch(console.error);