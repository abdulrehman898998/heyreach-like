import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { chromium } from 'playwright';
import { authenticator } from 'otplib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class InstagramBot {
    constructor(account, globalProxy = {}, userDataDir = null) {
        this.account = account;
        this.globalProxy = globalProxy;
        this.userDataDir = userDataDir;
        this.context = null;
        this.page = null;
    }

    async initialize() {
        const userDataDir = this.userDataDir || path.join(__dirname, '../chromium_data');
        
        const launchOptions = {
            headless: false,
            ignoreHTTPSErrors: true,
            proxy: this.globalProxy?.url ? {
                server: this.globalProxy.url,
                username: this.globalProxy.username,
                password: this.globalProxy.password
            } : undefined
        };

        // Updated browser launch method - launchPersistentContext returns a context directly
        this.context = await chromium.launchPersistentContext(userDataDir, launchOptions);
        this.page = await this.context.newPage();
        
        // Set user agent
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        });

        // Setup proactive popup handlers
        await this.setupPopupHandlers();
    }

    async setupPopupHandlers() {
        console.log('🔧 Setting up proactive popup handlers...');
        
        try {
            // Handler for "Save login info" popup (only when it appears as a modal)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Not Now")'),
                async () => {
                    console.log('🔄 Auto-handling "Save login info" popup...');
                    await this.page.locator('div[role="dialog"] button:has-text("Not Now")').click();
                }
            );

            // Handler for "Turn on notifications" popup (only in dialog context)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Not Now")').filter({ hasText: /notification/i }),
                async () => {
                    console.log('🔄 Auto-handling "Turn on notifications" popup...');
                    await this.page.locator('div[role="dialog"] button:has-text("Not Now")').click();
                }
            );

            // Handler for unexpected "Log in" modal popup (only in dialog context, not the main login form)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Log in")').or(this.page.locator('div[role="dialog"] a:has-text("Log in")')),
                async () => {
                    console.log('🔄 Auto-handling unexpected "Log in" modal popup...');
                    await this.page.locator('div[role="dialog"] button:has-text("Log in")').click();
                }
            );

            // Handler for "Sign up" modal popup (only in dialog context)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Sign up")').or(this.page.locator('div[role="dialog"] a:has-text("Sign up")')),
                async () => {
                    console.log('🔄 Auto-handling "Sign up" modal popup...');
                    await this.page.locator('div[role="dialog"] button:has-text("Sign up")').click();
                }
            );

            // Handler for generic modal close buttons (only in dialog context)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Close")').or(this.page.locator('div[role="dialog"] button:has-text("Cancel")')).or(this.page.locator('div[role="dialog"] button:has-text("×")')).or(this.page.locator('div[role="dialog"] button:has-text("✕")')),
                async () => {
                    console.log('🔄 Auto-handling generic modal close button...');
                    await this.page.locator('div[role="dialog"] button:has-text("Close")').click();
                }
            );

            // Handler for cookie consent popups (only when they appear as overlays)
            await this.page.addLocatorHandler(
                this.page.locator('div[role="dialog"] button:has-text("Accept")').or(this.page.locator('div[role="dialog"] button:has-text("Allow")')).or(this.page.locator('div[role="dialog"] button:has-text("OK")')).or(this.page.locator('div[role="dialog"] button:has-text("Got it")')).or(this.page.locator('div[class*="cookie"] button:has-text("Accept All")')).or(this.page.locator('div[class*="cookie"] button:has-text("Accept Cookies")')),
                async () => {
                    console.log('🔄 Auto-handling cookie consent popup...');
                    await this.page.locator('div[role="dialog"] button:has-text("Accept")').click();
                }
            );

            console.log('✅ Popup handlers setup complete');
        } catch (error) {
            console.error('❌ Error setting up popup handlers:', error.message);
        }
    }

    async checkLoginStatus() {
        try {
            // Check if we're already logged in by looking for the home icon or profile elements
            const isLoggedIn = await this.page.locator('svg[aria-label="Home"], a[href*="/accounts/edit/"]').isVisible({ timeout: 3000 });
            return isLoggedIn;
        } catch {
            return false;
        }
    }

    async login() {
        // Check if browser context is still valid
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser context is closed or invalid');
        }
        
        console.log(`\nAttempting to log in as ${this.account.username}...`);
        await this.page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for login form to be fully loaded
        console.log('⏳ Waiting for login form...');
        await this.page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 15000 });
        await this.page.waitForSelector('input[name="password"]', { state: 'visible', timeout: 15000 });
        await this.page.waitForTimeout(500 + Math.random() * 500);

        // Fill in login credentials with a slight delay to mimic human behavior
        console.log('📝 Filling login credentials...');
        await this.page.fill('input[name="username"]', this.account.username);
        await this.page.waitForTimeout(500 + Math.random() * 500); // Small random delay
        await this.page.fill('input[name="password"]', this.account.password);
        await this.page.waitForTimeout(500 + Math.random() * 500);

        // Click submit button with a robust selector
        console.log('🖱️ Clicking submit button...');
        const submitButton = this.page.locator('button[type="submit"]:visible');
        await submitButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(500 + Math.random() * 500);
        await submitButton.click();
        await this.page.waitForTimeout(500 + Math.random() * 500);

        // Wait for either home icon, 2FA prompt, or error message
        console.log('⏳ Waiting for login result...');
        try {
            await Promise.race([
                this.page.waitForSelector('svg[aria-label="Home"]', { timeout: 20000 }),
                this.page.waitForSelector('#slfErrorAlert, div[role="alert"]', { timeout: 20000 }),
                this.page.waitForSelector('input[name="verificationCode"], input[name="verification_code"]', { timeout: 20000 })
            ]);
        } catch (e) {
            console.error('Timeout waiting for login result.');
        }

        // Check for login error
        const loginError = await this.page.$('#slfErrorAlert, div[role="alert"]');
        if (loginError) {
            const errorMsg = await loginError.textContent();
            console.error('Login failed:', errorMsg);
            await this.page.screenshot({ path: 'login_error.png' });
            throw new Error('Login failed: ' + errorMsg);
        }

        // Handle 2FA prompt (TOTP)
        const twofaInput = await this.page.$('input[name="verificationCode"], input[name="verification_code"]');
        if (twofaInput && this.account.twofa) {
            console.log('2FA prompt detected. Generating TOTP code...');
            const code = authenticator.generate(this.account.twofa);
            console.log('Generated TOTP code:', code);
            await twofaInput.fill(code);
            await this.page.waitForTimeout(500 + Math.random() * 500);

            // Try pressing Enter
            await twofaInput.press('Enter');
            await this.page.waitForTimeout(2000);

            // If still on 2FA page, try clicking a button
            const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]:visible');
            if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await confirmBtn.click();
                await this.page.waitForTimeout(2000);
            }

            // Wait for login to complete
            await this.page.waitForSelector('svg[aria-label="Home"]', { timeout: 20000 });
            console.log('2FA code submitted. Login should complete.');
        }

        // Handle "Save login info" pop-up
        const saveLoginButton = this.page.locator('button:has-text("Not Now")');
        if (await saveLoginButton.isVisible({ timeout: 10000 }).catch(() => false)) {
            await saveLoginButton.click();
            await this.page.waitForTimeout(2000);
        }

        // Handle "Turn on notifications" pop-up
        const notificationsButton = this.page.locator('div[role="dialog"] >> button:has-text("Not Now")');
        if (await notificationsButton.isVisible({ timeout: 10000 }).catch(() => false)) {
            await notificationsButton.click();
            await this.page.waitForTimeout(2000);
        }

        // Handle any other popups that might appear after login
        console.log('🔍 Checking for any popups after login...');
        await this.handleAnyPopups();

        // Verify login success
        const homeIcon = await this.page.locator('svg[aria-label="Home"]').isVisible();
        if (homeIcon) {
            console.log(`Successfully logged in as ${this.account.username}.`);
        } else {
            throw new Error('Login failed: Home icon not found after login.');
        }
    }

    async sendMessage(profileUrl, message) {
        const maxRetries = 3;
        let attempt = 0;
        
        // Check if browser context is still valid
        if (!this.page || this.page.isClosed()) {
            throw new Error('Browser context is closed or invalid');
        }
        
        while (attempt < maxRetries) {
            try {
                attempt++;
                console.log(`Navigating to profile (attempt ${attempt}/${maxRetries}): ${profileUrl}`);
                
                // Check if browser context is still valid before each attempt
                if (!this.page || this.page.isClosed()) {
                    throw new Error('Browser context is closed or invalid');
                }
                
                // Reduced delay before navigation
                await this.page.waitForTimeout(1000 + Math.random() * 2000); // 1-3 seconds
                
                await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                
                // Reduced wait for redirects
                await this.page.waitForTimeout(2000);
                
                // Check for and handle Instagram modal popup after navigation
                console.log('🔍 Checking for Instagram modal popup after profile navigation...');
                const modalHandled = await this.handleInstagramModal();
                
                if (!modalHandled) {
                    console.log('⚠️ Modal handling failed after profile navigation, but continuing...');
                }
                
                // Handle any other popups that might appear
                console.log('🔍 Checking for any other popups...');
                await this.handleAnyPopups();
                
                // Check current URL after navigation
                const currentUrl = this.page.url();
                console.log(`Current URL after navigation: ${currentUrl}`);
                
                // Check if we were redirected to login or challenge page
                if (currentUrl.includes('/accounts/login/') || currentUrl.includes('/accounts/challenge/')) {
                    console.log('Login required, redirecting to login...');
                    await this.login();
                    // Navigate back to the profile after login
                    console.log(`Re-navigating to profile after login: ${profileUrl}`);
                    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await this.page.waitForTimeout(2000);
                }
                
                // Check if we were redirected to homepage or other unexpected page
                const finalUrl = this.page.url();
                if (finalUrl.includes('instagram.com') && !finalUrl.includes(profileUrl.split('/').pop()) && 
                    (finalUrl.endsWith('/') || finalUrl.includes('/feed/') || finalUrl.includes('/explore/'))) {
                    console.log(`⚠️ Redirected to homepage or unexpected page: ${finalUrl}`);
                    if (attempt < maxRetries) {
                        console.log('Retrying navigation...');
                        await this.page.waitForTimeout(3000); // Reduced wait before retry
                        continue;
                    } else {
                        throw new Error('Instagram keeps redirecting away from target profile');
                    }
                }
        
                // Wait for the profile header to be visible
                await this.page.waitForSelector('header', { state: 'visible', timeout: 10000 });
                await this.page.waitForTimeout(1000); // Reduced delay
                
                // If we reach here, navigation was successful, break the retry loop
                break;
                
            } catch (error) {
                console.error(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt >= maxRetries) {
                    throw error;
                }
                console.log(`Waiting before retry attempt ${attempt + 1}...`);
                await this.page.waitForTimeout(3000); // Reduced wait
            }
        }
        
        try {
            // Reduced delay before looking for message button
            await this.page.waitForTimeout(500 + Math.random() * 1000);
            
            // Try the most reliable selector for the "Message" button in the header
            let messageButton = this.page.locator('header').getByRole('button', { name: 'Message' });
            if (!(await messageButton.count())) {
                messageButton = this.page.locator('button:has-text("Message")');
                if (!(await messageButton.count())) {
                    messageButton = this.page.locator('a:has-text("Message")');
                }
                if (!(await messageButton.count())) {
                    messageButton = this.page.locator('div[role="button"]:has-text("Message")');
                }
            }
    
            await messageButton.first().waitFor({ state: 'visible', timeout: 10000 });
            await this.page.waitForTimeout(300 + Math.random() * 500); // Reduced delay
            await messageButton.first().click();
            
            // Handle notification popup if it appears (robust handler)
            await this.handleTurnOnNotificationsModal();
            
            // Reduced wait for DM interface to load
            await this.page.waitForTimeout(2000 + Math.random() * 1000);
    
            // Find message input field - optimized selectors in order of likelihood
            const messageInputSelectors = [
                'div[contenteditable="true"][data-testid="message-input"]',
                'div[contenteditable="true"][aria-label*="Message"]',
                'div[role="textbox"][contenteditable="true"]',
                'div[contenteditable="true"]',
                'textarea[placeholder*="Message"]'
            ];
    
            let messageInput = null;
            let inputFound = false;
    
            // Try each selector with shorter timeout
            for (const selector of messageInputSelectors) {
                try {
                    messageInput = this.page.locator(selector).first();
                    await messageInput.waitFor({ state: 'visible', timeout: 3000 }); // Reduced timeout
                    inputFound = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
    
            // If still not found, try a more general approach
            if (!inputFound) {
                try {
                    const allEditableElements = await this.page.locator('[contenteditable="true"]').all();
                    if (allEditableElements.length > 0) {
                        messageInput = this.page.locator('[contenteditable="true"]').last();
                        inputFound = true;
                    }
                } catch (e) {
                    // Ignore errors
                }
            }
    
            if (!inputFound) {
                throw new Error('Could not find message input field with any selector');
            }
    
            // Focus and interact with the input field - optimized delays
            await this.page.waitForTimeout(500 + Math.random() * 1000); // Reduced delay
            await messageInput.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(300 + Math.random() * 500); // Reduced delay
            
            // Click to focus the input field
            await messageInput.click();
            await this.page.waitForTimeout(500 + Math.random() * 500); // Reduced delay

            // Type the message using a single, reliable method
            let typingSuccess = false;
            
            try {
                // Use keyboard typing with optimized delays for human-like behavior
                const typingDelay = 60 + Math.random() * 100; // 60-160ms per character (faster but still human-like)
                await this.page.keyboard.type(message, { delay: typingDelay });
                typingSuccess = true;
            } catch (keyboardError) {
                try {
                    // Fallback to type() method
                    const typingDelay = 80 + Math.random() * 150; // 80-230ms per character
                    await messageInput.type(message, { delay: typingDelay, timeout: 15000 });
                    typingSuccess = true;
                } catch (typeError) {
                    try {
                        // Last resort: fill method (less human-like but reliable)
                        await messageInput.fill(message);
                        typingSuccess = true;
                    } catch (fillError) {
                        console.error('   -> All typing methods failed');
                        throw new Error('Could not type message with any method');
                    }
                }
            }
            
            if (!typingSuccess) {
                throw new Error('Could not type message with any method');
            }
            
            // Reduced wait after typing
            await this.page.waitForTimeout(1000 + Math.random() * 1000);

            // Send the message
            await messageInput.press('Enter');
            await this.page.waitForTimeout(2000); // Reduced wait

            // Check if message was sent, try Send button if needed
            const inputValue = await messageInput.textContent();
            if (inputValue && inputValue.trim().length > 0) {
                const sendButton = this.page.locator('div[role="button"]:has-text("Send")');
                if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await sendButton.click();
                    await this.page.waitForTimeout(2000);
                }
            }

            console.log(`   -> ✅ Message sent successfully to ${profileUrl}.`);
            return true;
            
        } catch (error) {
            // Only track as failed if message was attempted but not sent (not if Message button was missing)
            if (error.message && !error.message.includes('Could not find message input field')) {
                console.error(`   -> ❌ Failed to send message to ${profileUrl}: ${error.message}`);
                // Log more details about the failure
                if (error.message.includes('Message was not properly typed')) {
                    console.error('   -> Issue: Message typing verification failed');
                } else if (error.message.includes('timeout')) {
                    console.error('   -> Issue: Timeout waiting for elements');
                } else {
                    console.error('   -> Issue: Unknown error during message sending');
                }
                return false;
            } else {
                // Message button not available, just skip without tracking as failed
                console.log(`   -> ⚠️ Message button not available for ${profileUrl}, skipping.`);
                return null;
            }
        }
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
            'div[role="dialog"] a:has-text("Log in")',
            // Additional selectors for different modal types
            'div[role="dialog"] button:has-text("Sign up")',
            'div[role="dialog"] a:has-text("Sign up")',
            // Generic modal close buttons
            'div[role="dialog"] button:has-text("×")',
            'div[role="dialog"] button:has-text("✕")',
            'div[role="dialog"] button:has-text("Close")',
            'div[role="dialog"] button:has-text("Cancel")'
        ];

        let modalFound = false;
        let clicked = false;

        // Wait for modal to appear (with timeout)
        try {
            await this.page.waitForTimeout(2000); // Give modal time to appear
            
            // First, try the proactive approach with Playwright's built-in handlers
            console.log('🔄 Trying proactive modal handling...');
            
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
            
            // If no modal found with specific selectors, try generic modal detection
            if (!modalFound) {
                console.log('🔍 Trying generic modal detection...');
                const genericModalSelectors = [
                    'div[role="dialog"]:visible',
                    'div[class*="modal"]:visible',
                    'div[class*="popup"]:visible',
                    'div[class*="overlay"]:visible'
                ];
                
                for (const selector of genericModalSelectors) {
                    try {
                        const modal = await this.page.locator(selector).first();
                        if (await modal.isVisible({ timeout: 1000 })) {
                            console.log(`✅ Generic modal found with selector: ${selector}`);
                            modalFound = true;
                            
                            // Try to find and click any close button within the modal
                            const closeButton = modal.locator('button:has-text(/Close|Cancel|×|✕|Not Now|No thanks/i)').first();
                            if (await closeButton.isVisible({ timeout: 1000 })) {
                                await closeButton.click();
                                clicked = true;
                                console.log('✅ Generic modal close button clicked');
                                break;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
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

    async handleTurnOnNotificationsModal() {
        const notNowBtn = this.page.locator('button._a9--:has-text("Not Now")');
        try {
            if (await notNowBtn.isVisible({ timeout: 5000 })) {
                console.log('🔔 "Turn on Notifications" modal detected. Clicking "Not Now"...');
                await notNowBtn.click({ force: true });
                await this.page.waitForTimeout(1000);
                await this.page.waitForSelector('button._a9--:has-text("Not Now")', { state: 'detached', timeout: 5000 });
                console.log('✅ "Not Now" clicked and modal dismissed.');
            }
        } catch (e) {
            console.log('⚠️ Could not find or click "Not Now" button:', e.message);
        }
    }

    async handleAnyPopups() {
        console.log('🔍 Checking for any popups after navigation...');
        
        try {
            // Wait a moment for any popups to appear
            await this.page.waitForTimeout(2000);
            
            // Common popup selectors (only for unexpected popups, not login forms)
            const popupSelectors = [
                // Instagram-specific popups (only in dialog context)
                'div[role="dialog"] button:has-text("Not Now")',
                'div[role="dialog"] button:has-text("No thanks")',
                'div[role="dialog"] button:has-text("Close")',
                'div[role="dialog"] button:has-text("Cancel")',
                'div[role="dialog"] button:has-text("×")',
                'div[role="dialog"] button:has-text("✕")',
                
                // Generic popups (only overlays, not main page elements)
                'div[role="dialog"] button:has-text("Accept")',
                'div[role="dialog"] button:has-text("Allow")',
                'div[role="dialog"] button:has-text("OK")',
                'div[role="dialog"] button:has-text("Got it")',
                'div[role="dialog"] button:has-text("Continue")',
                
                // Cookie consent (only overlays)
                'div[role="dialog"] button:has-text("Accept All")',
                'div[role="dialog"] button:has-text("Accept Cookies")',
                'div[role="dialog"] button:has-text("I Accept")',
                'div[class*="cookie"] button:has-text("Accept All")',
                'div[class*="cookie"] button:has-text("Accept Cookies")'
            ];
            
            let popupHandled = false;
            
            for (const selector of popupSelectors) {
                try {
                    const popup = await this.page.locator(selector).first();
                    if (await popup.isVisible({ timeout: 1000 })) {
                        console.log(`🔄 Handling popup with selector: ${selector}`);
                        await popup.click();
                        await this.page.waitForTimeout(1000);
                        popupHandled = true;
                        console.log('✅ Popup handled successfully');
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!popupHandled) {
                console.log('ℹ️ No unexpected popups detected');
            }
            
            return popupHandled;
        } catch (error) {
            console.error('❌ Error handling popups:', error.message);
            return false;
        }
    }

    async close() {
        if (this.context) {
            await this.context.close();
        }
    }
}

export default InstagramBot;