import InstagramBot from './automation/instagramBot.js';

async function testPopupHandling() {
    console.log('🧪 Testing popup handling...');
    
    // Create a test account (you'll need to replace with real credentials)
    const testAccount = {
        username: 'your_test_username',
        password: 'your_test_password',
        twofa: null // Add your 2FA secret if needed
    };
    
    let bot = null;
    
    try {
        // Initialize the bot
        bot = new InstagramBot(testAccount);
        await bot.initialize();
        
        console.log('✅ Bot initialized successfully');
        
        // Navigate to Instagram to trigger any popups
        console.log('🌐 Navigating to Instagram...');
        await bot.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        
        // Wait a moment for any popups to appear
        await bot.page.waitForTimeout(3000);
        
        // Test the popup handling
        console.log('🔍 Testing popup handling...');
        await bot.handleAnyPopups();
        
        console.log('✅ Popup handling test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        if (bot) {
            await bot.close();
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testPopupHandling();
}

export { testPopupHandling }; 