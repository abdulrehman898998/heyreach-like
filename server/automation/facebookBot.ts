import { chromium, Browser, BrowserContext, Page } from 'playwright';
import path from 'path';
import { authenticator } from 'otplib';

interface FacebookAccount {
  username: string;
  password: string;
  twofa?: string;
}

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export class FacebookBot {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private account: FacebookAccount;
  private proxy?: ProxyConfig;
  private userDataDir: string;

  constructor(account: FacebookAccount, proxy?: ProxyConfig) {
    this.account = account;
    this.proxy = proxy;
    this.userDataDir = path.join(process.cwd(), 'chromium_profiles', account.username);
  }

  async initialize(): Promise<void> {
    const launchOptions = {
      headless: false,
      ignoreHTTPSErrors: true,
      proxy: this.proxy ? {
        server: this.proxy.server,
        username: this.proxy.username,
        password: this.proxy.password
      } : undefined
    };

    // Use persistent context for maintaining login sessions
    this.context = await chromium.launchPersistentContext(this.userDataDir, launchOptions);
    this.page = await this.context.newPage();
    
    // Set user agent
    await this.page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
    });

    console.log(`🔄 Using persistent profile: ${this.userDataDir}`);
  }

  async checkLoginStatus(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Check if we're already logged in by looking for Facebook home elements
      const isLoggedIn = await this.page.locator('[aria-label="Your profile"], [data-testid="blue_bar_profile_link"]').isVisible({ timeout: 3000 });
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async login(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`🔐 Logging into Facebook as ${this.account.username}...`);

    try {
      await this.page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);

      // Check if already logged in
      if (await this.checkLoginStatus()) {
        console.log('Already logged in to Facebook');
        return;
      }

      // Fill username
      const emailInput = this.page.locator('#email');
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(this.account.username);
      await this.page.waitForTimeout(500);

      // Fill password
      const passwordInput = this.page.locator('#pass');
      await passwordInput.fill(this.account.password);
      await this.page.waitForTimeout(500);

      // Click login button
      const loginButton = this.page.locator('[data-testid="royal_login_button"]');
      await loginButton.click();
      await this.page.waitForTimeout(3000);

      // Handle 2FA if configured
      if (this.account.twofa) {
        await this.handle2FA();
      }

      // Wait for login to complete
      await this.page.waitForURL('**/facebook.com/**', { timeout: 30000 });
      
      // Verify login success
      if (await this.checkLoginStatus()) {
        console.log('Successfully logged into Facebook');
      } else {
        throw new Error('Login failed: Could not verify login status');
      }

    } catch (error) {
      console.error('Facebook login error:', error);
      throw error;
    }
  }

  private async handle2FA(): Promise<void> {
    if (!this.page || !this.account.twofa) return;

    try {
      // Wait for 2FA input field
      const twoFAInput = this.page.locator('input[name="approvals_code"]');
      await twoFAInput.waitFor({ state: 'visible', timeout: 10000 });

      // Generate 2FA code
      const code = this.generate2FACode(this.account.twofa);
      
      // Fill 2FA code
      await twoFAInput.fill(code);
      await this.page.waitForTimeout(500);

      // Submit 2FA
      const submitButton = this.page.locator('[data-testid="2fa_continue_button"]');
      await submitButton.click();
      await this.page.waitForTimeout(3000);

    } catch (error) {
      console.error('2FA handling failed:', error);
      throw error;
    }
  }

  private generate2FACode(secret: string): string {
    return authenticator.generate(secret);
  }

  async sendDirectMessage(profileUrl: string, message: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`📱 Sending message to: ${profileUrl}`);

    // Navigate to profile
    await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    
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
            console.error('All typing methods failed');
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
      
      console.log(`✅ Message sent successfully to ${profileUrl}`);
      
    } catch (error) {
      if (error.message && !error.message.includes('Could not find message input field')) {
        console.error(`❌ Failed to send message to ${profileUrl}: ${error.message}`);
        throw error;
      } else {
        console.log(`⚠️ Message button not available for ${profileUrl}, skipping.`);
        throw new Error(`Message button not available for ${profileUrl}`);
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}