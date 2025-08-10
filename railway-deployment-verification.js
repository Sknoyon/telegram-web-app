const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://ewhoreweb.up.railway.app';

async function checkDeploymentStatus() {
    console.log('🔍 RAILWAY DEPLOYMENT VERIFICATION');
    console.log('=' .repeat(60));
    
    // Check local files
    console.log('\n📁 LOCAL FILE VERIFICATION:');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`✅ package.json main: ${packageJson.main}`);
    console.log(`✅ package.json start script: ${packageJson.scripts.start}`);
    
    const serverSimpleExists = fs.existsSync('server-simple.js');
    console.log(`${serverSimpleExists ? '✅' : '❌'} server-simple.js exists: ${serverSimpleExists}`);
    
    const serverExists = fs.existsSync('server.js');
    console.log(`${serverExists ? '✅' : '❌'} server.js exists: ${serverExists}`);
    
    // Check git status
    console.log('\n📊 GIT STATUS:');
    try {
        const { execSync } = require('child_process');
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        if (gitStatus.trim()) {
            console.log('⚠️  Uncommitted changes:');
            console.log(gitStatus);
        } else {
            console.log('✅ All changes committed');
        }
        
        const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
        console.log(`📝 Last commit: ${lastCommit}`);
    } catch (error) {
        console.log('❌ Git check failed:', error.message);
    }
    
    // Test endpoints with detailed analysis
    console.log('\n🌐 ENDPOINT TESTING:');
    
    const endpoints = [
        { method: 'GET', path: '/', name: 'Root' },
        { method: 'GET', path: '/health', name: 'Health Check' },
        { method: 'GET', path: '/ping', name: 'Ping' },
        { method: 'GET', path: '/store', name: 'Store Page' },
        { method: 'POST', path: '/webhook', name: 'Webhook', data: { test: true } },
        { method: 'GET', path: '/api/status', name: 'API Status' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const config = {
                method: endpoint.method,
                url: `${BASE_URL}${endpoint.path}`,
                timeout: 10000,
                headers: {
                    'User-Agent': 'Railway-Deployment-Verification/1.0'
                }
            };
            
            if (endpoint.data) {
                config.data = endpoint.data;
                config.headers['Content-Type'] = 'application/json';
            }
            
            const response = await axios(config);
            console.log(`✅ ${endpoint.name}: ${response.status} ${response.statusText}`);
            
            // Check for specific server indicators
            const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            if (responseText.includes('Simple Server') || responseText.includes('server-simple')) {
                console.log('   🎯 Confirmed: Running server-simple.js');
            } else if (responseText.includes('AdvancedServiceOrchestrator') || responseText.includes('orchestrator')) {
                console.log('   ⚠️  Warning: Might be running old server.js');
            }
            
        } catch (error) {
            if (error.response) {
                console.log(`❌ ${endpoint.name}: ${error.response.status} ${error.response.statusText}`);
                
                // Analyze 404 responses
                if (error.response.status === 404) {
                    const errorBody = error.response.data;
                    if (typeof errorBody === 'string' && errorBody.includes('Cannot POST') || errorBody.includes('Cannot GET')) {
                        console.log('   🔍 Express default 404 - Route not defined');
                    } else {
                        console.log('   🔍 Custom 404 - Server running but route missing');
                    }
                }
            } else {
                console.log(`❌ ${endpoint.name}: Network error - ${error.message}`);
            }
        }
    }
    
    // Check Railway-specific headers
    console.log('\n🚂 RAILWAY INFRASTRUCTURE CHECK:');
    try {
        const response = await axios.get(`${BASE_URL}/health`, {
            timeout: 10000
        });
        
        const railwayHeaders = Object.keys(response.headers)
            .filter(header => header.toLowerCase().includes('railway') || header.toLowerCase().includes('x-'))
            .reduce((obj, key) => {
                obj[key] = response.headers[key];
                return obj;
            }, {});
            
        if (Object.keys(railwayHeaders).length > 0) {
            console.log('✅ Railway headers detected:');
            Object.entries(railwayHeaders).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        } else {
            console.log('⚠️  No Railway-specific headers found');
        }
    } catch (error) {
        console.log('❌ Could not check Railway headers');
    }
    
    console.log('\n🎯 DEPLOYMENT ANALYSIS:');
    console.log('=' .repeat(60));
    
    // Provide analysis based on results
    console.log('\n📋 POSSIBLE ISSUES:');
    console.log('1. 🔄 Railway is still deploying the old server.js');
    console.log('2. 🐛 Railway build cache needs to be cleared');
    console.log('3. 🔧 Railway start command override in dashboard');
    console.log('4. 📦 Railway not detecting package.json changes');
    console.log('5. 🌐 CDN/proxy caching old responses');
    
    console.log('\n🚀 IMMEDIATE ACTIONS:');
    console.log('1. Check Railway dashboard deployment logs');
    console.log('2. Verify Railway is using: "node server-simple.js"');
    console.log('3. Try manual redeploy in Railway dashboard');
    console.log('4. Clear Railway build cache if available');
    console.log('5. Check Railway environment variables');
}

checkDeploymentStatus().catch(console.error);