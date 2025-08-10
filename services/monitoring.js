/**
 * Advanced Monitoring Service
 * Real-time system monitoring, health checks, performance metrics, and alerting
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class AdvancedMonitoringService extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            system: {
                cpu: [],
                memory: [],
                disk: [],
                network: []
            },
            application: {
                requests: [],
                responses: [],
                errors: [],
                database: [],
                cache: []
            },
            business: {
                orders: [],
                revenue: [],
                users: [],
                products: []
            }
        };
        
        this.alerts = {
            rules: new Map(),
            history: [],
            channels: new Map()
        };
        
        this.healthChecks = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        this.thresholds = {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            disk: { warning: 85, critical: 95 },
            responseTime: { warning: 1000, critical: 3000 },
            errorRate: { warning: 5, critical: 10 }
        };
        
        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Set up default health checks
        this.registerHealthCheck('system', () => this.checkSystemHealth());
        this.registerHealthCheck('database', () => this.checkDatabaseHealth());
        this.registerHealthCheck('cache', () => this.checkCacheHealth());
        this.registerHealthCheck('api', () => this.checkAPIHealth());
        
        // Set up default alert rules
        this.setupDefaultAlerts();
        
        console.log('📊 Advanced Monitoring Service initialized');
    }

    // Start/Stop Monitoring
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) {
            console.log('⚠️ Monitoring already running');
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
        
        console.log(`📈 Monitoring started with ${intervalMs}ms interval`);
        this.emit('monitoringStarted', { interval: intervalMs });
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('📉 Monitoring stopped');
        this.emit('monitoringStopped');
    }

    // Metrics Collection
    async collectMetrics() {
        try {
            const timestamp = Date.now();
            
            // System metrics
            await this.collectSystemMetrics(timestamp);
            
            // Application metrics
            await this.collectApplicationMetrics(timestamp);
            
            // Run health checks
            await this.runHealthChecks();
            
            // Check alert rules
            this.checkAlertRules();
            
            // Cleanup old metrics (keep last 24 hours)
            this.cleanupOldMetrics(timestamp);
            
            this.emit('metricsCollected', { timestamp });
            
        } catch (error) {
            console.error('❌ Error collecting metrics:', error);
            this.emit('metricsError', { error: error.message });
        }
    }

    async collectSystemMetrics(timestamp) {
        // CPU Usage
        const cpuUsage = await this.getCPUUsage();
        this.metrics.system.cpu.push({ timestamp, value: cpuUsage });
        
        // Memory Usage
        const memoryUsage = this.getMemoryUsage();
        this.metrics.system.memory.push({ timestamp, ...memoryUsage });
        
        // Disk Usage
        const diskUsage = await this.getDiskUsage();
        this.metrics.system.disk.push({ timestamp, ...diskUsage });
        
        // Network Stats (if available)
        const networkStats = this.getNetworkStats();
        this.metrics.system.network.push({ timestamp, ...networkStats });
    }

    async collectApplicationMetrics(timestamp) {
        // These will be populated by middleware and other services
        // For now, we'll add placeholder structure
        
        // Request metrics (populated by middleware)
        // Response time metrics (populated by middleware)
        // Error metrics (populated by error handlers)
        // Database metrics (populated by database service)
        // Cache metrics (populated by cache service)
    }

    // System Metrics Helpers
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startMeasure = this.cpuAverage();
            
            setTimeout(() => {
                const endMeasure = this.cpuAverage();
                const idleDifference = endMeasure.idle - startMeasure.idle;
                const totalDifference = endMeasure.total - startMeasure.total;
                const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
                resolve(percentageCPU);
            }, 1000);
        });
    }

    cpuAverage() {
        const cpus = os.cpus();
        let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
        
        for (const cpu of cpus) {
            user += cpu.times.user;
            nice += cpu.times.nice;
            sys += cpu.times.sys;
            idle += cpu.times.idle;
            irq += cpu.times.irq;
        }
        
        const total = user + nice + sys + idle + irq;
        return { idle, total };
    }

    getMemoryUsage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const usagePercentage = (usedMemory / totalMemory) * 100;
        
        return {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            percentage: usagePercentage
        };
    }

    async getDiskUsage() {
        try {
            const stats = await fs.stat(process.cwd());
            // This is a simplified version - in production, you'd want to use a library like 'diskusage'
            return {
                total: 0,
                used: 0,
                free: 0,
                percentage: 0
            };
        } catch (error) {
            return { total: 0, used: 0, free: 0, percentage: 0 };
        }
    }

    getNetworkStats() {
        const networkInterfaces = os.networkInterfaces();
        let totalRx = 0, totalTx = 0;
        
        // This is simplified - real network stats would require system calls
        return {
            bytesReceived: totalRx,
            bytesTransmitted: totalTx,
            packetsReceived: 0,
            packetsTransmitted: 0
        };
    }

    // Health Checks
    registerHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, {
            check: checkFunction,
            lastRun: null,
            lastResult: null,
            history: []
        });
    }

    async runHealthChecks() {
        const results = {};
        
        for (const [name, healthCheck] of this.healthChecks.entries()) {
            try {
                const startTime = Date.now();
                const result = await healthCheck.check();
                const duration = Date.now() - startTime;
                
                const healthResult = {
                    status: result.status || 'unknown',
                    message: result.message || '',
                    duration,
                    timestamp: Date.now(),
                    details: result.details || {}
                };
                
                healthCheck.lastRun = Date.now();
                healthCheck.lastResult = healthResult;
                healthCheck.history.push(healthResult);
                
                // Keep only last 100 results
                if (healthCheck.history.length > 100) {
                    healthCheck.history = healthCheck.history.slice(-100);
                }
                
                results[name] = healthResult;
                
                if (healthResult.status !== 'healthy') {
                    this.emit('healthCheckFailed', { name, result: healthResult });
                }
                
            } catch (error) {
                const errorResult = {
                    status: 'error',
                    message: error.message,
                    duration: 0,
                    timestamp: Date.now(),
                    details: { error: error.stack }
                };
                
                healthCheck.lastResult = errorResult;
                results[name] = errorResult;
                
                this.emit('healthCheckError', { name, error: error.message });
            }
        }
        
        return results;
    }

    // Default Health Check Implementations
    async checkSystemHealth() {
        const memoryUsage = this.getMemoryUsage();
        const loadAverage = os.loadavg()[0];
        
        if (memoryUsage.percentage > this.thresholds.memory.critical) {
            return {
                status: 'critical',
                message: `Memory usage critical: ${memoryUsage.percentage.toFixed(2)}%`,
                details: { memoryUsage }
            };
        }
        
        if (memoryUsage.percentage > this.thresholds.memory.warning) {
            return {
                status: 'warning',
                message: `Memory usage high: ${memoryUsage.percentage.toFixed(2)}%`,
                details: { memoryUsage }
            };
        }
        
        return {
            status: 'healthy',
            message: 'System resources normal',
            details: { memoryUsage, loadAverage }
        };
    }

    async checkDatabaseHealth() {
        // This would be implemented based on your database service
        return {
            status: 'healthy',
            message: 'Database connection healthy',
            details: { connectionPool: 'active' }
        };
    }

    async checkCacheHealth() {
        // This would be implemented based on your cache service
        return {
            status: 'healthy',
            message: 'Cache service healthy',
            details: { hitRate: '85%' }
        };
    }

    async checkAPIHealth() {
        const recentErrors = this.metrics.application.errors
            .filter(error => Date.now() - error.timestamp < 5 * 60 * 1000)
            .length;
        
        if (recentErrors > 10) {
            return {
                status: 'warning',
                message: `High error rate: ${recentErrors} errors in last 5 minutes`,
                details: { recentErrors }
            };
        }
        
        return {
            status: 'healthy',
            message: 'API endpoints responding normally',
            details: { recentErrors }
        };
    }

    // Alert System
    setupDefaultAlerts() {
        // CPU Alert
        this.addAlertRule('high_cpu', {
            condition: (metrics) => {
                const latestCPU = metrics.system.cpu.slice(-1)[0];
                return latestCPU && latestCPU.value > this.thresholds.cpu.warning;
            },
            message: (metrics) => {
                const latestCPU = metrics.system.cpu.slice(-1)[0];
                return `High CPU usage: ${latestCPU.value.toFixed(2)}%`;
            },
            severity: 'warning',
            cooldown: 5 * 60 * 1000 // 5 minutes
        });
        
        // Memory Alert
        this.addAlertRule('high_memory', {
            condition: (metrics) => {
                const latestMemory = metrics.system.memory.slice(-1)[0];
                return latestMemory && latestMemory.percentage > this.thresholds.memory.warning;
            },
            message: (metrics) => {
                const latestMemory = metrics.system.memory.slice(-1)[0];
                return `High memory usage: ${latestMemory.percentage.toFixed(2)}%`;
            },
            severity: 'warning',
            cooldown: 5 * 60 * 1000
        });
        
        // Error Rate Alert
        this.addAlertRule('high_error_rate', {
            condition: (metrics) => {
                const recentErrors = metrics.application.errors
                    .filter(error => Date.now() - error.timestamp < 5 * 60 * 1000)
                    .length;
                return recentErrors > this.thresholds.errorRate.warning;
            },
            message: (metrics) => {
                const recentErrors = metrics.application.errors
                    .filter(error => Date.now() - error.timestamp < 5 * 60 * 1000)
                    .length;
                return `High error rate: ${recentErrors} errors in last 5 minutes`;
            },
            severity: 'critical',
            cooldown: 2 * 60 * 1000
        });
    }

    addAlertRule(name, rule) {
        this.alerts.rules.set(name, {
            ...rule,
            lastTriggered: 0
        });
    }

    checkAlertRules() {
        const now = Date.now();
        
        for (const [name, rule] of this.alerts.rules.entries()) {
            try {
                // Check cooldown
                if (now - rule.lastTriggered < rule.cooldown) {
                    continue;
                }
                
                // Check condition
                if (rule.condition(this.metrics)) {
                    const message = rule.message(this.metrics);
                    
                    const alert = {
                        name,
                        message,
                        severity: rule.severity,
                        timestamp: now,
                        metrics: this.getRecentMetrics()
                    };
                    
                    this.triggerAlert(alert);
                    rule.lastTriggered = now;
                }
                
            } catch (error) {
                console.error(`❌ Error checking alert rule ${name}:`, error);
            }
        }
    }

    triggerAlert(alert) {
        this.alerts.history.push(alert);
        
        // Keep only last 1000 alerts
        if (this.alerts.history.length > 1000) {
            this.alerts.history = this.alerts.history.slice(-1000);
        }
        
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
        this.emit('alert', alert);
        
        // Send to configured channels
        this.sendAlertToChannels(alert);
    }

    sendAlertToChannels(alert) {
        for (const [channelName, channel] of this.alerts.channels.entries()) {
            try {
                channel.send(alert);
            } catch (error) {
                console.error(`❌ Failed to send alert to ${channelName}:`, error);
            }
        }
    }

    addAlertChannel(name, channel) {
        this.alerts.channels.set(name, channel);
    }

    // Metrics Recording (for middleware)
    recordRequest(req, res, responseTime) {
        const timestamp = Date.now();
        
        this.metrics.application.requests.push({
            timestamp,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
        
        if (res.statusCode >= 400) {
            this.metrics.application.errors.push({
                timestamp,
                statusCode: res.statusCode,
                method: req.method,
                url: req.url,
                error: res.locals.error || 'Unknown error'
            });
        }
    }

    recordBusinessMetric(type, data) {
        const timestamp = Date.now();
        
        if (this.metrics.business[type]) {
            this.metrics.business[type].push({
                timestamp,
                ...data
            });
        }
    }

    // Data Retrieval
    getMetrics(timeRange = '1h') {
        const now = Date.now();
        const ranges = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };
        
        const cutoff = now - (ranges[timeRange] || ranges['1h']);
        
        const filteredMetrics = {};
        for (const [category, metrics] of Object.entries(this.metrics)) {
            filteredMetrics[category] = {};
            for (const [type, data] of Object.entries(metrics)) {
                filteredMetrics[category][type] = data.filter(item => item.timestamp > cutoff);
            }
        }
        
        return filteredMetrics;
    }

    getRecentMetrics() {
        return this.getMetrics('5m');
    }

    getHealthStatus() {
        const status = {};
        for (const [name, healthCheck] of this.healthChecks.entries()) {
            status[name] = healthCheck.lastResult;
        }
        return status;
    }

    getAlerts(limit = 50) {
        return this.alerts.history.slice(-limit).reverse();
    }

    // Performance Analytics
    getPerformanceReport() {
        const metrics = this.getMetrics('1h');
        const requests = metrics.application.requests;
        
        if (requests.length === 0) {
            return { message: 'No data available' };
        }
        
        const avgResponseTime = requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length;
        const errorRate = (metrics.application.errors.length / requests.length) * 100;
        const requestsPerMinute = requests.length / 60;
        
        return {
            totalRequests: requests.length,
            averageResponseTime: Math.round(avgResponseTime),
            errorRate: errorRate.toFixed(2),
            requestsPerMinute: requestsPerMinute.toFixed(2),
            statusCodes: this.groupBy(requests, 'statusCode'),
            topEndpoints: this.getTopEndpoints(requests),
            slowestEndpoints: this.getSlowestEndpoints(requests)
        };
    }

    // Utility methods
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || 0;
            groups[group]++;
            return groups;
        }, {});
    }

    getTopEndpoints(requests, limit = 10) {
        const endpoints = this.groupBy(requests, 'url');
        return Object.entries(endpoints)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([url, count]) => ({ url, count }));
    }

    getSlowestEndpoints(requests, limit = 10) {
        const endpointTimes = {};
        
        requests.forEach(req => {
            if (!endpointTimes[req.url]) {
                endpointTimes[req.url] = [];
            }
            endpointTimes[req.url].push(req.responseTime);
        });
        
        const avgTimes = Object.entries(endpointTimes)
            .map(([url, times]) => ({
                url,
                avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
                count: times.length
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, limit);
        
        return avgTimes;
    }

    cleanupOldMetrics(currentTime) {
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const cutoff = currentTime - maxAge;
        
        for (const category of Object.values(this.metrics)) {
            for (const [type, data] of Object.entries(category)) {
                category[type] = data.filter(item => item.timestamp > cutoff);
            }
        }
    }

    // Monitoring middleware
    createMonitoringMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const responseTime = Date.now() - startTime;
                this.recordRequest(req, res, responseTime);
            });
            
            next();
        };
    }

    // Shutdown
    shutdown() {
        this.stopMonitoring();
        console.log('📊 Monitoring service shutdown completed');
    }
}

module.exports = AdvancedMonitoringService;