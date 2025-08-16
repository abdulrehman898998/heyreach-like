import type { Page } from 'playwright';

export interface SelectorStrategy {
  name: string;
  selectors: string[];
  fallbackSelectors?: string[];
  timeout?: number;
}

export interface ElementDetectionResult {
  element: any;
  strategy: string;
  selector: string;
  confidence: number;
}

export class AdaptiveSelectors {
  private static readonly SELECTOR_STRATEGIES = {
    // Login form selectors
    usernameInput: {
      name: 'Username Input',
      selectors: [
        'input[name="username"]',
        'input[aria-label="Phone number, username, or email"]',
        'input[placeholder*="username"]',
        'input[placeholder*="phone"]',
        'input[placeholder*="email"]',
        'input[type="text"]',
        'input[autocomplete="username"]'
      ],
      timeout: 10000
    },

    passwordInput: {
      name: 'Password Input',
      selectors: [
        'input[name="password"]',
        'input[aria-label="Password"]',
        'input[type="password"]',
        'input[placeholder*="password"]',
        'input[autocomplete="current-password"]'
      ],
      timeout: 10000
    },

    loginButton: {
      name: 'Login Button',
      selectors: [
        'button[type="submit"]',
        'button:has-text("Log In")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        'input[type="submit"]',
        'button[data-testid="login-button"]',
        'button[aria-label*="login"]'
      ],
      timeout: 10000
    },

    // 2FA selectors
    twofaInput: {
      name: '2FA Input',
      selectors: [
        'input[name="verificationCode"]',
        'input[placeholder*="code"]',
        'input[placeholder*="verification"]',
        'input[type="text"]',
        'input[autocomplete="one-time-code"]'
      ],
      timeout: 10000
    },

    // Message selectors
    messageButton: {
      name: 'Message Button',
      selectors: [
        'button:has-text("Message")',
        'a[href*="/direct/"]',
        'button[aria-label*="message"]',
        'button[data-testid="message-button"]',
        'a:has-text("Message")',
        'button:has-text("Send Message")'
      ],
      timeout: 10000
    },

    messageInput: {
      name: 'Message Input',
      selectors: [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="message"]',
        'textarea[aria-label*="message"]',
        'textarea[data-testid="message-input"]',
        'textarea',
        'input[placeholder*="Message"]',
        'div[contenteditable="true"]'
      ],
      timeout: 10000
    },

    // Profile selectors
    followButton: {
      name: 'Follow Button',
      selectors: [
        'button:has-text("Follow")',
        'button[data-testid="follow-button"]',
        'button[aria-label*="follow"]',
        'button:has-text("Follow Back")',
        'button:has-text("Follow User")'
      ],
      timeout: 10000
    },

    unfollowButton: {
      name: 'Unfollow Button',
      selectors: [
        'button:has-text("Unfollow")',
        'button[data-testid="unfollow-button"]',
        'button[aria-label*="unfollow"]',
        'button:has-text("Following")',
        'button:has-text("Remove")'
      ],
      timeout: 10000
    },

    likeButton: {
      name: 'Like Button',
      selectors: [
        'button[aria-label*="like"]',
        'button[data-testid="like-button"]',
        'button:has-text("Like")',
        'svg[aria-label*="like"]',
        'button[aria-label*="heart"]'
      ],
      timeout: 10000
    },

    // Navigation selectors
    homeButton: {
      name: 'Home Button',
      selectors: [
        'a[href="/"]',
        'a[aria-label*="home"]',
        'a[data-testid="home-button"]',
        'a:has-text("Home")',
        'nav a[href="/"]'
      ],
      timeout: 5000
    },

    exploreButton: {
      name: 'Explore Button',
      selectors: [
        'a[href="/explore/"]',
        'a[aria-label*="explore"]',
        'a[data-testid="explore-button"]',
        'a:has-text("Explore")',
        'nav a[href="/explore/"]'
      ],
      timeout: 5000
    }
  };

  /**
   * Find element using multiple selector strategies
   */
  static async findElement(
    page: Page,
    elementType: keyof typeof AdaptiveSelectors.SELECTOR_STRATEGIES,
    options: { timeout?: number; visible?: boolean } = {}
  ): Promise<ElementDetectionResult | null> {
    const strategy = this.SELECTOR_STRATEGIES[elementType];
    if (!strategy) {
      throw new Error(`Unknown element type: ${elementType}`);
    }

    const timeout = options.timeout || strategy.timeout || 10000;
    const visible = options.visible !== false;

    console.log(`🔍 Searching for ${strategy.name} with ${strategy.selectors.length} selectors`);

    // Try each selector in order
    for (let i = 0; i < strategy.selectors.length; i++) {
      const selector = strategy.selectors[i];
      
      try {
        console.log(`  Trying selector ${i + 1}/${strategy.selectors.length}: ${selector}`);
        
        const element = visible 
          ? await page.waitForSelector(selector, { timeout: Math.min(timeout, 3000), state: 'visible' })
          : await page.waitForSelector(selector, { timeout: Math.min(timeout, 3000) });

        if (element) {
          const confidence = this.calculateConfidence(i, strategy.selectors.length);
          console.log(`✅ Found ${strategy.name} using selector: ${selector} (confidence: ${confidence}%)`);
          
          return {
            element,
            strategy: strategy.name,
            selector,
            confidence
          };
        }
      } catch (error) {
        console.log(`  ❌ Selector failed: ${selector}`);
        continue;
      }
    }

    // If all selectors fail, try fallback strategies
    if (strategy.fallbackSelectors) {
      console.log(`🔄 Trying fallback selectors for ${strategy.name}`);
      
      for (const fallbackSelector of strategy.fallbackSelectors) {
        try {
          const element = visible 
            ? await page.waitForSelector(fallbackSelector, { timeout: 2000, state: 'visible' })
            : await page.waitForSelector(fallbackSelector, { timeout: 2000 });

          if (element) {
            console.log(`✅ Found ${strategy.name} using fallback selector: ${fallbackSelector}`);
            
            return {
              element,
              strategy: `${strategy.name} (Fallback)`,
              selector: fallbackSelector,
              confidence: 50 // Lower confidence for fallback
            };
          }
        } catch (error) {
          continue;
        }
      }
    }

    console.log(`❌ Failed to find ${strategy.name} with any selector`);
    return null;
  }

  /**
   * Calculate confidence based on selector position
   */
  private static calculateConfidence(index: number, total: number): number {
    // First selector has highest confidence, decreases with position
    const baseConfidence = 100;
    const decreasePerPosition = 10;
    return Math.max(baseConfidence - (index * decreasePerPosition), 50);
  }

  /**
   * Detect if page structure has changed significantly
   */
  static async detectPageStructureChange(page: Page): Promise<{
    hasChanged: boolean;
    detectedElements: string[];
    missingElements: string[];
  }> {
    const criticalElements = [
      'usernameInput',
      'passwordInput', 
      'loginButton',
      'homeButton'
    ] as const;

    const detectedElements: string[] = [];
    const missingElements: string[] = [];

    for (const elementType of criticalElements) {
      try {
        const result = await this.findElement(page, elementType, { timeout: 2000 });
        if (result) {
          detectedElements.push(elementType);
        } else {
          missingElements.push(elementType);
        }
      } catch (error) {
        missingElements.push(elementType);
      }
    }

    const hasChanged = missingElements.length > 0;
    
    console.log(`📊 Page structure analysis:`);
    console.log(`  ✅ Detected: ${detectedElements.join(', ')}`);
    console.log(`  ❌ Missing: ${missingElements.join(', ')}`);
    console.log(`  🔄 Structure changed: ${hasChanged}`);

    return {
      hasChanged,
      detectedElements,
      missingElements
    };
  }

  /**
   * Get alternative selectors for an element type
   */
  static getAlternativeSelectors(elementType: keyof typeof AdaptiveSelectors.SELECTOR_STRATEGIES): string[] {
    const strategy = this.SELECTOR_STRATEGIES[elementType];
    return strategy ? [...strategy.selectors, ...(strategy.fallbackSelectors || [])] : [];
  }

  /**
   * Update selectors dynamically (for future Instagram changes)
   */
  static updateSelectors(
    elementType: keyof typeof AdaptiveSelectors.SELECTOR_STRATEGIES,
    newSelectors: string[]
  ): void {
    if (this.SELECTOR_STRATEGIES[elementType]) {
      this.SELECTOR_STRATEGIES[elementType].selectors = newSelectors;
      console.log(`🔄 Updated selectors for ${elementType}:`, newSelectors);
    }
  }

  /**
   * Add new selector strategy
   */
  static addSelectorStrategy(
    name: string,
    strategy: SelectorStrategy
  ): void {
    (this.SELECTOR_STRATEGIES as any)[name] = strategy;
    console.log(`➕ Added new selector strategy: ${name}`);
  }
}
