/**
 * Instagram Modal Handling Example
 * 
 * This example demonstrates how to robustly handle Instagram's modal popup
 * that appears when navigating to profile URLs with a fresh session.
 * 
 * The modal shows "Sign up for Instagram" with a "Log in" button that needs
 * to be clicked before the login form becomes accessible.
 */

import { chromium } from 'playwright';

class InstagramModalHandler {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    async initialize() {
        console.log('🚀 Initializing browser...');
        
        this.browser = await chromium.launch({ 
            headless: false, // Set to true for production
            slowMo: 1000 // Slow down actions for visibility
        });
        
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });
        
        this.page = await this.context.newPage();
        console.log('✅ Browser initialized');
    }

    async handleInstagramModal() {
        console.log('🔍 Checking for Instagram modal popup...');
        
        // Multiple selectors for the modal login button to handle different scenarios
        const modalSelectors = [
            // Full class selector from the user's example
            'div.x1i10hfl.xjqpnuy.xc5r6h4.xqeqjp1.x1phubyo.x972fbf.x10w94by.x1qhh985.x14e42zd.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x14z9mp.xat24cr.x1lziwak.x2lwn1j.xeuugli.xexx8yu.x18d9i69.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x1lku1pv.x1a2a7pz.x6s0dn4.xjyslct.x1obq294.x5a5i1n.xde0f50.x15x8krk.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x9f619.x1ypdohk.x78zum5.x1f6kntn.xwhw2v2.xl56j7k.x17ydfre.xf7dkkf.xv54qhq.x1n2onr6.x2b8uid.xlyipyv.x87ps6o.x14atkfc.x5c86q.x18br7mf.x1i0vuye.x1aavi5t.x1h6iz8e.xixcex4.xk4oym4.xl3ioum.xn3w4p2[role="button"][tabindex="0"]',
            // Alternative selectors that might work
            'div[role="button"]:has-text("Log in"):visible',
            'button:has-text("Log in"):visible',
            'a:has-text("Log in"):visible',
            // More specific modal selectors
            'div[role="dialog"] div[role="button"]:has-text("Log in")',
            'div[role="dialog"] button:has-text("Log in")',
            'div[role="dialog"] a:has-text("Log in")'
        ];

        let modalFound = false;
        let clicked = false;

        // Wait for modal to appear (with timeout)
        try {
            await this.page.waitForTimeout(2000); // Give modal time to appear
            
            // Check if any modal selector is present
            for (const selector of modalSelectors) {
                try {
                    const element = await this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 1000 })) {
                        console.log(`✅ Modal found with selector: ${selector}`);
                        modalFound = true;
                        
                        // Try multiple click strategies
                        clicked = await this.clickModalButton(element, selector);
                        
                        if (clicked) {
                            console.log('✅ Modal login button clicked successfully');
                            break;
                        }
                    }
                } catch (e) {
                    // Continue to next selector
                    continue;
                }
            }
            
            if (!modalFound) {
                console.log('ℹ️ No modal detected - proceeding with normal flow');
                return true;
            }
            
            if (!clicked) {
                console.log('❌ Failed to click modal button with any method');
                return false;
            }
            
            // Wait for modal to disappear
            console.log('⏳ Waiting for modal to disappear...');
            await this.waitForModalDisappearance(modalSelectors);
            console.log('✅ Modal disappeared successfully');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error handling modal:', error.message);
            return false;
        }
    }

    async clickModalButton(element, selector) {
        console.log(`🖱️ Attempting to click modal button with selector: ${selector}`);
        
        // Strategy 1: Playwright's click() with force option
        try {
            console.log('   → Trying Playwright click() with force...');
            await element.click({ force: true, timeout: 5000 });
            await this.page.waitForTimeout(1000);
            
            // Check if modal disappeared
            if (await this.isModalDisappeared(selector)) {
                console.log('   ✅ Playwright click() succeeded');
                return true;
            }
        } catch (e) {
            console.log('   ❌ Playwright click() failed:', e.message);
        }
        
        // Strategy 2: JavaScript click() with visibility check
        try {
            console.log('   → Trying JavaScript click()...');
            const jsClicked = await this.page.evaluate((sel) => {
                const btn = document.querySelector(sel);
                if (btn && btn.offsetParent !== null && btn.offsetWidth > 0 && btn.offsetHeight > 0) {
                    // Check if element is actually visible and clickable
                    const rect = btn.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }, selector);
            
            if (jsClicked) {
                await this.page.waitForTimeout(1000);
                if (await this.isModalDisappeared(selector)) {
                    console.log('   ✅ JavaScript click() succeeded');
                    return true;
                }
            }
        } catch (e) {
            console.log('   ❌ JavaScript click() failed:', e.message);
        }
        
        // Strategy 3: Dispatch click event
        try {
            console.log('   → Trying dispatch click event...');
            const dispatched = await this.page.evaluate((sel) => {
                const btn = document.querySelector(sel);
                if (btn) {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    btn.dispatchEvent(clickEvent);
                    return true;
                }
                return false;
            }, selector);
            
            if (dispatched) {
                await this.page.waitForTimeout(1000);
                if (await this.isModalDisappeared(selector)) {
                    console.log('   ✅ Dispatch click event succeeded');
                    return true;
                }
            }
        } catch (e) {
            console.log('   ❌ Dispatch click event failed:', e.message);
        }
        
        // Strategy 4: Focus and press Enter
        try {
            console.log('   → Trying focus + Enter...');
            await element.focus();
            await this.page.waitForTimeout(500);
            await element.press('Enter');
            await this.page.waitForTimeout(1000);
            
            if (await this.isModalDisappeared(selector)) {
                console.log('   ✅ Focus + Enter succeeded');
                return true;
            }
        } catch (e) {
            console.log('   ❌ Focus + Enter failed:', e.message);
        }
        
        return false;
    }

    async isModalDisappeared(selector) {
        try {
            const element = await this.page.locator(selector).first();
            return !(await element.isVisible({ timeout: 1000 }));
        } catch {
            return true; // Element not found means modal disappeared
        }
    }

    async waitForModalDisappearance(selectors, timeout = 10000) {
        console.log('⏳ Waiting for modal to disappear...');
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            let modalStillVisible = false;
            
            for (const selector of selectors) {
                try {
                    const element = await this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 1000 })) {
                        modalStillVisible = true;
                        break;
                    }
                } catch {
                    // Element not found, continue checking other selectors
                }
            }
            
            if (!modalStillVisible) {
                console.log('✅ Modal disappeared');
                return true;
            }
            
            await this.page.waitForTimeout(500);
        }
        
        console.log('⚠️ Modal did not disappear within timeout');
        return false;
    }

    async navigateToProfile(profileUrl) {
        console.log(`🌐 Navigating to profile: ${profileUrl}`);
        
        try {
            await this.page.goto(profileUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 30000 
            });
            
            // Wait for page to load
            await this.page.waitForTimeout(2000);
            
            // Check for and handle Instagram modal popup
            console.log('🔍 Checking for Instagram modal popup after navigation...');
            const modalHandled = await this.handleInstagramModal();
            
            if (!modalHandled) {
                console.log('⚠️ Modal handling failed, but continuing...');
            }
            
            // Check if we're now on the login page
            const currentUrl = this.page.url();
            console.log(`Current URL: ${currentUrl}`);
            
            if (currentUrl.includes('/accounts/login/')) {
                console.log('✅ Successfully redirected to login page after modal handling');
                return true;
            } else {
                console.log('ℹ️ Not redirected to login page - modal may not have appeared');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Error navigating to profile:', error.message);
            return false;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// Example usage
async function main() {
    const handler = new InstagramModalHandler();
    
    try {
        await handler.initialize();
        
        // Navigate to a profile URL (this should trigger the modal)
        const profileUrl = 'https://www.instagram.com/instagram/'; // Example profile
        const success = await handler.navigateToProfile(profileUrl);
        
        if (success) {
            console.log('🎉 Modal handling completed successfully!');
            
            // Wait a bit to see the result
            await handler.page.waitForTimeout(5000);
        } else {
            console.log('❌ Modal handling failed');
        }
        
    } catch (error) {
        console.error('❌ Error in main:', error.message);
    } finally {
        await handler.close();
    }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { InstagramModalHandler }; 