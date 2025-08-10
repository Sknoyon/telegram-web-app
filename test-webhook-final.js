const axios = require('axios');

const BASE_URL = 'https://ewhoreweb.up.railway.app';

async function testWebhookEndpoint() {
    console.log('🔍 Final Webhook Test - Testing actual webhook endpoint...');
    
    try {
        // Test with a simple Telegram-like payload
        const testPayload = {
            update_id: 123456789,
            message: {
                message_id: 1,
                from: {
                    id: 123456789,
                    is_bot: false,
                    first_name: "Test",
                    username: "testuser"
                },
                chat: {
                    id: 123456789,
                    first_name: "Test",
                    username: "testuser",
                    type: "private"
                },
                date: Math.floor(Date.now() / 1000),
                text: "/start"
            }
        };

        console.log('📡 Testing POST /webhook with Telegram-like payload...');
        
        const response = await axios.post(`${BASE_URL}/webhook`, testPayload, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TelegramBot (like TwitterBot)'
            },
            timeout: 10000
        });
        
        console.log('✅ Webhook Response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });
        
        if (response.status === 200) {
            console.log('🎉 SUCCESS: Webhook endpoint is working!');
            console.log('🤖 Your Telegram bot should now be responding to messages.');
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Webhook Error Response:', {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

async function testStoreEndpoint() {
    console.log('\n🏪 Testing Store Endpoint...');
    
    try {
        const response = await axios.get(`${BASE_URL}/store`, {
            timeout: 10000
        });
        
        console.log('✅ Store Response:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers['content-type']
        });
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Store Error:', {
                status: error.response.status,
                statusText: error.response.statusText
            });
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

async function runFinalTest() {
    console.log('🚀 Running Final Deployment Test...');
    console.log('=' .repeat(50));
    
    await testWebhookEndpoint();
    await testStoreEndpoint();
    
    console.log('\n📊 Test Summary:');
    console.log('- If webhook returns 200: Bot is working ✅');
    console.log('- If store returns 200: Web app is working ✅');
    console.log('- If both work: Deployment is successful! 🎉');
}

runFinalTest().catch(console.error);