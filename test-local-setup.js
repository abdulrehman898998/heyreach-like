#!/usr/bin/env node

/**
 * Local Setup Test Script
 * Tests all components of SocialBot Pro local installation
 */

import { Pool } from 'pg';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testLocalSetup() {
  console.log('🔍 Testing SocialBot Pro Local Setup...\n');
  
  let allTests = [];
  
  // Test 1: Environment Variables
  console.log('1. Testing Environment Variables...');
  const requiredEnvVars = [
    'DATABASE_URL',
    'META_APP_ID', 
    'META_APP_SECRET',
    'SESSION_SECRET'
  ];
  
  let envTest = true;
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.log(`   ❌ Missing: ${envVar}`);
      envTest = false;
    } else {
      console.log(`   ✅ Found: ${envVar}`);
    }
  }
  allTests.push({ name: 'Environment Variables', passed: envTest });
  
  // Test 2: Database Connection
  console.log('\n2. Testing Database Connection...');
  let dbTest = false;
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT NOW()');
    console.log(`   ✅ Database connected: ${result.rows[0].now}`);
    
    // Test tables exist
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'users', 'social_accounts', 'google_sheets', 'campaigns', 
      'campaign_targets', 'messages', 'replies', 'proxies', 
      'activity_logs', 'sessions'
    ];
    
    const existingTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log(`   ✅ All ${expectedTables.length} tables exist`);
      dbTest = true;
    } else {
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
      console.log(`   💡 Run: npm run db:push`);
    }
    
    await pool.end();
  } catch (error) {
    console.log(`   ❌ Database error: ${error.message}`);
  }
  allTests.push({ name: 'Database Connection', passed: dbTest });
  
  // Test 3: Playwright/Chromium
  console.log('\n3. Testing Playwright/Chromium...');
  let browserTest = false;
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    await browser.close();
    
    console.log(`   ✅ Chromium working: ${title}`);
    browserTest = true;
  } catch (error) {
    console.log(`   ❌ Chromium error: ${error.message}`);
    console.log(`   💡 Run: npx playwright install chromium`);
  }
  allTests.push({ name: 'Playwright/Chromium', passed: browserTest });
  
  // Test 4: File Structure
  console.log('\n4. Testing File Structure...');
  const requiredFiles = [
    'server/index.ts',
    'server/automation/instagramBot.ts',
    'server/services/automationService.ts',
    'client/src/App.tsx',
    'shared/schema.ts',
    'drizzle.config.ts',
    'package.json'
  ];
  
  let fileTest = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ Found: ${file}`);
    } else {
      console.log(`   ❌ Missing: ${file}`);
      fileTest = false;
    }
  }
  allTests.push({ name: 'File Structure', passed: fileTest });
  
  // Test 5: Node Modules
  console.log('\n5. Testing Dependencies...');
  let depsTest = false;
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const criticalDeps = ['playwright', 'drizzle-orm', 'express', 'react'];
    
    let allDepsFound = true;
    for (const dep of criticalDeps) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
        console.log(`   ✅ Installed: ${dep}`);
      } else {
        console.log(`   ❌ Missing: ${dep}`);
        allDepsFound = false;
      }
    }
    
    if (allDepsFound && fs.existsSync('node_modules')) {
      console.log(`   ✅ All dependencies installed`);
      depsTest = true;
    }
  } catch (error) {
    console.log(`   ❌ Dependencies error: ${error.message}`);
    console.log(`   💡 Run: npm install`);
  }
  allTests.push({ name: 'Dependencies', passed: depsTest });
  
  // Summary
  console.log('\n📊 Setup Test Summary:');
  console.log('========================');
  
  const passedTests = allTests.filter(test => test.passed).length;
  const totalTests = allTests.length;
  
  allTests.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });
  
  console.log(`\n🎯 Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🚀 All tests passed! Your local setup is ready.');
    console.log('   Run: npm run dev');
    console.log('   Visit: http://localhost:5000');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix the issues above.');
    console.log('   Check the LOCAL_SETUP_GUIDE.md for detailed instructions.');
  }
  
  return { passed: passedTests, total: totalTests };
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testLocalSetup().catch(console.error);
}

export { testLocalSetup };