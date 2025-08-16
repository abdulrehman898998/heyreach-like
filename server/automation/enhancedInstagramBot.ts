import { chromium, Browser, BrowserContext, Page, LaunchOptions, BrowserContextOptions } from 'playwright';
import { authenticator } from 'otplib';
import { UserAgentGenerator } from '../utils/userAgentGenerator';
import { AdaptiveSelectors } from '../utils/adaptiveSelectors';

interface BotConfig {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

interface LoginResult {
  success: boolean;
  message: string;
  requires2FA?: boolean;
}

interface MessageResult {
  success: boolean;
  message: string;
  profileUrl?: string;
}

interface WarmupResult {
  success: boolean;
  message: string;
  activityType: string;
  targetUsername?: string;
}

export class EnhancedInstagramBot {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;

  private config: BotConfig;

  constructor(config: BotConfig = {}) {
    this.config = {
      headless: false, // Always run in non-headless mode to see the browser
      slowMo: 1000,
      timeout: 30000,
      ...config
    };
  }

  private generateUserAgent(): string {
    return UserAgentGenerator.generate();
  }

  async initialize(username: string, password: string, twofaSecret?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🚀 Initializing Enhanced Instagram Bot...');
      
      // Generate user agent
      const userAgent = this.generateUserAgent();
      console.log(`🔧 Using user agent: ${userAgent}`);

      // Launch browser
      const browserOptions: LaunchOptions = {
        headless: this.config.headless ?? false,
        slowMo: this.config.slowMo ?? 100,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--user-agent=' + userAgent
        ]
      };

      // Add proxy if configured
      if (this.config.proxy) {
        browserOptions.args!.push(`--proxy-server=${this.config.proxy.server}`);
      }

      console.log('🌐 Launching browser...');
      this.browser = await chromium.launch(browserOptions);
      console.log('✅ Browser launched successfully');

      // Create context
      const contextOptions: BrowserContextOptions = {
        userAgent,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      };

      // Add proxy authentication if provided
      if (this.config.proxy?.username && this.config.proxy?.password) {
        contextOptions.extraHTTPHeaders = {
          ...contextOptions.extraHTTPHeaders,
          'Proxy-Authorization': `Basic ${Buffer.from(`${this.config.proxy.username}:${this.config.proxy.password}`).toString('base64')}`
        };
      }

      console.log('🌐 Creating browser context...');
      this.context = await this.browser!.newContext(contextOptions);
      console.log('✅ Browser context created successfully');

      // Create page
      this.page = await this.context!.newPage();
      
      // Set additional page options
      await this.page.setDefaultNavigationTimeout(this.config.timeout ?? 30000);
      await this.page.setDefaultTimeout(this.config.timeout ?? 30000);

      console.log('🌐 Navigating to Instagram...');
      await this.page.goto('https://www.instagram.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      console.log('🔍 Checking login status...');
      const isLoggedIn = await this.checkLoginStatus();
      
      if (isLoggedIn) {
        console.log('✅ Already logged in');
        this.isLoggedIn = true;
        return { success: true, message: 'Already logged in' };
      }

      console.log('🔍 Starting login process...');
      const loginResult = await this.performLogin(username, password);
      
      if (!loginResult.success) {
        return loginResult;
      }

      // Handle 2FA if required
      if (loginResult.requires2FA && twofaSecret) {
        console.log('🔐 Handling 2FA...');
        const twofaResult = await this.handle2FA(twofaSecret);
        if (!twofaResult.success) {
          return twofaResult;
        }
      }

      this.isLoggedIn = true;
      console.log('✅ Login successful');
      
      return { success: true, message: 'Login successful' };

    } catch (error) {
      console.error('❌ Bot initialization failed:', error);
      await this.close();
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  private async checkLoginStatus(): Promise<boolean> {
    try {
      if (!this.page) return false;

      const currentUrl = this.page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);

      // Check for onetap redirect (this means login was successful)
      if (currentUrl.includes('onetap')) {
        console.log('✅ Detected onetap redirect - login successful');
        this.isLoggedIn = true;
        return true;
      }

      // Check for main Instagram page
      if (currentUrl.includes('instagram.com') && !currentUrl.includes('login')) {
        console.log('✅ On Instagram main page');
        
        // Look for login indicators
        const loginIndicators = [
          'a[href="/explore/"]',
          'a[href="/reels/"]',
          'a[href="/direct/inbox/"]',
          'a[href="/accounts/activity/"]',
          'a[href="/accounts/edit/"]',
          'button[aria-label*="New post"]',
          'button[aria-label*="Create"]',
          'a[href="/p/"]',
          'a[href="/stories/"]',
          'div[data-testid="user-avatar"]',
          'img[alt*="profile picture"]',
          'a[href="/accounts/onetap/"]'
        ];

        for (const selector of loginIndicators) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              console.log(`✅ Found logged-in indicator: ${selector}`);
              return true;
            }
          } catch (e) {
            continue;
          }
        }

        // Check for login form (if found, not logged in)
        const loginFormSelectors = [
          'input[name="username"]',
          'input[name="password"]',
          'button[type="submit"]',
          'form[action*="login"]'
        ];

        for (const selector of loginFormSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              console.log(`❌ Found login form element: ${selector} - Not logged in`);
              return false;
            }
          } catch (e) {
            continue;
          }
        }

        // If we're on main page but no clear indicators, assume logged in
        console.log('⚠️ On Instagram main page but no clear login indicators - assuming not logged in');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  private async performLogin(username: string, password: string): Promise<LoginResult> {
    try {
      if (!this.page) {
        return { success: false, message: 'Page not initialized' };
      }

      console.log('🔍 Starting login process...');

      // Navigate to Instagram login page
      console.log('🌐 Navigating to Instagram login page...');
      try {
        await this.page.goto('https://www.instagram.com/accounts/login/', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        console.log('✅ Navigation completed successfully');
      } catch (e) {
        console.error('❌ Navigation failed:', e);
        return { success: false, message: `Navigation failed: ${e instanceof Error ? e.message : 'Unknown error'}` };
      }
      
      await this.page.waitForTimeout(5000);

      // Take a screenshot for debugging
      try {
        await this.page.screenshot({ path: 'login-page.png' });
        console.log('📸 Screenshot saved as login-page.png');
      } catch (e) {
        console.log('⚠️ Could not save screenshot');
      }

      // Wait for the page to be fully loaded
      await this.page.waitForTimeout(3000);

      // Check if we're on the right page
      const currentUrl = this.page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      if (!currentUrl.includes('instagram.com')) {
        console.log('❌ Not on Instagram domain');
        return { success: false, message: 'Failed to navigate to Instagram' };
      }

      // Enhanced selectors for Instagram login page (desktop version)
      console.log('🔍 Looking for username field...');
      let usernameField = null;
      
      const usernameSelectors = [
        // Primary selectors
        'input[name="username"]',
        'input[aria-label="Phone number, username, or email"]',
        'input[aria-label="Username"]',
        'input[aria-label="Phone number, username, or email address"]',
        
        // Alternative selectors
        'input[placeholder*="username"]',
        'input[placeholder*="Username"]',
        'input[placeholder*="email"]',
        'input[placeholder*="phone"]',
        'input[placeholder*="Phone number, username, or email"]',
        
        // Type and autocomplete selectors
        'input[type="text"]',
        'input[autocomplete="username"]',
        'input[autocomplete="email"]',
        'input[autocomplete="tel"]',
        
        // Data attributes
        'input[data-testid="username"]',
        'input[data-testid="email"]',
        'input[id*="username"]',
        'input[id*="email"]',
        'input[class*="username"]',
        'input[class*="email"]',
        
        // Generic form inputs
        'form input[type="text"]:first-of-type',
        'form input:not([type="password"]):not([type="submit"]):not([type="button"])',
        
        // Additional selectors for mobile/desktop variations
        'input[name="emailOrPhone"]',
        'input[name="email"]',
        'input[type="email"]',
        'input[type="tel"]',
        'input[aria-describedby*="username"]',
        'input[aria-describedby*="email"]'
      ];
      
      for (const selector of usernameSelectors) {
        try {
          usernameField = await this.page.waitForSelector(selector, { timeout: 2000 });
          if (usernameField) {
            console.log(`✅ Found username field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameField) {
        console.log('❌ No username field found');
        // Log page content for debugging
        try {
          const pageContent = await this.page.content();
          console.log(`📄 Page content (first 1000 chars): ${pageContent.substring(0, 1000)}`);
          
          // Also try to find any input elements
          const allInputs = await this.page.$$('input');
          console.log(`🔍 Found ${allInputs.length} input elements on page`);
          
          for (let i = 0; i < allInputs.length; i++) {
            try {
              const inputType = await allInputs[i].getAttribute('type');
              const inputName = await allInputs[i].getAttribute('name');
              const inputPlaceholder = await allInputs[i].getAttribute('placeholder');
              const inputAriaLabel = await allInputs[i].getAttribute('aria-label');
              console.log(`  Input ${i + 1}: type="${inputType}", name="${inputName}", placeholder="${inputPlaceholder}", aria-label="${inputAriaLabel}"`);
            } catch (e) {
              console.log(`  Input ${i + 1}: Could not get attributes`);
            }
          }
          
          // Check if we're being redirected or blocked
          if (pageContent.includes('blocked') || pageContent.includes('suspicious') || pageContent.includes('verify')) {
            console.log('🚫 Instagram is blocking the bot - detected security measures');
            return { success: false, message: 'Instagram is blocking automated access' };
          }
          
          // Try alternative approach - look for any text input
          console.log('🔄 Trying alternative approach - looking for any text input...');
          const textInputs = await this.page.$$('input[type="text"], input[type="email"], input[type="tel"]');
          if (textInputs.length > 0) {
            usernameField = textInputs[0];
            console.log('✅ Found text input using alternative approach');
          }
          
        } catch (e) {
          console.log('⚠️ Could not get page content');
        }
        
        if (!usernameField) {
          return { success: false, message: 'Username field not found - Instagram may be blocking automated access' };
        }
      }

      // Fill username
      console.log('📝 Filling username...');
      await usernameField.click();
      await usernameField.fill('');
      await usernameField.type(username, { delay: 100 });
      await this.page.waitForTimeout(1000);
      
      // Find and fill password field
      console.log('🔍 Looking for password field...');
      let passwordField = null;
      
      const passwordSelectors = [
        // Primary selectors
        'input[name="password"]',
        'input[aria-label="Password"]',
        'input[type="password"]',
        
        // Alternative selectors
        'input[placeholder*="password"]',
        'input[placeholder*="Password"]',
        'input[autocomplete="current-password"]',
        
        // Data attributes
        'input[data-testid="password"]',
        'input[id*="password"]',
        'input[class*="password"]',
        
        // Generic password input
        'form input[type="password"]',
        
        // Additional selectors
        'input[aria-describedby*="password"]',
        'input[name="passwd"]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.waitForSelector(selector, { timeout: 2000 });
          if (passwordField) {
            console.log(`✅ Found password field with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordField) {
        console.log('❌ Password field not found');
        return { success: false, message: 'Password field not found' };
      }

      // Fill password
      console.log('📝 Filling password...');
      await passwordField.click();
      await passwordField.fill('');
      await passwordField.type(password, { delay: 100 });
      await this.page.waitForTimeout(1000);
      
      // Find and click login button
      console.log('🔍 Looking for login button...');
      let loginButton = null;
      
      const loginButtonSelectors = [
        // Primary selectors
        'button[type="submit"]',
        'button:has-text("Log In")',
        'button:has-text("Log in")',
        'button:has-text("Sign In")',
        'button:has-text("Continue")',
        
        // Alternative selectors
        'input[type="submit"]',
        'button[data-testid="login-button"]',
        'button[data-testid="submit"]',
        'button[aria-label*="Log in"]',
        'button[aria-label*="Sign in"]',
        
        // Generic form submit
        'form button[type="submit"]',
        'form input[type="submit"]',
        'button:has-text("Submit")',
        
        // Additional selectors
        'button[type="button"]:has-text("Log In")',
        'button[type="button"]:has-text("Sign In")',
        'button[class*="login"]',
        'button[class*="submit"]'
      ];
      
      for (const selector of loginButtonSelectors) {
        try {
          loginButton = await this.page.waitForSelector(selector, { timeout: 2000 });
          if (loginButton) {
            console.log(`✅ Found login button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!loginButton) {
        console.log('❌ Login button not found');
        return { success: false, message: 'Login button not found' };
      }

      // Click login button
      console.log('🖱️ Clicking login button...');
      await loginButton.click();
      await this.page.waitForTimeout(3000);

      // Take screenshot after login attempt
      try {
        await this.page.screenshot({ path: 'after-login.png' });
        console.log('📸 Screenshot saved as after-login.png');
      } catch (e) {
        console.log('⚠️ Could not save after-login screenshot');
      }

      // Check for 2FA requirement
      const twofaSelectors = [
        'input[name="verificationCode"]',
        'input[aria-label="Security code"]',
        'input[placeholder*="code"]',
        'input[placeholder*="Code"]',
        'input[data-testid="verification-code"]'
      ];

      for (const selector of twofaSelectors) {
        try {
          const twofaField = await this.page.$(selector);
          if (twofaField) {
            console.log('🔐 2FA required');
            return { success: false, message: '2FA required', requires2FA: true };
          }
        } catch (e) {
          continue;
        }
      }

      // Check for error messages
      const errorSelectors = [
        '.error',
        '[data-testid="error"]',
        '.alert',
        '.message',
        'div[role="alert"]'
      ];

      for (const selector of errorSelectors) {
        try {
          const errorElement = await this.page.$(selector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            if (errorText && errorText.trim()) {
              console.log(`❌ Login error: ${errorText}`);
              return { success: false, message: `Login failed: ${errorText}` };
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Check if login was successful
      await this.page.waitForTimeout(2000);
      const isLoggedIn = await this.checkLoginStatus();
      
      if (isLoggedIn) {
        console.log('✅ Login successful');
        return { success: true, message: 'Login successful' };
      } else {
        console.log('❌ Login failed - not logged in after attempt');
        return { success: false, message: 'Login failed - not logged in after attempt' };
      }

    } catch (error) {
      console.error('❌ Error during login:', error);
      return { 
        success: false, 
        message: `Login error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async handle2FA(twofaSecret: string): Promise<LoginResult> {
    try {
      if (!this.page) {
        return { success: false, message: 'Page not initialized' };
      }

      // Generate TOTP code using secret
      const totpCode = authenticator.generate(twofaSecret);
      
      // Fill 2FA code
      await this.page.fill('input[name="verificationCode"]', totpCode);
      await this.page.waitForTimeout(500);
      
      // Submit 2FA
      await this.page.click('button[type="submit"]');
      await this.page.waitForTimeout(3000);
      
      // Check for success
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) {
        return { success: true, message: '2FA successful' };
      }
      
      // Check for 2FA errors
      const errorElement = await this.page.$('[data-testid="verification-code-error"]');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        return { success: false, message: errorText || '2FA failed' };
      }
      
      return { success: false, message: '2FA failed - unknown error' };

    } catch (error) {
      console.error('Error during 2FA:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown 2FA error'
      };
    }
  }

  async sendDirectMessage(profileUrl: string, message: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.page) {
        throw new Error('Page not initialized');
      }

      console.log(`📨 Sending DM to: ${profileUrl}`);
      console.log(`💬 Message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

      // Extract username from profile URL
      const username = profileUrl.split('/').filter(Boolean).pop();
      if (!username) {
        throw new Error('Invalid profile URL');
      }

      // Navigate to user profile
      console.log(`🌐 Navigating to profile: ${username}`);
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      await this.page.waitForTimeout(3000);

      // Look for message button
      const messageSelectors = [
        'a[href*="/direct/t/"]',
        'a[href*="/direct/inbox/"]',
        'button:has-text("Message")',
        'button:has-text("Send message")',
        'a:has-text("Message")',
        'a:has-text("Send message")'
      ];

      let messageButton = null;
      for (const selector of messageSelectors) {
        try {
          messageButton = await this.page.$(selector);
          if (messageButton) {
            console.log(`✅ Found message button with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!messageButton) {
        throw new Error('Message button not found');
      }

      // Click message button
      console.log('🖱️ Clicking message button...');
      await messageButton.click();
      await this.page.waitForTimeout(3000);

      // Wait for DM page to load
      console.log('⏳ Waiting for DM page to load...');
      await this.page.waitForTimeout(5000);

      // Look for message input
      const messageInputSelectors = [
        'textarea[placeholder*="Message"]',
        'textarea[aria-label*="Message"]',
        'div[contenteditable="true"]',
        'textarea',
        'input[type="text"]'
      ];

      let messageInput = null;
      for (const selector of messageInputSelectors) {
        try {
          messageInput = await this.page.$(selector);
          if (messageInput) {
            console.log(`✅ Found message input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!messageInput) {
        throw new Error('Message input not found');
      }

      // Type message
      console.log('📝 Typing message...');
      await messageInput.click();
      await messageInput.type(message);
      await this.page.waitForTimeout(2000);

      // Send message
      console.log('📤 Sending message...');
      await messageInput.press('Enter');
      await this.page.waitForTimeout(3000);

      console.log(`✅ Message sent successfully to ${username}`);
      
      return {
        success: true,
        message: 'Message sent successfully'
      };
      
    } catch (error) {
      console.error(`❌ Failed to send DM to ${profileUrl}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  async executeWarmupActivities(): Promise<WarmupResult[]> {
    const results: WarmupResult[] = [];
    
    try {
      console.log('🔥 Starting comprehensive warmup activities...');
      
      if (!this.page) {
        return [{
          success: false,
          message: 'Page not initialized',
          activityType: 'warmup'
        }];
      }

      // 1. Browse Instagram feed (scroll through posts)
      try {
        console.log('📱 Navigating to Instagram home...');
        await this.page.goto('https://www.instagram.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        // Scroll through feed
        console.log('📜 Scrolling through feed...');
        for (let i = 0; i < 3; i++) {
          await this.page.evaluate(() => window.scrollBy(0, 800));
          await this.page.waitForTimeout(2000 + Math.random() * 2000);
        }
        
        results.push({
          success: true,
          message: 'Successfully browsed Instagram feed',
          activityType: 'browse'
        });
      } catch (error) {
        console.log('⚠️ Feed browsing failed:', error);
        results.push({
          success: false,
          message: `Feed browsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'browse'
        });
      }

      // 2. Like some posts
      try {
        console.log('❤️ Looking for posts to like...');
        await this.page.waitForTimeout(2000);
        
        const likeButtons = await this.page.$$('article svg[aria-label="Like"]');
        console.log(`Found ${likeButtons.length} like buttons`);
        
        if (likeButtons.length > 0) {
          const likesToPerform = Math.min(2, likeButtons.length);
          for (let i = 0; i < likesToPerform; i++) {
            try {
              await likeButtons[i].click();
              console.log(`✅ Liked post ${i + 1}`);
              await this.page.waitForTimeout(3000 + Math.random() * 2000);
            } catch (e) {
              console.log(`⚠️ Failed to like post ${i + 1}`);
            }
          }
          
          results.push({
            success: true,
            message: `Liked ${likesToPerform} posts`,
            activityType: 'like'
          });
        } else {
          console.log('No like buttons found');
          results.push({
            success: false,
            message: 'No posts found to like',
            activityType: 'like'
          });
        }
      } catch (error) {
        results.push({
          success: false,
          message: `Liking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'like'
        });
      }

      // 3. Watch reels
      try {
        console.log('🎬 Looking for reels to watch...');
        await this.page.goto('https://www.instagram.com/reels/', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        // Watch a few reels
        for (let i = 0; i < 2; i++) {
          await this.page.waitForTimeout(5000 + Math.random() * 3000);
          // Scroll to next reel
          await this.page.evaluate(() => window.scrollBy(0, 600));
        }
        
        results.push({
          success: true,
          message: 'Successfully watched reels',
          activityType: 'view_reel'
        });
      } catch (error) {
        console.log('⚠️ Reel watching failed:', error);
        results.push({
          success: false,
          message: `Reel watching failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'view_reel'
        });
      }

      // 4. Browse explore page
      try {
        console.log('🔍 Browsing explore page...');
        await this.page.goto('https://www.instagram.com/explore/', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        // Scroll through explore
        for (let i = 0; i < 3; i++) {
          await this.page.evaluate(() => window.scrollBy(0, 800));
          await this.page.waitForTimeout(2000 + Math.random() * 2000);
        }
        
        results.push({
          success: true,
          message: 'Successfully browsed explore page',
          activityType: 'explore'
        });
      } catch (error) {
        console.log('⚠️ Explore browsing failed:', error);
        results.push({
          success: false,
          message: `Explore browsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'explore'
        });
      }

      // 5. Comment on a post
      try {
        console.log('💬 Looking for posts to comment on...');
        await this.page.goto('https://www.instagram.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        // Find a post to comment on
        const posts = await this.page.$$('article a[href*="/p/"]');
        if (posts.length > 0) {
          await posts[0].click();
          await this.page.waitForTimeout(3000);
          
          // Find comment box with retry mechanism
          let commentBox = null;
          let retries = 3;
          
          while (retries > 0 && !commentBox) {
            try {
              commentBox = await this.page.$('textarea[aria-label*="comment"]');
              if (!commentBox) {
                commentBox = await this.page.$('textarea[placeholder*="comment"]');
              }
              if (!commentBox) {
                commentBox = await this.page.$('textarea[placeholder*="Add a comment"]');
              }
              if (!commentBox) {
                commentBox = await this.page.$('div[contenteditable="true"]');
              }
              
              if (commentBox) {
                // Verify element is still attached
                const isAttached = await commentBox.evaluate(() => true).catch(() => false);
                if (!isAttached) {
                  commentBox = null;
                  retries--;
                  await this.page.waitForTimeout(1000);
                  continue;
                }
                break;
              }
            } catch (error) {
              retries--;
              await this.page.waitForTimeout(1000);
            }
          }
          
          if (commentBox) {
            const comments = [
              'Great post! 👍',
              'Love this! ❤️',
              'Amazing content! ✨',
              'Well done! 👏',
              'Fantastic! 🌟'
            ];
            const randomComment = comments[Math.floor(Math.random() * comments.length)];
            
            try {
              await commentBox.click();
              await this.page.waitForTimeout(500);
              
              // Use page.type instead of element.type for better reliability
              await this.page.keyboard.type(randomComment);
              await this.page.waitForTimeout(1000);
              
              // Find post button
              const postButton = await this.page.$('button[type="submit"]');
              if (postButton) {
                await postButton.click();
                console.log(`✅ Posted comment: "${randomComment}"`);
                
                results.push({
                  success: true,
                  message: `Posted comment: "${randomComment}"`,
                  activityType: 'comment'
                });
              }
            } catch (error) {
              console.log('⚠️ Failed to post comment:', error);
              results.push({
                success: false,
                message: `Commenting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                activityType: 'comment'
              });
            }
          } else {
            console.log('⚠️ No comment box found after retries');
            results.push({
              success: false,
              message: 'No comment box found',
              activityType: 'comment'
            });
          }
        }
      } catch (error) {
        console.log('⚠️ Commenting failed:', error);
        results.push({
          success: false,
          message: `Commenting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'comment'
        });
      }

      // 6. Follow suggested users
      try {
        console.log('👥 Looking for users to follow...');
        await this.page.goto('https://www.instagram.com/', { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });
        await this.page.waitForTimeout(3000);
        
        // Look for follow suggestions
        const followButtons = await this.page.$$('button:has-text("Follow")');
        console.log(`Found ${followButtons.length} follow buttons`);
        
        if (followButtons.length > 0) {
          const usersToFollow = Math.min(2, followButtons.length);
          for (let i = 0; i < usersToFollow; i++) {
            try {
              await followButtons[i].click();
              console.log(`✅ Followed user ${i + 1}`);
              await this.page.waitForTimeout(3000 + Math.random() * 2000);
            } catch (e) {
              console.log(`⚠️ Failed to follow user ${i + 1}`);
            }
          }
          
          results.push({
            success: true,
            message: `Followed ${usersToFollow} users`,
            activityType: 'follow'
          });
        } else {
          console.log('No follow buttons found');
          results.push({
            success: false,
            message: 'No users found to follow',
            activityType: 'follow'
          });
        }
      } catch (error) {
        results.push({
          success: false,
          message: `Following failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          activityType: 'follow'
        });
      }

      console.log('🎉 Warmup activities completed!');
      return results;

    } catch (error) {
      console.error('Error executing warmup activities:', error);
      return [{
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        activityType: 'warmup'
      }];
    }
  }

  isInitialized(): boolean {
    return this.browser !== null && this.context !== null && this.page !== null;
  }

  async close(): Promise<void> {
    try {
      console.log('🔄 Closing Enhanced Instagram Bot...');

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
      }
      
      console.log('✅ Bot closed successfully');
    } catch (error) {
      console.error('Error closing bot:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Additional methods for warmup activities
  async navigateToHome(): Promise<void> {
    if (!this.page) throw new Error('Bot not initialized');
    await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
  }

  async scrollFeed(scrollCount: number): Promise<void> {
    if (!this.page) throw new Error('Bot not initialized');
    
    for (let i = 0; i < scrollCount; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, 800);
      });
      await this.page.waitForTimeout(2000 + Math.random() * 1000);
    }
  }

  async likeRecentPosts(count: number): Promise<number> {
    if (!this.page) throw new Error('Bot not initialized');
    
    const likeButtons = await this.page.$$('button[aria-label*="Like"]');
    console.log(`Found ${likeButtons.length} like buttons`);
    
    const likedCount = Math.min(count, likeButtons.length);
    for (let i = 0; i < likedCount; i++) {
      try {
        await likeButtons[i].click();
        console.log(`✅ Liked post ${i + 1}`);
        await this.page.waitForTimeout(2000 + Math.random() * 1000);
      } catch (e) {
        console.log(`⚠️ Failed to like post ${i + 1}`);
      }
    }
    
    return likedCount;
  }

  async viewStories(): Promise<void> {
    if (!this.page) throw new Error('Bot not initialized');
    
    // Navigate to stories
    await this.page.goto('https://www.instagram.com/stories/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
    
    // Click on first story if available
    const storyButtons = await this.page.$$('div[role="button"]');
    if (storyButtons.length > 0) {
      await storyButtons[0].click();
      await this.page.waitForTimeout(5000);
    }
  }

  async followSuggestedUsers(count: number): Promise<number> {
    if (!this.page) throw new Error('Bot not initialized');
    
    const followButtons = await this.page.$$('button:has-text("Follow")');
    console.log(`Found ${followButtons.length} follow buttons`);
    
    const followedCount = Math.min(count, followButtons.length);
    for (let i = 0; i < followedCount; i++) {
      try {
        await followButtons[i].click();
        console.log(`✅ Followed user ${i + 1}`);
        await this.page.waitForTimeout(3000 + Math.random() * 2000);
      } catch (e) {
        console.log(`⚠️ Failed to follow user ${i + 1}`);
      }
    }
    
    return followedCount;
  }

  async commentOnRecentPost(comment: string): Promise<void> {
    if (!this.page) throw new Error('Bot not initialized');
    
    // Find comment box
    const commentBox = await this.page.$('textarea[aria-label*="comment"]');
    if (commentBox) {
      await commentBox.click();
      await commentBox.type(comment);
      await this.page.waitForTimeout(1000);
      
      // Find post button
      const postButton = await this.page.$('button:has-text("Post")');
      if (postButton) {
        await postButton.click();
        console.log(`✅ Commented: "${comment}"`);
      }
    }
  }

  async unfollowUsers(count: number): Promise<number> {
    if (!this.page) throw new Error('Bot not initialized');
    
    // Navigate to following page
    await this.page.goto('https://www.instagram.com/accounts/activity/', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
    
    const unfollowButtons = await this.page.$$('button:has-text("Following")');
    console.log(`Found ${unfollowButtons.length} unfollow buttons`);
    
    const unfollowedCount = Math.min(count, unfollowButtons.length);
    for (let i = 0; i < unfollowedCount; i++) {
      try {
        await unfollowButtons[i].click();
        await this.page.waitForTimeout(1000);
        
        // Confirm unfollow
        const confirmButton = await this.page.$('button:has-text("Unfollow")');
        if (confirmButton) {
          await confirmButton.click();
          console.log(`✅ Unfollowed user ${i + 1}`);
        }
        
        await this.page.waitForTimeout(2000 + Math.random() * 1000);
      } catch (e) {
        console.log(`⚠️ Failed to unfollow user ${i + 1}`);
      }
    }
    
    return unfollowedCount;
  }
}