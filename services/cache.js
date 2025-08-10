/**
 * Advanced Redis Caching Service
 * High-performance caching with intelligent invalidation and real-time features
 */

const EventEmitter = require('events');

class AdvancedCacheService extends EventEmitter {
    constructor() {
        super();
        this.cache = new Map(); // In-memory fallback when Redis is not available
        this.redisClient = null;
        this.isRedisAvailable = false;
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };
        
        this.initializeRedis();
        this.setupCacheStrategies();
    }

    async initializeRedis() {
        try {
            // Try to use Redis if available
            const redis = require('redis');
            this.redisClient = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.log('⚠️ Redis server connection refused, using in-memory cache');
                        return undefined; // Stop retrying
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            await this.redisClient.connect();
            this.isRedisAvailable = true;
            console.log('✅ Redis cache connected successfully');
            
            this.redisClient.on('error', (err) => {
                console.error('❌ Redis error:', err);
                this.cacheStats.errors++;
                this.isRedisAvailable = false;
            });
            
        } catch (error) {
            console.log('⚠️ Redis not available, using in-memory cache fallback');
            this.isRedisAvailable = false;
        }
    }

    // Cache strategies for different data types
    setupCacheStrategies() {
        this.strategies = {
            // Product data - cache for 1 hour
            products: {
                ttl: 3600,
                prefix: 'product:',
                invalidateOn: ['product_update', 'product_delete']
            },
            // User sessions - cache for 30 minutes
            users: {
                ttl: 1800,
                prefix: 'user:',
                invalidateOn: ['user_update']
            },
            // Order data - cache for 10 minutes
            orders: {
                ttl: 600,
                prefix: 'order:',
                invalidateOn: ['order_update', 'payment_received']
            },
            // Analytics - cache for 5 minutes
            analytics: {
                ttl: 300,
                prefix: 'analytics:',
                invalidateOn: ['new_order', 'new_user']
            },
            // API responses - cache for 2 minutes
            api: {
                ttl: 120,
                prefix: 'api:',
                invalidateOn: []
            }
        };
    }

    // Smart caching with automatic strategy selection
    async set(key, value, options = {}) {
        try {
            const strategy = this.detectStrategy(key) || options.strategy || 'api';
            const config = this.strategies[strategy];
            const fullKey = config.prefix + key;
            const ttl = options.ttl || config.ttl;
            
            const serializedValue = JSON.stringify({
                data: value,
                timestamp: Date.now(),
                strategy: strategy
            });

            if (this.isRedisAvailable && this.redisClient) {
                await this.redisClient.setEx(fullKey, ttl, serializedValue);
            } else {
                // Fallback to in-memory cache with TTL
                this.cache.set(fullKey, {
                    value: serializedValue,
                    expiry: Date.now() + (ttl * 1000)
                });
            }
            
            this.cacheStats.sets++;
            this.emit('cacheSet', { key: fullKey, strategy, ttl });
            
        } catch (error) {
            console.error('❌ Cache set error:', error);
            this.cacheStats.errors++;
        }
    }

    async get(key, options = {}) {
        try {
            const strategy = this.detectStrategy(key) || options.strategy || 'api';
            const config = this.strategies[strategy];
            const fullKey = config.prefix + key;
            
            let cachedData = null;
            
            if (this.isRedisAvailable && this.redisClient) {
                cachedData = await this.redisClient.get(fullKey);
            } else {
                // Check in-memory cache
                const memoryData = this.cache.get(fullKey);
                if (memoryData && memoryData.expiry > Date.now()) {
                    cachedData = memoryData.value;
                } else if (memoryData) {
                    // Expired, remove it
                    this.cache.delete(fullKey);
                }
            }
            
            if (cachedData) {
                this.cacheStats.hits++;
                const parsed = JSON.parse(cachedData);
                this.emit('cacheHit', { key: fullKey, strategy, age: Date.now() - parsed.timestamp });
                return parsed.data;
            } else {
                this.cacheStats.misses++;
                this.emit('cacheMiss', { key: fullKey, strategy });
                return null;
            }
            
        } catch (error) {
            console.error('❌ Cache get error:', error);
            this.cacheStats.errors++;
            return null;
        }
    }

    // Intelligent cache invalidation
    async invalidate(pattern, event = null) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                // Redis pattern-based deletion
                const keys = await this.redisClient.keys(pattern);
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                    this.cacheStats.deletes += keys.length;
                }
            } else {
                // In-memory pattern matching
                const keysToDelete = [];
                for (const key of this.cache.keys()) {
                    if (this.matchPattern(key, pattern)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => this.cache.delete(key));
                this.cacheStats.deletes += keysToDelete.length;
            }
            
            this.emit('cacheInvalidated', { pattern, event, count: this.cacheStats.deletes });
            
        } catch (error) {
            console.error('❌ Cache invalidation error:', error);
            this.cacheStats.errors++;
        }
    }

    // Event-driven cache invalidation
    async invalidateByEvent(event, metadata = {}) {
        const invalidationPromises = [];
        
        for (const [strategyName, strategy] of Object.entries(this.strategies)) {
            if (strategy.invalidateOn.includes(event)) {
                const pattern = strategy.prefix + '*';
                invalidationPromises.push(this.invalidate(pattern, event));
            }
        }
        
        await Promise.all(invalidationPromises);
        this.emit('eventInvalidation', { event, metadata });
    }

    // Cache warming for frequently accessed data
    async warmCache(warmingConfig) {
        console.log('🔥 Starting cache warming...');
        
        for (const config of warmingConfig) {
            try {
                const data = await config.dataLoader();
                await this.set(config.key, data, { strategy: config.strategy });
                console.log(`✅ Warmed cache for ${config.key}`);
            } catch (error) {
                console.error(`❌ Failed to warm cache for ${config.key}:`, error);
            }
        }
        
        console.log('🔥 Cache warming completed');
    }

    // Advanced caching patterns
    async getOrSet(key, dataLoader, options = {}) {
        let data = await this.get(key, options);
        
        if (data === null) {
            // Cache miss, load data
            try {
                data = await dataLoader();
                await this.set(key, data, options);
            } catch (error) {
                console.error('❌ Error in getOrSet data loader:', error);
                throw error;
            }
        }
        
        return data;
    }

    // Distributed cache locking for preventing cache stampede
    async withLock(lockKey, operation, timeout = 30000) {
        const lockValue = `lock_${Date.now()}_${Math.random()}`;
        const acquired = await this.acquireLock(lockKey, lockValue, timeout);
        
        if (!acquired) {
            throw new Error(`Failed to acquire lock for ${lockKey}`);
        }
        
        try {
            return await operation();
        } finally {
            await this.releaseLock(lockKey, lockValue);
        }
    }

    async acquireLock(key, value, timeout) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                const result = await this.redisClient.set(`lock:${key}`, value, {
                    PX: timeout,
                    NX: true
                });
                return result === 'OK';
            } else {
                // Simple in-memory locking
                const lockKey = `lock:${key}`;
                if (!this.cache.has(lockKey)) {
                    this.cache.set(lockKey, {
                        value: value,
                        expiry: Date.now() + timeout
                    });
                    return true;
                }
                return false;
            }
        } catch (error) {
            console.error('❌ Lock acquisition error:', error);
            return false;
        }
    }

    async releaseLock(key, value) {
        try {
            if (this.isRedisAvailable && this.redisClient) {
                // Lua script for atomic lock release
                const script = `
                    if redis.call('get', KEYS[1]) == ARGV[1] then
                        return redis.call('del', KEYS[1])
                    else
                        return 0
                    end
                `;
                await this.redisClient.eval(script, {
                    keys: [`lock:${key}`],
                    arguments: [value]
                });
            } else {
                const lockKey = `lock:${key}`;
                const lock = this.cache.get(lockKey);
                if (lock && lock.value === value) {
                    this.cache.delete(lockKey);
                }
            }
        } catch (error) {
            console.error('❌ Lock release error:', error);
        }
    }

    // Cache analytics and monitoring
    getStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0 
            ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
            : 0;
            
        return {
            ...this.cacheStats,
            hitRate: `${hitRate}%`,
            isRedisAvailable: this.isRedisAvailable,
            memoryUsage: this.cache.size
        };
    }

    // Helper methods
    detectStrategy(key) {
        if (key.includes('product')) return 'products';
        if (key.includes('user')) return 'users';
        if (key.includes('order')) return 'orders';
        if (key.includes('analytics')) return 'analytics';
        return 'api';
    }

    matchPattern(str, pattern) {
        // Simple pattern matching for in-memory cache
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(str);
    }

    // Cleanup and shutdown
    async shutdown() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        this.cache.clear();
        console.log('🔄 Cache service shutdown completed');
    }
}

module.exports = AdvancedCacheService;