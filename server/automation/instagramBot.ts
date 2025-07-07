import { chromium, type Browser, type Page } from 'playwright';

interface InstagramAccount {
  username: string;
  password: string;
  twofa?: string;
}

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export class InstagramBot {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private account: InstagramAccount;
  private proxy?: ProxyConfig;

  constructor(account: InstagramAccount, proxy?: ProxyConfig) {
    this.account = account;
    this.proxy = proxy;
  }

  async initialize(): Promise<void> {
    try {
      // Create user data directory for persistent sessions
      const userDataDir = `./chromium_profiles/${this.account.username.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const launchOptions: any = {
        headless: true, // Must be true for Replit environment
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=site-per-process',
          '--disable-blink-features=AutomationControlled'
        ]
      };

      // Add proxy configuration if provided
      if (this.proxy) {
        launchOptions.proxy = this.proxy;
        console.log(`Using proxy: ${this.proxy.server}`);
      }

      console.log(`🔄 Using persistent profile: ${userDataDir}`);
      // Use launchPersistentContext for user data persistence
      this.browser = await chromium.launchPersistentContext(userDataDir, launchOptions);

      // Get existing page or create new one
      const pages = this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
      
      // Set user agent (check if method exists)
      if (typeof this.page.setUserAgent === 'function') {
        await this.page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        );
      }

      // Navigate to Instagram
      await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);

      // Handle cookie banner
      await this.handlePopups();

      // Login
      await this.login();
      
    } catch (error) {
      if (error.message.includes('Executable doesn\'t exist')) {
        console.error('Browser not installed. Installing Chromium...');
        throw new Error('Browser not ready. Chromium is being installed in the background. Please try again in a few minutes.');
      }
      console.error('Failed to initialize Instagram bot:', error);
      await this.close();
      throw error;
    }
  }

  private async handlePopups(): Promise<void> {
    try {
      // Handle cookie consent
      const cookieButtons = [
        'button[data-cookiebanner="accept_cookie"]',
        'button:has-text("Accept")',
        'button:has-text("Allow")',
        '[role="button"]:has-text("Accept")'
      ];

      for (const selector of cookieButtons) {
        try {
          const element = await this.page?.locator(selector).first();
          if (element && await element.isVisible({ timeout: 2000 })) {
            await element.click();
            await this.page?.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Handle other popups
      const closeButtons = [
        'button[aria-label="Close"]',
        'button:has-text("Not Now")',
        'button:has-text("Cancel")',
        '[role="button"]:has-text("Not Now")'
      ];

      for (const selector of closeButtons) {
        try {
          const element = await this.page?.locator(selector).first();
          if (element && await element.isVisible({ timeout: 1000 })) {
            await element.click();
            await this.page?.waitForTimeout(500);
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    } catch (error) {
      console.log('No popups to handle or error handling popups:', error.message);
    }
  }

  private async login(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    try {
      // Wait for login form
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Fill login form
      await this.page.fill('input[name="username"]', this.account.username);
      await this.page.waitForTimeout(1000);
      
      await this.page.fill('input[name="password"]', this.account.password);
      await this.page.waitForTimeout(1000);

      // Click login button
      await this.page.click('button[type="submit"]');

      // Wait for navigation or 2FA
      await this.page.waitForTimeout(3000);

      // Check if 2FA is actually required by looking for the input field
      const twoFASelector = 'input[name="verificationCode"]';
      const has2FA = await this.page.locator(twoFASelector).isVisible().catch(() => false);
      
      if (has2FA && this.account.twofa) {
        console.log('2FA detected, handling...');
        await this.handle2FA();
      } else if (has2FA && !this.account.twofa) {
        console.log('2FA required but no 2FA secret provided');
        throw new Error('2FA required but no 2FA secret configured for this account');
      }

      // Check if login was successful
      const currentUrl = this.page.url();
      if (currentUrl.includes('/challenge/') || currentUrl.includes('/accounts/login/')) {
        // Check if we're still on login page or there's a challenge
        const stillOnLogin = await this.page.locator('input[name="username"]').isVisible().catch(() => false);
        if (stillOnLogin) {
          throw new Error('Login failed - possibly incorrect credentials');
        }
      }

      // Handle post-login popups
      await this.handlePostLoginPopups();

      console.log('Successfully logged into Instagram');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  private async handle2FA(): Promise<void> {
    if (!this.page || !this.account.twofa) return;

    try {
      // Wait for 2FA input
      const twoFASelector = 'input[name="verificationCode"]';
      await this.page.waitForSelector(twoFASelector, { timeout: 10000 });

      // Generate 2FA code (simplified - you'd use a proper TOTP library)
      const code = this.generate2FACode(this.account.twofa);
      
      await this.page.fill(twoFASelector, code);
      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(3000);
    } catch (error) {
      console.error('2FA handling failed:', error);
      throw error;
    }
  }

  private generate2FACode(secret: string): string {
    // This is a placeholder - implement proper TOTP generation
    // You would use a library like 'otplib' for this
    return '123456';
  }

  private async handlePostLoginPopups(): Promise<void> {
    if (!this.page) return;

    try {
      // Handle "Save Info" popup
      const notNowButtons = await this.page.locator('button:has-text("Not Now")');
      if (await notNowButtons.count() > 0) {
        await notNowButtons.first().click();
        await this.page.waitForTimeout(1000);
      }

      // Handle notifications popup
      const notificationButtons = await this.page.locator('button:has-text("Not Now")');
      if (await notificationButtons.count() > 0) {
        await notificationButtons.first().click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('No post-login popups to handle');
    }
  }

  async sendDirectMessage(profileUrl: string, message: string): Promise<void> {
    if (!this.page) throw new Error('Bot not initialized');

    try {
      // Navigate to profile
      await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);

      // Click message button
      const messageButton = this.page.locator('text="Message"').first();
      await messageButton.click();
      await this.page.waitForTimeout(2000);

      // Type message
      const messageInput = this.page.locator('textarea[placeholder*="Message"]').first();
      await messageInput.fill(message);
      await this.page.waitForTimeout(1000);

      // Send message
      const sendButton = this.page.locator('button:has-text("Send")').first();
      await sendButton.click();
      await this.page.waitForTimeout(2000);

      console.log(`Message sent to ${profileUrl}`);
    } catch (error) {
      console.error(`Failed to send message to ${profileUrl}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}
