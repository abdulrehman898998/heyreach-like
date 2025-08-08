import { storage } from "../storage";

class CronService {
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start all cron jobs
   */
  startCronJobs(): void {
    console.log("Starting cron jobs...");
    
    // Hourly account health check (runs every hour)
    this.startHourlyHealthCheck();
    
    console.log("Cron jobs started successfully");
  }

  /**
   * Stop all cron jobs
   */
  stopCronJobs(): void {
    console.log("Stopping cron jobs...");
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    console.log("Cron jobs stopped");
  }

  /**
   * Hourly account health check
   */
  private startHourlyHealthCheck(): void {
    const interval = setInterval(async () => {
      try {
        console.log("Running hourly account health check...");
        await this.updateAccountHealthScores();
        console.log("Hourly account health check completed");
      } catch (error) {
        console.error("Error in hourly health check:", error);
      }
    }, 60 * 60 * 1000); // Run every hour

    this.intervals.push(interval);
  }

  /**
   * Update account health scores based on recent activity
   */
  private async updateAccountHealthScores(): Promise<void> {
    try {
      // Get all Instagram accounts
      const accounts = await storage.getInstagramAccountsByUser(""); // This would need to be updated to loop through all users
      
      for (const account of accounts) {
        if (account.isActive) {
          // For now, just mark accounts as healthy
          // In a real implementation, this would check for:
          // - Recent successful message sends
          // - Account blocks/restrictions
          // - Rate limiting issues
          
          await storage.updateInstagramAccount(account.id, {
            isHealthy: true,
            lastHealthCheck: new Date()
          });
        }
      }
    } catch (error) {
      console.error("Error updating account health scores:", error);
    }
  }

  /**
   * Get cron job status
   */
  getCronStatus(): {
    running: boolean;
    jobsCount: number;
  } {
    return {
      running: this.intervals.length > 0,
      jobsCount: this.intervals.length
    };
  }
}

export const cronService = new CronService();