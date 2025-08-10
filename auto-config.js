/**
 * Auto-Configuration Module
 * Automatically detects and configures environment settings
 */

const fs = require('fs');
const path = require('path');

class AutoConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
        this.displayed = false;
    }

    detectEnvironment() {
        // Check for Railway environment
        if (process.env.RAILWAY_ENVIRONMENT) {
            return 'railway';
        }
        
        // Check for other cloud platforms
        if (process.env.HEROKU_APP_NAME) {
            return 'heroku';
        }
        
        if (process.env.VERCEL) {
            return 'vercel';
        }
        
        if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
            return 'aws';
        }
        
        // Check for local development
        if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
            return 'local';
        }
        
        return 'production';
    }

    loadConfiguration() {
        const config = {
            environment: this.environment,
            port: process.env.PORT || 3000,
            nodeEnv: process.env.NODE_ENV || 'production'
        };

        // Environment-specific configurations
        switch (this.environment) {
            case 'railway':
                config.database = {
                    url: process.env.DATABASE_URL,
                    ssl: true,
                    connectionTimeout: 30000
                };
                config.server = {
                    host: '0.0.0.0',
                    port: process.env.PORT || 3000,
                    trustProxy: true
                };
                config.telegram = {
                    token: process.env.TELEGRAM_BOT_TOKEN,
                    webhookUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/webhook` : null
                };
                break;
                
            case 'local':
                // Check if DATABASE_URL is a Railway placeholder
                const dbUrl = process.env.DATABASE_URL;
                const isRailwayPlaceholder = dbUrl && (dbUrl.includes('${{') || dbUrl === '${{DATABASE_URL}}');
                
                config.database = {
                    url: isRailwayPlaceholder ? null : (dbUrl || 'postgresql://postgres:password@localhost:5432/telegram_store'),
                    ssl: false,
                    mockMode: isRailwayPlaceholder || !dbUrl
                };
                config.server = {
                    host: 'localhost',
                    port: process.env.PORT || 3000,
                    trustProxy: false
                };
                config.telegram = {
                    token: process.env.TELEGRAM_BOT_TOKEN,
                    webhookUrl: null // Use polling for local development
                };
                break;
                
            default:
                config.database = {
                    url: process.env.DATABASE_URL,
                    ssl: true
                };
                config.server = {
                    host: '0.0.0.0',
                    port: process.env.PORT || 3000,
                    trustProxy: true
                };
                config.telegram = {
                    token: process.env.TELEGRAM_BOT_TOKEN,
                    webhookUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/webhook` : null
                };
        }

        // Common configurations
        config.plisio = {
            secretKey: process.env.PLISIO_SECRET_KEY,
            webhookUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/plisio-webhook` : null
        };
        
        config.admin = {
            telegramIds: process.env.ADMIN_TELEGRAM_IDS ? 
                process.env.ADMIN_TELEGRAM_IDS.split(',').map(id => id.trim()) : []
        };
        
        config.security = {
            webhookSecret: process.env.WEBHOOK_SECRET || this.generateSecret(),
            jwtSecret: process.env.JWT_SECRET || this.generateSecret()
        };

        return config;
    }

    generateSecret(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    validateConfiguration() {
        const errors = [];
        const warnings = [];

        // Required environment variables
        if (!this.config.telegram.token) {
            errors.push('TELEGRAM_BOT_TOKEN is required');
        }

        if (!this.config.database.url && !this.config.database.mockMode) {
            errors.push('DATABASE_URL is required');
        } else if (this.config.database.mockMode) {
            warnings.push('Database is in mock mode - some features may not work properly');
        }

        if (!this.config.plisio.secretKey) {
            warnings.push('PLISIO_SECRET_KEY is not set - payment processing will not work');
        }

        if (this.config.admin.telegramIds.length === 0) {
            warnings.push('ADMIN_TELEGRAM_IDS is not set - admin features will not work');
        }

        if (this.environment === 'railway' && !process.env.BASE_URL) {
            warnings.push('BASE_URL is not set - webhooks may not work properly');
        }

        return { errors, warnings };
    }

    displayConfiguration() {
        if (this.displayed) {
            return;
        }
        
        this.displayed = true;
        
        console.log('🔧 Auto-Configuration Results:');
        console.log(`📍 Environment: ${this.environment}`);
        console.log(`🌐 Server: ${this.config.server.host}:${this.config.server.port}`);
        console.log(`🗄️ Database: ${this.config.database.mockMode ? 'Mock Mode (No DB)' : (this.config.database.url ? 'Configured' : 'Not configured')}`);
        console.log(`🤖 Telegram Bot: ${this.config.telegram.token ? 'Configured' : 'Not configured'}`);
        console.log(`💰 Plisio: ${this.config.plisio.secretKey ? 'Configured' : 'Not configured'}`);
        console.log(`👑 Admin IDs: ${this.config.admin.telegramIds.length} configured`);
        
        const validation = this.validateConfiguration();
        
        if (validation.errors.length > 0) {
            console.log('\n❌ Configuration Errors:');
            validation.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️ Configuration Warnings:');
            validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        if (validation.errors.length === 0) {
            console.log('\n✅ Configuration is valid!');
        }
        
        console.log('');
    }

    getConfig() {
        return this.config;
    }

    isValid() {
        const validation = this.validateConfiguration();
        return validation.errors.length === 0;
    }
}

// Auto-detect and configure on module load
const autoConfig = new AutoConfig();

// Only display configuration if running directly, not when required
if (require.main === module) {
    autoConfig.displayConfiguration();
}

module.exports = autoConfig;