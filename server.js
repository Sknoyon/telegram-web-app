const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bodyParser = require('body-parser');
const TelegramBot = require('./bot/telegram-bot');
const PlisioService = require('./services/plisio');
const { 
    userQueries, 
    productQueries, 
    orderQueries, 
    invoiceQueries, 
    statsQueries 
} = require('./database/db');
require('dotenv').config();

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.telegramBot = new TelegramBot();
        this.plisio = new PlisioService();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https:"],
                    frameSrc: ["'none'"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? [process.env.BASE_URL, 'https://web.telegram.org']
                : true,
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP'
        });
        this.app.use('/api/', limiter);

        // Body parsing
        this.app.use(bodyParser.json({ limit: '10mb' }));
        this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

        // Static files
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: new Date().toISOString() });
        });

        // Serve frontend pages
        this.app.get('/store', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'store.html'));
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });

        // API Routes
        this.setupProductRoutes();
        this.setupOrderRoutes();
        this.setupWebhookRoutes();
        this.setupAdminRoutes();

        // 404 handler
        this.app.use('*', (req, res) => {
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

    setupProductRoutes() {
        // Get all products
        this.app.get('/api/products', async (req, res) => {
            try {
                const products = await productQueries.getAll();
                res.json({ success: true, data: products });
            } catch (error) {
                console.error('❌ Error fetching products:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch products' });
            }
        });

        // Get single product
        this.app.get('/api/products/:id', async (req, res) => {
            try {
                const product = await productQueries.getById(req.params.id);
                if (!product) {
                    return res.status(404).json({ success: false, error: 'Product not found' });
                }
                res.json({ success: true, data: product });
            } catch (error) {
                console.error('❌ Error fetching product:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch product' });
            }
        });

        // Create product (admin only)
        this.app.post('/api/products', this.adminAuth, async (req, res) => {
            try {
                const { name, description, price_usd, image_url, stock } = req.body;
                
                if (!name || !price_usd) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Name and price are required' 
                    });
                }

                const product = await productQueries.create({
                    name,
                    description,
                    price_usd: parseFloat(price_usd),
                    image_url,
                    stock: parseInt(stock) || 0
                });

                res.status(201).json({ success: true, data: product });
            } catch (error) {
                console.error('❌ Error creating product:', error);
                res.status(500).json({ success: false, error: 'Failed to create product' });
            }
        });

        // Update product (admin only)
        this.app.put('/api/products/:id', this.adminAuth, async (req, res) => {
            try {
                const { name, description, price_usd, image_url, stock } = req.body;
                
                const product = await productQueries.update(req.params.id, {
                    name,
                    description,
                    price_usd: parseFloat(price_usd),
                    image_url,
                    stock: parseInt(stock)
                });

                if (!product) {
                    return res.status(404).json({ success: false, error: 'Product not found' });
                }

                res.json({ success: true, data: product });
            } catch (error) {
                console.error('❌ Error updating product:', error);
                res.status(500).json({ success: false, error: 'Failed to update product' });
            }
        });

        // Delete product (admin only)
        this.app.delete('/api/products/:id', this.adminAuth, async (req, res) => {
            try {
                await productQueries.delete(req.params.id);
                res.json({ success: true, message: 'Product deleted successfully' });
            } catch (error) {
                console.error('❌ Error deleting product:', error);
                res.status(500).json({ success: false, error: 'Failed to delete product' });
            }
        });
    }

    setupOrderRoutes() {
        // Create order and invoice
        this.app.post('/api/orders', async (req, res) => {
            try {
                const { telegram_id, items, currency = 'BTC' } = req.body;
                
                if (!telegram_id || !items || !Array.isArray(items) || items.length === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Telegram ID and items are required' 
                    });
                }

                // Find user
                const user = await userQueries.findByTelegramId(telegram_id);
                if (!user) {
                    return res.status(404).json({ success: false, error: 'User not found' });
                }

                // Validate and calculate total
                let totalPrice = 0;
                const orderItems = [];

                for (const item of items) {
                    const product = await productQueries.getById(item.product_id);
                    if (!product) {
                        return res.status(400).json({ 
                            success: false, 
                            error: `Product ${item.product_id} not found` 
                        });
                    }

                    if (product.stock < item.quantity) {
                        return res.status(400).json({ 
                            success: false, 
                            error: `Insufficient stock for ${product.name}` 
                        });
                    }

                    const itemTotal = product.price_usd * item.quantity;
                    totalPrice += itemTotal;

                    orderItems.push({
                        product_id: product.id,
                        quantity: item.quantity,
                        price_per_item: product.price_usd,
                        total_price: itemTotal
                    });
                }

                // Create order
                const order = await orderQueries.create(user.id, orderItems, totalPrice);

                // Create Plisio invoice
                const invoiceData = {
                    currency,
                    amount: totalPrice,
                    order_name: `Order #${order.id}`,
                    order_number: order.id.toString(),
                    callback_url: `${process.env.BASE_URL}/api/webhook/plisio`,
                    success_url: `${process.env.BASE_URL}/store?success=1&order=${order.id}`,
                    fail_url: `${process.env.BASE_URL}/store?failed=1&order=${order.id}`
                };

                const plisioInvoice = await this.plisio.createInvoice(invoiceData);

                // Save invoice to database
                const invoice = await invoiceQueries.create({
                    order_id: order.id,
                    plisio_invoice_id: plisioInvoice.txn_id,
                    currency: plisioInvoice.currency,
                    amount: parseFloat(plisioInvoice.amount),
                    amount_usd: totalPrice,
                    invoice_url: plisioInvoice.invoice_url,
                    qr_code_url: plisioInvoice.qr_code,
                    wallet_hash: plisioInvoice.wallet_hash,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                });

                // Update product stock
                for (const item of orderItems) {
                    await productQueries.updateStock(item.product_id, item.quantity);
                }

                res.status(201).json({ 
                    success: true, 
                    data: { 
                        order, 
                        invoice: {
                            id: invoice.id,
                            currency: invoice.currency,
                            amount: invoice.amount,
                            invoice_url: invoice.invoice_url,
                            qr_code_url: invoice.qr_code_url
                        }
                    } 
                });
            } catch (error) {
                console.error('❌ Error creating order:', error);
                res.status(500).json({ success: false, error: 'Failed to create order' });
            }
        });

        // Get user orders
        this.app.get('/api/orders/user/:telegram_id', async (req, res) => {
            try {
                const user = await userQueries.findByTelegramId(req.params.telegram_id);
                if (!user) {
                    return res.status(404).json({ success: false, error: 'User not found' });
                }

                const orders = await orderQueries.getByUser(user.id);
                res.json({ success: true, data: orders });
            } catch (error) {
                console.error('❌ Error fetching user orders:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch orders' });
            }
        });

        // Get order details
        this.app.get('/api/orders/:id', async (req, res) => {
            try {
                const order = await orderQueries.getById(req.params.id);
                if (!order) {
                    return res.status(404).json({ success: false, error: 'Order not found' });
                }

                const invoice = await invoiceQueries.getByOrderId(order.id);
                res.json({ success: true, data: { order, invoice } });
            } catch (error) {
                console.error('❌ Error fetching order:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch order' });
            }
        });
    }

    setupWebhookRoutes() {
        // Plisio webhook
        this.app.post('/api/webhook/plisio', async (req, res) => {
            try {
                console.log('📨 Received Plisio webhook:', req.body);
                
                // Verify webhook signature
                const signature = req.headers['x-plisio-signature'] || req.body.verify_hash;
                if (!this.plisio.verifyWebhookSignature(req.body, signature)) {
                    console.error('❌ Invalid webhook signature');
                    return res.status(401).json({ error: 'Invalid signature' });
                }

                const webhookData = this.plisio.processWebhook(req.body);
                
                // Find invoice
                const invoice = await invoiceQueries.getByPlisioId(webhookData.invoiceId);
                if (!invoice) {
                    console.error('❌ Invoice not found:', webhookData.invoiceId);
                    return res.status(404).json({ error: 'Invoice not found' });
                }

                // Update invoice status
                await invoiceQueries.updateStatus(
                    webhookData.invoiceId, 
                    webhookData.status,
                    webhookData.isPaid ? new Date() : null
                );

                // Update order status if paid
                if (webhookData.isPaid) {
                    await orderQueries.updateStatus(invoice.order_id, 'paid');
                    
                    // Notify user and admin
                    await this.telegramBot.notifyPaymentReceived(invoice.order_id);
                    
                    console.log(`✅ Payment confirmed for order ${invoice.order_id}`);
                }

                res.json({ success: true, message: 'Webhook processed' });
            } catch (error) {
                console.error('❌ Webhook processing error:', error);
                res.status(500).json({ error: 'Webhook processing failed' });
            }
        });
    }

    setupAdminRoutes() {
        // Get all orders (admin only)
        this.app.get('/api/admin/orders', this.adminAuth, async (req, res) => {
            try {
                const orders = await orderQueries.getAll();
                res.json({ success: true, data: orders });
            } catch (error) {
                console.error('❌ Error fetching admin orders:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch orders' });
            }
        });

        // Get statistics (admin only)
        this.app.get('/api/admin/stats', this.adminAuth, async (req, res) => {
            try {
                const totalStats = await statsQueries.getTotalStats();
                const dailyEarnings = await statsQueries.getDailyEarnings();
                
                res.json({ 
                    success: true, 
                    data: { 
                        total: totalStats, 
                        daily: dailyEarnings 
                    } 
                });
            } catch (error) {
                console.error('❌ Error fetching admin stats:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
            }
        });

        // Get all users (admin only)
        this.app.get('/api/admin/users', this.adminAuth, async (req, res) => {
            try {
                const users = await userQueries.getAll();
                res.json({ success: true, data: users });
            } catch (error) {
                console.error('❌ Error fetching users:', error);
                res.status(500).json({ success: false, error: 'Failed to fetch users' });
            }
        });
    }

    // Admin authentication middleware
    adminAuth = (req, res, next) => {
        const telegramId = req.headers['x-telegram-id'];
        const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id)) || [];
        
        if (!telegramId || !adminIds.includes(parseInt(telegramId))) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }
        
        next();
    };

    async start() {
        try {
            // Try to start Telegram bot
            try {
                await this.telegramBot.start();
                console.log('✅ Telegram bot started successfully');
            } catch (botError) {
                console.warn('⚠️ Telegram bot failed to start (likely invalid token):', botError.message);
                console.log('📝 Server will continue running for development/testing');
            }
            
            // Start Express server
            this.app.listen(this.port, () => {
                console.log(`🚀 Server running on port ${this.port}`);
                console.log(`🌐 Store URL: ${process.env.BASE_URL}/store`);
                console.log(`⚙️ Admin URL: ${process.env.BASE_URL}/admin`);
                console.log('\n📋 To use this application:');
                console.log('1. Set valid TELEGRAM_BOT_TOKEN in .env file');
                console.log('2. Set valid PLISIO_API_KEY and PLISIO_SECRET_KEY in .env file');
                console.log('3. Configure DATABASE_URL for PostgreSQL connection');
                console.log('4. Add your Telegram ID to ADMIN_TELEGRAM_IDS');
            });
        } catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start server if this file is run directly
if (require.main === module) {
    const server = new Server();
    server.start();
}

module.exports = Server;