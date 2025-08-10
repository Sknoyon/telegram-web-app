const { Telegraf } = require('telegraf');
require('dotenv').config();

async function testBotToken() {
    console.log('🔍 Testing Telegram Bot Token...');
    
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
        return;
    }
    
    console.log(`🔑 Token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);
    
    try {
        const bot = new Telegraf(token);
        
        // Test bot info
        console.log('📡 Fetching bot info...');
        const botInfo = await bot.telegram.getMe();
        console.log('✅ Bot info retrieved successfully:');
        console.log(`   - Username: @${botInfo.username}`);
        console.log(`   - Name: ${botInfo.first_name}`);
        console.log(`   - ID: ${botInfo.id}`);
        console.log(`   - Can join groups: ${botInfo.can_join_groups}`);
        console.log(`   - Can read messages: ${botInfo.can_read_all_group_messages}`);
        
        // Test webhook info
        console.log('\n🔗 Checking webhook info...');
        const webhookInfo = await bot.telegram.getWebhookInfo();
        console.log(`   - Webhook URL: ${webhookInfo.url || 'Not set'}`);
        console.log(`   - Pending updates: ${webhookInfo.pending_update_count}`);
        
        console.log('\n✅ Bot token is valid and working!');
        
    } catch (error) {
        console.error('❌ Bot token test failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Description: ${error.response.description}`);
        }
        
        if (error.message.includes('401')) {
            console.error('\n💡 This usually means:');
            console.error('   - The bot token is invalid');
            console.error('   - The bot was deleted by @BotFather');
            console.error('   - The token was regenerated');
        }
    }
}

testBotToken().catch(console.error);