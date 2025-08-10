const axios = require('axios');

async function testWebhookDirect() {
    console.log('🔍 Testing webhook endpoint directly...');
    
    const webhookUrl = 'https://ewhoreweb.up.railway.app/webhook';
    
    try {
        // Test with a simple POST request
        console.log('📡 Sending test POST to webhook...');
        const response = await axios.post(webhookUrl, {
            test: true,
            message: 'Direct webhook test'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Webhook endpoint responded!');
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, response.data);
        
        // Now test the current webhook status
        console.log('\n🔗 Checking current webhook status...');
        const token = process.env.TELEGRAM_BOT_TOKEN || '8463521309:AAG7QJZotBBpkTD0YoSztC8rSM1_pI29tqM';
        const webhookInfoUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
        const webhookInfo = await axios.get(webhookInfoUrl);
        
        if (webhookInfo.data.ok) {
            const info = webhookInfo.data.result;
            console.log(`📡 Webhook URL: ${info.url}`);
            console.log(`📊 Pending updates: ${info.pending_update_count}`);
            console.log(`❌ Last error: ${info.last_error_message || 'None'}`);
            console.log(`🕐 Last error date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'None'}`);
            
            if (info.last_error_message) {
                console.log('\n⚠️ Webhook has errors but endpoint is now accessible!');
                console.log('💡 The bot should start working now. Try sending /start to @EwhoreAssistantbot');
            } else {
                console.log('\n✅ Webhook is working perfectly!');
                console.log('🎉 Bot should be fully functional now!');
            }
        }
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ Webhook endpoint error: ${error.response.status} - ${error.response.statusText}`);
            if (error.response.status === 404) {
                console.log('🔄 The webhook endpoint is still not deployed. Railway may still be building...');
            }
        } else if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection refused - server may be down');
        } else {
            console.log(`❌ Network error: ${error.message}`);
        }
        
        console.log('\n💡 Troubleshooting steps:');
        console.log('1. Check Railway dashboard for deployment status');
        console.log('2. Verify all environment variables are set');
        console.log('3. Check Railway build logs for errors');
        console.log('4. Wait a few more minutes for deployment to complete');
    }
}

testWebhookDirect().catch(console.error);