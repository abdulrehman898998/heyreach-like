import { chromium } from 'playwright';
import { execSync } from 'child_process';

export class BrowserSetup {
  private static isInstalling = false;
  private static installPromise: Promise<boolean> | null = null;

  static async checkBrowserAvailability(): Promise<{ available: boolean; message: string }> {
    try {
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      return { available: true, message: 'Browser automation is ready' };
    } catch (error) {
      if (error.message.includes('Executable doesn\'t exist')) {
        return { 
          available: false, 
          message: 'Browser not installed. Run: npx playwright install chromium' 
        };
      }
      return { 
        available: false, 
        message: `Browser error: ${error.message}` 
      };
    }
  }

  static async installBrowser(): Promise<boolean> {
    if (this.isInstalling && this.installPromise) {
      return this.installPromise;
    }

    this.isInstalling = true;
    this.installPromise = this.performInstallation();
    
    try {
      const result = await this.installPromise;
      this.isInstalling = false;
      return result;
    } catch (error) {
      this.isInstalling = false;
      throw error;
    }
  }

  private static async performInstallation(): Promise<boolean> {
    try {
      console.log('Installing Chromium browser...');
      execSync('npx playwright install chromium', { 
        stdio: 'inherit',
        timeout: 300000 // 5 minutes timeout
      });
      
      // Verify installation
      const check = await this.checkBrowserAvailability();
      return check.available;
    } catch (error) {
      console.error('Browser installation failed:', error);
      return false;
    }
  }

  static isCurrentlyInstalling(): boolean {
    return this.isInstalling;
  }
}