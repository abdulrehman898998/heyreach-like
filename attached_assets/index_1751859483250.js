import InstagramBot from './instagramBot.js';
import { getSheetData, writeStatusToSheet } from './googleSheet.js';
import path from 'path';

/**
 * Shuffles an array in place.
 * @param {Array} array The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}

/**
 * The main function to run the automation.
 */
async function runAutomation(config, logCallback) {
    logCallback('--- Starting Instagram DM Automation ---');
    let bot = null;

    // Validate core configuration
    if (!config?.instagram?.accounts?.length) {
        throw new Error('No Instagram accounts configured');
    }
    if (!config.google.sheetId || !config.google.apiKey) {
        throw new Error('Missing Google Sheets configuration');
    }

    try {
        const profilesToProcess = await getSheetData(config, logCallback);
        console.log('Profiles to process:', profilesToProcess.length);
        logCallback(`📊 Found ${profilesToProcess.length} profiles to process`);
        
        if (profilesToProcess.length === 0) {
            console.log('No profiles to process. Exiting.');
            logCallback('❌ No profiles found in the specified range. Please check your Google Sheets configuration.');
            return;
        }

        // 2. Prepare the shuffled account queue
        const accounts = [...config.instagram.accounts];
        shuffleArray(accounts);
        if (!accounts || accounts.length === 0) {
          throw new Error('Valid Instagram accounts array not received');
        }
        
        logCallback(`👥 Using ${accounts.length} Instagram accounts`);
        let accountQueue = [...accounts]; // Create a copy to use as a queue
        let messagesSentThisSession = 0;
        let accountUsageCounter = 0; // New counter for account rotation
        const failedProfiles = [];
        const skippedProfiles = [];

        // 3. Process each profile from the sheet
        for (let i = 0; i < profilesToProcess.length; i++) {
            const profile = profilesToProcess[i];
            logCallback(`\n🔄 Processing profile ${i + 1}/${profilesToProcess.length}: ${profile.profileUrl}`);
            
            try {
                if (!profile?.profileUrl) {
                    logCallback(`⚠️ Skipping profile without URL: ${JSON.stringify(profile)}`);
                    skippedProfiles.push(profile);
                    continue;
                }
                
                // Rotate account if needed
                if (accountUsageCounter % config.instagram.messagesPerAccount === 0) {
                    if (bot) {
                        logCallback('🔄 Closing previous browser session...');
                        await bot.close(); // Close previous browser session
                    }

                    // Get the next account from the queue, or reshuffle if queue is empty
                    if (accountQueue.length === 0) {
                        logCallback('\n🔄 All accounts used once. Re-shuffling and starting new cycle.');
                        shuffleArray(accounts);
                        accountQueue = [...accounts];
                    }
                    const currentAccount = accountQueue.shift();
                    if (!currentAccount?.username || !currentAccount?.password) {
                        logCallback(`❌ Invalid account configuration: ${JSON.stringify(currentAccount)}`);
                        skippedProfiles.push(profile);
                        continue;
                    }

                    // Use a unique chromium_data directory per account
                    const userDataDir = path.join('chromium_data', currentAccount.username);
                    bot = new InstagramBot(currentAccount, config.proxy, userDataDir);
                    logCallback(`🔐 Initializing browser for account: ${currentAccount.username}`);
                    await bot.initialize();
                    logCallback(`✅ Successfully switched to account: ${currentAccount.username}`);
                }

                // Check if bot is properly initialized
                if (!bot || !bot.page) {
                    logCallback('🔄 Browser not initialized, creating new session...');
                    if (bot) {
                        try {
                            await bot.close();
                        } catch (e) {
                            // Ignore close errors
                        }
                    }
                    
                    // Get the next account from the queue, or reshuffle if queue is empty
                    if (accountQueue.length === 0) {
                        logCallback('\n🔄 All accounts used once. Re-shuffling and starting new cycle.');
                        shuffleArray(accounts);
                        accountQueue = [...accounts];
                    }
                    const currentAccount = accountQueue.shift();
                    if (!currentAccount?.username || !currentAccount?.password) {
                        logCallback(`❌ Invalid account configuration: ${JSON.stringify(currentAccount)}`);
                        skippedProfiles.push(profile);
                        continue;
                    }

                    // Use a unique chromium_data directory per account
                    const userDataDir = path.join('chromium_data', currentAccount.username);
                    bot = new InstagramBot(currentAccount, config.proxy, userDataDir);
                    logCallback(`🔐 Initializing browser for account: ${currentAccount.username}`);
                    await bot.initialize();
                    logCallback(`✅ Successfully switched to account: ${currentAccount.username}`);
                }

                // Log which account is being used for this profile
                logCallback(`📤 Using account: ${bot.account.username} for profile: ${profile.profileUrl}`);

                // 4. Send the message
                const result = await bot.sendMessage(profile.profileUrl, profile.message);
                accountUsageCounter++; // Increment for every profile processed
                
                if (result === true) {
                    messagesSentThisSession++;
                    logCallback(`✅ Successfully sent message to: ${profile.profileUrl}`);
                    // Write status to Google Sheet column C
                    await writeStatusToSheet(config, profile.rowNumber, 'Sent', logCallback);
                } else if (result === false) {
                    logCallback(`❌ Failed to send message for: ${profile.profileUrl}`);
                    failedProfiles.push(profile);
                    // Write status to Google Sheet column C
                    await writeStatusToSheet(config, profile.rowNumber, 'Failed to send', logCallback);
                } else if (result === null) {
                    logCallback(`⚠️ Message button not available for: ${profile.profileUrl} (skipping)`);
                    skippedProfiles.push(profile);
                    await writeStatusToSheet(config, profile.rowNumber, 'No message button', logCallback);
                }

                // Add a longer random delay to mimic human behavior and avoid rate limits
                const delay = Math.floor(Math.random() * 20000) + 10000; // 10-30 seconds (reduced from 15-40)
                logCallback(`⏳ Waiting for ${Math.round(delay / 1000)} seconds before next profile...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Additional delay every 5-10 messages to be extra cautious
                if (messagesSentThisSession > 0 && messagesSentThisSession % (5 + Math.floor(Math.random() * 6)) === 0) {
                    const extraDelay = Math.floor(Math.random() * 300000) + 120000; // 2-7 minutes (reduced from 3-10)
                    logCallback(`🛌 Taking a longer break (${Math.round(extraDelay / 1000)} seconds) after ${messagesSentThisSession} messages...`);
                    await new Promise(resolve => setTimeout(resolve, extraDelay));
                }
            } catch (profileErr) {
                logCallback(`❌ Error processing profile ${profile?.profileUrl || ''}: ${profileErr.message}`);
                failedProfiles.push(profile);
                await writeStatusToSheet(config, profile.rowNumber, `Error: ${profileErr.message}`, logCallback);
                // Continue to next profile instead of stopping
            }
        }

        logCallback('\n🎉 --- Automation Complete ---');
        logCallback(`📊 Total messages sent successfully: ${messagesSentThisSession}`);
        logCallback(`📊 Total profiles processed: ${profilesToProcess.length}`);
        
        if (failedProfiles.length > 0) {
            logCallback(`❌ Failed profiles (${failedProfiles.length}):`);
            failedProfiles.forEach(p => logCallback(`   - ${p.profileUrl}`));
        }
        if (skippedProfiles.length > 0) {
            logCallback(`⚠️ Skipped profiles (${skippedProfiles.length}):`);
            skippedProfiles.forEach(p => logCallback(`   - ${p.profileUrl}`));
        }
    } catch (err) {
        logCallback(`❌ An unexpected error occurred during automation: ${err.message}`);
        console.error('Automation error:', err);
    } finally {
        if (bot) {
            logCallback('🔒 Closing browser session...');
            await bot.close();
        }
    }
    logCallback('--- Automation script finished. ---');
}

export { runAutomation };