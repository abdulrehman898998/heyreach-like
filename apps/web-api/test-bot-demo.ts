// Demo script to show Instagram bot opening without login
import { InstagramBot } from './src/lib/instagramBot.js';

async function demoBot() {
  console.log('🎭 Instagram Bot Demo - Opening browser without login...');
  
  // Demo account (won't actually log in)
  const demoAccount = {
    username: 'demo_user',
    password: 'demo_pass'
  };

  try {
    console.log('🚀 Creating bot instance...');
    const bot = new InstagramBot(demoAccount, {
      headless: false, // Visible mode
      slowMo: 2000 // Slower for demo
    });
    
    console.log('🔄 Initializing bot (will open Instagram login page)...');
    const initResult = await bot.initialize();
    
    console.log(`📝 Result: ${initResult.message}`);
    
    if (initResult.success) {
      console.log('✅ Bot opened successfully!');
      console.log('👀 You should see Instagram login page in the browser');
      console.log('⏳ Keeping browser open for 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    } else {
      console.log('❌ Bot failed to open');
      console.log('⏳ Keeping browser open for 10 seconds to show error...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('🔒 Closing bot...');
    await bot.close();
    console.log('✅ Demo completed!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
  
  process.exit(0);
}

demoBot();
