/**
 * Proxy Verification Test
 * This script tests if your proxy is working properly
 */

import { chromium } from 'playwright';

async function testProxyConnection() {
    console.log('🔍 Testing proxy connection...');
    
    // Your proxy details
    const proxyConfig = {
        server: 'http://79d78e2b508d3771.ika.na.pyproxy.io:16666',
        username: 'abdul123-zone-resi',
        password: 'rehmanwallah123'
    };
    
    let browser = null;
    let context = null;
    
    try {
        // Launch browser with proxy
        browser = await chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        // Create context with proxy
        context = await browser.newContext({
            proxy: proxyConfig,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        // Test 1: Check IP address without proxy
        console.log('📍 Testing IP address detection...');
        
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle' });
        const ipResponse = await page.textContent('body');
        const ipData = JSON.parse(ipResponse);
        
        console.log('✅ Current IP address:', ipData.origin);
        
        // Test 2: Check headers and user agent
        await page.goto('https://httpbin.org/headers', { waitUntil: 'networkidle' });
        const headerResponse = await page.textContent('body');
        const headerData = JSON.parse(headerResponse);
        
        console.log('📋 Headers received:');
        console.log('  User-Agent:', headerData.headers['User-Agent']);
        console.log('  Host:', headerData.headers['Host']);
        
        // Test 3: Test Instagram connectivity through proxy
        console.log('🔗 Testing Instagram connectivity...');
        
        try {
            await page.goto('https://www.instagram.com/', { 
                waitUntil: 'networkidle',
                timeout: 30000
            });
            
            const title = await page.title();
            console.log('✅ Instagram loaded successfully');
            console.log('  Page title:', title);
            
            // Check if we can see the login form
            const loginForm = await page.$('form').catch(() => null);
            if (loginForm) {
                console.log('✅ Login form detected - proxy working with Instagram');
            } else {
                console.log('⚠️  No login form found - might be blocked');
            }
            
        } catch (error) {
            console.log('❌ Instagram connection failed:', error.message);
        }
        
        // Test 4: Check for any blocking
        console.log('🛡️  Testing for blocking patterns...');
        
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        if (currentUrl.includes('challenge') || pageContent.includes('challenge')) {
            console.log('⚠️  Instagram challenge detected - account may need verification');
        } else if (pageContent.includes('login')) {
            console.log('✅ Normal login page - proxy working well');
        } else {
            console.log('❓ Unexpected page content - checking response');
        }
        
        console.log('🎯 Proxy test completed successfully!');
        
    } catch (error) {
        console.error('❌ Proxy test failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Proxy connection refused - check proxy server and credentials');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('💡 Proxy server not found - check proxy URL');
        } else if (error.message.includes('407')) {
            console.log('💡 Proxy authentication failed - check username/password');
        }
    } finally {
        if (context) await context.close();
        if (browser) await browser.close();
    }
}

// Run the test
testProxyConnection().catch(console.error);