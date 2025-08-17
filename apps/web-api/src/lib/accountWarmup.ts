import { db, schema } from './drizzle';
import { eq } from 'drizzle-orm';
import { InstagramBot } from './instagramBot';

// Utility functions
function gaussianRandom(mean: number, stdDev: number): number {
  let u1 = 0, u2 = 0;
  while(u1 === 0) u1 = Math.random();
  while(u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// Types
interface InstagramAccount {
  id: number;
  username: string;
  password?: string;
  twofa?: string;
  home_country: string;
  home_city?: string;
  assigned_proxy_id?: number;
  session_label?: string;
  cookies_encrypted?: string;
  status: string;
}

interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  country: string;
  ip_type: string;
}

// HeyReach integration helpers
const logAction = async (accountId: number, type: string, details: any) => {
  try {
    await db.insert(schema.action_logs).values({
      account_id: accountId,
      action_type: type,
      target: details.target || null,
      result: details.success ? 'success' : 'failed',
      details: details,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};

const updateAccountRisk = async (accountId: number, riskScore: number) => {
  await db.update(schema.accounts)
    .set({ risk_score: riskScore })
    .where(eq(schema.accounts.id, accountId));
};

const createNotification = async (userId: number, type: string, payload: any) => {
  await db.insert(schema.notifications).values({
    user_id: userId,
    type: type,
    channel: 'in_app',
    payload: payload,
    is_read: false,
  });
};

const isNightTime = (timezone: string): boolean => {
  try {
    const now = new Date().toLocaleString('en-US', { timeZone: timezone });
    const hour = new Date(now).getHours();
    return hour >= 0 && hour < 6; // 00:00-06:00 silence
  } catch {
    return false;
  }
};

export class AccountWarmup {
  private bot: InstagramBot | null = null;
  private riskScore = 0;
  private recentActions = 0;

  constructor(
    private account: InstagramAccount, 
    private proxy: ProxyConfig | null = null
  ) {}

  async initialize() {
    console.log(`🔄 Initializing warmup for @${this.account.username}`);
    
    if (!this.account.password) {
      throw new Error('Account password is required for warmup');
    }

    // Create Instagram bot with account and proxy configuration
    const botConfig = {
      headless: false, // VISIBLE MODE - so you can see Instagram automation
      slowMo: gaussianRandom(500, 100),
      proxy: this.proxy ? {
        server: this.proxy.server,
        username: this.proxy.username,
        password: this.proxy.password,
      } : undefined
    };

    this.bot = new InstagramBot({
      username: this.account.username,
      password: this.account.password,
      twofa: this.account.twofa
    }, botConfig);

    // Initialize the bot
    const initResult = await this.bot.initialize();
    if (!initResult.success) {
      throw new Error(`Bot initialization failed: ${initResult.message}`);
    }

    await logAction(this.account.id, 'initialize', { success: true, risk: this.riskScore });
  }

  // Removed unused legacy methods - using InstagramBot's built-in popup handling

  async performNaturalBrowsing() {
    console.log('🌐 Natural browsing - Explore and scroll');
    
    if (!this.bot || !this.bot.isReady) {
      throw new Error('Bot not ready or not logged in');
    }

    const page = this.bot.currentPage;
    if (!page) {
      throw new Error('Page not available');
    }

    try {
      // Navigate to explore page
      await page.goto('https://www.instagram.com/explore/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
      await page.waitForTimeout(gaussianRandom(2500, 500));

      // Natural scrolling behavior
      const scrollSteps = Math.floor(gaussianRandom(8, 2));
      console.log(`📜 Scrolling ${scrollSteps} times`);
      
      for (let i = 0; i < scrollSteps; i++) {
        const scrollAmount = gaussianRandom(400, 150);
        await page.evaluate((amount) => {
          window.scrollBy(0, amount);
        }, scrollAmount);
        
        // Human-like pause between scrolls
        await page.waitForTimeout(gaussianRandom(2000, 800));
        
        // Occasional backtrack (human behavior)
        if (Math.random() < 0.3) {
          const backtrack = gaussianRandom(200, 100);
          await page.evaluate((amount) => {
            window.scrollBy(0, -amount);
          }, backtrack);
          await page.waitForTimeout(gaussianRandom(1000, 300));
        }
      }

      this.recentActions++;
      await logAction(this.account.id, 'browsing', { 
        scrolls: scrollSteps, 
        success: true 
      });
      
          return true;
      } catch (error) {
      console.error('❌ Browsing failed:', error);
      await logAction(this.account.id, 'browsing', { 
        success: false, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  async likeSomePosts() {
    console.log('❤️ Liking posts on explore page');
    
    if (!this.bot || !this.bot.isReady) {
      throw new Error('Bot not ready or not logged in');
    }

    const page = this.bot.currentPage;
    if (!page) {
      throw new Error('Page not available');
    }

    try {
      // Go to explore page
      await page.goto('https://www.instagram.com/explore/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await page.waitForTimeout(gaussianRandom(3000, 1000));

      // Find like buttons (multiple selectors for reliability)
      const likeSelectors = [
        'svg[aria-label="Like"]',
        'button[aria-label="Like"]',
        'div[role="button"] svg[aria-label="Like"]',
        'span[role="button"] svg[aria-label="Like"]'
      ];

      let totalLiked = 0;
      const maxLikes = Math.floor(gaussianRandom(4, 2)); // 2-6 likes
      console.log(`🎯 Planning to like ${maxLikes} posts`);

      for (const selector of likeSelectors) {
        if (totalLiked >= maxLikes) break;

        try {
          const likeButtons = await page.locator(selector).all();
          console.log(`Found ${likeButtons.length} like buttons with selector: ${selector}`);

          for (const button of likeButtons) {
            if (totalLiked >= maxLikes) break;

            try {
              // Check if already liked (look for "Unlike" which means it's already liked)
              const parentElement = button.locator('..').first();
              const isAlreadyLiked = await parentElement.locator('svg[aria-label="Unlike"]')
          .isVisible({ timeout: 500 })
          .catch(() => false);
        
              if (isAlreadyLiked) {
                console.log('⚠️ Post already liked, skipping');
                continue;
              }

              // Scroll element into view and click
              await button.scrollIntoViewIfNeeded();
              await page.waitForTimeout(gaussianRandom(1000, 500));
              
              await button.click();
              
              // Wait and verify the like was successful
              await page.waitForTimeout(gaussianRandom(1500, 500));
              
              const likeSuccess = await parentElement.locator('svg[aria-label="Unlike"]')
                .isVisible({ timeout: 3000 })
          .catch(() => false);
        
              if (likeSuccess) {
                totalLiked++;
                console.log(`✅ Successfully liked post ${totalLiked}/${maxLikes}`);
                
                // Human-like delay between likes
                await page.waitForTimeout(gaussianRandom(4000, 2000));
              } else {
                console.log('⚠️ Like may not have registered');
              }

            } catch (error) {
              console.log(`⚠️ Failed to like individual post: ${(error as Error).message}`);
              continue;
            }
          }
        } catch (error) {
          console.log(`⚠️ No buttons found with selector ${selector}`);
          continue;
        }
      }

      this.recentActions += totalLiked;
      const success = totalLiked > 0;
      
      await logAction(this.account.id, 'like_posts', { 
        liked: totalLiked, 
        target: maxLikes, 
        success 
      });
      
      console.log(`📊 Liked ${totalLiked} posts total`);
      return success;

    } catch (error) {
      console.error('❌ Like posts failed:', error);
      await logAction(this.account.id, 'like_posts', { 
        success: false, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  // Follow functionality removed - focusing on safer warmup activities (like, view, comment)

  async viewStories() {
    console.log('📖 Viewing stories');
    
    if (!this.bot || !this.bot.isReady) {
      throw new Error('Bot not ready or not logged in');
    }

    const page = this.bot.currentPage;
    if (!page) {
      throw new Error('Page not available');
    }

    try {
      await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(gaussianRandom(3000, 1000));

      // Find story elements with multiple selectors
      const storySelectors = [
        'div[role="button"] canvas',
        'div[data-testid*="story"] img',
        'section div[role="button"] img',
        'div[aria-label*="story"]'
      ];

      let storyElements: any[] = [];
      for (const selector of storySelectors) {
        try {
          const elements = await page.locator(selector).all();
          if (elements.length > 0) {
            storyElements = elements;
            console.log(`Found ${elements.length} stories with selector: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }
    
    if (storyElements.length === 0) {
      console.warn('⚠️ No stories available');
        await logAction(this.account.id, 'view_stories', { count: 0, success: false });
      return false;
    }

    const numToView = Math.min(Math.floor(gaussianRandom(3, 1)), storyElements.length);
      let storiesViewed = 0;
    
    for (let i = 0; i < numToView; i++) {
        try {
          await storyElements[i].scrollIntoViewIfNeeded();
          await page.waitForTimeout(gaussianRandom(1000, 500));
          await storyElements[i].click();
          
          // Watch story for realistic duration (8-20 seconds)
          const watchTime = gaussianRandom(14000, 6000);
          console.log(`👀 Watching story ${i + 1} for ${Math.round(watchTime / 1000)} seconds`);
          await page.waitForTimeout(watchTime);
          
          // Try to go to next story or close
          const viewport = page.viewportSize() || { width: 1280, height: 720 };
          if (i < numToView - 1) {
            // Click right side to go to next story
            await page.mouse.click(
              viewport.width * 0.8,
              viewport.height * 0.5
            );
          } else {
            // Close stories by clicking close button or pressing Escape
            try {
              const closeButton = page.locator('button[aria-label="Close"], svg[aria-label="Close"]');
              if (await closeButton.isVisible({ timeout: 2000 })) {
                await closeButton.click();
              } else {
                await page.keyboard.press('Escape');
              }
            } catch (error) {
              await page.keyboard.press('Escape');
            }
          }
          
          storiesViewed++;
          await page.waitForTimeout(gaussianRandom(2000, 1000));
          
        } catch (error) {
          console.log(`⚠️ Failed to view story ${i + 1}: ${(error as Error).message}`);
          continue;
        }
      }

      this.recentActions += storiesViewed;
      await logAction(this.account.id, 'view_stories', { 
        count: storiesViewed, 
        target: numToView, 
        success: storiesViewed > 0 
      });
      
      console.log(`📊 Viewed ${storiesViewed} stories`);
      return storiesViewed > 0;

    } catch (error) {
      console.error('❌ View stories failed:', error);
      await logAction(this.account.id, 'view_stories', { 
        success: false, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  async watchReels() {
    console.log('🎬 Watching reels');
    
    if (!this.bot || !this.bot.isReady) {
      throw new Error('Bot not ready or not logged in');
    }

    const page = this.bot.currentPage;
    if (!page) {
      throw new Error('Page not available');
    }

    try {
      // Go to reels page
      await page.goto('https://www.instagram.com/reels/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await page.waitForTimeout(gaussianRandom(3000, 1000));

      const reelsToWatch = Math.floor(gaussianRandom(4, 2)); // 2-6 reels
      console.log(`🎯 Planning to watch ${reelsToWatch} reels`);

      for (let i = 0; i < reelsToWatch; i++) {
        try {
          // Watch current reel for 15-45 seconds (realistic viewing time)
          const watchTime = gaussianRandom(30000, 15000);
          console.log(`👀 Watching reel ${i + 1} for ${Math.round(watchTime / 1000)} seconds`);
          
          // Random scrolling within the reel area
          if (Math.random() < 0.3) {
            const scrollAmount = gaussianRandom(200, 100);
            await page.evaluate((amount) => {
              window.scrollBy(0, amount);
            }, scrollAmount);
            await page.waitForTimeout(gaussianRandom(1000, 500));
          }
          
          await page.waitForTimeout(watchTime);
          
          // Scroll down to next reel (swipe down behavior)
          if (i < reelsToWatch - 1) {
            await page.evaluate(() => {
              window.scrollBy(0, window.innerHeight);
            });
            await page.waitForTimeout(gaussianRandom(2000, 1000));
          }
          
        } catch (error) {
          console.log(`⚠️ Failed to watch reel ${i + 1}: ${(error as Error).message}`);
          continue;
        }
      }

      this.recentActions += reelsToWatch;
      await logAction(this.account.id, 'watch_reels', { 
        watched: reelsToWatch, 
        success: true 
      });
      
      console.log(`📊 Watched ${reelsToWatch} reels`);
        return true;

    } catch (error) {
      console.error('❌ Watch reels failed:', error);
      await logAction(this.account.id, 'watch_reels', { 
        success: false, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  async addComments() {
    console.log('💬 Adding comments to posts');
    
    if (!this.bot || !this.bot.isReady) {
      throw new Error('Bot not ready or not logged in');
    }

    const page = this.bot.currentPage;
    if (!page) {
      throw new Error('Page not available');
    }

    try {
      // Go to explore page to find posts
      await page.goto('https://www.instagram.com/explore/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      await page.waitForTimeout(gaussianRandom(3000, 1000));

      // Realistic comments pool
      const comments = [
        '❤️', '🔥', '✨', '👏', '😍', '💯', '🙌', '👍',
        'Nice!', 'Love this!', 'Amazing!', 'Great post!', 'Beautiful!', 
        'Awesome!', 'Perfect!', 'So good!', 'Love it!', 'Incredible!'
      ];

      const commentsToAdd = Math.floor(gaussianRandom(2, 1)); // 1-3 comments
      console.log(`🎯 Planning to add ${commentsToAdd} comments`);

      let commentsAdded = 0;

      // Find posts to comment on
      const postSelectors = [
        'article div[role="button"]',
        'div[role="button"] img',
        'a[href*="/p/"]'
      ];

      for (const selector of postSelectors) {
        if (commentsAdded >= commentsToAdd) break;

        try {
          const posts = await page.locator(selector).all();
          
          for (const post of posts.slice(0, commentsToAdd)) {
            if (commentsAdded >= commentsToAdd) break;

            try {
              // Click on post to open it
              await post.scrollIntoViewIfNeeded();
              await page.waitForTimeout(gaussianRandom(1000, 500));
              await post.click();
              
              // Wait for post to load
              await page.waitForTimeout(gaussianRandom(3000, 1000));

              // Find comment input
              const commentSelectors = [
                'textarea[placeholder*="comment"]',
                'textarea[aria-label*="comment"]',
                'div[contenteditable="true"][aria-label*="comment"]',
                'form textarea'
              ];

              let commentInput = null;
              for (const commentSelector of commentSelectors) {
                try {
                  commentInput = page.locator(commentSelector).first();
                  if (await commentInput.isVisible({ timeout: 2000 })) {
                    break;
                  }
                } catch (error) {
                  continue;
                }
              }

              if (commentInput && await commentInput.isVisible()) {
                // Select random comment
                const comment = comments[Math.floor(Math.random() * comments.length)];
                
                await commentInput.scrollIntoViewIfNeeded();
                await page.waitForTimeout(gaussianRandom(1000, 500));
                await commentInput.click();
                
                // Type comment with human-like speed
                await page.waitForTimeout(gaussianRandom(1000, 500));
                for (const char of comment) {
                  await commentInput.type(char);
                  await page.waitForTimeout(gaussianRandom(150, 100));
                }
                
                // Submit comment (Enter or Post button)
                await page.waitForTimeout(gaussianRandom(1000, 500));
                
                try {
                  const postButton = page.locator('button:has-text("Post"), button[type="submit"]');
                  if (await postButton.isVisible({ timeout: 2000 })) {
                    await postButton.click();
                  } else {
                    await commentInput.press('Enter');
                  }
                  
                  commentsAdded++;
                  console.log(`✅ Added comment ${commentsAdded}: "${comment}"`);
                  
                  await page.waitForTimeout(gaussianRandom(3000, 1000));
                  
                } catch (error) {
                  console.log('⚠️ Failed to submit comment');
                }
              }

              // Close post (press Escape or click close)
              try {
                await page.keyboard.press('Escape');
                await page.waitForTimeout(gaussianRandom(2000, 1000));
              } catch (error) {
                // Try clicking close button
                try {
                  const closeButton = page.locator('button[aria-label="Close"], svg[aria-label="Close"]');
                  if (await closeButton.isVisible({ timeout: 2000 })) {
                    await closeButton.click();
                  }
                } catch (error) {
                  // If all else fails, go back
                  await page.goBack();
                }
                await page.waitForTimeout(gaussianRandom(2000, 1000));
              }

            } catch (error) {
              console.log(`⚠️ Failed to comment on post: ${(error as Error).message}`);
              continue;
            }
          }
        } catch (error) {
          console.log(`⚠️ No posts found with selector ${selector}`);
          continue;
        }
      }

      this.recentActions += commentsAdded;
      await logAction(this.account.id, 'add_comments', { 
        added: commentsAdded, 
        target: commentsToAdd, 
        success: commentsAdded > 0 
      });
      
      console.log(`📊 Added ${commentsAdded} comments`);
      return commentsAdded > 0;

    } catch (error) {
      console.error('❌ Add comments failed:', error);
      await logAction(this.account.id, 'add_comments', { 
        success: false, 
        error: (error as Error).message 
      });
      return false;
    }
  }

  // DM functionality moved to separate campaign system - warmup should only do organic activities

  async runWarmupSession(phase: 'initial' | 'ongoing' = 'ongoing') {
    const timezone = process.env.DEFAULT_TIMEZONE || 'Europe/London';
    
    if (isNightTime(timezone)) {
      console.log('🌙 Night silence active; skipping warmup session');
      return;
    }

    try {
      await this.initialize();

      // Ensure bot is properly logged in before starting activities
      if (!this.bot || !this.bot.isReady) {
        throw new Error('Bot not ready or not logged in - warmup cannot proceed');
      }

      console.log('✅ Bot is ready and logged in - starting warmup activities');

      // Available organic warmup activities (NO DM sending or following in warmup!)
      const activities = [
        { name: 'browsing', fn: () => this.performNaturalBrowsing() },
        { name: 'liking', fn: () => this.likeSomePosts() },
        { name: 'stories', fn: () => this.viewStories() },
        { name: 'reels', fn: () => this.watchReels() },
        { name: 'comments', fn: () => this.addComments() }
      ];

      // Randomize activities
      const shuffled = activities.sort(() => Math.random() - 0.5);
      const numActivities = phase === 'initial' ? 
        Math.floor(gaussianRandom(4, 1)) : // 3-5 activities for initial
        Math.floor(gaussianRandom(6, 2));   // 4-8 activities for ongoing

      console.log(`🎯 Planning ${numActivities} warmup activities for ${phase} phase`);

      // Execute activities with realistic spacing
      for (let i = 0; i < Math.min(numActivities, shuffled.length); i++) {
        const activity = shuffled[i];
        
        try {
          console.log(`\n🔄 Starting activity ${i + 1}/${numActivities}: ${activity.name}`);
          const success = await activity.fn();
          
          if (success) {
            console.log(`✅ Activity ${activity.name} completed successfully`);
          } else {
            console.log(`⚠️ Activity ${activity.name} had issues but continuing`);
          }
          
        } catch (error) {
          console.error(`❌ Activity ${activity.name} failed:`, error);
          // Continue with other activities even if one fails
        }
        
        // Realistic spacing between activities (2-7 minutes)
        if (i < numActivities - 1) {
          const spacing = gaussianRandom(4.5 * 60000, 2.5 * 60000); // 2-7 minutes
          console.log(`⏳ Activity spacing: ${Math.round(spacing / 60000)} minutes before next activity`);
          await new Promise(resolve => setTimeout(resolve, spacing));
        }
      }

      // Update last login time
        await db.update(schema.accounts)
          .set({ 
            last_login_at: new Date()
          })
          .where(eq(schema.accounts.id, this.account.id));

      console.log(`✅ Warmup session completed (actions: ${this.recentActions}, risk: ${this.riskScore})`);
      
      await logAction(this.account.id, 'warmup_session', { 
        phase,
        actions: this.recentActions,
        risk: this.riskScore,
        success: true 
      });

    } catch (error) {
      console.error(`❌ Warmup session failed: ${error}`);
      
      this.riskScore += 20;
      await updateAccountRisk(this.account.id, this.riskScore);
      
      if (this.riskScore >= 60) {
        // Create notification for manual verification
        await createNotification(1, 'needs_manual_verification', {
          reason: 'warmup_session_failed',
          account_username: this.account.username,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    } finally {
      await this.close();
    }
  }

  async close() {
    if (this.bot) {
      await this.bot.close();
      this.bot = null;
    }
  }
}
