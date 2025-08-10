#!/usr/bin/env node

/**
 * Railway Force Fix Script
 * This script aggressively forces Railway PORT configuration
 * and provides comprehensive diagnostics
 */

const express = require('express');
const app = express();

// FORCE PORT CONFIGURATION - Multiple fallbacks
const FORCED_PORT = process.env.PORT || process.env.RAILWAY_PORT || 8080;
const HOST = '0.0.0.0'; // Railway requires 0.0.0.0

console.log('🚨 RAILWAY FORCE FIX ACTIVATED');
console.log('=' .repeat(60));

// Required environment variables
const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'TELEGRAM_BOT_TOKEN',
    'BASE_URL'
];

// Environment diagnostics
console.log('\n📋 COMPLETE ENVIRONMENT AUDIT:');
console.log(`PORT: ${process.env.PORT || 'NOT SET ❌'}`);
console.log(`RAILWAY_PORT: ${process.env.RAILWAY_PORT || 'NOT SET'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT SET ❌'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET (using local file)'}`);
console.log(`TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? 'SET ✅' : 'NOT SET ❌'}`);
console.log(`BASE_URL: ${process.env.BASE_URL || 'NOT SET ❌'}`);

// Railway-specific variables
console.log('\n🚂 RAILWAY ENVIRONMENT:');
console.log(`RAILWAY_ENVIRONMENT: ${process.env.RAILWAY_ENVIRONMENT || 'NOT SET'}`);
console.log(`RAILWAY_SERVICE_NAME: ${process.env.RAILWAY_SERVICE_NAME || 'NOT SET'}`);
console.log(`RAILWAY_PUBLIC_DOMAIN: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'NOT SET'}`);
console.log(`RAILWAY_PRIVATE_DOMAIN: ${process.env.RAILWAY_PRIVATE_DOMAIN || 'NOT SET'}`);
console.log(`RAILWAY_DEPLOYMENT_ID: ${process.env.RAILWAY_DEPLOYMENT_ID || 'NOT SET'}`);

// Force configuration
console.log('\n🔧 FORCED CONFIGURATION:');
console.log(`FORCED_PORT: ${FORCED_PORT}`);
console.log(`HOST: ${HOST}`);
console.log(`PORT Type: ${typeof FORCED_PORT}`);

// Multiple health endpoints for Railway
app.get('/health', (req, res) => {
    console.log(`🏥 Health check hit from: ${req.ip} at ${new Date().toISOString()}`);
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: FORCED_PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        railway: {
            environment: process.env.RAILWAY_ENVIRONMENT,
            service: process.env.RAILWAY_SERVICE_NAME,
            deployment: process.env.RAILWAY_DEPLOYMENT_ID
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// Alternative health endpoints
app.get('/healthz', (req, res) => {
    console.log(`🏥 Healthz check hit from: ${req.ip}`);
    res.status(200).send('OK');
});

app.get('/ping', (req, res) => {
    console.log(`🏓 Ping check hit from: ${req.ip}`);
    res.status(200).send('pong');
});

app.get('/_ready', (req, res) => {
    console.log(`✅ Ready check hit from: ${req.ip}`);
    res.status(200).json({ ready: true, port: FORCED_PORT });
});

// Root endpoint
app.get('/', (req, res) => {
    console.log(`🏠 Root hit from: ${req.ip}`);
    res.status(200).json({
        message: 'Railway Force Fix Active',
        port: FORCED_PORT,
        health: '/health',
        timestamp: new Date().toISOString()
    });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path} from ${req.ip} - Headers: ${JSON.stringify(req.headers)}`);
    next();
});

// Error handling
app.use((err, req, res, next) => {
    console.error(`❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message, port: FORCED_PORT });
});

// Start server with aggressive error handling
const server = app.listen(FORCED_PORT, HOST, () => {
    console.log('\n🚀 RAILWAY FORCE FIX SERVER STARTED!');
    console.log(`📍 Listening on: ${HOST}:${FORCED_PORT}`);
    console.log(`🔗 Health URL: http://${HOST}:${FORCED_PORT}/health`);
    console.log(`🌐 Public URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not available'}`);
    
    // Test all health endpoints
    console.log('\n🧪 TESTING ALL HEALTH ENDPOINTS:');
    const http = require('http');
    
    const testEndpoints = ['/health', '/healthz', '/ping', '/_ready'];
    
    testEndpoints.forEach((endpoint, index) => {
        setTimeout(() => {
            const options = {
                hostname: 'localhost',
                port: FORCED_PORT,
                path: endpoint,
                method: 'GET'
            };
            
            const req = http.request(options, (res) => {
                console.log(`✅ ${endpoint}: Status ${res.statusCode}`);
            });
            
            req.on('error', (e) => {
                console.log(`❌ ${endpoint}: Error ${e.message}`);
            });
            
            req.end();
        }, index * 100);
    });
    
    console.log('\n🎯 RAILWAY DEPLOYMENT CHECKLIST:');
    console.log('1. ✅ Server started on 0.0.0.0');
    console.log(`2. ✅ Listening on port ${FORCED_PORT}`);
    console.log('3. ✅ Multiple health endpoints available');
    console.log('4. ✅ Comprehensive logging enabled');
    console.log('\n🚨 IF HEALTH CHECKS STILL FAIL:');
    console.log('1. Check Railway service settings for PORT=8080');
    console.log('2. Verify railway.json has PORT in environments.production.variables');
    console.log('3. Ensure healthcheckPath is set to /health');
    console.log('4. Check deployment logs for this output');
});

server.on('error', (e) => {
    console.error(`❌ CRITICAL SERVER ERROR: ${e.message}`);
    console.error(`Code: ${e.code}`);
    console.error(`Port: ${FORCED_PORT}`);
    console.error(`Host: ${HOST}`);
    
    if (e.code === 'EADDRINUSE') {
        console.error('🚨 PORT ALREADY IN USE - TRYING ALTERNATIVE PORT');
        const altPort = FORCED_PORT + 1;
        app.listen(altPort, HOST, () => {
            console.log(`🔄 FALLBACK SERVER STARTED ON PORT ${altPort}`);
        });
    }
    
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Keep process alive and log periodically
setInterval(() => {
    console.log(`💓 Server alive - Uptime: ${Math.floor(process.uptime())}s - Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}, 30000);

console.log('\n🔥 RAILWAY FORCE FIX SCRIPT LOADED - READY FOR DEPLOYMENT!');