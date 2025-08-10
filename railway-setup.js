#!/usr/bin/env node

/**
 * Railway Auto-Configuration Script
 * This script automatically sets up environment variables for Railway deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment variables configuration
const ENV_VARS = {
    TELEGRAM_BOT_TOKEN: '8463521309:AAG7QJZotBBpkTD0YoSztC8rSM1_pI29tqM',
    PLISIO_SECRET_KEY: '24N0-OAIybXVC5XqylDtM21BrWjXVLjiCKvpfVEJDU41xDIQhJSdiRXkPjSc6I8J',
    ADMIN_TELEGRAM_IDS: '6145005883',
    NODE_ENV: 'production',
    PORT: '3000',
    WEBHOOK_SECRET: 'wh_sec_9k2mN8pQ7xR4vL6zE3tY1uI5oA8cF2nB',
    JWT_SECRET: 'jwt_9x7K2mP5qR8vL3nE6tY4uI1oA9cF7bN2sG5hJ8kM1pQ4rT6wZ3xC'
};

class RailwaySetup {
    constructor() {
        this.railwayInstalled = this.checkRailwayCLI();
    }

    checkRailwayCLI() {
        try {
            execSync('railway --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    installRailwayCLI() {
        console.log('📦 Installing Railway CLI...');
        try {
            execSync('npm install -g @railway/cli', { stdio: 'inherit' });
            console.log('✅ Railway CLI installed successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to install Railway CLI:', error.message);
            return false;
        }
    }

    async setupEnvironmentVariables() {
        console.log('🔧 Setting up environment variables...');
        
        for (const [key, value] of Object.entries(ENV_VARS)) {
            try {
                console.log(`Setting ${key}...`);
                execSync(`railway variables set ${key}="${value}"`, { stdio: 'pipe' });
                console.log(`✅ ${key} set successfully`);
            } catch (error) {
                console.error(`❌ Failed to set ${key}:`, error.message);
            }
        }
    }

    async addPostgreSQL() {
        console.log('🗄️ Adding PostgreSQL database...');
        try {
            execSync('railway add postgresql', { stdio: 'inherit' });
            console.log('✅ PostgreSQL database added successfully');
            console.log('📝 DATABASE_URL will be automatically provided by Railway');
        } catch (error) {
            console.error('❌ Failed to add PostgreSQL:', error.message);
            console.log('💡 You can add PostgreSQL manually from Railway dashboard');
        }
    }

    async deployProject() {
        console.log('🚀 Deploying to Railway...');
        try {
            execSync('railway up', { stdio: 'inherit' });
            console.log('✅ Deployment completed successfully');
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
        }
    }

    async getProjectInfo() {
        try {
            const projectInfo = execSync('railway status', { encoding: 'utf8' });
            console.log('📊 Project Status:');
            console.log(projectInfo);
        } catch (error) {
            console.log('💡 Run "railway status" to check your project status');
        }
    }

    async run() {
        console.log('🚀 Railway Auto-Configuration Started\n');

        // Check if Railway CLI is installed
        if (!this.railwayInstalled) {
            console.log('⚠️ Railway CLI not found');
            const installed = this.installRailwayCLI();
            if (!installed) {
                console.log('\n📋 Manual Installation:');
                console.log('1. Install Railway CLI: npm install -g @railway/cli');
                console.log('2. Login: railway login');
                console.log('3. Run this script again');
                return;
            }
        }

        try {
            // Check if logged in
            execSync('railway whoami', { stdio: 'ignore' });
        } catch (error) {
            console.log('🔐 Please login to Railway first:');
            console.log('Run: railway login');
            return;
        }

        // Setup environment variables
        await this.setupEnvironmentVariables();
        
        // Add PostgreSQL
        await this.addPostgreSQL();
        
        // Deploy project
        await this.deployProject();
        
        // Show project info
        await this.getProjectInfo();
        
        console.log('\n🎉 Railway setup completed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Check your Railway dashboard for the deployment URL');
        console.log('2. Update BASE_URL environment variable with your actual Railway URL');
        console.log('3. Configure Plisio webhook URL in your Plisio dashboard');
        console.log('4. Test your bot by sending /start command');
    }
}

// Run the setup if this file is executed directly
if (require.main === module) {
    const setup = new RailwaySetup();
    setup.run().catch(console.error);
}

module.exports = RailwaySetup;