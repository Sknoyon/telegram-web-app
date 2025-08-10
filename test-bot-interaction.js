const { Telegraf } = require('telegraf');
require('dotenv').config();

async function testBotInteraction() {
    console.log('🔍 Testing Telegram Bot Interaction...');
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
        return;
    }
    
    try {
        const bot = new Telegraf(token);
        
        // Test sending a message to the bot (this would normally require a chat ID)
        console.log('📡 Testing bot commands...');
        
        // Get bot info to confirm it's working
        const botInfo = await bot.telegram.getMe();
        console.log('✅ Bot is accessible:');
        console.log(`   - Username: @${botInfo.username}`);
        console.log(`   - Name: ${botInfo.first_name}`);
        
        // Test webhook info
        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log('\n🔗 Webhook status:');
        console.log(`   - URL: ${webhookInfo.url || 'Not set (using polling)'}`);
        console.log(`   - Pending updates: ${webhookInfo.pending_update_count}`);
        
        console.log('\n✅ Bot interaction test completed!');
        console.log('💡 To test the "User not found" issue:');
        console.log('   1. Open Telegram and search for your bot');
        console.log('   2. Send /start command');
        console.log('   3. The bot should now respond with mock user data');
        
    } catch (error) {
        console.error('❌ Bot interaction test failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Description: ${error.response.description}`);
        }
    }
}

testBotInteraction().catch(console.error);