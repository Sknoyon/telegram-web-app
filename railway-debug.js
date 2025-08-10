#!/usr/bin/env node

/**
 * Railway Debug Script
 * This script helps diagnose Railway deployment issues
 */

console.log('🔍 Railway Debug Information');
console.log('=' .repeat(50));

// Environment Variables
console.log('\n📋 Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT: ${process.env.PORT || 'not set'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'set' : 'not set'}`);
console.log(`BASE_URL: ${process.env.BASE_URL || 'not set'}`);

// Railway-specific variables
console.log('\n🚂 Railway Variables:');
console.log(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'not set'}`);
console.log(`RAILWAY_SERVICE_NAME: ${process.env.RAILWAY_SERVICE_NAME || 'not set'}`);
console.log(`RAILWAY_PUBLIC_DOMAIN: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'not set'}`);
console.log(`RAILWAY_PRIVATE_DOMAIN: ${process.env.RAILWAY_PRIVATE_DOMAIN || 'not set'}`);

// Port Configuration
console.log('\n🔌 Port Configuration:');
const configuredPort = process.env.PORT || 8080;
console.log(`Configured Port: ${configuredPort}`);
console.log(`Port Type: ${typeof configuredPort}`);

// Health Check Test
console.log('\n🏥 Health Check Test:');
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: configuredPort,
        environment: process.env.NODE_ENV || 'development'
    });
});

const server = app.listen(configuredPort, '0.0.0.0', () => {
    console.log(`✅ Test server started on 0.0.0.0:${configuredPort}`);
    console.log(`🔗 Health check URL: http://0.0.0.0:${configuredPort}/health`);
    
    // Test the health endpoint
    const http = require('http');
    const options = {
        hostname: 'localhost',
        port: configuredPort,
        path: '/health',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        console.log(`\n📊 Health Check Response:`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`Response Body:`, data);
            
            console.log('\n🎯 Next Steps:');
            console.log('1. Ensure PORT environment variable is set to 8080 in Railway service settings');
            console.log('2. Verify BASE_URL is set to your Railway domain');
            console.log('3. Check that all required environment variables are configured');
            console.log('4. Redeploy after setting the PORT variable');
            
            server.close();
            process.exit(0);
        });
    });
    
    req.on('error', (e) => {
        console.error(`❌ Health check failed: ${e.message}`);
        server.close();
        process.exit(1);
    });
    
    req.end();
});

server.on('error', (e) => {
    console.error(`❌ Server failed to start: ${e.message}`);
    process.exit(1);
});