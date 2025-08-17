// Debug script to understand Instagram login page structure
import { chromium } from 'playwright';

async function debugInstagramPage() {
  console.log('🔍 Debugging Instagram login page structure...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to Instagram login...');
    await page.goto('https://www.instagram.com/accounts/login/', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });
    
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(5000);
    
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'instagram-debug.png' });
    
    console.log('🔍 Analyzing page elements...');
    
    // Check for all input fields
    const inputs = await page.$$('input');
    console.log(`\n📝 Found ${inputs.length} input fields:`);
    for (let i = 0; i < inputs.length; i++) {
      try {
        const type = await inputs[i].getAttribute('type');
        const name = await inputs[i].getAttribute('name');
        const placeholder = await inputs[i].getAttribute('placeholder');
        const ariaLabel = await inputs[i].getAttribute('aria-label');
        console.log(`  Input ${i + 1}: type="${type}", name="${name}", placeholder="${placeholder}", aria-label="${ariaLabel}"`);
      } catch (e) {
        console.log(`  Input ${i + 1}: Could not read properties`);
      }
    }
    
    // Check for all buttons
    const buttons = await page.$$('button');
    console.log(`\n🔘 Found ${buttons.length} buttons:`);
    for (let i = 0; i < buttons.length; i++) {
      try {
        const text = await buttons[i].textContent();
        const type = await buttons[i].getAttribute('type');
        const className = await buttons[i].getAttribute('class');
        console.log(`  Button ${i + 1}: text="${text?.trim()}", type="${type}", class="${className}"`);
      } catch (e) {
        console.log(`  Button ${i + 1}: Could not read properties`);
      }
    }
    
    // Check for all form elements
    const forms = await page.$$('form');
    console.log(`\n📋 Found ${forms.length} forms:`);
    for (let i = 0; i < forms.length; i++) {
      try {
        const action = await forms[i].getAttribute('action');
        const method = await forms[i].getAttribute('method');
        console.log(`  Form ${i + 1}: action="${action}", method="${method}"`);
      } catch (e) {
        console.log(`  Form ${i + 1}: Could not read properties`);
      }
    }
    
    // Check page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`\n📄 Page info:`);
    console.log(`  Title: ${title}`);
    console.log(`  URL: ${url}`);
    
    console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
    console.log('✅ Debug completed!');
  }
}

debugInstagramPage();
