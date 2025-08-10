/**
 * Advanced Security Service
 * Comprehensive security features including JWT, rate limiting, encryption, and threat detection
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const EventEmitter = require('events');

class AdvancedSecurityService extends EventEmitter {
    constructor() {
        super();
        this.rateLimitStore = new Map();
        this.suspiciousActivities = new Map();
        this.blockedIPs = new Set();
        this.securityConfig = {
            jwt: {
                secret: process.env.JWT_SECRET || this.generateSecureSecret(),
                expiresIn: '24h',
                refreshExpiresIn: '7d'
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                maxRequests: 100,
                blockDuration: 60 * 60 * 1000 // 1 hour
            },
            encryption: {
                algorithm: 'aes-256-gcm',
                keyLength: 32,
                ivLength: 16
            },
            security: {
                maxFailedAttempts: 5,
                lockoutDuration: 30 * 60 * 1000, // 30 minutes
                suspiciousThreshold: 10
            }
        };
        
        this.initializeSecurity();
    }

    initializeSecurity() {
        // Clean up expired rate limit entries every 5 minutes
        setInterval(() => this.cleanupRateLimit(), 5 * 60 * 1000);
        
        // Clean up suspicious activities every hour
        setInterval(() => this.cleanupSuspiciousActivities(), 60 * 60 * 1000);
        
        console.log('🔒 Advanced Security Service initialized');
    }

    // JWT Token Management
    generateTokens(payload) {
        try {
            const accessToken = jwt.sign(
                { ...payload, type: 'access' },
                this.securityConfig.jwt.secret,
                { expiresIn: this.securityConfig.jwt.expiresIn }
            );
            
            const refreshToken = jwt.sign(
                { ...payload, type: 'refresh' },
                this.securityConfig.jwt.secret,
                { expiresIn: this.securityConfig.jwt.refreshExpiresIn }
            );
            
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('❌ Token generation error:', error);
            throw new Error('Failed to generate tokens');
        }
    }

    verifyToken(token, tokenType = 'access') {
        try {
            const decoded = jwt.verify(token, this.securityConfig.jwt.secret);
            
            if (decoded.type !== tokenType) {
                throw new Error('Invalid token type');
            }
            
            return decoded;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    }

    refreshAccessToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken, 'refresh');
            const newPayload = { ...decoded };
            delete newPayload.type;
            delete newPayload.iat;
            delete newPayload.exp;
            
            return this.generateTokens(newPayload);
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }

    // Advanced Rate Limiting
    checkRateLimit(identifier, customLimits = {}) {
        const config = { ...this.securityConfig.rateLimit, ...customLimits };
        const now = Date.now();
        const windowStart = now - config.windowMs;
        
        if (!this.rateLimitStore.has(identifier)) {
            this.rateLimitStore.set(identifier, {
                requests: [],
                blocked: false,
                blockExpiry: 0
            });
        }
        
        const userLimit = this.rateLimitStore.get(identifier);
        
        // Check if user is currently blocked
        if (userLimit.blocked && now < userLimit.blockExpiry) {
            this.emit('rateLimitBlocked', { identifier, remainingTime: userLimit.blockExpiry - now });
            return {
                allowed: false,
                remaining: 0,
                resetTime: userLimit.blockExpiry,
                blocked: true
            };
        }
        
        // Remove expired requests
        userLimit.requests = userLimit.requests.filter(time => time > windowStart);
        userLimit.blocked = false;
        
        // Check if limit exceeded
        if (userLimit.requests.length >= config.maxRequests) {
            userLimit.blocked = true;
            userLimit.blockExpiry = now + config.blockDuration;
            
            this.emit('rateLimitExceeded', { identifier, requests: userLimit.requests.length });
            this.recordSuspiciousActivity(identifier, 'rate_limit_exceeded');
            
            return {
                allowed: false,
                remaining: 0,
                resetTime: userLimit.blockExpiry,
                blocked: true
            };
        }
        
        // Add current request
        userLimit.requests.push(now);
        
        return {
            allowed: true,
            remaining: config.maxRequests - userLimit.requests.length,
            resetTime: windowStart + config.windowMs,
            blocked: false
        };
    }

    // Data Encryption/Decryption
    encrypt(text, key = null) {
        try {
            const encryptionKey = key || this.getEncryptionKey();
            const iv = crypto.randomBytes(this.securityConfig.encryption.ivLength);
            const cipher = crypto.createCipher(this.securityConfig.encryption.algorithm, encryptionKey);
            cipher.setAAD(Buffer.from('telegram-crypto-store'));
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            console.error('❌ Encryption error:', error);
            throw new Error('Encryption failed');
        }
    }

    decrypt(encryptedData, key = null) {
        try {
            const encryptionKey = key || this.getEncryptionKey();
            const decipher = crypto.createDecipher(this.securityConfig.encryption.algorithm, encryptionKey);
            
            decipher.setAAD(Buffer.from('telegram-crypto-store'));
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption error:', error);
            throw new Error('Decryption failed');
        }
    }

    // Password Security
    async hashPassword(password) {
        try {
            const saltRounds = 12;
            return await bcrypt.hash(password, saltRounds);
        } catch (error) {
            console.error('❌ Password hashing error:', error);
            throw new Error('Password hashing failed');
        }
    }

    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            console.error('❌ Password verification error:', error);
            return false;
        }
    }

    // Threat Detection and Prevention
    recordSuspiciousActivity(identifier, activityType, metadata = {}) {
        const now = Date.now();
        
        if (!this.suspiciousActivities.has(identifier)) {
            this.suspiciousActivities.set(identifier, []);
        }
        
        const activities = this.suspiciousActivities.get(identifier);
        activities.push({
            type: activityType,
            timestamp: now,
            metadata
        });
        
        // Keep only recent activities (last 24 hours)
        const dayAgo = now - (24 * 60 * 60 * 1000);
        this.suspiciousActivities.set(
            identifier,
            activities.filter(activity => activity.timestamp > dayAgo)
        );
        
        // Check if threshold exceeded
        if (activities.length >= this.securityConfig.security.suspiciousThreshold) {
            this.blockIP(identifier, 'suspicious_activity');
            this.emit('threatDetected', { identifier, activities: activities.length, type: activityType });
        }
        
        this.emit('suspiciousActivity', { identifier, activityType, metadata });
    }

    blockIP(ip, reason = 'manual') {
        this.blockedIPs.add(ip);
        this.emit('ipBlocked', { ip, reason, timestamp: Date.now() });
        console.log(`🚫 IP blocked: ${ip} (Reason: ${reason})`);
    }

    unblockIP(ip) {
        this.blockedIPs.delete(ip);
        this.emit('ipUnblocked', { ip, timestamp: Date.now() });
        console.log(`✅ IP unblocked: ${ip}`);
    }

    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    // Input Validation and Sanitization
    validateInput(input, rules) {
        const errors = [];
        
        for (const [field, fieldRules] of Object.entries(rules)) {
            const value = input[field];
            
            // Required check
            if (fieldRules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }
            
            if (value !== undefined && value !== null && value !== '') {
                // Type check
                if (fieldRules.type && typeof value !== fieldRules.type) {
                    errors.push(`${field} must be of type ${fieldRules.type}`);
                }
                
                // Length check
                if (fieldRules.minLength && value.length < fieldRules.minLength) {
                    errors.push(`${field} must be at least ${fieldRules.minLength} characters`);
                }
                
                if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
                    errors.push(`${field} must not exceed ${fieldRules.maxLength} characters`);
                }
                
                // Pattern check
                if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }
                
                // Custom validation
                if (fieldRules.custom && !fieldRules.custom(value)) {
                    errors.push(`${field} validation failed`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    sanitizeInput(input) {
        if (typeof input === 'string') {
            return input
                .replace(/[<>"'&]/g, (match) => {
                    const entities = {
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#x27;',
                        '&': '&amp;'
                    };
                    return entities[match];
                })
                .trim();
        }
        
        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(input)) {
                sanitized[key] = this.sanitizeInput(value);
            }
            return sanitized;
        }
        
        return input;
    }

    // Security Headers
    getSecurityHeaders() {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        };
    }

    // Security Middleware
    createSecurityMiddleware() {
        return (req, res, next) => {
            const clientIP = req.ip || req.connection.remoteAddress;
            
            // Check if IP is blocked
            if (this.isIPBlocked(clientIP)) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            // Apply security headers
            const headers = this.getSecurityHeaders();
            for (const [header, value] of Object.entries(headers)) {
                res.setHeader(header, value);
            }
            
            // Rate limiting
            const rateLimit = this.checkRateLimit(clientIP);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Too many requests',
                    resetTime: rateLimit.resetTime
                });
            }
            
            // Add rate limit headers
            res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
            res.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
            
            next();
        };
    }

    // Utility methods
    generateSecureSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    getEncryptionKey() {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            console.warn('⚠️ No encryption key found, generating temporary key');
            return crypto.randomBytes(this.securityConfig.encryption.keyLength);
        }
        return crypto.createHash('sha256').update(key).digest();
    }

    cleanupRateLimit() {
        const now = Date.now();
        for (const [identifier, data] of this.rateLimitStore.entries()) {
            if (data.blocked && now > data.blockExpiry) {
                data.blocked = false;
                data.requests = [];
            }
        }
    }

    cleanupSuspiciousActivities() {
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        for (const [identifier, activities] of this.suspiciousActivities.entries()) {
            const recentActivities = activities.filter(activity => activity.timestamp > dayAgo);
            if (recentActivities.length === 0) {
                this.suspiciousActivities.delete(identifier);
            } else {
                this.suspiciousActivities.set(identifier, recentActivities);
            }
        }
    }

    // Security Analytics
    getSecurityStats() {
        return {
            blockedIPs: this.blockedIPs.size,
            rateLimitedUsers: Array.from(this.rateLimitStore.values()).filter(data => data.blocked).length,
            suspiciousActivities: this.suspiciousActivities.size,
            totalRateLimitEntries: this.rateLimitStore.size
        };
    }

    // Export security report
    generateSecurityReport() {
        const stats = this.getSecurityStats();
        const recentThreats = [];
        
        for (const [identifier, activities] of this.suspiciousActivities.entries()) {
            recentThreats.push({
                identifier,
                activitiesCount: activities.length,
                lastActivity: Math.max(...activities.map(a => a.timestamp)),
                types: [...new Set(activities.map(a => a.type))]
            });
        }
        
        return {
            timestamp: Date.now(),
            stats,
            blockedIPs: Array.from(this.blockedIPs),
            recentThreats: recentThreats.sort((a, b) => b.lastActivity - a.lastActivity).slice(0, 10)
        };
    }
}

module.exports = AdvancedSecurityService;