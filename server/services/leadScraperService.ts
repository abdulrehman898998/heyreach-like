import { BrowserSetup } from "../utils/browserSetup";
import { storage } from "../storage";
import type { CampaignTarget, InsertCampaignTarget } from "@shared/schema";

interface ScrapingOptions {
  hashtags?: string[];
  competitorUsernames?: string[];
  locations?: string[];
  filters?: {
    minFollowers?: number;
    maxFollowers?: number;
    minEngagement?: number;
    hasEmail?: boolean;
    hasWebsite?: boolean;
  };
  maxResults?: number;
}

interface ScrapedProfile {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  profileUrl: string;
  isPrivate: boolean;
  isBusiness: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  location?: string;
  website?: string;
  email?: string;
}

interface ScrapingResult {
  profiles: ScrapedProfile[];
  totalFound: number;
  errors: string[];
  duration: number;
}

class LeadScraperService {
  private readonly MAX_CONCURRENT_SCRAPES = 3;
  private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
  private readonly MAX_PROFILES_PER_SEARCH = 100;

  /**
   * Scrape leads using hashtag search
   */
  async scrapeByHashtags(hashtags: string[], options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const startTime = Date.now();
    const profiles: ScrapedProfile[] = [];
    const errors: string[] = [];

    for (const hashtag of hashtags) {
      try {
        const hashtagProfiles = await this.scrapeHashtag(hashtag, options);
        profiles.push(...hashtagProfiles);
        
        // Rate limiting
        await this.delay(this.RATE_LIMIT_DELAY);
      } catch (error) {
        errors.push(`Hashtag #${hashtag}: ${error.message}`);
      }
    }

    return {
      profiles: this.filterProfiles(profiles, options.filters),
      totalFound: profiles.length,
      errors,
      duration: Date.now() - startTime
    };
  }

  /**
   * Scrape leads from competitor followers
   */
  async scrapeCompetitorFollowers(competitors: string[], options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const startTime = Date.now();
    const profiles: ScrapedProfile[] = [];
    const errors: string[] = [];

    for (const competitor of competitors) {
      try {
        const followerProfiles = await this.scrapeFollowers(competitor, options);
        profiles.push(...followerProfiles);
        
        await this.delay(this.RATE_LIMIT_DELAY);
      } catch (error) {
        errors.push(`Competitor @${competitor}: ${error.message}`);
      }
    }

    return {
      profiles: this.filterProfiles(profiles, options.filters),
      totalFound: profiles.length,
      errors,
      duration: Date.now() - startTime
    };
  }

  /**
   * Scrape leads by location
   */
  async scrapeByLocation(locations: string[], options: ScrapingOptions = {}): Promise<ScrapingResult> {
    const startTime = Date.now();
    const profiles: ScrapedProfile[] = [];
    const errors: string[] = [];

    for (const location of locations) {
      try {
        const locationProfiles = await this.scrapeLocation(location, options);
        profiles.push(...locationProfiles);
        
        await this.delay(this.RATE_LIMIT_DELAY);
      } catch (error) {
        errors.push(`Location ${location}: ${error.message}`);
      }
    }

    return {
      profiles: this.filterProfiles(profiles, options.filters),
      totalFound: profiles.length,
      errors,
      duration: Date.now() - startTime
    };
  }

  /**
   * Save scraped profiles to campaign targets
   */
  async saveScrapedProfiles(
    campaignId: number,
    profiles: ScrapedProfile[],
    customMessage?: string
  ): Promise<number> {
    const targets: InsertCampaignTarget[] = profiles.map(profile => ({
      campaignId,
      profileUrl: profile.profileUrl,
      username: profile.username,
      firstName: this.extractFirstName(profile.fullName),
      lastName: this.extractLastName(profile.fullName),
      bio: profile.bio,
      customMessage
    }));

    const savedCount = await storage.createCampaignTargets(targets);
    return savedCount;
  }

  /**
   * Export scraped profiles to CSV
   */
  async exportToCSV(profiles: ScrapedProfile[]): Promise<string> {
    const headers = [
      'Username',
      'Full Name',
      'Bio',
      'Followers',
      'Following',
      'Posts',
      'Profile URL',
      'Is Private',
      'Is Business',
      'Has Email',
      'Has Website',
      'Location',
      'Website',
      'Email'
    ];

    const rows = profiles.map(profile => [
      profile.username,
      profile.fullName,
      profile.bio,
      profile.followers,
      profile.following,
      profile.posts,
      profile.profileUrl,
      profile.isPrivate,
      profile.isBusiness,
      profile.hasEmail,
      profile.hasWebsite,
      profile.location || '',
      profile.website || '',
      profile.email || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Validate profile quality score
   */
  calculateProfileScore(profile: ScrapedProfile): number {
    let score = 0;

    // Follower count (0-30 points)
    if (profile.followers >= 1000 && profile.followers <= 10000) score += 30;
    else if (profile.followers >= 10000 && profile.followers <= 50000) score += 25;
    else if (profile.followers >= 50000) score += 20;
    else if (profile.followers >= 500) score += 15;

    // Engagement indicators (0-25 points)
    if (profile.posts > 0) {
      const engagementRatio = profile.followers / profile.posts;
      if (engagementRatio >= 50 && engagementRatio <= 200) score += 25;
      else if (engagementRatio >= 200 && engagementRatio <= 500) score += 20;
      else if (engagementRatio >= 500) score += 15;
    }

    // Business indicators (0-25 points)
    if (profile.isBusiness) score += 15;
    if (profile.hasEmail) score += 10;
    if (profile.hasWebsite) score += 10;

    // Bio quality (0-20 points)
    if (profile.bio && profile.bio.length > 50) score += 20;
    else if (profile.bio && profile.bio.length > 20) score += 15;
    else if (profile.bio) score += 10;

    return Math.min(100, score);
  }

  private async scrapeHashtag(hashtag: string, options: ScrapingOptions): Promise<ScrapedProfile[]> {
    const browser = await BrowserSetup.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto(`https://www.instagram.com/explore/tags/${hashtag}/`);
      await page.waitForSelector('article', { timeout: 10000 });

      // Scroll to load more posts
      await this.scrollToLoadMore(page, options.maxResults || this.MAX_PROFILES_PER_SEARCH);

      // Extract profile URLs from posts
      const profileUrls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('article a[href^="/"]'));
        return [...new Set(links.map(link => link.getAttribute('href')))].slice(0, 50);
      });

      // Scrape individual profiles
      const profiles: ScrapedProfile[] = [];
      for (const profileUrl of profileUrls) {
        try {
          const profile = await this.scrapeProfile(page, profileUrl);
          if (profile) profiles.push(profile);
          await this.delay(1000); // Rate limiting
        } catch (error) {
          console.error(`Error scraping profile ${profileUrl}:`, error);
        }
      }

      return profiles;
    } finally {
      await page.close();
    }
  }

  private async scrapeFollowers(username: string, options: ScrapingOptions): Promise<ScrapedProfile[]> {
    const browser = await BrowserSetup.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto(`https://www.instagram.com/${username}/`);
      await page.waitForSelector('a[href*="/followers/"]', { timeout: 10000 });

      // Click on followers link
      await page.click('a[href*="/followers/"]');
      await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

      // Scroll to load more followers
      await this.scrollToLoadMore(page, options.maxResults || this.MAX_PROFILES_PER_SEARCH);

      // Extract follower profiles
      const profiles = await page.evaluate(() => {
        const followers = Array.from(document.querySelectorAll('div[role="dialog"] a[href^="/"]'));
        return followers.map(follower => {
          const href = follower.getAttribute('href');
          const nameElement = follower.querySelector('span');
          return {
            profileUrl: href,
            fullName: nameElement?.textContent || ''
          };
        }).slice(0, 50);
      });

      // Scrape individual profiles
      const scrapedProfiles: ScrapedProfile[] = [];
      for (const profile of profiles) {
        try {
          const fullProfile = await this.scrapeProfile(page, profile.profileUrl);
          if (fullProfile) scrapedProfiles.push(fullProfile);
          await this.delay(1000);
        } catch (error) {
          console.error(`Error scraping follower profile:`, error);
        }
      }

      return scrapedProfiles;
    } finally {
      await page.close();
    }
  }

  private async scrapeLocation(location: string, options: ScrapingOptions): Promise<ScrapedProfile[]> {
    const browser = await BrowserSetup.getBrowser();
    const page = await browser.newPage();
    
    try {
      // Search for location
      await page.goto(`https://www.instagram.com/explore/locations/`);
      await page.waitForSelector('input[placeholder*="Search"]', { timeout: 10000 });
      
      await page.type('input[placeholder*="Search"]', location);
      await page.waitForTimeout(2000);

      // Click on first location result
      const locationLink = await page.$('a[href*="/locations/"]');
      if (locationLink) {
        await locationLink.click();
        await page.waitForSelector('article', { timeout: 10000 });

        // Similar to hashtag scraping
        await this.scrollToLoadMore(page, options.maxResults || this.MAX_PROFILES_PER_SEARCH);

        const profileUrls = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('article a[href^="/"]'));
          return [...new Set(links.map(link => link.getAttribute('href')))].slice(0, 50);
        });

        const profiles: ScrapedProfile[] = [];
        for (const profileUrl of profileUrls) {
          try {
            const profile = await this.scrapeProfile(page, profileUrl);
            if (profile) profiles.push(profile);
            await this.delay(1000);
          } catch (error) {
            console.error(`Error scraping profile ${profileUrl}:`, error);
          }
        }

        return profiles;
      }

      return [];
    } finally {
      await page.close();
    }
  }

  private async scrapeProfile(page: any, profileUrl: string): Promise<ScrapedProfile | null> {
    try {
      await page.goto(`https://www.instagram.com${profileUrl}`);
      await page.waitForTimeout(2000);

      const profileData = await page.evaluate(() => {
        const username = document.querySelector('h2')?.textContent || '';
        const fullName = document.querySelector('h1')?.textContent || '';
        const bio = document.querySelector('div[data-testid="user-bio"]')?.textContent || '';
        
        // Extract stats
        const statsElements = document.querySelectorAll('li');
        let followers = 0, following = 0, posts = 0;
        
        statsElements.forEach((li, index) => {
          const text = li.textContent || '';
          if (text.includes('posts')) posts = parseInt(text) || 0;
          else if (text.includes('followers')) followers = parseInt(text) || 0;
          else if (text.includes('following')) following = parseInt(text) || 0;
        });

        // Check if private/business
        const isPrivate = !!document.querySelector('h2:contains("This Account is Private")');
        const isBusiness = !!document.querySelector('span:contains("Business")');

        // Extract contact info from bio
        const hasEmail = bio.includes('@') && bio.includes('.');
        const hasWebsite = bio.includes('http') || bio.includes('www.');
        
        // Extract website and email
        const websiteMatch = bio.match(/(https?:\/\/[^\s]+)/);
        const emailMatch = bio.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);

        return {
          username,
          fullName,
          bio,
          followers,
          following,
          posts,
          profileUrl: window.location.pathname,
          isPrivate,
          isBusiness,
          hasEmail,
          hasWebsite,
          website: websiteMatch ? websiteMatch[1] : undefined,
          email: emailMatch ? emailMatch[0] : undefined
        };
      });

      return profileData;
    } catch (error) {
      console.error(`Error scraping profile ${profileUrl}:`, error);
      return null;
    }
  }

  private async scrollToLoadMore(page: any, maxItems: number): Promise<void> {
    let previousHeight = 0;
    let currentItems = 0;
    const maxScrolls = 10;

    for (let i = 0; i < maxScrolls; i++) {
      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) break;

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);

      currentItems = await page.evaluate(() => {
        return document.querySelectorAll('article').length;
      });

      if (currentItems >= maxItems) break;
      previousHeight = currentHeight;
    }
  }

  private filterProfiles(profiles: ScrapedProfile[], filters?: ScrapingOptions['filters']): ScrapedProfile[] {
    if (!filters) return profiles;

    return profiles.filter(profile => {
      if (filters.minFollowers && profile.followers < filters.minFollowers) return false;
      if (filters.maxFollowers && profile.followers > filters.maxFollowers) return false;
      if (filters.hasEmail && !profile.hasEmail) return false;
      if (filters.hasWebsite && !profile.hasWebsite) return false;
      if (profile.isPrivate) return false; // Skip private accounts
      
      return true;
    });
  }

  private extractFirstName(fullName: string): string {
    return fullName.split(' ')[0] || '';
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const leadScraperService = new LeadScraperService();
