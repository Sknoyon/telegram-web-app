const axios = require('axios');

async function checkDeployment() {
    console.log('🔍 Checking Railway Deployment Status...');
    
    const baseUrl = 'https://ewhoreweb.up.railway.app';
    const maxAttempts = 10;
    const delay = 5000; // 5 seconds
    
    console.log(`📡 Testing ${baseUrl}/webhook endpoint...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`\n🔄 Attempt ${attempt}/${maxAttempts}`);
            
            // Test health endpoint first
            const healthResponse = await axios.get(`${baseUrl}/health`);
            console.log(`✅ Health check: ${healthResponse.status}`);
            
            // Test webhook endpoint
            try {
                const webhookResponse = await axios.post(`${baseUrl}/webhook`, {
                    test: true
                });
                console.log(`✅ Webhook endpoint is live! Status: ${webhookResponse.status}`);
                console.log('🎉 Railway deployment is complete!');
                
                // Test webhook status
                console.log('\n🔗 Testing webhook status...');
                const token = process.env.TELEGRAM_BOT_TOKEN || '8463521309:AAG7QJZotBBpkTD0YoSztC8rSM1_pI29tqM';
                const webhookInfoUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
                const webhookInfo = await axios.get(webhookInfoUrl);
                
                if (webhookInfo.data.ok) {
                    const info = webhookInfo.data.result;
                    console.log(`📡 Webhook URL: ${info.url}`);
                    console.log(`📊 Pending updates: ${info.pending_update_count}`);
                    console.log(`❌ Last error: ${info.last_error_message || 'None'}`);
                    
                    if (info.last_error_message) {
                        console.log('⚠️ There are webhook errors - but endpoint is accessible');
                    } else {
                        console.log('✅ Webhook is working perfectly!');
                    }
                }
                
                return;
            } catch (webhookError) {
                if (webhookError.response?.status === 404) {
                    console.log('❌ Webhook endpoint not found (404) - deployment still in progress');
                } else {
                    console.log(`⚠️ Webhook error: ${webhookError.message}`);
                }
            }
            
            if (attempt < maxAttempts) {
                console.log(`⏳ Waiting ${delay/1000} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
        } catch (error) {
            console.log(`❌ Health check failed: ${error.message}`);
            if (attempt < maxAttempts) {
                console.log(`⏳ Waiting ${delay/1000} seconds before next attempt...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.log('\n⚠️ Deployment check completed - webhook endpoint may still be deploying');
    console.log('💡 Manual steps:');
    console.log('1. Check Railway dashboard for deployment status');
    console.log('2. Look for build/deployment logs');
    console.log('3. Ensure all environment variables are set');
    console.log('4. Try sending /start to @EwhoreAssistantbot in Telegram');
}

checkDeployment().catch(console.error);