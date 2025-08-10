const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bodyParser = require('body-parser');
const TelegramBot = require('./bot/telegram-bot');
const PlisioService = require('./services/plisio');
const { 
    userQueries, 
    productQueries, 
    orderQueries, 
    invoiceQueries, 
    purchasedProductQueries,
    statsQueries 
} = require('./database/db');
require('dotenv').config();

// Auto-configuration for environment detection
const autoConfig = require('./auto-config');
const config = autoConfig.getConfig();

// Display configuration on startup
autoConfig.displayConfiguration();

class SimpleServer {
    constructor() {
        this.app = express();
        this.port = config.server.port;
        this.host = config.server.host;
        this.config = config;
        this.telegramBot = new TelegramBot(this.config);
        this.plisio = new PlisioService();
    }

    setupMiddleware() {
        // Basic security and monitoring logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
        
        // Enhanced security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https:", "wss:"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? [process.env.BASE_URL, 'https://web.telegram.org', 'https://healthcheck.railway.app']
                : true,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Body parsing
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // Root route - redirect to store
        this.app.get('/', (req, res) => {
            res.redirect('/store');
        });

        // Health check endpoint - simple and fast for Railway
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: this.config.environment
            });
        });
        
        // Alternative health check paths
        this.app.get('/healthz', (req, res) => {
            res.status(200).send('OK');
        });
        
        this.app.get('/ping', (req, res) => {
            res.status(200).send('pong');
        });

        // Basic API endpoint
        this.app.get('/api/status', (req, res) => {
            res.json({
                status: 'running',
                timestamp: Date.now(),
                environment: this.config.environment
            });
        });

        // Serve frontend pages
        this.app.get('/store', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'store.html'));
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });

        // Telegram webhook
        this.app.post('/webhook', async (req, res) => {
            try {
                console.log('📨 Received Telegram webhook:', req.body);
                
                // Process the update through the bot
                await this.telegramBot.getBot().handleUpdate(req.body);
                
                res.status(200).json({ ok: true });
            } catch (error) {
                console.error('❌ Telegram webhook processing error:', error);
                res.status(500).json({ error: 'Webhook processing failed' });
            }
        });

        // Basic product routes
        this.app.get('/api/products', async (req, res) => {
            try {
                const products = await productQueries.getAll();
                res.json(products);
            } catch (error) {
                console.error('❌ Error fetching products:', error);
                res.status(500).json({ error: 'Failed to fetch products' });
            }
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
            res.status(404).json({ error: 'Route not found' });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('❌ Server error:', error);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        });
    }

    async start() {
        try {
            console.log('🚀 Starting Simple Server...');
            
            // Setup middleware
            this.setupMiddleware();
            console.log('✅ Middleware configured');
            
            // Setup routes
            this.setupRoutes();
            console.log('✅ Routes configured');
            
            // Try to start Telegram bot
            try {
                await this.telegramBot.start();
                console.log('✅ Telegram bot started successfully');
            } catch (botError) {
                console.warn('⚠️ Telegram bot failed to start:', botError.message);
                console.log('📝 Server will continue running');
            }
            
            // Ensure proper port configuration for Railway
            const finalPort = process.env.PORT || this.port;
            const finalHost = this.config.environment === 'railway' ? '0.0.0.0' : this.host;
            
            console.log(`🔧 Starting server on ${finalHost}:${finalPort}`);
            console.log(`📍 Environment: ${this.config.environment}`);
            console.log(`🌐 PORT env var: ${process.env.PORT || 'not set'}`);
            
            // Start Express server
            this.app.listen(finalPort, finalHost, () => {
                console.log(`\n🚀 Simple Server started successfully!`);
                console.log(`📍 Environment: ${this.config.environment}`);
                console.log(`🌐 Server: http://${finalHost}:${finalPort}`);
                
                if (process.env.BASE_URL) {
                    console.log(`🛍️ Store URL: ${process.env.BASE_URL}/store`);
                    console.log(`⚙️ Admin URL: ${process.env.BASE_URL}/admin`);
                    console.log(`🔗 Health Check: ${process.env.BASE_URL}/health`);
                    console.log(`📡 Webhook: ${process.env.BASE_URL}/webhook`);
                } else {
                    console.log(`🛍️ Store URL: http://${finalHost}:${finalPort}/store`);
                    console.log(`⚙️ Admin URL: http://${finalHost}:${finalPort}/admin`);
                    console.log(`🔗 Health Check: http://${finalHost}:${finalPort}/health`);
                    console.log(`📡 Webhook: http://${finalHost}:${finalPort}/webhook`);
                }
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new SimpleServer();
    server.start();
}

module.exports = SimpleServer;