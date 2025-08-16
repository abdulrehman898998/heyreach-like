#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 HeyReach Setup Script\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file...');
  const envTemplate = `# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/heyreach

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Playwright Configuration
PLAYWRIGHT_HEADLESS=true

# Optional: LLM API for MCP fallback
LLM_API_KEY=your_openai_api_key_here
LLM_API_URL=https://api.openai.com/v1/chat/completions

# Optional: Proxy Configuration (if using external proxy service)
PROXY_PROVIDER=your_proxy_provider
PROXY_USERNAME=your_proxy_username
PROXY_PASSWORD=your_proxy_password

# Optional: Encryption Key for cookies (generate a secure random key)
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Optional: Session Secret
SESSION_SECRET=your_session_secret_here
`;
  
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ .env file created. Please edit it with your configuration.');
} else {
  console.log('✅ .env file already exists.');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed.');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed.');
}

// Install Playwright browsers
console.log('\n🌐 Installing Playwright browsers...');
try {
  execSync('npx playwright install chromium', { stdio: 'inherit' });
  console.log('✅ Playwright browsers installed.');
} catch (error) {
  console.error('❌ Failed to install Playwright browsers:', error.message);
  process.exit(1);
}

// Setup database
console.log('\n🗄️ Setting up database...');
try {
  execSync('npm run db:push', { stdio: 'inherit' });
  console.log('✅ Database schema created.');
} catch (error) {
  console.error('❌ Failed to setup database:', error.message);
  console.log('💡 Make sure PostgreSQL is running and DATABASE_URL is correct in .env');
  process.exit(1);
}

// Seed database
console.log('\n🌱 Seeding database with test data...');
try {
  execSync('npx tsx server/seed.ts', { stdio: 'inherit' });
  console.log('✅ Test data seeded.');
} catch (error) {
  console.error('❌ Failed to seed database:', error.message);
  process.exit(1);
}

console.log('\n🎉 HeyReach setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit .env file with your configuration');
console.log('2. Start the development server: npm run dev');
console.log('3. Open http://localhost:5001 in your browser');
console.log('4. Test the system: node test-heyreach.js');
console.log('\n📚 For more information, see README.md');
