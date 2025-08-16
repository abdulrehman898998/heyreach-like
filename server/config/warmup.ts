export interface WarmupConfig {
  enabled: boolean;
  durationMinutes: number;
  intervalHours: number;
  maxAccountsPerRun: number;
  dailyLimits: {
    follows: number;
    unfollows: number;
    likes: number;
    storyViews: number;
    comments: number;
  };
  sessionLimits: {
    follows: number;
    unfollows: number;
    likes: number;
    storyViews: number;
    comments: number;
  };
  delays: {
    betweenActions: number; // seconds
    betweenSessions: number; // minutes
  };
  warmupDuration: number; // days
}

export const warmupConfig: WarmupConfig = {
  enabled: true,
  durationMinutes: 15, // 15 minutes per warmup session
  intervalHours: 4, // Run warmup every 4 hours
  maxAccountsPerRun: 5, // Max accounts to warm up per run
  
  dailyLimits: {
    follows: 25,
    unfollows: 20,
    likes: 50,
    storyViews: 15,
    comments: 10
  },
  
  sessionLimits: {
    follows: 5,
    unfollows: 3,
    likes: 10,
    storyViews: 3,
    comments: 2
  },
  
  delays: {
    betweenActions: 30, // 30 seconds between actions
    betweenSessions: 240 // 4 hours between sessions
  },
  
  warmupDuration: 7 // 7 days total warmup period
};

