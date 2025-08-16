import type { Page } from 'playwright';
import { AdaptiveSelectors } from './adaptiveSelectors';
import { storage } from '../storage';

export interface PageStructureAnalysis {
  timestamp: Date;
  url: string;
  hasChanged: boolean;
  detectedElements: string[];
  missingElements: string[];
  confidence: number;
  suggestedActions: string[];
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actions: string[];
}

export class PageStructureHandler {
  private static readonly RECOVERY_STRATEGIES: Record<string, RecoveryStrategy[]> = {
    loginPage: [
      {
        name: 'Mobile Layout Fallback',
        description: 'Try mobile version of login page',
        priority: 'high',
        actions: [
          'Navigate to mobile login URL',
          'Use mobile-specific selectors',
          'Try touch-based interactions'
        ]
      },
      {
        name: 'Alternative Login Methods',
        description: 'Try different login approaches',
        priority: 'medium',
        actions: [
          'Try email-based login',
          'Try phone-based login',
          'Use social login buttons'
        ]
      },
      {
        name: 'Manual Detection',
        description: 'Use AI-powered element detection',
        priority: 'low',
        actions: [
          'Analyze page structure',
          'Find elements by text content',
          'Use visual element detection'
        ]
      }
    ],
    profilePage: [
      {
        name: 'URL-Based Navigation',
        description: 'Use direct URLs instead of UI elements',
        priority: 'high',
        actions: [
          'Navigate directly to profile URLs',
          'Use API endpoints if available',
          'Try alternative profile layouts'
        ]
      },
      {
        name: 'Content-Based Detection',
        description: 'Find elements by their content',
        priority: 'medium',
        actions: [
          'Search for text content',
          'Find elements by aria-labels',
          'Use data attributes'
        ]
      }
    ],
    messagePage: [
      {
        name: 'Direct Message URLs',
        description: 'Use direct message URLs',
        priority: 'high',
        actions: [
          'Navigate to /direct/t/username',
          'Use message API endpoints',
          'Try alternative message interfaces'
        ]
      },
      {
        name: 'Keyboard Navigation',
        description: 'Use keyboard shortcuts',
        priority: 'medium',
        actions: [
          'Use Tab navigation',
          'Try keyboard shortcuts',
          'Navigate with arrow keys'
        ]
      }
    ]
  };

  /**
   * Analyze current page structure
   */
  static async analyzePageStructure(page: Page): Promise<PageStructureAnalysis> {
    const url = page.url();
    const timestamp = new Date();

    console.log(`🔍 Analyzing page structure for: ${url}`);

    // Detect page type
    const pageType = this.detectPageType(url);
    
    // Check for structure changes
    const structureCheck = await AdaptiveSelectors.detectPageStructureChange(page);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(structureCheck.detectedElements, structureCheck.missingElements);
    
    // Get suggested actions
    const suggestedActions = this.getSuggestedActions(pageType, structureCheck);

    const analysis: PageStructureAnalysis = {
      timestamp,
      url,
      hasChanged: structureCheck.hasChanged,
      detectedElements: structureCheck.detectedElements,
      missingElements: structureCheck.missingElements,
      confidence,
      suggestedActions
    };

    // Log analysis
    console.log(`📊 Page Structure Analysis:`);
    console.log(`  📍 URL: ${url}`);
    console.log(`  🏷️ Type: ${pageType}`);
    console.log(`  🔄 Changed: ${structureCheck.hasChanged}`);
    console.log(`  📈 Confidence: ${confidence}%`);
    console.log(`  ✅ Detected: ${structureCheck.detectedElements.join(', ')}`);
    console.log(`  ❌ Missing: ${structureCheck.missingElements.join(', ')}`);
    console.log(`  💡 Suggestions: ${suggestedActions.join(', ')}`);

    // Store analysis for monitoring
    await this.storeAnalysis(analysis);

    return analysis;
  }

  /**
   * Detect page type based on URL
   */
  private static detectPageType(url: string): string {
    if (url.includes('/accounts/login')) return 'loginPage';
    if (url.includes('/direct/')) return 'messagePage';
    if (url.includes('/explore/')) return 'explorePage';
    if (url.includes('/p/')) return 'postPage';
    if (url.includes('/reel/')) return 'reelPage';
    if (url.includes('/stories/')) return 'storyPage';
    if (url.match(/\/[^\/]+\/?$/)) return 'profilePage';
    return 'unknownPage';
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(detected: string[], missing: string[]): number {
    const total = detected.length + missing.length;
    if (total === 0) return 0;
    
    const detectedRatio = detected.length / total;
    return Math.round(detectedRatio * 100);
  }

  /**
   * Get suggested recovery actions
   */
  private static getSuggestedActions(pageType: string, structureCheck: any): string[] {
    const strategies = this.RECOVERY_STRATEGIES[pageType] || [];
    const actions: string[] = [];

    if (structureCheck.hasChanged) {
      // Add high priority strategies first
      strategies
        .filter(s => s.priority === 'high')
        .forEach(s => actions.push(...s.actions));
      
      // Add medium priority if still missing elements
      if (structureCheck.missingElements.length > 0) {
        strategies
          .filter(s => s.priority === 'medium')
          .forEach(s => actions.push(...s.actions));
      }
    }

    return actions.slice(0, 5); // Limit to top 5 actions
  }

  /**
   * Execute recovery strategy
   */
  static async executeRecoveryStrategy(
    page: Page,
    pageType: string,
    strategyName: string
  ): Promise<boolean> {
    const strategies = this.RECOVERY_STRATEGIES[pageType] || [];
    const strategy = strategies.find(s => s.name === strategyName);

    if (!strategy) {
      console.log(`❌ Recovery strategy not found: ${strategyName}`);
      return false;
    }

    console.log(`🔄 Executing recovery strategy: ${strategy.name}`);
    console.log(`📝 Description: ${strategy.description}`);

    try {
      switch (strategyName) {
        case 'Mobile Layout Fallback':
          return await this.executeMobileLayoutFallback(page);
        
        case 'URL-Based Navigation':
          return await this.executeUrlBasedNavigation(page);
        
        case 'Content-Based Detection':
          return await this.executeContentBasedDetection(page);
        
        case 'Keyboard Navigation':
          return await this.executeKeyboardNavigation(page);
        
        default:
          console.log(`⚠️ Unknown recovery strategy: ${strategyName}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Recovery strategy failed: ${strategyName}`, error);
      return false;
    }
  }

  /**
   * Execute mobile layout fallback
   */
  private static async executeMobileLayoutFallback(page: Page): Promise<boolean> {
    try {
      console.log(`📱 Trying mobile layout fallback`);
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Try mobile-specific URLs
      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login')) {
        await page.goto('https://www.instagram.com/accounts/login/', {
          waitUntil: 'networkidle'
        });
      }

      // Wait for mobile layout to load
      await page.waitForTimeout(2000);

      // Check if mobile layout worked
      const analysis = await this.analyzePageStructure(page);
      return analysis.confidence > 70;

    } catch (error) {
      console.error(`❌ Mobile layout fallback failed:`, error);
      return false;
    }
  }

  /**
   * Execute URL-based navigation
   */
  private static async executeUrlBasedNavigation(page: Page): Promise<boolean> {
    try {
      console.log(`🔗 Trying URL-based navigation`);
      
      // For profile pages, try direct navigation
      const currentUrl = page.url();
      if (currentUrl.includes('/accounts/login')) {
        // Try alternative login URLs
        const alternativeUrls = [
          'https://www.instagram.com/accounts/login/',
          'https://www.instagram.com/login/',
          'https://www.instagram.com/accounts/login/?next=/'
        ];

        for (const url of alternativeUrls) {
          try {
            await page.goto(url, { waitUntil: 'networkidle' });
            const analysis = await this.analyzePageStructure(page);
            if (analysis.confidence > 80) {
              return true;
            }
          } catch (error) {
            continue;
          }
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ URL-based navigation failed:`, error);
      return false;
    }
  }

  /**
   * Execute content-based detection
   */
  private static async executeContentBasedDetection(page: Page): Promise<boolean> {
    try {
      console.log(`🔍 Trying content-based detection`);
      
      // Find elements by text content
      const textSelectors = [
        'text="Log In"',
        'text="Sign In"',
        'text="Username"',
        'text="Password"',
        'text="Message"',
        'text="Follow"'
      ];

      for (const selector of textSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 2000 });
          if (element) {
            console.log(`✅ Found element by text: ${selector}`);
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ Content-based detection failed:`, error);
      return false;
    }
  }

  /**
   * Execute keyboard navigation
   */
  private static async executeKeyboardNavigation(page: Page): Promise<boolean> {
    try {
      console.log(`⌨️ Trying keyboard navigation`);
      
      // Try Tab navigation to find focusable elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      // Check if any element is focused
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        return active ? active.tagName + (active.getAttribute('type') || '') : null;
      });

      if (focusedElement) {
        console.log(`✅ Found focusable element: ${focusedElement}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Keyboard navigation failed:`, error);
      return false;
    }
  }

  /**
   * Store analysis for monitoring
   */
  private static async storeAnalysis(analysis: PageStructureAnalysis): Promise<void> {
    try {
      // This would store in database for monitoring
      console.log(`💾 Storing page structure analysis`);
      
      // For now, just log it
      console.log(`📊 Analysis stored:`, {
        timestamp: analysis.timestamp,
        url: analysis.url,
        confidence: analysis.confidence,
        hasChanged: analysis.hasChanged
      });
    } catch (error) {
      console.error(`❌ Failed to store analysis:`, error);
    }
  }

  /**
   * Get available recovery strategies for a page type
   */
  static getRecoveryStrategies(pageType: string): RecoveryStrategy[] {
    return this.RECOVERY_STRATEGIES[pageType] || [];
  }

  /**
   * Add new recovery strategy
   */
  static addRecoveryStrategy(pageType: string, strategy: RecoveryStrategy): void {
    if (!this.RECOVERY_STRATEGIES[pageType]) {
      this.RECOVERY_STRATEGIES[pageType] = [];
    }
    this.RECOVERY_STRATEGIES[pageType].push(strategy);
    console.log(`➕ Added recovery strategy for ${pageType}: ${strategy.name}`);
  }
}
