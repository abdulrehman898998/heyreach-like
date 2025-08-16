import { Server as SocketIOServer } from 'socket.io';
import { storage } from '../storage';
import { campaignExecutionService } from './campaignExecutionService';

interface MonitoringEvent {
  type: 'campaign' | 'account' | 'system' | 'alert';
  action: string;
  data: any;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
}

interface AccountHealthAlert {
  accountId: number;
  username: string;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
}

interface CampaignAlert {
  campaignId: number;
  name: string;
  issue: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export class MonitoringService {
  private io: SocketIOServer | null = null;
  private events: MonitoringEvent[] = [];
  private alerts: (AccountHealthAlert | CampaignAlert)[] = [];
  private metrics: SystemMetrics = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    activeConnections: 0
  };
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
    this.startMonitoring();
  }

  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log('🔌 Client connected to monitoring:', socket.id);
      this.metrics.activeConnections++;

      // Send initial data
      socket.emit('monitoring:init', {
        events: this.events.slice(-50), // Last 50 events
        alerts: this.alerts.slice(-20), // Last 20 alerts
        metrics: this.metrics
      });

      // Handle client requests
      socket.on('monitoring:get-events', () => {
        socket.emit('monitoring:events', this.events);
      });

      socket.on('monitoring:get-alerts', () => {
        socket.emit('monitoring:alerts', this.alerts);
      });

      socket.on('monitoring:get-metrics', () => {
        socket.emit('monitoring:metrics', this.metrics);
      });

      socket.on('monitoring:get-campaign-status', async (campaignId: number) => {
        const isRunning = campaignExecutionService.getCampaignStatus(campaignId);
        socket.emit('monitoring:campaign-status', { campaignId, isRunning });
      });

      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected from monitoring:', socket.id);
        this.metrics.activeConnections--;
      });
    });
  }

  private startMonitoring() {
    // Start system metrics monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.updateSystemMetrics();
      await this.checkAccountHealth();
      await this.checkCampaignHealth();
      this.broadcastMetrics();
    }, 30000); // Every 30 seconds

    // Start health check monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000); // Every minute
  }

  private async updateSystemMetrics() {
    try {
      // Simulate system metrics (in production, use actual system monitoring)
      this.metrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
        activeConnections: this.metrics.activeConnections
      };

      // Check for high resource usage
      if (this.metrics.cpu > 80) {
        this.createAlert('system', 'High CPU usage detected', 'warning');
      }
      if (this.metrics.memory > 85) {
        this.createAlert('system', 'High memory usage detected', 'warning');
      }
    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }

  private async checkAccountHealth() {
    try {
      const accounts = await storage.accounts.getAllAccounts();
      
      for (const account of accounts) {
        // Check health score
        if (account.healthScore < 50) {
          this.createAccountAlert(account.id, account.username, 'Low health score', 'warning');
        }
        if (account.healthScore < 30) {
          this.createAccountAlert(account.id, account.username, 'Critical health score', 'critical');
        }

        // Check daily message limits
        if (account.dailyMessageCount >= account.dailyMessageLimit) {
          this.createAccountAlert(account.id, account.username, 'Daily message limit reached', 'warning');
        }

        // Check for banned status
        if (account.status === 'banned') {
          this.createAccountAlert(account.id, account.username, 'Account banned', 'critical');
        }

        // Check for inactivity
        if (account.lastActivityDate) {
          const lastActivity = new Date(account.lastActivityDate);
          const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceActivity > 7) {
            this.createAccountAlert(account.id, account.username, 'Account inactive for more than 7 days', 'warning');
          }
        }
      }
    } catch (error) {
      console.error('Error checking account health:', error);
    }
  }

  private async checkCampaignHealth() {
    try {
      const campaigns = await storage.campaigns.getAllCampaigns();
      
      for (const campaign of campaigns) {
        // Check for high failure rates
        const executions = await storage.executions.getExecutionsByCampaignId(campaign.id);
        const failedExecutions = executions.filter(e => e.status === 'failed');
        const failureRate = executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0;
        
        if (failureRate > 20) {
          this.createCampaignAlert(campaign.id, campaign.name, `High failure rate: ${failureRate.toFixed(1)}%`, 'warning');
        }
        if (failureRate > 50) {
          this.createCampaignAlert(campaign.id, campaign.name, `Critical failure rate: ${failureRate.toFixed(1)}%`, 'critical');
        }

        // Check for stuck campaigns
        if (campaign.status === 'active') {
          const recentExecutions = executions.filter(e => 
            e.createdAt && new Date(e.createdAt) > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
          );
          if (recentExecutions.length === 0) {
            this.createCampaignAlert(campaign.id, campaign.name, 'Campaign appears to be stuck', 'warning');
          }
        }

        // Check for rate limiting
        const rateLimitedExecutions = executions.filter(e => e.status === 'rate_limited');
        if (rateLimitedExecutions.length > 0) {
          this.createCampaignAlert(campaign.id, campaign.name, 'Rate limiting detected', 'warning');
        }
      }
    } catch (error) {
      console.error('Error checking campaign health:', error);
    }
  }

  private async performHealthChecks() {
    try {
      // Check database connectivity
      const dbHealthy = await storage.healthCheck();
      if (!dbHealthy) {
        this.createAlert('system', 'Database connection failed', 'critical');
      }

      // Check active campaigns
      const activeCampaigns = await storage.campaigns.getAllCampaigns();
      const runningCampaigns = activeCampaigns.filter(c => c.status === 'active');
      
      if (runningCampaigns.length > 10) {
        this.createAlert('system', 'Too many active campaigns', 'warning');
      }

      // Check account availability
      const activeAccounts = await storage.accounts.getActiveAccounts();
      if (activeAccounts.length === 0) {
        this.createAlert('system', 'No active accounts available', 'critical');
      }

    } catch (error) {
      console.error('Error performing health checks:', error);
      this.createAlert('system', 'Health check failed', 'error');
    }
  }

  private createAlert(type: string, message: string, severity: 'info' | 'warning' | 'error' | 'critical' = 'info') {
    const event: MonitoringEvent = {
      type: 'system',
      action: message,
      data: { type, severity },
      timestamp: new Date(),
      severity
    };

    this.events.push(event);
    this.broadcastEvent(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  private createAccountAlert(accountId: number, username: string, issue: string, severity: 'warning' | 'error' | 'critical') {
    const alert: AccountHealthAlert = {
      accountId,
      username,
      issue,
      severity,
      timestamp: new Date()
    };

    this.alerts.push(alert);
    this.broadcastAlert(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private createCampaignAlert(campaignId: number, name: string, issue: string, severity: 'warning' | 'error' | 'critical') {
    const alert: CampaignAlert = {
      campaignId,
      name,
      issue,
      severity,
      timestamp: new Date()
    };

    this.alerts.push(alert);
    this.broadcastAlert(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private broadcastEvent(event: MonitoringEvent) {
    if (this.io) {
      this.io.emit('monitoring:event', event);
    }
  }

  private broadcastAlert(alert: AccountHealthAlert | CampaignAlert) {
    if (this.io) {
      this.io.emit('monitoring:alert', alert);
    }
  }

  private broadcastMetrics() {
    if (this.io) {
      this.io.emit('monitoring:metrics', this.metrics);
    }
  }

  // Public methods for external use
  public logCampaignEvent(campaignId: number, action: string, data: any, severity: 'info' | 'warning' | 'error' = 'info') {
    const event: MonitoringEvent = {
      type: 'campaign',
      action,
      data: { campaignId, ...data },
      timestamp: new Date(),
      severity
    };

    this.events.push(event);
    this.broadcastEvent(event);
  }

  public logAccountEvent(accountId: number, action: string, data: any, severity: 'info' | 'warning' | 'error' = 'info') {
    const event: MonitoringEvent = {
      type: 'account',
      action,
      data: { accountId, ...data },
      timestamp: new Date(),
      severity
    };

    this.events.push(event);
    this.broadcastEvent(event);
  }

  public logSystemEvent(action: string, data: any, severity: 'info' | 'warning' | 'error' | 'critical' = 'info') {
    const event: MonitoringEvent = {
      type: 'system',
      action,
      data,
      timestamp: new Date(),
      severity
    };

    this.events.push(event);
    this.broadcastEvent(event);
  }

  public getEvents(limit: number = 100): MonitoringEvent[] {
    return this.events.slice(-limit);
  }

  public getAlerts(limit: number = 50): (AccountHealthAlert | CampaignAlert)[] {
    return this.alerts.slice(-limit);
  }

  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
let monitoringService: MonitoringService | null = null;

export function initializeMonitoring(io: SocketIOServer): MonitoringService {
  if (!monitoringService) {
    monitoringService = new MonitoringService(io);
  }
  return monitoringService;
}

export function getMonitoringService(): MonitoringService | null {
  return monitoringService;
}
