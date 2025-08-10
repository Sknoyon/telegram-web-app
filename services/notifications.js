/**
 * Advanced Notification Service
 * Multi-channel notifications with templates, queuing, and intelligent delivery
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class AdvancedNotificationService extends EventEmitter {
    constructor() {
        super();
        this.channels = new Map();
        this.templates = new Map();
        this.queue = [];
        this.deliveryHistory = [];
        this.userPreferences = new Map();
        this.isProcessing = false;
        this.retryAttempts = new Map();
        
        this.config = {
            maxRetries: 3,
            retryDelay: 5000,
            batchSize: 10,
            processingInterval: 1000,
            historyLimit: 10000
        };
        
        this.initializeService();
    }

    initializeService() {
        // Set up default templates
        this.setupDefaultTemplates();
        
        // Start queue processing
        this.startQueueProcessing();
        
        console.log('📢 Advanced Notification Service initialized');
    }

    // Channel Management
    registerChannel(name, channel) {
        if (!channel.send || typeof channel.send !== 'function') {
            throw new Error('Channel must have a send method');
        }
        
        this.channels.set(name, {
            ...channel,
            enabled: true,
            stats: {
                sent: 0,
                failed: 0,
                lastUsed: null
            }
        });
        
        console.log(`📡 Notification channel registered: ${name}`);
    }

    enableChannel(name) {
        const channel = this.channels.get(name);
        if (channel) {
            channel.enabled = true;
            console.log(`✅ Channel enabled: ${name}`);
        }
    }

    disableChannel(name) {
        const channel = this.channels.get(name);
        if (channel) {
            channel.enabled = false;
            console.log(`❌ Channel disabled: ${name}`);
        }
    }

    // Template Management
    setupDefaultTemplates() {
        // Order confirmation template
        this.addTemplate('order_confirmation', {
            subject: '🎉 Order Confirmed - #{orderNumber}',
            text: `Hi #{customerName},\n\nYour order #{orderNumber} has been confirmed!\n\nTotal: #{total}\nPayment Method: #{paymentMethod}\n\nThank you for your purchase!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">🎉 Order Confirmed!</h2>
                    <p>Hi <strong>#{customerName}</strong>,</p>
                    <p>Your order <strong>#{orderNumber}</strong> has been confirmed!</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Total:</strong> #{total}</p>
                        <p><strong>Payment Method:</strong> #{paymentMethod}</p>
                    </div>
                    <p>Thank you for your purchase!</p>
                </div>
            `,
            channels: ['email', 'telegram'],
            priority: 'high'
        });
        
        // Payment received template
        this.addTemplate('payment_received', {
            subject: '💰 Payment Received - #{orderNumber}',
            text: `Payment of #{amount} has been received for order #{orderNumber}.\n\nTransaction ID: #{transactionId}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196F3;">💰 Payment Received</h2>
                    <p>Payment of <strong>#{amount}</strong> has been received for order <strong>#{orderNumber}</strong>.</p>
                    <p><strong>Transaction ID:</strong> #{transactionId}</p>
                </div>
            `,
            channels: ['email', 'telegram'],
            priority: 'high'
        });
        
        // Welcome message template
        this.addTemplate('welcome', {
            subject: '👋 Welcome to Crypto Store!',
            text: `Welcome #{username}!\n\nThank you for joining our crypto store. Start exploring our products and enjoy secure payments with cryptocurrency.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF9800;">👋 Welcome to Crypto Store!</h2>
                    <p>Welcome <strong>#{username}</strong>!</p>
                    <p>Thank you for joining our crypto store. Start exploring our products and enjoy secure payments with cryptocurrency.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#{storeUrl}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Start Shopping</a>
                    </div>
                </div>
            `,
            channels: ['email', 'telegram'],
            priority: 'medium'
        });
        
        // System alert template
        this.addTemplate('system_alert', {
            subject: '🚨 System Alert: #{alertType}',
            text: `ALERT: #{message}\n\nSeverity: #{severity}\nTime: #{timestamp}\n\nDetails: #{details}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f44336;">🚨 System Alert</h2>
                    <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0;">
                        <h3>#{alertType}</h3>
                        <p><strong>#{message}</strong></p>
                        <p><strong>Severity:</strong> #{severity}</p>
                        <p><strong>Time:</strong> #{timestamp}</p>
                    </div>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        <h4>Details:</h4>
                        <pre>#{details}</pre>
                    </div>
                </div>
            `,
            channels: ['email', 'slack'],
            priority: 'critical'
        });
        
        // Order status update template
        this.addTemplate('order_status', {
            subject: '📦 Order Update - #{orderNumber}',
            text: `Hi #{customerName},\n\nYour order #{orderNumber} status has been updated to: #{status}\n\n#{statusMessage}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2196F3;">📦 Order Update</h2>
                    <p>Hi <strong>#{customerName}</strong>,</p>
                    <p>Your order <strong>#{orderNumber}</strong> status has been updated to:</p>
                    <div style="background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
                        <h3 style="margin: 0; color: #1976D2;">#{status}</h3>
                        <p style="margin: 10px 0 0 0;">#{statusMessage}</p>
                    </div>
                </div>
            `,
            channels: ['email', 'telegram'],
            priority: 'medium'
        });
    }

    addTemplate(name, template) {
        this.templates.set(name, {
            ...template,
            createdAt: Date.now(),
            usageCount: 0
        });
    }

    // Notification Sending
    async send(notification) {
        const notificationId = this.generateId();
        
        const enrichedNotification = {
            id: notificationId,
            ...notification,
            createdAt: Date.now(),
            status: 'queued',
            attempts: 0
        };
        
        // Apply template if specified
        if (notification.template) {
            this.applyTemplate(enrichedNotification);
        }
        
        // Apply user preferences
        this.applyUserPreferences(enrichedNotification);
        
        // Add to queue
        this.queue.push(enrichedNotification);
        
        this.emit('notificationQueued', { id: notificationId, notification: enrichedNotification });
        
        return notificationId;
    }

    async sendImmediate(notification) {
        const notificationId = this.generateId();
        
        const enrichedNotification = {
            id: notificationId,
            ...notification,
            createdAt: Date.now(),
            status: 'processing',
            attempts: 0
        };
        
        if (notification.template) {
            this.applyTemplate(enrichedNotification);
        }
        
        this.applyUserPreferences(enrichedNotification);
        
        return await this.processNotification(enrichedNotification);
    }

    applyTemplate(notification) {
        const template = this.templates.get(notification.template);
        if (!template) {
            console.warn(`⚠️ Template not found: ${notification.template}`);
            return;
        }
        
        // Merge template with notification
        notification.subject = notification.subject || template.subject;
        notification.text = notification.text || template.text;
        notification.html = notification.html || template.html;
        notification.channels = notification.channels || template.channels;
        notification.priority = notification.priority || template.priority;
        
        // Replace placeholders
        if (notification.data) {
            notification.subject = this.replacePlaceholders(notification.subject, notification.data);
            notification.text = this.replacePlaceholders(notification.text, notification.data);
            notification.html = this.replacePlaceholders(notification.html, notification.data);
        }
        
        // Update template usage
        template.usageCount++;
    }

    replacePlaceholders(content, data) {
        if (!content || !data) return content;
        
        return content.replace(/#{([^}]+)}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    applyUserPreferences(notification) {
        if (!notification.userId) return;
        
        const preferences = this.userPreferences.get(notification.userId);
        if (!preferences) return;
        
        // Filter channels based on user preferences
        if (preferences.disabledChannels) {
            notification.channels = notification.channels?.filter(
                channel => !preferences.disabledChannels.includes(channel)
            );
        }
        
        // Apply quiet hours
        if (preferences.quietHours && this.isQuietHours(preferences.quietHours)) {
            notification.delayUntil = this.getNextActiveTime(preferences.quietHours);
        }
        
        // Apply frequency limits
        if (preferences.maxPerDay && this.exceedsFrequencyLimit(notification.userId, preferences.maxPerDay)) {
            notification.status = 'skipped';
            notification.skipReason = 'frequency_limit_exceeded';
        }
    }

    // Queue Processing
    startQueueProcessing() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.processQueue();
    }

    async processQueue() {
        while (this.isProcessing) {
            try {
                const batch = this.queue.splice(0, this.config.batchSize);
                
                if (batch.length > 0) {
                    await Promise.all(batch.map(notification => this.processNotification(notification)));
                }
                
                await this.sleep(this.config.processingInterval);
            } catch (error) {
                console.error('❌ Error processing notification queue:', error);
                await this.sleep(this.config.processingInterval * 2);
            }
        }
    }

    async processNotification(notification) {
        try {
            // Check if notification should be delayed
            if (notification.delayUntil && Date.now() < notification.delayUntil) {
                this.queue.push(notification);
                return;
            }
            
            // Skip if marked as skipped
            if (notification.status === 'skipped') {
                this.recordDelivery(notification, 'skipped', notification.skipReason);
                return;
            }
            
            notification.status = 'processing';
            notification.attempts++;
            
            const results = [];
            const channels = notification.channels || ['default'];
            
            for (const channelName of channels) {
                const channel = this.channels.get(channelName);
                
                if (!channel) {
                    console.warn(`⚠️ Channel not found: ${channelName}`);
                    continue;
                }
                
                if (!channel.enabled) {
                    console.log(`⏭️ Channel disabled, skipping: ${channelName}`);
                    continue;
                }
                
                try {
                    const result = await channel.send(notification);
                    results.push({ channel: channelName, status: 'success', result });
                    
                    channel.stats.sent++;
                    channel.stats.lastUsed = Date.now();
                    
                } catch (error) {
                    console.error(`❌ Failed to send via ${channelName}:`, error);
                    results.push({ channel: channelName, status: 'failed', error: error.message });
                    
                    channel.stats.failed++;
                }
            }
            
            const hasSuccess = results.some(r => r.status === 'success');
            const allFailed = results.every(r => r.status === 'failed');
            
            if (hasSuccess) {
                notification.status = 'delivered';
                this.recordDelivery(notification, 'delivered', null, results);
                this.emit('notificationDelivered', { notification, results });
            } else if (allFailed && notification.attempts < this.config.maxRetries) {
                // Retry logic
                notification.status = 'retry';
                setTimeout(() => {
                    this.queue.push(notification);
                }, this.config.retryDelay * notification.attempts);
                
                this.emit('notificationRetry', { notification, attempt: notification.attempts });
            } else {
                notification.status = 'failed';
                this.recordDelivery(notification, 'failed', 'max_retries_exceeded', results);
                this.emit('notificationFailed', { notification, results });
            }
            
        } catch (error) {
            console.error('❌ Error processing notification:', error);
            notification.status = 'error';
            this.recordDelivery(notification, 'error', error.message);
        }
    }

    recordDelivery(notification, status, error = null, results = []) {
        const record = {
            id: notification.id,
            userId: notification.userId,
            template: notification.template,
            channels: notification.channels,
            status,
            error,
            results,
            attempts: notification.attempts,
            createdAt: notification.createdAt,
            deliveredAt: Date.now()
        };
        
        this.deliveryHistory.push(record);
        
        // Cleanup old history
        if (this.deliveryHistory.length > this.config.historyLimit) {
            this.deliveryHistory = this.deliveryHistory.slice(-this.config.historyLimit);
        }
    }

    // User Preferences
    setUserPreferences(userId, preferences) {
        this.userPreferences.set(userId, {
            ...preferences,
            updatedAt: Date.now()
        });
    }

    getUserPreferences(userId) {
        return this.userPreferences.get(userId);
    }

    // Utility Methods
    isQuietHours(quietHours) {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (quietHours.start <= quietHours.end) {
            return currentHour >= quietHours.start && currentHour < quietHours.end;
        } else {
            return currentHour >= quietHours.start || currentHour < quietHours.end;
        }
    }

    getNextActiveTime(quietHours) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (quietHours.start <= quietHours.end) {
            const endTime = new Date(now);
            endTime.setHours(quietHours.end, 0, 0, 0);
            return endTime.getTime();
        } else {
            const endTime = new Date(tomorrow);
            endTime.setHours(quietHours.end, 0, 0, 0);
            return endTime.getTime();
        }
    }

    exceedsFrequencyLimit(userId, maxPerDay) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStart = today.getTime();
        
        const todayNotifications = this.deliveryHistory.filter(
            record => record.userId === userId && 
                     record.deliveredAt >= todayStart && 
                     record.status === 'delivered'
        );
        
        return todayNotifications.length >= maxPerDay;
    }

    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Analytics and Reporting
    getDeliveryStats(timeRange = '24h') {
        const now = Date.now();
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const cutoff = now - (ranges[timeRange] || ranges['24h']);
        const recentDeliveries = this.deliveryHistory.filter(record => record.deliveredAt > cutoff);
        
        const stats = {
            total: recentDeliveries.length,
            delivered: recentDeliveries.filter(r => r.status === 'delivered').length,
            failed: recentDeliveries.filter(r => r.status === 'failed').length,
            skipped: recentDeliveries.filter(r => r.status === 'skipped').length,
            byChannel: {},
            byTemplate: {},
            deliveryRate: 0
        };
        
        // Calculate delivery rate
        if (stats.total > 0) {
            stats.deliveryRate = ((stats.delivered / stats.total) * 100).toFixed(2);
        }
        
        // Group by channel
        recentDeliveries.forEach(record => {
            record.channels?.forEach(channel => {
                if (!stats.byChannel[channel]) {
                    stats.byChannel[channel] = { total: 0, delivered: 0, failed: 0 };
                }
                stats.byChannel[channel].total++;
                if (record.status === 'delivered') stats.byChannel[channel].delivered++;
                if (record.status === 'failed') stats.byChannel[channel].failed++;
            });
        });
        
        // Group by template
        recentDeliveries.forEach(record => {
            if (record.template) {
                if (!stats.byTemplate[record.template]) {
                    stats.byTemplate[record.template] = { total: 0, delivered: 0, failed: 0 };
                }
                stats.byTemplate[record.template].total++;
                if (record.status === 'delivered') stats.byTemplate[record.template].delivered++;
                if (record.status === 'failed') stats.byTemplate[record.template].failed++;
            }
        });
        
        return stats;
    }

    getChannelStats() {
        const stats = {};
        for (const [name, channel] of this.channels.entries()) {
            stats[name] = {
                enabled: channel.enabled,
                ...channel.stats
            };
        }
        return stats;
    }

    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            pendingNotifications: this.queue.filter(n => n.status === 'queued').length,
            retryingNotifications: this.queue.filter(n => n.status === 'retry').length
        };
    }

    // Bulk Operations
    async sendBulk(notifications) {
        const results = [];
        
        for (const notification of notifications) {
            try {
                const id = await this.send(notification);
                results.push({ success: true, id });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    // Cleanup and Shutdown
    stopQueueProcessing() {
        this.isProcessing = false;
    }

    shutdown() {
        this.stopQueueProcessing();
        console.log('📢 Notification service shutdown completed');
    }
}

module.exports = AdvancedNotificationService;