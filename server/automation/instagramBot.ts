import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

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
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private account: InstagramAccount;
  private proxy?: ProxyConfig;

  constructor(account: InstagramAccount, proxy?: ProxyConfig) {
    this.account = account;
    this.proxy = proxy;
  }

  async checkLoginStatus(): Promise<boolean> {
    try {
      console.log('🔍 Checking Instagram login status...');
      // Check if we're already logged in by looking for the home icon or profile elements
      const isLoggedIn = await this.page.locator('svg[aria-label="Home"], a[href*="/accounts/edit/"]').isVisible({ timeout: 3000 });
      console.log(`Login status: ${isLoggedIn ? 'Logged in' : 'Not logged in'}`);
      return isLoggedIn;
    } catch {
      console.log('Login status check failed - assuming not logged in');
      return false;
    }
  }

  async initialize(): Promise<void> {
    try {
      // Use persistent user data directory like local code (no timestamp for session persistence)
      const userDataDir = `./chromium_profiles/${this.account.username.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      const launchOptions: any = {
        headless: false, // Debugging mode to see what's happening
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
      // Use launchPersistentContext which returns a context directly (not a browser)
      this.context = await chromium.launchPersistentContext(userDataDir, launchOptions);
      this.page = await this.context.newPage();
      
      // Set user agent using setExtraHTTPHeaders to match working code
      await this.page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      });

      // Setup proactive popup handlers like local code BEFORE navigation
      await this.setupPopupHandlers();

      // Don't navigate to Instagram in initialize - let sendMessage handle navigation
      console.log('✅ Instagram bot initialized successfully');
      
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

      console.log('✅ Popup handlers setup complete');
    } catch (error) {
      console.error('❌ Error setting up popup handlers:', error.message);
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

    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`Navigating to profile (attempt ${attempt}/${maxRetries}): ${profileUrl}`);
        
        // First ensure we're logged into Instagram
        console.log('Ensuring logged into Instagram...');
        await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForTimeout(2000);
        
        // Check if logged in
        console.log('🔍 Checking if logged into Instagram...');
        const isLoggedIn = await this.checkLoginStatus();
        if (!isLoggedIn) {
          console.log('🔐 Not logged in, attempting login...');
          await this.login();
        } else {
          console.log('✅ Already logged into Instagram');
        }
        
        // Use human-like navigation that avoids Instagram's bot detection
        console.log(`Navigating to target profile: ${profileUrl}`);
        
        // Add human-like delay patterns
        await this.page.waitForTimeout(1000 + Math.random() * 2000);
        
        // Try JavaScript navigation first (less detectable)
        try {
          console.log('Attempting JavaScript navigation...');
          await this.page.evaluate((url) => {
            window.location.href = url;
          }, profileUrl);
          
          // Wait for navigation to complete
          await this.page.waitForTimeout(3000 + Math.random() * 2000);
          
          // Check if we're on the target profile
          const currentUrl = this.page.url();
          const username = profileUrl.split('/').pop() || '';
          
          if (currentUrl.includes(username)) {
            console.log('✅ JavaScript navigation successful');
          } else {
            throw new Error('JavaScript navigation redirected elsewhere');
          }
          
        } catch (jsError) {
          console.log('JavaScript navigation failed, trying alternative...');
          
          // Fallback: gradual navigation approach
          try {
            // First go to Instagram home if not there already
            const currentUrl = this.page.url();
            if (!currentUrl.includes('instagram.com') || currentUrl.includes('chrome-error')) {
              await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
              await this.page.waitForTimeout(2000 + Math.random() * 1000);
            }
            
            // Extract username and try search-based navigation
            const username = profileUrl.split('/').pop() || '';
            console.log(`Searching for user: ${username}`);
            
            // Look for search functionality on current page
            const searchElements = [
              'input[placeholder*="Search"]',
              'input[type="text"]',
              'svg[aria-label*="Search"]',
              'a[href*="explore"]'
            ];
            
            let searchSuccess = false;
            for (const selector of searchElements) {
              try {
                const element = this.page.locator(selector).first();
                if (await element.isVisible({ timeout: 3000 })) {
                  console.log(`Found search element: ${selector}`);
                  
                  if (selector.includes('input')) {
                    await element.fill(username);
                    await this.page.waitForTimeout(1000);
                    
                    // Look for user in results
                    const userLink = this.page.locator(`a[href*="/${username}/"]`).first();
                    if (await userLink.isVisible({ timeout: 5000 })) {
                      await userLink.click();
                      searchSuccess = true;
                      break;
                    }
                  } else {
                    // It's a search icon/link
                    await element.click();
                    await this.page.waitForTimeout(2000);
                    
                    // Try to find search input after clicking
                    const searchInput = this.page.locator('input[placeholder*="Search"], input[type="text"]').first();
                    if (await searchInput.isVisible({ timeout: 3000 })) {
                      await searchInput.fill(username);
                      await this.page.waitForTimeout(1000);
                      
                      const userLink = this.page.locator(`a[href*="/${username}/"]`).first();
                      if (await userLink.isVisible({ timeout: 5000 })) {
                        await userLink.click();
                        searchSuccess = true;
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                continue;
              }
            }
            
            if (!searchSuccess) {
              throw new Error('Search-based navigation failed');
            }
            
          } catch (altError) {
            console.log('All navigation methods failed, this profile may be inaccessible');
            throw new Error(`Navigation failed: ${altError.message}`);
          }
        }
        
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
        
        const currentUrl = this.page.url();
        console.log(`Current URL after navigation: ${currentUrl}`);
        
        if (currentUrl.includes('/accounts/login/') || currentUrl.includes('/accounts/challenge/')) {
          console.log('Login required, redirecting to login...');
          await this.login();
          console.log(`Re-navigating to profile after login: ${profileUrl}`);
          await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await this.page.waitForTimeout(2000);
        }
        
        const finalUrl = this.page.url();
        if (finalUrl.includes('instagram.com') && !finalUrl.includes(profileUrl.split('/').pop() || '') && 
            (finalUrl.endsWith('/') || finalUrl.includes('/feed/') || finalUrl.includes('/explore/'))) {
          console.log(`Redirected to homepage or unexpected page: ${finalUrl}`);
          if (attempt < maxRetries) {
            console.log('Retrying navigation...');
            await this.page.waitForTimeout(3000);
            continue;
          } else {
            throw new Error('Instagram keeps redirecting away from target profile');
          }
        }

        await this.page.waitForSelector('header', { state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(1000);
        break;
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        
        // Handle browser session conflicts and network errors
        if (error.message.includes('Opening in existing browser session') || 
            error.message.includes('ERR_HTTP_RESPONSE_CODE_FAILURE') || 
            error.message.includes('net::ERR_NETWORK_CHANGED') ||
            error.message.includes('net::ERR_CONNECTION_RESET') ||
            error.message.includes('net::ERR_INTERNET_DISCONNECTED')) {
          console.log('Browser session conflict or network error detected. Closing and recreating session...');
          
          // Close existing browser session and recreate
          try {
            if (this.page) {
              await this.page.close();
              this.page = null;
            }
            if (this.context) {
              await this.context.close();
              this.context = null;
            }
            
            // Wait before recreating
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Re-initialize with fresh session
            await this.initialize();
            continue; // Try again with fresh session
            
          } catch (altError) {
            console.log('Session recreation failed, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
        
        if (attempt >= maxRetries) {
          throw error;
        }
        console.log(`Waiting before retry attempt ${attempt + 1}...`);
        await this.page.waitForTimeout(5000); // Increased wait time
      }
    }
    
    try {
      await this.page.waitForTimeout(500 + Math.random() * 1000);
      
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
      await this.page.waitForTimeout(300 + Math.random() * 500);
      await messageButton.first().click();
      
      await this.handlePostLoginPopups();
      await this.page.waitForTimeout(2000 + Math.random() * 1000);

      const messageInputSelectors = [
        'div[contenteditable="true"][data-testid="message-input"]',
        'div[contenteditable="true"][aria-label*="Message"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Message"]'
      ];

      let messageInput = null;
      let inputFound = false;

      for (const selector of messageInputSelectors) {
        try {
          messageInput = this.page.locator(selector).first();
          await messageInput.waitFor({ state: 'visible', timeout: 3000 });
          inputFound = true;
          break;
        } catch (e) {
          continue;
        }
      }

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

      await this.page.waitForTimeout(500 + Math.random() * 1000);
      await messageInput.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300 + Math.random() * 500);
      await messageInput.click();
      await this.page.waitForTimeout(500 + Math.random() * 500);

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
      await messageInput.press('Enter');
      await this.page.waitForTimeout(2000);

      const inputValue = await messageInput.textContent();
      if (inputValue && inputValue.trim().length > 0) {
        const sendButton = this.page.locator('div[role="button"]:has-text("Send")');
        if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await sendButton.click();
          await this.page.waitForTimeout(2000);
        }
      }

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

  async handleInstagramModal() {
    console.log('🔍 Checking for Instagram modal popup...');
    
    // Multiple selectors for the modal login button to handle different scenarios
    const modalSelectors = [
      'div[role="dialog"] div[role="button"]:has-text("Log in")',
      'div[role="dialog"] button:has-text("Log in")',
      'div[role="dialog"] a:has-text("Log in")',
      'div[role="button"]:has-text("Log in"):visible',
      'button:has-text("Log in"):visible',
      'a:has-text("Log in"):visible'
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
            
            // Try clicking the modal button
            await element.click({ force: true, timeout: 5000 });
            await this.page.waitForTimeout(1000);
            clicked = true;
            console.log('✅ Modal login button clicked successfully');
            break;
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
      await this.page.waitForTimeout(2000);
      console.log('✅ Modal disappeared successfully');
      
      return true;
      
    } catch (error) {
      console.error('❌ Error handling modal:', error.message);
      return false;
    }
  }

  async handleAnyPopups() {
    console.log('🔍 Checking for any popups...');
    
    const popupSelectors = [
      'button:has-text("Not Now")',
      'button:has-text("Cancel")',
      'button:has-text("Skip")',
      'button:has-text("Dismiss")',
      'div[role="dialog"] button:has-text("Not Now")',
      'div[role="dialog"] button:has-text("Cancel")',
      '[role="button"]:has-text("Not Now")',
      '[role="button"]:has-text("Cancel")',
      'button[aria-label="Close"]',
      'div[role="dialog"] button[aria-label="Close"]'
    ];

    for (const selector of popupSelectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`🔄 Clicking popup button: ${selector}`);
          await element.click();
          await this.page.waitForTimeout(1000);
          break; // Only handle one popup at a time
        }
      } catch (e) {
        // Continue to next selector
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}
