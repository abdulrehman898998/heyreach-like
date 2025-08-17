import { chromium, BrowserContext, Page } from 'playwright';
import { authenticator } from 'otplib';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BotConfig {
  headless?: boolean;
  slowMo?: number;
  timeout?: number;
  userDataDir?: string;
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

interface Account {
  username: string;
  password: string;
  twofa?: string;
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

export class InstagramBot {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isLoggedIn = false;
  private account: Account | null = null;

  private config: BotConfig;

  constructor(account: Account, config: BotConfig = {}) {
    this.account = account;
    this.config = {
      headless: false, // VISIBLE MODE - so you can see Instagram automation
      slowMo: 1000,
      timeout: 30000,
      userDataDir: config.userDataDir || path.join(__dirname, `session-${account.username}`),
      ...config
    };
  }

  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🚀 Initializing Instagram Bot...');
      
      if (!this.account) {
        return { success: false, message: 'Account not provided' };
      }

      const launchOptions = {
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        timeout: this.config.timeout,
        bypassCSP: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        proxy: this.config.proxy ? this.config.proxy : undefined,
        args: ['--disable-blink-features=AutomationControlled']
      };
      this.context = await chromium.launchPersistentContext(this.config.userDataDir!, launchOptions);
      this.page = await this.context.newPage();

      // Add anti-detection evasions
      await this.page.addInitScript(() => {
        // Remove navigator.webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        // Add chrome runtime
        // @ts-ignore
        window.navigator.chrome = {
          runtime: {},
        };
        // Add plugins length
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        // Add languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      // Set extra headers
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
        'Upgrade-Insecure-Requests': '1'
      });

      // Setup proactive popup handlers
      await this.setupPopupHandlers();
      
      console.log('✅ Browser initialized successfully');

      // Check if already logged in
      const isAlreadyLoggedIn = await this.checkLoginStatus();
      if (isAlreadyLoggedIn) {
        console.log('✅ Already logged in');
        this.isLoggedIn = true;
        return { success: true, message: 'Bot initialized - already logged in' };
      }

      // Login
      const loginResult = await this.login();
      if (!loginResult.success) {
        return loginResult;
      }

      return { success: true, message: 'Bot initialized and logged in successfully' };
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      return { success: false, message: `Failed to initialize: ${error}` };
    }
  }

  async setupPopupHandlers(): Promise<void> {
    if (!this.page) return;
    
    console.log('🔧 Setting up proactive popup handlers...');
    
    try {
      // Handler for "Save login info" popup (only when it appears as a modal)
      await this.page.addLocatorHandler(
        this.page.locator('div[role="dialog"] button:has-text("Not Now")'),
        async () => {
          console.log('🔄 Auto-handling "Save login info" popup...');
          await this.page!.locator('div[role="dialog"] button:has-text("Not Now")').click();
        }
      );

      // Handler for "Turn on notifications" popup (only in dialog context)
      await this.page.addLocatorHandler(
        this.page.locator('div[role="dialog"] button:has-text("Not Now")').filter({ hasText: /notification/i }),
        async () => {
          console.log('🔄 Auto-handling "Turn on notifications" popup...');
          await this.page!.locator('div[role="dialog"] button:has-text("Not Now")').click();
        }
      );

      // Handler for generic modal close buttons (only in dialog context)
      await this.page.addLocatorHandler(
        this.page.locator('div[role="dialog"] button:has-text("Close")').or(
          this.page.locator('div[role="dialog"] button:has-text("Cancel")')
        ).or(
          this.page.locator('div[role="dialog"] button:has-text("×")')
        ).or(
          this.page.locator('div[role="dialog"] button:has-text("✕")')
        ),
        async () => {
          console.log('🔄 Auto-handling generic modal close button...');
          await this.page!.locator('div[role="dialog"] button:has-text("Close")').click();
        }
      );

      console.log('✅ Popup handlers setup complete');
    } catch (error) {
      console.error('❌ Error setting up popup handlers:', error);
    }
  }

  async checkLoginStatus(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      await this.page.goto('https://www.instagram.com/', { waitUntil: 'networkidle', timeout: 10000 });
      // Check if we're already logged in by looking for the home icon or profile elements
      const isLoggedIn = await this.page.locator('svg[aria-label="Home"], a[href*="/accounts/edit/"]').isVisible({ timeout: 3000 });
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  private async login(): Promise<LoginResult> {
    try {
      if (!this.page || !this.account) {
        return { success: false, message: 'Page or account not initialized' };
      }

      console.log(`\nAttempting to log in as ${this.account.username}...`);
      // Attempt to navigate to login page
      await this.page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000); // Additional delay for page to stabilize
      console.log('Current URL after goto:', await this.page.url());
      await this.page.screenshot({ path: 'after_goto.png' });

      // Use getByRole with fallback for languages
      console.log('⏳ Waiting for username field...');
      let usernameField = null;
      try {
        usernameField = this.page.getByRole('textbox', { name: 'Phone number, username, or email' });
        await usernameField.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✅ Found English username field');
      } catch (e) {
        console.log('📌 English username not found, trying Urdu...');
        usernameField = this.page.getByRole('textbox', { name: 'فون نمبر، یوزر نیم، یا ای میل' });
        await usernameField.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✅ Found Urdu username field');
      }

      console.log('⏳ Waiting for password field...');
      let passwordField = null;
      try {
        passwordField = this.page.getByRole('textbox', { name: 'Password' });
        await passwordField.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✅ Found English password field');
      } catch (e) {
        console.log('📌 English password not found, trying Urdu...');
        passwordField = this.page.getByRole('textbox', { name: 'پاس ورڈ' });
        await passwordField.waitFor({ state: 'visible', timeout: 30000 });
        console.log('✅ Found Urdu password field');
      }

      await this.page.waitForTimeout(1000 + Math.random() * 1000);

      // Fill in login credentials
      console.log('📝 Filling login credentials...');
      await usernameField.fill(this.account.username);
      await this.page.waitForTimeout(500 + Math.random() * 500);
      await passwordField.fill(this.account.password);
      await this.page.waitForTimeout(500 + Math.random() * 500);

      // Submit using getByRole with fallback
      console.log('🖱️ Submitting login...');
      let loginButton = null;
      try {
        loginButton = this.page.getByRole('button', { name: 'Log in' });
        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('✅ Found English login button');
      } catch (e) {
        console.log('📌 English button not found, trying Urdu...');
        loginButton = this.page.getByRole('button', { name: 'لاگ ان کریں' });
        await loginButton.waitFor({ state: 'visible', timeout: 15000 });
        console.log('✅ Found Urdu login button');
      }
      await loginButton.click();
      await this.page.waitForTimeout(2000 + Math.random() * 2000);

      // Wait for login result
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
      const loginError = await this.page.locator('#slfErrorAlert, div[role="alert"]').first();
      if (await loginError.isVisible().catch(() => false)) {
        const errorMsg = await loginError.textContent();
        console.error('Login failed:', errorMsg);
        return { success: false, message: 'Login failed: ' + errorMsg };
      }

      // Handle 2FA prompt (TOTP)
      const twofaInput = await this.page.locator('input[name="verificationCode"], input[name="verification_code"]').first();
      if (await twofaInput.isVisible().catch(() => false) && this.account.twofa) {
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
      } else if (await twofaInput.isVisible().catch(() => false) && !this.account.twofa) {
        return { success: false, message: '2FA required but no TOTP secret provided', requires2FA: true };
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

      // Handle potential profile selection page
      console.log('⏳ Checking for profile selection page...');
      const continueButtonSelectors = [
        'button:has-text("Continue")',
        'button:has-text("Use this profile")',
        'button[role="button"]:has-text("Continue")',
        'button[class*="continue"]'
      ];

      let continueButton = null;
      for (const selector of continueButtonSelectors) {
        try {
          continueButton = await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
          console.log(`✅ Found continue button with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`❌ Continue selector failed: ${selector}`);
        }
      }

      if (continueButton) {
        console.log('🔄 Profile selection page detected. Clicking Continue...');
        await continueButton.click();
        await this.page.waitForTimeout(2000 + Math.random() * 1000);
      } else {
        console.log('✅ No profile selection page found.');
      }

      // Verify login success
      const homeIcon = await this.page.locator('svg[aria-label="Home"]').isVisible({ timeout: 5000 }).catch(() => false);
      if (homeIcon) {
        console.log(`✅ Successfully logged in as ${this.account.username}.`);
        this.isLoggedIn = true;
        return { success: true, message: 'Login successful' };
      } else {
        console.log('❌ Home icon not found after login attempts.');
        return { success: false, message: 'Login failed: Home icon not found after login.' };
      }

    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, message: `Login failed: ${error}` };
    }
  }

  async sendDirectMessage(username: string, message: string): Promise<MessageResult> {
    const maxRetries = 3;
    let attempt = 0;
    
    // Check if browser context is still valid
    if (!this.page || this.page.isClosed()) {
      return { success: false, message: 'Browser context is closed or invalid' };
    }
    
    const profileUrl = `https://www.instagram.com/${username}/`;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`Navigating to profile (attempt ${attempt}/${maxRetries}): ${profileUrl}`);
        
        // Reduced delay before navigation
        await this.page.waitForTimeout(1000 + Math.random() * 2000);
        
        await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await this.page.waitForTimeout(2000);
        
        // Check current URL after navigation
        const currentUrl = this.page.url();
        console.log(`Current URL after navigation: ${currentUrl}`);
        
        // Check if we were redirected to login or challenge page
        if (currentUrl.includes('/accounts/login/') || currentUrl.includes('/accounts/challenge/')) {
          console.log('Login required, redirecting to login...');
          const loginResult = await this.login();
          if (!loginResult.success) {
            return { success: false, message: 'Re-login failed' };
          }
          // Navigate back to the profile after login
          console.log(`Re-navigating to profile after login: ${profileUrl}`);
          await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await this.page.waitForTimeout(2000);
        }
        
        // Wait for the profile header to be visible
        await this.page.waitForSelector('header', { state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(1000);
        
        // If we reach here, navigation was successful, break the retry loop
        break;
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed: ${(error as Error).message}`);
        if (attempt >= maxRetries) {
          return { success: false, message: `Navigation failed after ${maxRetries} attempts: ${error}` };
        }
        console.log(`Waiting before retry attempt ${attempt + 1}...`);
        await this.page.waitForTimeout(3000);
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
      await this.page.waitForTimeout(300 + Math.random() * 500);
      await messageButton.first().click();
      
      // Reduced wait for DM interface to load
      await this.page.waitForTimeout(2000 + Math.random() * 1000);

      // Find message input field - optimized selectors
      const messageInputSelectors = [
        'div[contenteditable="true"][data-testid="message-input"]',
        'div[contenteditable="true"][aria-label*="Message"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"]',
        'textarea[placeholder*="Message"]'
      ];

      let messageInput: any = null;
      let inputFound = false;

      // Try each selector with shorter timeout
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

      if (!inputFound || !messageInput) {
        return { success: false, message: 'Could not find message input field' };
      }

      // Focus and interact with the input field
      await this.page.waitForTimeout(500 + Math.random() * 1000);
      await messageInput.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300 + Math.random() * 500);
      
      // Click to focus the input field
      await messageInput.click();
      await this.page.waitForTimeout(500 + Math.random() * 500);

      // Type the message using keyboard typing for human-like behavior
      let typingSuccess = false;
      
      try {
        const typingDelay = 60 + Math.random() * 100; // 60-160ms per character
        await this.page.keyboard.type(message, { delay: typingDelay });
        typingSuccess = true;
      } catch (keyboardError) {
        try {
          // Fallback to type() method
          const typingDelay = 80 + Math.random() * 150;
          await messageInput.type(message, { delay: typingDelay, timeout: 15000 });
          typingSuccess = true;
        } catch (typeError) {
          try {
            // Last resort: fill method
            await messageInput.fill(message);
            typingSuccess = true;
          } catch (fillError) {
            return { success: false, message: 'Could not type message with any method' };
          }
        }
      }
      
      if (!typingSuccess) {
        return { success: false, message: 'Could not type message with any method' };
      }
      
      // Reduced wait after typing
      await this.page.waitForTimeout(1000 + Math.random() * 1000);

      // Send the message
      await messageInput.press('Enter');
      await this.page.waitForTimeout(2000);

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
      return { success: true, message: 'Message sent successfully', profileUrl };

    } catch (error) {
      console.error(`   -> ❌ Failed to send message to ${profileUrl}: ${(error as Error).message}`);
      return { success: false, message: `Failed to send message: ${error}` };
    }
  }

  async performWarmupActivity(): Promise<WarmupResult> {
    try {
      if (!this.page || !this.isLoggedIn) {
        return { success: false, message: 'Bot not initialized or not logged in', activityType: 'none' };
      }

      // Random warmup activity
      const activities = ['like_posts', 'view_stories', 'browse_feed'];
      const activity = activities[Math.floor(Math.random() * activities.length)];

      console.log(`🔥 Performing warmup activity: ${activity}`);

      switch (activity) {
        case 'like_posts':
          return await this.likePosts();
        case 'view_stories':
          return await this.viewStories();
        case 'browse_feed':
          return await this.browseFeed();
        default:
          return { success: false, message: 'Unknown activity type', activityType: activity };
      }

    } catch (error) {
      console.error('❌ Warmup activity failed:', error);
      return { 
        success: false, 
        message: `Warmup failed: ${error}`, 
        activityType: 'error' 
      };
    }
  }

  private async likePosts(): Promise<WarmupResult> {
    try {
      // Navigate to home feed
      await this.page!.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
      await this.page!.waitForTimeout(3000);

      // Find like buttons
      const likeButtons = await this.page!.$$('button[aria-label*="Like"]');
      
      if (likeButtons.length === 0) {
        return { success: false, message: 'No posts found to like', activityType: 'like_posts' };
      }

      // Like 1-3 random posts
      const postsToLike = Math.min(Math.floor(Math.random() * 3) + 1, likeButtons.length);
      
      for (let i = 0; i < postsToLike; i++) {
        const randomIndex = Math.floor(Math.random() * likeButtons.length);
        await likeButtons[randomIndex].click();
        await this.page!.waitForTimeout(2000 + Math.random() * 3000); // Random delay
      }

      console.log(`✅ Liked ${postsToLike} posts`);
      return { 
        success: true, 
        message: `Liked ${postsToLike} posts`, 
        activityType: 'like_posts' 
      };

    } catch (error) {
      return { 
        success: false, 
        message: `Failed to like posts: ${error}`, 
        activityType: 'like_posts' 
      };
    }
  }

  private async viewStories(): Promise<WarmupResult> {
    try {
      // Navigate to home feed
      await this.page!.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
      await this.page!.waitForTimeout(3000);

      // Find story links
      const storyLinks = await this.page!.$$('a[href*="/stories/"]');
      
      if (storyLinks.length === 0) {
        return { success: false, message: 'No stories found to view', activityType: 'view_stories' };
      }

      // View 1-2 random stories
      const storiesToView = Math.min(Math.floor(Math.random() * 2) + 1, storyLinks.length);
      
      for (let i = 0; i < storiesToView; i++) {
        const randomIndex = Math.floor(Math.random() * storyLinks.length);
        await storyLinks[randomIndex].click();
        await this.page!.waitForTimeout(5000 + Math.random() * 5000); // Watch for 5-10 seconds
        
        // Go back to feed
        await this.page!.goBack();
        await this.page!.waitForTimeout(2000);
      }

      console.log(`✅ Viewed ${storiesToView} stories`);
      return { 
        success: true, 
        message: `Viewed ${storiesToView} stories`, 
        activityType: 'view_stories' 
      };

    } catch (error) {
      return { 
        success: false, 
        message: `Failed to view stories: ${error}`, 
        activityType: 'view_stories' 
      };
    }
  }

  private async browseFeed(): Promise<WarmupResult> {
    try {
      // Navigate to home feed
      await this.page!.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
      await this.page!.waitForTimeout(3000);

      // Scroll through feed
      for (let i = 0; i < 5; i++) {
        await this.page!.evaluate(() => {
          window.scrollBy(0, Math.floor(Math.random() * 500) + 300);
        });
        await this.page!.waitForTimeout(2000 + Math.random() * 3000);
      }

      console.log('✅ Browsed feed');
      return { 
        success: true, 
        message: 'Browsed feed successfully', 
        activityType: 'browse_feed' 
      };

    } catch (error) {
      return { 
        success: false, 
        message: `Failed to browse feed: ${error}`, 
        activityType: 'browse_feed' 
      };
    }
  }



  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${name}-${timestamp}.png`;
    const path = `./screenshots/${filename}`;
    
    await this.page.screenshot({ path, fullPage: true });
    console.log(`📸 Screenshot saved: ${path}`);
    
    return path;
  }

  async close(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
      }
      console.log('🔐 Browser closed successfully');
    } catch (error) {
      console.error('❌ Error closing browser:', error);
    }
  }

  // Getters
  get isReady(): boolean {
    return this.isLoggedIn && this.page !== null;
  }

  get currentPage(): Page | null {
    return this.page;
  }
}
