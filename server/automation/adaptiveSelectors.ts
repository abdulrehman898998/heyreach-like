export interface SelectorConfig {
  name: string;
  selectors: string[];
  priority: number;
  fallbackSelectors?: string[];
  lastUpdated: Date;
  successRate: number;
  usageCount: number;
}

export interface SelectorResult {
  element: any;
  selector: string;
  confidence: number;
  fallbackUsed: boolean;
}

export class AdaptiveSelectors {
  private static selectorConfigs: Map<string, SelectorConfig> = new Map();
  private static selectorStats: Map<string, { success: number; total: number }> = new Map();

  static {
    // Initialize with comprehensive selector configurations
    this.initializeSelectors();
  }

  private static initializeSelectors() {
    // Login form selectors (most critical)
    this.addSelectorConfig('usernameField', {
      name: 'Username Field',
      selectors: [
        'input[name="username"]',
        'input[aria-label*="Phone number, username, or email"]',
        'input[aria-label*="Username"]',
        'input[placeholder*="Phone number, username, or email"]',
        'input[placeholder*="Username"]',
        'input[type="text"]',
        'input[autocomplete="username"]'
      ],
      priority: 1,
      fallbackSelectors: [
        'input[type="text"]:first-of-type',
        'input:first-of-type'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    this.addSelectorConfig('passwordField', {
      name: 'Password Field',
      selectors: [
        'input[name="password"]',
        'input[aria-label*="Password"]',
        'input[placeholder*="Password"]',
        'input[type="password"]',
        'input[autocomplete="current-password"]'
      ],
      priority: 1,
      fallbackSelectors: [
        'input[type="password"]',
        'input:last-of-type'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    this.addSelectorConfig('loginButton', {
      name: 'Login Button',
      selectors: [
        'button[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        'button[aria-label*="Log in"]',
        'button[aria-label*="Sign in"]',
        'input[type="submit"]'
      ],
      priority: 1,
      fallbackSelectors: [
        'button:last-of-type',
        'input[type="submit"]'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Like button selectors
    this.addSelectorConfig('likeButton', {
      name: 'Like Button',
      selectors: [
        'button[aria-label*="Like"]',
        'svg[aria-label="Like"]',
        'button:has(svg[aria-label="Like"])',
        'article svg[aria-label="Like"]',
        'button[data-testid="like-button"]',
        'button:has-text("Like")'
      ],
      priority: 2,
      fallbackSelectors: [
        'button:has(svg)',
        'svg[aria-label*="heart"]'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Follow button selectors
    this.addSelectorConfig('followButton', {
      name: 'Follow Button',
      selectors: [
        'button:has-text("Follow")',
        'button[aria-label*="Follow"]',
        'button[data-testid="follow-button"]',
        'button:contains("Follow")',
        'a:has-text("Follow")'
      ],
      priority: 2,
      fallbackSelectors: [
        'button:has-text("Follow")',
        'button:last-of-type'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Comment input selectors
    this.addSelectorConfig('commentInput', {
      name: 'Comment Input',
      selectors: [
        'textarea[aria-label*="comment"]',
        'textarea[placeholder*="comment"]',
        'textarea[placeholder*="Add a comment"]',
        'div[contenteditable="true"]',
        'textarea',
        'input[type="text"]'
      ],
      priority: 2,
      fallbackSelectors: [
        'textarea',
        'input[type="text"]'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Message button selectors
    this.addSelectorConfig('messageButton', {
      name: 'Message Button',
      selectors: [
        'a[href*="/direct/t/"]',
        'a[href*="/direct/inbox/"]',
        'button:has-text("Message")',
        'button:has-text("Send message")',
        'a:has-text("Message")',
        'a:has-text("Send message")',
        'button[aria-label*="Message"]'
      ],
      priority: 2,
      fallbackSelectors: [
        'button:has-text("Message")',
        'a:has-text("Message")'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Post link selectors
    this.addSelectorConfig('postLink', {
      name: 'Post Link',
      selectors: [
        'a[href*="/p/"]',
        'article a[href*="/p/"]',
        'a[href*="/reel/"]',
        'article a[href*="/reel/"]'
      ],
      priority: 3,
      fallbackSelectors: [
        'a[href*="/p/"]',
        'a[href*="/reel/"]'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });

    // Story selectors
    this.addSelectorConfig('storyLink', {
      name: 'Story Link',
      selectors: [
        'a[href*="/stories/"]',
        'div[role="button"]:has(img)',
        'div[data-testid="story"]'
      ],
      priority: 3,
      fallbackSelectors: [
        'a[href*="/stories/"]',
        'div[role="button"]'
      ],
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });
  }

  private static addSelectorConfig(key: string, config: SelectorConfig) {
    this.selectorConfigs.set(key, config);
  }

  /**
   * Find element using adaptive selectors with fallbacks
   */
  static async findElement(page: any, selectorKey: string, timeout: number = 5000): Promise<SelectorResult | null> {
    const config = this.selectorConfigs.get(selectorKey);
    if (!config) {
      console.warn(`⚠️ No selector config found for: ${selectorKey}`);
      return null;
    }

    const startTime = Date.now();
    let element = null;
    let usedSelector = '';
    let fallbackUsed = false;

    // Try primary selectors first
    for (const selector of config.selectors) {
      try {
        element = await page.$(selector);
        if (element) {
          usedSelector = selector;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // If no element found, try fallback selectors
    if (!element && config.fallbackSelectors) {
      fallbackUsed = true;
      for (const selector of config.fallbackSelectors) {
        try {
          element = await page.$(selector);
          if (element) {
            usedSelector = selector;
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Update statistics
    const success = element !== null;
    this.updateSelectorStats(selectorKey, success);

    if (element) {
      console.log(`✅ Found ${config.name} with selector: ${usedSelector}${fallbackUsed ? ' (fallback)' : ''}`);
      
      return {
        element,
        selector: usedSelector,
        confidence: this.calculateConfidence(config, success, fallbackUsed),
        fallbackUsed
      };
    } else {
      console.warn(`❌ Failed to find ${config.name} with all selectors`);
      return null;
    }
  }

  /**
   * Find multiple elements using adaptive selectors
   */
  static async findElements(page: any, selectorKey: string, timeout: number = 5000): Promise<any[]> {
    const config = this.selectorConfigs.get(selectorKey);
    if (!config) {
      console.warn(`⚠️ No selector config found for: ${selectorKey}`);
      return [];
    }

    let elements: any[] = [];

    // Try primary selectors first
    for (const selector of config.selectors) {
      try {
        elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} ${config.name} elements with selector: ${selector}`);
          this.updateSelectorStats(selectorKey, true);
          return elements;
        }
      } catch (error) {
        continue;
      }
    }

    // Try fallback selectors
    if (config.fallbackSelectors) {
      for (const selector of config.fallbackSelectors) {
        try {
          elements = await page.$$(selector);
          if (elements.length > 0) {
            console.log(`✅ Found ${elements.length} ${config.name} elements with fallback selector: ${selector}`);
            this.updateSelectorStats(selectorKey, true);
            return elements;
          }
        } catch (error) {
          continue;
        }
      }
    }

    console.warn(`❌ Failed to find any ${config.name} elements`);
    this.updateSelectorStats(selectorKey, false);
    return [];
  }

  /**
   * Wait for element to appear using adaptive selectors
   */
  static async waitForElement(page: any, selectorKey: string, timeout: number = 10000): Promise<SelectorResult | null> {
    const config = this.selectorConfigs.get(selectorKey);
    if (!config) {
      console.warn(`⚠️ No selector config found for: ${selectorKey}`);
      return null;
    }

    const startTime = Date.now();
    let element = null;
    let usedSelector = '';
    let fallbackUsed = false;

    // Try primary selectors with wait
    for (const selector of config.selectors) {
      try {
        element = await page.waitForSelector(selector, { timeout: Math.min(2000, timeout) });
        if (element) {
          usedSelector = selector;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // Try fallback selectors if primary failed
    if (!element && config.fallbackSelectors) {
      fallbackUsed = true;
      for (const selector of config.fallbackSelectors) {
        try {
          element = await page.waitForSelector(selector, { timeout: Math.min(2000, timeout) });
          if (element) {
            usedSelector = selector;
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    const success = element !== null;
    this.updateSelectorStats(selectorKey, success);

    if (element) {
      console.log(`✅ Waited for ${config.name} with selector: ${usedSelector}${fallbackUsed ? ' (fallback)' : ''}`);
      
      return {
        element,
        selector: usedSelector,
        confidence: this.calculateConfidence(config, success, fallbackUsed),
        fallbackUsed
      };
    } else {
      console.warn(`❌ Failed to wait for ${config.name} with all selectors`);
      return null;
    }
  }

  /**
   * Update selector success statistics
   */
  private static updateSelectorStats(selectorKey: string, success: boolean) {
    const stats = this.selectorStats.get(selectorKey) || { success: 0, total: 0 };
    stats.total++;
    if (success) stats.success++;
    this.selectorStats.set(selectorKey, stats);

    // Update config success rate
    const config = this.selectorConfigs.get(selectorKey);
    if (config) {
      config.usageCount++;
      config.successRate = stats.success / stats.total;
      config.lastUpdated = new Date();
    }
  }

  /**
   * Calculate confidence score for selector result
   */
  private static calculateConfidence(config: SelectorConfig, success: boolean, fallbackUsed: boolean): number {
    let confidence = config.successRate;
    
    if (fallbackUsed) {
      confidence *= 0.8; // Reduce confidence for fallback selectors
    }
    
    if (config.usageCount < 10) {
      confidence *= 0.9; // Reduce confidence for new selectors
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Get selector statistics for monitoring
   */
  static getSelectorStats() {
    const stats: Record<string, any> = {};
    
    for (const [key, config] of this.selectorConfigs) {
      const selectorStats = this.selectorStats.get(key) || { success: 0, total: 0 };
      stats[key] = {
        name: config.name,
        successRate: config.successRate,
        usageCount: config.usageCount,
        lastUpdated: config.lastUpdated,
        totalAttempts: selectorStats.total,
        successfulAttempts: selectorStats.success
      };
    }
    
    return stats;
  }

  /**
   * Add new selector configuration dynamically
   */
  static addSelector(key: string, selectors: string[], fallbackSelectors?: string[]) {
    this.addSelectorConfig(key, {
      name: key,
      selectors,
      priority: 3,
      fallbackSelectors,
      lastUpdated: new Date(),
      successRate: 1.0,
      usageCount: 0
    });
    
    console.log(`✅ Added new selector config: ${key} with ${selectors.length} selectors`);
  }

  /**
   * Update existing selector configuration
   */
  static updateSelector(key: string, selectors: string[], fallbackSelectors?: string[]) {
    const existing = this.selectorConfigs.get(key);
    if (existing) {
      existing.selectors = selectors;
      if (fallbackSelectors) existing.fallbackSelectors = fallbackSelectors;
      existing.lastUpdated = new Date();
      console.log(`✅ Updated selector config: ${key}`);
    } else {
      this.addSelector(key, selectors, fallbackSelectors);
    }
  }

  /**
   * Auto-learn new selectors from successful interactions
   */
  static learnSelector(page: any, elementType: string, successfulSelector: string) {
    console.log(`🧠 Learning new selector for ${elementType}: ${successfulSelector}`);
    
    // Add to existing config or create new one
    const existing = this.selectorConfigs.get(elementType);
    if (existing) {
      // Add to beginning of selectors array (higher priority)
      existing.selectors.unshift(successfulSelector);
      existing.lastUpdated = new Date();
    } else {
      this.addSelector(elementType, [successfulSelector]);
    }
  }
}
