/**
 * Advanced API Service
 * GraphQL, REST, WebSocket support with intelligent routing and real-time features
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLFloat, GraphQLBoolean } = require('graphql');
const { graphqlHTTP } = require('express-graphql');

class AdvancedAPIService extends EventEmitter {
    constructor(app, server) {
        super();
        this.app = app;
        this.server = server;
        this.wsServer = null;
        this.connections = new Map();
        this.subscriptions = new Map();
        this.apiVersions = new Map();
        this.rateLimiter = null;
        this.cache = null;
        
        this.config = {
            websocket: {
                port: process.env.WS_PORT || 3001,
                heartbeatInterval: 30000,
                maxConnections: 1000
            },
            graphql: {
                endpoint: '/graphql',
                introspection: process.env.NODE_ENV !== 'production',
                playground: process.env.NODE_ENV !== 'production'
            },
            rest: {
                prefix: '/api',
                versioning: true,
                defaultVersion: 'v1'
            }
        };
        
        this.initializeAPI();
    }

    initializeAPI() {
        this.setupRESTAPI();
        this.setupGraphQLAPI();
        this.setupWebSocketServer();
        this.setupMiddleware();
        
        console.log('🚀 Advanced API Service initialized');
    }

    // REST API Setup
    setupRESTAPI() {
        const router = require('express').Router();
        
        // API versioning middleware
        router.use((req, res, next) => {
            const version = req.headers['api-version'] || 
                           req.query.version || 
                           this.config.rest.defaultVersion;
            req.apiVersion = version;
            next();
        });
        
        // Enhanced Products API
        router.get('/products', this.createVersionedHandler({
            v1: this.getProductsV1.bind(this),
            v2: this.getProductsV2.bind(this)
        }));
        
        router.get('/products/:id', this.createVersionedHandler({
            v1: this.getProductByIdV1.bind(this),
            v2: this.getProductByIdV2.bind(this)
        }));
        
        router.post('/products', this.createVersionedHandler({
            v1: this.createProductV1.bind(this),
            v2: this.createProductV2.bind(this)
        }));
        
        // Enhanced Orders API
        router.get('/orders', this.createVersionedHandler({
            v1: this.getOrdersV1.bind(this),
            v2: this.getOrdersV2.bind(this)
        }));
        
        router.post('/orders', this.createVersionedHandler({
            v1: this.createOrderV1.bind(this),
            v2: this.createOrderV2.bind(this)
        }));
        
        router.get('/orders/:id', this.createVersionedHandler({
            v1: this.getOrderByIdV1.bind(this),
            v2: this.getOrderByIdV2.bind(this)
        }));
        
        // Analytics API
        router.get('/analytics/dashboard', this.getDashboardAnalytics.bind(this));
        router.get('/analytics/sales', this.getSalesAnalytics.bind(this));
        router.get('/analytics/users', this.getUserAnalytics.bind(this));
        router.get('/analytics/performance', this.getPerformanceAnalytics.bind(this));
        
        // Real-time API
        router.get('/realtime/metrics', this.getRealtimeMetrics.bind(this));
        router.post('/realtime/subscribe', this.subscribeToUpdates.bind(this));
        
        // System API
        router.get('/system/health', this.getSystemHealth.bind(this));
        router.get('/system/status', this.getSystemStatus.bind(this));
        router.get('/system/metrics', this.getSystemMetrics.bind(this));
        
        this.app.use(this.config.rest.prefix, router);
    }

    // GraphQL Setup
    setupGraphQLAPI() {
        const schema = this.createGraphQLSchema();
        
        this.app.use(this.config.graphql.endpoint, graphqlHTTP({
            schema: schema,
            graphiql: this.config.graphql.playground,
            introspection: this.config.graphql.introspection,
            context: (req) => ({
                user: req.user,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            })
        }));
    }

    createGraphQLSchema() {
        // Product Type
        const ProductType = new GraphQLObjectType({
            name: 'Product',
            fields: {
                id: { type: GraphQLString },
                name: { type: GraphQLString },
                description: { type: GraphQLString },
                price: { type: GraphQLFloat },
                currency: { type: GraphQLString },
                category: { type: GraphQLString },
                image: { type: GraphQLString },
                inStock: { type: GraphQLBoolean },
                createdAt: { type: GraphQLString },
                updatedAt: { type: GraphQLString }
            }
        });
        
        // Order Type
        const OrderType = new GraphQLObjectType({
            name: 'Order',
            fields: {
                id: { type: GraphQLString },
                userId: { type: GraphQLString },
                products: { type: new GraphQLList(ProductType) },
                total: { type: GraphQLFloat },
                currency: { type: GraphQLString },
                status: { type: GraphQLString },
                paymentMethod: { type: GraphQLString },
                createdAt: { type: GraphQLString },
                updatedAt: { type: GraphQLString }
            }
        });
        
        // User Type
        const UserType = new GraphQLObjectType({
            name: 'User',
            fields: {
                id: { type: GraphQLString },
                telegramId: { type: GraphQLString },
                username: { type: GraphQLString },
                firstName: { type: GraphQLString },
                lastName: { type: GraphQLString },
                isActive: { type: GraphQLBoolean },
                createdAt: { type: GraphQLString },
                lastActive: { type: GraphQLString }
            }
        });
        
        // Analytics Type
        const AnalyticsType = new GraphQLObjectType({
            name: 'Analytics',
            fields: {
                totalOrders: { type: GraphQLInt },
                totalRevenue: { type: GraphQLFloat },
                totalUsers: { type: GraphQLInt },
                averageOrderValue: { type: GraphQLFloat },
                conversionRate: { type: GraphQLFloat },
                topProducts: { type: new GraphQLList(ProductType) },
                recentOrders: { type: new GraphQLList(OrderType) }
            }
        });
        
        // Root Query
        const RootQuery = new GraphQLObjectType({
            name: 'RootQueryType',
            fields: {
                products: {
                    type: new GraphQLList(ProductType),
                    args: {
                        category: { type: GraphQLString },
                        limit: { type: GraphQLInt },
                        offset: { type: GraphQLInt }
                    },
                    resolve: async (parent, args, context) => {
                        return await this.resolveProducts(args, context);
                    }
                },
                product: {
                    type: ProductType,
                    args: { id: { type: GraphQLString } },
                    resolve: async (parent, args, context) => {
                        return await this.resolveProduct(args.id, context);
                    }
                },
                orders: {
                    type: new GraphQLList(OrderType),
                    args: {
                        userId: { type: GraphQLString },
                        status: { type: GraphQLString },
                        limit: { type: GraphQLInt },
                        offset: { type: GraphQLInt }
                    },
                    resolve: async (parent, args, context) => {
                        return await this.resolveOrders(args, context);
                    }
                },
                order: {
                    type: OrderType,
                    args: { id: { type: GraphQLString } },
                    resolve: async (parent, args, context) => {
                        return await this.resolveOrder(args.id, context);
                    }
                },
                users: {
                    type: new GraphQLList(UserType),
                    args: {
                        limit: { type: GraphQLInt },
                        offset: { type: GraphQLInt }
                    },
                    resolve: async (parent, args, context) => {
                        return await this.resolveUsers(args, context);
                    }
                },
                analytics: {
                    type: AnalyticsType,
                    args: {
                        timeRange: { type: GraphQLString },
                        currency: { type: GraphQLString }
                    },
                    resolve: async (parent, args, context) => {
                        return await this.resolveAnalytics(args, context);
                    }
                }
            }
        });
        
        return new GraphQLSchema({
            query: RootQuery
        });
    }

    // WebSocket Setup
    setupWebSocketServer() {
        this.wsServer = new WebSocket.Server({ 
            port: this.config.websocket.port,
            maxPayload: 16 * 1024 // 16KB
        });
        
        this.wsServer.on('connection', (ws, req) => {
            const connectionId = this.generateConnectionId();
            const clientIP = req.socket.remoteAddress;
            
            console.log(`🔌 WebSocket connected: ${connectionId} from ${clientIP}`);
            
            // Store connection
            this.connections.set(connectionId, {
                ws,
                id: connectionId,
                ip: clientIP,
                connectedAt: Date.now(),
                lastPing: Date.now(),
                subscriptions: new Set()
            });
            
            // Set up message handling
            ws.on('message', (data) => {
                this.handleWebSocketMessage(connectionId, data);
            });
            
            // Set up ping/pong for heartbeat
            ws.on('pong', () => {
                const connection = this.connections.get(connectionId);
                if (connection) {
                    connection.lastPing = Date.now();
                }
            });
            
            // Handle disconnection
            ws.on('close', () => {
                console.log(`🔌 WebSocket disconnected: ${connectionId}`);
                this.cleanupConnection(connectionId);
            });
            
            // Send welcome message
            this.sendToConnection(connectionId, {
                type: 'welcome',
                connectionId,
                timestamp: Date.now()
            });
        });
        
        // Set up heartbeat
        this.startHeartbeat();
        
        console.log(`🔌 WebSocket server listening on port ${this.config.websocket.port}`);
    }

    // Middleware Setup
    setupMiddleware() {
        // Request logging middleware
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                this.emit('apiRequest', {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            });
            
            next();
        });
    }

    // API Version Handlers
    createVersionedHandler(handlers) {
        return (req, res, next) => {
            const version = req.apiVersion;
            const handler = handlers[version] || handlers[this.config.rest.defaultVersion];
            
            if (!handler) {
                return res.status(400).json({
                    error: 'Unsupported API version',
                    supportedVersions: Object.keys(handlers)
                });
            }
            
            handler(req, res, next);
        };
    }

    // Products API Handlers
    async getProductsV1(req, res) {
        try {
            const { category, limit = 20, offset = 0 } = req.query;
            
            // Mock data for now - replace with actual database calls
            const products = [
                {
                    id: '1',
                    name: 'Premium Crypto Course',
                    description: 'Learn cryptocurrency trading',
                    price: 99.99,
                    currency: 'USD',
                    category: 'education',
                    image: '/images/course1.jpg'
                }
            ];
            
            res.json({
                success: true,
                data: products,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: products.length
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getProductsV2(req, res) {
        try {
            const { category, limit = 20, offset = 0, sort = 'name', order = 'asc' } = req.query;
            
            // Enhanced version with sorting and filtering
            const products = [
                {
                    id: '1',
                    name: 'Premium Crypto Course',
                    description: 'Learn cryptocurrency trading',
                    price: 99.99,
                    currency: 'USD',
                    category: 'education',
                    image: '/images/course1.jpg',
                    rating: 4.8,
                    reviews: 156,
                    tags: ['crypto', 'trading', 'education']
                }
            ];
            
            res.json({
                success: true,
                data: products,
                meta: {
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        total: products.length
                    },
                    sorting: { sort, order },
                    filters: { category }
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Analytics API Handlers
    async getDashboardAnalytics(req, res) {
        try {
            const { timeRange = '24h' } = req.query;
            
            const analytics = {
                overview: {
                    totalOrders: 156,
                    totalRevenue: 15420.50,
                    totalUsers: 1234,
                    averageOrderValue: 98.85
                },
                trends: {
                    ordersGrowth: 12.5,
                    revenueGrowth: 18.3,
                    usersGrowth: 8.7
                },
                topProducts: [
                    { id: '1', name: 'Premium Course', sales: 45, revenue: 4495.50 }
                ],
                recentActivity: [
                    { type: 'order', message: 'New order #1234', timestamp: Date.now() }
                ]
            };
            
            res.json({ success: true, data: analytics });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Real-time API Handlers
    async getRealtimeMetrics(req, res) {
        try {
            const metrics = {
                activeUsers: this.connections.size,
                ordersToday: 23,
                revenueToday: 2340.50,
                systemLoad: {
                    cpu: 45.2,
                    memory: 67.8,
                    disk: 23.1
                },
                timestamp: Date.now()
            };
            
            res.json({ success: true, data: metrics });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // WebSocket Message Handling
    handleWebSocketMessage(connectionId, data) {
        try {
            const message = JSON.parse(data.toString());
            const connection = this.connections.get(connectionId);
            
            if (!connection) return;
            
            switch (message.type) {
                case 'subscribe':
                    this.handleSubscription(connectionId, message.channel, message.params);
                    break;
                    
                case 'unsubscribe':
                    this.handleUnsubscription(connectionId, message.channel);
                    break;
                    
                case 'ping':
                    this.sendToConnection(connectionId, { type: 'pong', timestamp: Date.now() });
                    break;
                    
                default:
                    this.sendToConnection(connectionId, {
                        type: 'error',
                        message: 'Unknown message type'
                    });
            }
        } catch (error) {
            console.error('❌ WebSocket message error:', error);
            this.sendToConnection(connectionId, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    handleSubscription(connectionId, channel, params = {}) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;
        
        connection.subscriptions.add(channel);
        
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, new Set());
        }
        
        this.subscriptions.get(channel).add(connectionId);
        
        this.sendToConnection(connectionId, {
            type: 'subscribed',
            channel,
            params
        });
        
        console.log(`📡 Connection ${connectionId} subscribed to ${channel}`);
    }

    handleUnsubscription(connectionId, channel) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;
        
        connection.subscriptions.delete(channel);
        
        if (this.subscriptions.has(channel)) {
            this.subscriptions.get(channel).delete(connectionId);
        }
        
        this.sendToConnection(connectionId, {
            type: 'unsubscribed',
            channel
        });
        
        console.log(`📡 Connection ${connectionId} unsubscribed from ${channel}`);
    }

    // Real-time Broadcasting
    broadcast(channel, data) {
        const subscribers = this.subscriptions.get(channel);
        if (!subscribers) return;
        
        const message = {
            type: 'broadcast',
            channel,
            data,
            timestamp: Date.now()
        };
        
        for (const connectionId of subscribers) {
            this.sendToConnection(connectionId, message);
        }
    }

    sendToConnection(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        
        try {
            connection.ws.send(JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`❌ Failed to send to connection ${connectionId}:`, error);
            this.cleanupConnection(connectionId);
            return false;
        }
    }

    // Connection Management
    startHeartbeat() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [connectionId, connection] of this.connections.entries()) {
                if (now - connection.lastPing > this.config.websocket.heartbeatInterval * 2) {
                    console.log(`💔 Connection ${connectionId} timed out`);
                    connection.ws.terminate();
                    this.cleanupConnection(connectionId);
                } else {
                    connection.ws.ping();
                }
            }
        }, this.config.websocket.heartbeatInterval);
    }

    cleanupConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;
        
        // Remove from all subscriptions
        for (const channel of connection.subscriptions) {
            if (this.subscriptions.has(channel)) {
                this.subscriptions.get(channel).delete(connectionId);
            }
        }
        
        this.connections.delete(connectionId);
    }

    generateConnectionId() {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // GraphQL Resolvers
    async resolveProducts(args, context) {
        // Mock implementation - replace with actual database calls
        return [
            {
                id: '1',
                name: 'Premium Crypto Course',
                description: 'Learn cryptocurrency trading',
                price: 99.99,
                currency: 'USD',
                category: 'education',
                image: '/images/course1.jpg',
                inStock: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    async resolveProduct(id, context) {
        // Mock implementation
        return {
            id,
            name: 'Premium Crypto Course',
            description: 'Learn cryptocurrency trading',
            price: 99.99,
            currency: 'USD',
            category: 'education',
            image: '/images/course1.jpg',
            inStock: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    // API Statistics
    getAPIStats() {
        return {
            websocket: {
                activeConnections: this.connections.size,
                totalSubscriptions: Array.from(this.subscriptions.values())
                    .reduce((total, subs) => total + subs.size, 0),
                channels: Array.from(this.subscriptions.keys())
            },
            rest: {
                supportedVersions: Array.from(this.apiVersions.keys()),
                defaultVersion: this.config.rest.defaultVersion
            }
        };
    }

    // Shutdown
    shutdown() {
        if (this.wsServer) {
            this.wsServer.close();
        }
        
        for (const connection of this.connections.values()) {
            connection.ws.terminate();
        }
        
        this.connections.clear();
        this.subscriptions.clear();
        
        console.log('🚀 API service shutdown completed');
    }
}

module.exports = AdvancedAPIService;