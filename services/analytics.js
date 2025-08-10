/**
 * Advanced Analytics Service
 * Real-time analytics, user behavior tracking, and business intelligence
 */

const EventEmitter = require('events');

class AdvancedAnalytics extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            realTime: {
                activeUsers: new Set(),
                currentSessions: 0,
                liveOrders: 0,
                revenue: {
                    today: 0,
                    thisHour: 0,
                    thisMinute: 0
                }
            },
            userBehavior: {
                pageViews: new Map(),
                clickHeatmap: new Map(),
                conversionFunnel: {
                    visitors: 0,
                    productViews: 0,
                    cartAdds: 0,
                    checkouts: 0,
                    purchases: 0
                }
            },
            performance: {
                responseTime: [],
                errorRate: 0,
                uptime: Date.now(),
                memoryUsage: []
            },
            business: {
                topProducts: new Map(),
                customerLifetimeValue: new Map(),
                churnRate: 0,
                averageOrderValue: 0
            }
        };
        
        this.startRealTimeTracking();
    }

    // Real-time user tracking
    trackUserSession(userId, action, metadata = {}) {
        const timestamp = Date.now();
        const sessionData = {
            userId,
            action,
            timestamp,
            metadata
        };

        // Add to active users
        this.metrics.realTime.activeUsers.add(userId);
        
        // Track user behavior
        this.updateUserBehavior(action, metadata);
        
        // Emit real-time event
        this.emit('userAction', sessionData);
        
        // Auto-remove inactive users after 30 minutes
        setTimeout(() => {
            this.metrics.realTime.activeUsers.delete(userId);
        }, 30 * 60 * 1000);
    }

    // Advanced conversion funnel tracking
    updateUserBehavior(action, metadata) {
        const funnel = this.metrics.userBehavior.conversionFunnel;
        
        switch (action) {
            case 'visit':
                funnel.visitors++;
                break;
            case 'product_view':
                funnel.productViews++;
                this.trackProductPopularity(metadata.productId);
                break;
            case 'add_to_cart':
                funnel.cartAdds++;
                break;
            case 'checkout_start':
                funnel.checkouts++;
                break;
            case 'purchase_complete':
                funnel.purchases++;
                this.trackRevenue(metadata.amount);
                break;
        }
        
        // Track page views
        const page = metadata.page || 'unknown';
        this.metrics.userBehavior.pageViews.set(
            page, 
            (this.metrics.userBehavior.pageViews.get(page) || 0) + 1
        );
    }

    // Revenue tracking with time-based buckets
    trackRevenue(amount) {
        const now = new Date();
        const revenue = this.metrics.realTime.revenue;
        
        revenue.today += amount;
        revenue.thisHour += amount;
        revenue.thisMinute += amount;
        
        // Reset hourly revenue at the start of each hour
        setTimeout(() => {
            revenue.thisHour = 0;
        }, (60 - now.getMinutes()) * 60 * 1000);
        
        // Reset minute revenue every minute
        setTimeout(() => {
            revenue.thisMinute = 0;
        }, (60 - now.getSeconds()) * 1000);
    }

    // Product popularity tracking
    trackProductPopularity(productId) {
        const current = this.metrics.business.topProducts.get(productId) || 0;
        this.metrics.business.topProducts.set(productId, current + 1);
    }

    // Performance monitoring
    trackPerformance(responseTime, hasError = false) {
        this.metrics.performance.responseTime.push({
            time: responseTime,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 entries
        if (this.metrics.performance.responseTime.length > 1000) {
            this.metrics.performance.responseTime.shift();
        }
        
        if (hasError) {
            this.metrics.performance.errorRate++;
        }
    }

    // Advanced analytics calculations
    getAdvancedMetrics() {
        const funnel = this.metrics.userBehavior.conversionFunnel;
        const performance = this.metrics.performance;
        
        return {
            realTime: {
                activeUsers: this.metrics.realTime.activeUsers.size,
                revenue: this.metrics.realTime.revenue,
                conversionRate: funnel.visitors > 0 ? (funnel.purchases / funnel.visitors * 100).toFixed(2) : 0
            },
            performance: {
                averageResponseTime: this.calculateAverageResponseTime(),
                errorRate: performance.errorRate,
                uptime: Date.now() - performance.uptime,
                memoryUsage: process.memoryUsage()
            },
            business: {
                topProducts: Array.from(this.metrics.business.topProducts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10),
                conversionFunnel: funnel,
                pageViews: Array.from(this.metrics.userBehavior.pageViews.entries())
            },
            predictions: this.generatePredictions()
        };
    }

    // AI-powered predictions
    generatePredictions() {
        const funnel = this.metrics.userBehavior.conversionFunnel;
        const revenue = this.metrics.realTime.revenue;
        
        // Simple prediction algorithms
        const hourlyRevenue = revenue.thisHour;
        const dailyProjection = hourlyRevenue * 24;
        
        const conversionRate = funnel.visitors > 0 ? funnel.purchases / funnel.visitors : 0;
        const expectedPurchases = Math.round(funnel.visitors * conversionRate);
        
        return {
            dailyRevenueProjection: dailyProjection.toFixed(2),
            expectedPurchasesToday: expectedPurchases,
            peakHours: this.identifyPeakHours(),
            churnRisk: this.calculateChurnRisk()
        };
    }

    // Helper methods
    calculateAverageResponseTime() {
        const times = this.metrics.performance.responseTime;
        if (times.length === 0) return 0;
        
        const sum = times.reduce((acc, curr) => acc + curr.time, 0);
        return (sum / times.length).toFixed(2);
    }

    identifyPeakHours() {
        // Simplified peak hour identification
        const currentHour = new Date().getHours();
        const revenue = this.metrics.realTime.revenue.thisHour;
        
        return {
            currentHour,
            isCurrentlyPeak: revenue > this.metrics.realTime.revenue.today / 24
        };
    }

    calculateChurnRisk() {
        // Simplified churn risk calculation
        const activeUsers = this.metrics.realTime.activeUsers.size;
        const totalVisitors = this.metrics.userBehavior.conversionFunnel.visitors;
        
        if (totalVisitors === 0) return 0;
        
        const engagementRate = activeUsers / totalVisitors;
        return engagementRate < 0.1 ? 'high' : engagementRate < 0.3 ? 'medium' : 'low';
    }

    // Real-time tracking initialization
    startRealTimeTracking() {
        // Update metrics every minute
        setInterval(() => {
            this.emit('metricsUpdate', this.getAdvancedMetrics());
        }, 60000);
        
        // Memory usage tracking
        setInterval(() => {
            const usage = process.memoryUsage();
            this.metrics.performance.memoryUsage.push({
                ...usage,
                timestamp: Date.now()
            });
            
            // Keep only last 100 entries
            if (this.metrics.performance.memoryUsage.length > 100) {
                this.metrics.performance.memoryUsage.shift();
            }
        }, 30000);
    }

    // Export data for external analysis
    exportAnalyticsData(format = 'json') {
        const data = this.getAdvancedMetrics();
        
        switch (format) {
            case 'csv':
                return this.convertToCSV(data);
            case 'json':
            default:
                return JSON.stringify(data, null, 2);
        }
    }

    convertToCSV(data) {
        // Simplified CSV conversion for key metrics
        const rows = [
            ['Metric', 'Value', 'Timestamp'],
            ['Active Users', data.realTime.activeUsers, Date.now()],
            ['Conversion Rate', data.realTime.conversionRate, Date.now()],
            ['Average Response Time', data.performance.averageResponseTime, Date.now()],
            ['Daily Revenue Projection', data.predictions.dailyRevenueProjection, Date.now()]
        ];
        
        return rows.map(row => row.join(',')).join('\n');
    }
}

module.exports = AdvancedAnalytics;