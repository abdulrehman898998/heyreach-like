/**
 * Simple Automation Test - Test basic browser functionality
 */

import { chromium } from 'playwright';

async function testSimpleAutomation() {
    console.log('🔍 Testing basic browser automation...');
    
    try {
        // Try to launch browser with minimal options
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        
        console.log('✅ Browser launched successfully');
        
        const page = await browser.newPage();
        console.log('✅ Page created successfully');
        
        // Test basic navigation
        await page.goto('https://httpbin.org/ip', { timeout: 10000 });
        console.log('✅ Navigation successful');
        
        const content = await page.textContent('body');
        console.log('✅ Content retrieved:', content);
        
        await browser.close();
        console.log('✅ Browser closed successfully');
        
        console.log('\n🎉 Basic automation test passed! Browser is working.');
        
    } catch (error) {
        console.error('❌ Browser test failed:', error.message);
        
        if (error.message.includes('Executable doesn\'t exist')) {
            console.log('💡 Browser not installed. Installing now...');
            console.log('Run: npx playwright install chromium');
        } else if (error.message.includes('launch')) {
            console.log('💡 Browser launch failed. Check system requirements.');
        }
    }
}

testSimpleAutomation().catch(console.error);