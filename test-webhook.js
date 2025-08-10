const axios = require('axios');
require('dotenv').config();

async function testWebhook() {
    console.log('🔍 Testing Telegram Bot Webhook Setup...');
    
    const baseUrl = process.env.BASE_URL || 'https://ewhoreweb.up.railway.app';
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
        console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
        return;
    }
    
    try {
        // Test webhook endpoint accessibility
        console.log('🌐 Testing webhook endpoint accessibility...');
        try {
            const healthResponse = await axios.get(`${baseUrl}/health`);
            console.log('✅ Server is accessible:', healthResponse.status);
        } catch (error) {
            console.error('❌ Server not accessible:', error.message);
            return;
        }
        
        // Check current webhook status
        console.log('🔗 Checking current webhook status...');
        const webhookInfoUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
        const webhookResponse = await axios.get(webhookInfoUrl);
        
        if (webhookResponse.data.ok) {
            const info = webhookResponse.data.result;
            console.log('📡 Current webhook info:');
            console.log(`   - URL: ${info.url || 'Not set'}`);
            console.log(`   - Pending updates: ${info.pending_update_count}`);
            console.log(`   - Last error: ${info.last_error_message || 'None'}`);
            console.log(`   - Last error date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'None'}`);
            
            if (info.url && info.url.includes(baseUrl)) {
                console.log('✅ Webhook is correctly set to your Railway app!');
            } else if (!info.url) {
                console.log('⚠️ No webhook set - bot is using polling mode');
            } else {
                console.log('⚠️ Webhook is set to a different URL');
            }
        }
        
        // Test bot info
        console.log('\n🤖 Testing bot accessibility...');
        const botInfoUrl = `https://api.telegram.org/bot${token}/getMe`;
        const botResponse = await axios.get(botInfoUrl);
        
        if (botResponse.data.ok) {
            const bot = botResponse.data.result;
            console.log('✅ Bot is accessible:');
            console.log(`   - Username: @${bot.username}`);
            console.log(`   - Name: ${bot.first_name}`);
        }
        
        console.log('\n💡 Next steps:');
        console.log('1. Wait for Railway deployment to complete');
        console.log('2. Check Railway logs for webhook setup messages');
        console.log('3. Send /start to your bot in Telegram');
        console.log('4. If still not working, check Railway environment variables');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
    }
}

testWebhook().catch(console.error);