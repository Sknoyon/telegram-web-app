const axios = require('axios');

async function emergencyDiagnosis() {
    console.log('🚨 EMERGENCY RAILWAY DIAGNOSIS');
    console.log('=' .repeat(50));
    
    const baseUrl = 'https://ewhoreweb.up.railway.app';
    
    // Test all critical endpoints
    const endpoints = [
        { path: '/', name: 'Root' },
        { path: '/health', name: 'Health Check' },
        { path: '/healthz', name: 'Health Z' },
        { path: '/ping', name: 'Ping' },
        { path: '/store', name: 'Store Page' },
        { path: '/webhook', name: 'Telegram Webhook', method: 'POST' },
        { path: '/api/status', name: 'API Status' }
    ];
    
    console.log('\n🔍 Testing all endpoints...');
    
    for (const endpoint of endpoints) {
        try {
            const method = endpoint.method || 'GET';
            const url = `${baseUrl}${endpoint.path}`;
            
            console.log(`\n📡 Testing ${endpoint.name}: ${method} ${url}`);
            
            let response;
            if (method === 'POST') {
                response = await axios.post(url, { test: true }, { timeout: 5000 });
            } else {
                response = await axios.get(url, { timeout: 5000 });
            }
            
            console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText}`);
            
        } catch (error) {
            if (error.response) {
                console.log(`❌ ${endpoint.name}: ${error.response.status} ${error.response.statusText}`);
                if (error.response.status === 404) {
                    console.log(`   🔍 404 suggests routing issue or server not running`);
                } else if (error.response.status >= 500) {
                    console.log(`   🔍 5xx suggests server error or crash`);
                }
            } else if (error.code === 'ECONNREFUSED') {
                console.log(`❌ ${endpoint.name}: Connection refused - server down`);
            } else if (error.code === 'ENOTFOUND') {
                console.log(`❌ ${endpoint.name}: DNS resolution failed`);
            } else {
                console.log(`❌ ${endpoint.name}: ${error.message}`);
            }
        }
    }
    
    console.log('\n🔍 Checking Telegram webhook status...');
    try {
        const token = '8463521309:AAG7QJZotBBpkTD0YoSztC8rSM1_pI29tqM';
        const webhookInfoUrl = `https://api.telegram.org/bot${token}/getWebhookInfo`;
        const webhookInfo = await axios.get(webhookInfoUrl);
        
        if (webhookInfo.data.ok) {
            const info = webhookInfo.data.result;
            console.log(`📡 Webhook URL: ${info.url || 'Not set'}`);
            console.log(`📊 Pending updates: ${info.pending_update_count}`);
            console.log(`❌ Last error: ${info.last_error_message || 'None'}`);
            console.log(`🕐 Last error date: ${info.last_error_date ? new Date(info.last_error_date * 1000) : 'None'}`);
        }
    } catch (error) {
        console.log(`❌ Failed to check webhook status: ${error.message}`);
    }
    
    console.log('\n🚨 DIAGNOSIS SUMMARY');
    console.log('=' .repeat(50));
    console.log('\n🔍 POSSIBLE CAUSES:');
    console.log('1. 🏗️  Railway deployment failed completely');
    console.log('2. 💥 Server crashes on startup due to missing dependencies');
    console.log('3. 🔧 Environment variables not set correctly');
    console.log('4. 🐛 Code syntax error preventing server start');
    console.log('5. 📦 Package.json or dependencies issue');
    console.log('6. 🔌 Port binding issue (not using Railway\'s PORT)');
    
    console.log('\n🚀 IMMEDIATE ACTIONS REQUIRED:');
    console.log('1. 📊 Check Railway dashboard for build/deployment logs');
    console.log('2. 🔍 Look for error messages in Railway runtime logs');
    console.log('3. ✅ Verify all environment variables are set:');
    console.log('   - NODE_ENV=production');
    console.log('   - TELEGRAM_BOT_TOKEN=8463521309:AAG7QJZotBBpkTD0YoSztC8rSM1_pI29tqM');
    console.log('   - BASE_URL=https://ewhoreweb.up.railway.app');
    console.log('   - PORT=8080');
    console.log('4. 🔄 Try manual redeploy in Railway dashboard');
    console.log('5. 📝 Check if Railway is using correct start command: "node server.js"');
    
    console.log('\n⚠️  If all endpoints return 404, the server is likely not starting at all!');
}

emergencyDiagnosis().catch(console.error);