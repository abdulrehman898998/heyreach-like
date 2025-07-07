import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { chromium } from 'playwright';
import { authenticator } from 'otplib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class FacebookBot {
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
    }

    async checkLoginStatus() {
        try {
            // Check if we're already logged in by looking for Facebook home elements
            const isLoggedIn = await this.page.locator('[aria-label="Your profile"], [data-testid="blue_bar_profile_link"]').isVisible({ timeout: 3000 });
            return isLoggedIn;
        } catch {
            return false;
        }
    }

    async login() {
        console.log(`\nAttempting to log in as ${this.account.username}...`);
        await this.page.goto('https://www.facebook.com/login/', { waitUntil: 'networkidle', timeout: 30000 });
    
        // Wait for login form to be fully loaded
        await this.page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 15000 });
        await this.page.waitForSelector('input[name="pass"]', { state: 'visible', timeout: 15000 });
        await this.page.waitForTimeout(500 + Math.random() * 500);
    
        // Fill in login credentials with a slight delay to mimic human behavior
        await this.page.fill('input[name="email"]', this.account.username);
        await this.page.waitForTimeout(500 + Math.random() * 500); // Small random delay
        await this.page.fill('input[name="pass"]', this.account.password);
        await this.page.waitForTimeout(500 + Math.random() * 500);
    
        // Click submit button with a robust selector
        const submitButton = this.page.locator('button[name="login"]:visible');
        await submitButton.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(500 + Math.random() * 500);
        await submitButton.click();
        await this.page.waitForTimeout(500 + Math.random() * 500);
    
        // Wait for either home elements, 2FA prompt, or error message
        try {
            await Promise.race([
                this.page.waitForSelector('[aria-label="Your profile"], [data-testid="blue_bar_profile_link"]', { timeout: 20000 }),
                this.page.waitForSelector('[data-testid="error_box"], ._9ay7', { timeout: 20000 }),
                this.page.waitForSelector('input[name="approvals_code"], input[name="code"]', { timeout: 20000 })
            ]);
        } catch (e) {
            console.error('Timeout waiting for login result.');
        }
    
        // Check for login error
        const loginError = await this.page.$('[data-testid="error_box"], ._9ay7');
        if (loginError) {
            const errorMsg = await loginError.textContent();
            console.error('Login failed:', errorMsg);
            await this.page.screenshot({ path: 'facebook_login_error.png' });
            throw new Error('Login failed: ' + errorMsg);
        }

        // Handle 2FA prompt (TOTP)
        const twofaInput = await this.page.$('input[name="approvals_code"], input[name="code"]');
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
            const confirmBtn = this.page.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Continue"), button[type="submit"]:visible, button[name="checkpoint_submit_button"]');
            if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await confirmBtn.click();
                await this.page.waitForTimeout(2000);
            }

            // Wait for login to complete
            await this.page.waitForSelector('[aria-label="Your profile"], [data-testid="blue_bar_profile_link"]', { timeout: 20000 });
            console.log('2FA code submitted. Login should complete.');
        }
    
        // Handle "Save login info" pop-up
        const saveLoginButton = this.page.locator('button:has-text(/Not\s+Now/i), button:has-text(/Skip/i)');
        if (await saveLoginButton.isVisible({ timeout: 10000 }).catch(() => false)) {
            await saveLoginButton.click();
            await this.page.waitForTimeout(2000);
        }
    
        // Handle "Turn on notifications" pop-up
        const notificationsButton = this.page.locator('button:has-text(/Not\s+Now/i), button:has-text(/Skip/i)');
        if (await notificationsButton.isVisible({ timeout: 10000 }).catch(() => false)) {
            await notificationsButton.click();
            await this.page.waitForTimeout(2000);
        }
    
        // Verify login success
        const profileElement = await this.page.locator('[aria-label="Your profile"], [data-testid="blue_bar_profile_link"]').isVisible();
        if (profileElement) {
            console.log(`Successfully logged in as ${this.account.username}.`);
        } else {
            throw new Error('Login failed: Profile element not found after login.');
        }
    }

    async sendMessage(profileUrl, message) {
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                attempt++;
                console.log(`Navigating to profile (attempt ${attempt}/${maxRetries}): ${profileUrl}`);
                
                // Reduced delay before navigation
                await this.page.waitForTimeout(1000 + Math.random() * 2000); // 1-3 seconds
                
                await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                
                // Reduced wait for redirects
                await this.page.waitForTimeout(2000);
                
                // Check current URL after navigation
                const currentUrl = this.page.url();
                console.log(`Current URL after navigation: ${currentUrl}`);
                
                // Check if we were redirected to login or challenge page
                if (currentUrl.includes('/login/') || currentUrl.includes('/checkpoint/')) {
                    console.log('Login required, redirecting to login...');
                    await this.login();
                    // Navigate back to the profile after login
                    console.log(`Re-navigating to profile after login: ${profileUrl}`);
                    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    await this.page.waitForTimeout(2000);
                }
                
                // Check if we were redirected to homepage or other unexpected page
                const finalUrl = this.page.url();
                if (finalUrl.includes('facebook.com') && !finalUrl.includes(profileUrl.split('/').pop()) && 
                    (finalUrl.endsWith('/') || finalUrl.includes('/feed/') || finalUrl.includes('/home/'))) {
                    console.log(`⚠️ Redirected to homepage or unexpected page: ${finalUrl}`);
                    if (attempt < maxRetries) {
                        console.log('Retrying navigation...');
                        await this.page.waitForTimeout(3000); // Reduced wait before retry
                        continue;
                    } else {
                        throw new Error('Facebook keeps redirecting away from target profile');
                    }
                }
        
                // Wait for the profile content to be visible
                await this.page.waitForTimeout(1000); // Give time for the page to load
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
            // Wait for the message button to appear and click it
            await this.page.waitForTimeout(1000 + Math.random() * 1000);
            const messageButton = this.page.locator('div[role="none"][data-visualcompletion="ignore"].x1ey2m1c');
            await messageButton.first().waitFor({ state: 'visible', timeout: 15000 });
            await messageButton.first().click();
            await this.page.waitForTimeout(2000 + Math.random() * 1000);

            // Find the message input field (Messenger/chat popup)
            let messageInput = null;
            let inputFound = false;
            const messageInputSelectors = [
                'div[contenteditable="true"]',
                'div[role="textbox"][contenteditable="true"]',
                'textarea[placeholder*="Type a message"]',
                'input[placeholder*="Type a message"]'
            ];
            for (const selector of messageInputSelectors) {
                try {
                    messageInput = this.page.locator(selector).first();
                    await messageInput.waitFor({ state: 'visible', timeout: 5000 });
                    inputFound = true;
                    break;
                } catch (e) {
                    continue;
                }
            }
            if (!inputFound) {
                throw new Error('Could not find message input field with any selector');
            }
            await this.page.waitForTimeout(500 + Math.random() * 1000);
            await messageInput.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(300 + Math.random() * 500);
            await messageInput.click();
            await this.page.waitForTimeout(500 + Math.random() * 500);
            // Type the message
            let typingSuccess = false;
            try {
                const typingDelay = 60 + Math.random() * 100;
                await this.page.keyboard.type(message, { delay: typingDelay });
                typingSuccess = true;
            } catch (keyboardError) {
                try {
                    const typingDelay = 80 + Math.random() * 150;
                    await messageInput.type(message, { delay: typingDelay, timeout: 15000 });
                    typingSuccess = true;
                } catch (typeError) {
                    try {
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
            await this.page.waitForTimeout(1000 + Math.random() * 1000);
            // Send the message
            await messageInput.press('Enter');
            await this.page.waitForTimeout(2000);
            // Optionally check if message was sent (not strictly needed)
            console.log(`   -> ✅ Message sent successfully to ${profileUrl}.`);
            return true;
        } catch (error) {
            if (error.message && !error.message.includes('Could not find message input field')) {
                console.error(`   -> ❌ Failed to send message to ${profileUrl}: ${error.message}`);
                return false;
            } else {
                console.log(`   -> ⚠️ Message button not available for ${profileUrl}, skipping.`);
                return null;
            }
        }
    }

    async close() {
        if (this.context) {
            await this.context.close();
        }
    }
}

export default FacebookBot; 