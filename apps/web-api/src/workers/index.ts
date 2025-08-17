#!/usr/bin/env node

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { warmupWorker, dmSendWorker } from './warmupWorker';

console.log('🚀 Starting HeyReach Workers...');
console.log('📋 Workers initialized:');
console.log('  - Warmup Worker (Instagram account warmup)');
console.log('  - DM Send Worker (Direct message automation)');

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    await warmupWorker.close();
    await dmSendWorker.close();
    console.log('✅ Workers shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Keep process alive
process.on('exit', () => {
  console.log('👋 HeyReach Workers stopped');
});

console.log('✅ HeyReach Workers are running...');
console.log('Press Ctrl+C to stop');
