const { Telegraf, Markup } = require('telegraf');
const { userQueries, orderQueries, productQueries, invoiceQueries, purchasedProductQueries, statsQueries } = require('../database/db');
const PlisioService = require('../services/plisio');
require('dotenv').config();

class TelegramBot {
    constructor(config = null) {
        this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        this.plisio = new PlisioService();
        this.adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id)) || [];
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.config = config;
        this.mockMode = config?.database?.mockMode || false;
        
        this.setupCommands();
        this.setupMiddleware();
    }

    setupMiddleware() {
        // User registration middleware
        this.bot.use(async (ctx, next) => {
            if (ctx.from) {
                if (this.mockMode) {
                    // Create a mock user object when database is not available
                    ctx.user = {
                        id: 1,
                        telegram_id: ctx.from.id,
                        username: ctx.from.username,
                        first_name: ctx.from.first_name,
                        last_name: ctx.from.last_name,
                        created_at: new Date(),
                        last_active: new Date()
                    };
                    console.log(`👤 Mock user created: ${ctx.user.first_name} (${ctx.user.telegram_id})`);
                } else {
                    try {
                        let user = await userQueries.findByTelegramId(ctx.from.id);
                        
                        if (!user) {
                            user = await userQueries.create({
                                telegram_id: ctx.from.id,
                                username: ctx.from.username,
                                first_name: ctx.from.first_name,
                                last_name: ctx.from.last_name
                            });
                            console.log(`👤 New user registered: ${user.first_name} (${user.telegram_id})`);
                        } else {
                            await userQueries.updateLastActive(ctx.from.id);
                        }
                        
                        ctx.user = user;
                    } catch (error) {
                        console.error('❌ Error in user middleware:', error);
                    }
                }
            }
            return next();
        });

        // Admin check middleware
        this.bot.use((ctx, next) => {
            ctx.isAdmin = this.adminIds.includes(ctx.from?.id);
            return next();
        });
    }

    setupCommands() {
        // Start command
        this.bot.command('start', async (ctx) => {
            const welcomeMessage = `🛍️ *Welcome to Crypto Store!*\n\n` +
                `Hi ${ctx.from.first_name}! Welcome to our premium digital store where you can purchase products using cryptocurrency.\n\n` +
                `🔹 Browse our products\n` +
                `🔹 Pay with Bitcoin, Ethereum, and more\n` +
                `🔹 Instant delivery for digital products\n\n` +
                `Use the buttons below to get started:`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🛒 Open Store', `${this.baseUrl}/store`)],
                [Markup.button.callback('📋 My Orders', 'my_orders'), Markup.button.callback('📥 My Downloads', 'my_downloads')],
                ctx.isAdmin ? [Markup.button.callback('⚙️ Admin Panel', 'admin_panel')] : []
            ].filter(row => row.length > 0));

            await ctx.reply(welcomeMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        });

        // Shop command
        this.bot.command('shop', async (ctx) => {
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('🛒 Open Store', `${this.baseUrl}/store`)]
            ]);

            await ctx.reply('🛍️ *Open our store to browse products:*', {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        });

        // Admin command
        this.bot.command('admin', async (ctx) => {
            if (!ctx.isAdmin) {
                return ctx.reply('❌ You are not authorized to access admin features.');
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('⚙️ Admin Panel', `${this.baseUrl}/admin`)]
            ]);

            await ctx.reply('🔧 *Admin Panel Access:*', {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        });

        // Help command
        this.bot.command('help', async (ctx) => {
            const helpMessage = `🆘 *Help & Commands*\n\n` +
                `*Available Commands:*\n` +
                `• /start - Welcome message and main menu\n` +
                `• /shop - Open the store\n` +
                `• /orders - View your orders\n` +
                `• /help - Show this help message\n\n` +
                `*How to Purchase:*\n` +
                `1. Click "Open Store" to browse products\n` +
                `2. Add items to cart and checkout\n` +
                `3. Pay with your preferred cryptocurrency\n` +
                `4. Receive your digital products instantly\n\n` +
                `*Supported Cryptocurrencies:*\n` +
                `• Bitcoin (BTC)\n` +
                `• Ethereum (ETH)\n` +
                `• Litecoin (LTC)\n` +
                `• And many more!\n\n` +
                `Need assistance? Contact our support team.`;

            await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
        });

        // Orders command
        this.bot.command('orders', async (ctx) => {
            await this.showUserOrders(ctx);
        });

        // My Downloads command
        this.bot.command('downloads', async (ctx) => {
            await this.showUserDownloads(ctx);
        });

        // Admin product management commands
        this.bot.command('addproduct', async (ctx) => {
            if (!ctx.isAdmin) {
                return ctx.reply('❌ You are not authorized to use this command.');
            }
            await this.startAddProduct(ctx);
        });

        this.bot.command('products', async (ctx) => {
            if (!ctx.isAdmin) {
                return ctx.reply('❌ You are not authorized to use this command.');
            }
            await this.showAdminProducts(ctx);
        });

        // Callback query handlers
        this.bot.action('my_orders', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showUserOrders(ctx);
        });

        this.bot.action('admin_panel', async (ctx) => {
            await ctx.answerCbQuery();
            if (!ctx.isAdmin) {
                return ctx.reply('❌ Access denied.');
            }
            await this.showAdminPanel(ctx);
        });

        this.bot.action(/^order_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const orderId = parseInt(ctx.match[1]);
            await this.showOrderDetails(ctx, orderId);
        });

        this.bot.action(/^resend_invoice_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            if (!ctx.isAdmin) {
                return ctx.reply('❌ Access denied.');
            }
            const orderId = parseInt(ctx.match[1]);
            await this.resendInvoice(ctx, orderId);
        });

        this.bot.action('my_downloads', async (ctx) => {
            await ctx.answerCbQuery();
            await this.showUserDownloads(ctx);
        });

        this.bot.action(/^download_(\d+)$/, async (ctx) => {
            await ctx.answerCbQuery();
            const productId = parseInt(ctx.match[1]);
            await this.sendMegaLink(ctx, productId);
        });

        // Error handling
        this.bot.catch((err, ctx) => {
            console.error('❌ Bot error:', err);
            ctx.reply('❌ An error occurred. Please try again later.');
        });
    }

    async showUserOrders(ctx) {
        try {
            if (!ctx.user) {
                return ctx.reply('❌ User not found. Please try /start command first.');
            }
            
            const orders = await orderQueries.getByUser(ctx.user.id);
            
            if (orders.length === 0) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('🛒 Start Shopping', `${this.baseUrl}/store`)]
                ]);
                
                return ctx.reply('📋 *Your Orders*\n\nYou haven\'t placed any orders yet. Start shopping to see your orders here!', {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            }

            let message = '📋 *Your Orders*\n\n';
            const buttons = [];

            for (const order of orders.slice(0, 10)) { // Show last 10 orders
                const statusEmoji = {
                    'pending': '⏳',
                    'paid': '✅',
                    'cancelled': '❌',
                    'refunded': '🔄'
                }[order.status] || '❓';

                const date = new Date(order.created_at).toLocaleDateString();
                const items = order.items.map(item => item.product_name).join(', ');
                
                message += `${statusEmoji} *Order #${order.id}*\n`;
                message += `📅 ${date}\n`;
                message += `💰 $${order.total_price}\n`;
                message += `📦 ${items}\n\n`;

                buttons.push([Markup.button.callback(`View Order #${order.id}`, `order_${order.id}`)]);
            }

            buttons.push([Markup.button.webApp('🛒 Continue Shopping', `${this.baseUrl}/store`)]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            });
        } catch (error) {
            console.error('❌ Error showing user orders:', error);
            ctx.reply('❌ Error loading orders. Please try again.');
        }
    }

    async showOrderDetails(ctx, orderId) {
        try {
            if (!ctx.user) {
                return ctx.reply('❌ User not found. Please try /start command first.');
            }
            
            const order = await orderQueries.getById(orderId);
            
            if (!order || (order.user_id !== ctx.user.id && !ctx.isAdmin)) {
                return ctx.reply('❌ Order not found or access denied.');
            }

            const invoice = await invoiceQueries.getByOrderId(orderId);
            
            const statusEmoji = {
                'pending': '⏳',
                'paid': '✅',
                'cancelled': '❌',
                'refunded': '🔄'
            }[order.status] || '❓';

            let message = `📋 *Order Details #${order.id}*\n\n`;
            message += `${statusEmoji} Status: ${order.status.toUpperCase()}\n`;
            message += `📅 Date: ${new Date(order.created_at).toLocaleString()}\n`;
            message += `👤 Customer: ${order.first_name} ${order.last_name || ''}\n`;
            message += `💰 Total: $${order.total_price}\n\n`;
            
            message += `*Items:*\n`;
            order.items.forEach(item => {
                message += `• ${item.product_name} x${item.quantity} - $${item.total_price}\n`;
            });

            const buttons = [];
            
            if (invoice && order.status === 'pending') {
                message += `\n💳 *Payment Info:*\n`;
                message += `Currency: ${invoice.currency}\n`;
                message += `Amount: ${invoice.amount} ${invoice.currency}\n`;
                
                if (invoice.invoice_url) {
                    buttons.push([Markup.button.url('💳 Pay Now', invoice.invoice_url)]);
                }
            }

            if (ctx.isAdmin && order.status === 'pending') {
                buttons.push([Markup.button.callback('🔄 Resend Invoice', `resend_invoice_${orderId}`)]);
            }

            // Show download links for paid orders
            if (order.status === 'paid') {
                message += `\n🎉 *Payment Completed!*\n`;
                message += `Your digital products are ready for download:\n\n`;
                
                for (const item of order.items) {
                    const product = await productQueries.getById(item.product_id);
                    if (product && product.mega_link) {
                        buttons.push([Markup.button.callback(`📥 Download ${item.product_name}`, `download_${item.product_id}`)]);
                    }
                }
            }

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: buttons.length > 0 ? Markup.inlineKeyboard(buttons).reply_markup : undefined
            });
        } catch (error) {
            console.error('❌ Error showing order details:', error);
            ctx.reply('❌ Error loading order details.');
        }
    }

    async showAdminPanel(ctx) {
        try {
            const stats = await statsQueries.getTotalStats();
            
            let message = `⚙️ *Admin Panel*\n\n`;
            message += `📊 *Statistics:*\n`;
            message += `• Total Revenue: $${stats.total_revenue}\n`;
            message += `• Paid Orders: ${stats.total_paid_orders}\n`;
            message += `• Pending Orders: ${stats.pending_orders}\n`;
            message += `• Unique Customers: ${stats.unique_customers}\n\n`;
            
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('📊 Full Admin Panel', `${this.baseUrl}/admin`)],
                [Markup.button.callback('📋 Recent Orders', 'admin_orders')],
                [Markup.button.callback('📈 Daily Stats', 'daily_stats')]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        } catch (error) {
            console.error('❌ Error showing admin panel:', error);
            ctx.reply('❌ Error loading admin panel.');
        }
    }

    async resendInvoice(ctx, orderId) {
        try {
            const order = await orderQueries.getById(orderId);
            if (!order) {
                return ctx.reply('❌ Order not found.');
            }

            const invoice = await invoiceQueries.getByOrderId(orderId);
            if (!invoice) {
                return ctx.reply('❌ No invoice found for this order.');
            }

            const message = `💳 *Payment Invoice Resent*\n\n` +
                `Order #${orderId}\n` +
                `Amount: ${invoice.amount} ${invoice.currency}\n` +
                `Status: ${order.status.toUpperCase()}\n\n` +
                `Please complete your payment using the link below:`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('💳 Pay Now', invoice.invoice_url)]
            ]);

            // Send to customer
            await this.bot.telegram.sendMessage(order.telegram_id, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });

            await ctx.reply(`✅ Invoice resent to customer for Order #${orderId}`);
        } catch (error) {
            console.error('❌ Error resending invoice:', error);
            ctx.reply('❌ Error resending invoice.');
        }
    }

    async notifyPaymentReceived(orderId) {
        try {
            const order = await orderQueries.getById(orderId);
            if (!order) {
                console.error('❌ Order not found for notification:', orderId);
                return;
            }

            const user = await userQueries.findByTelegramId(order.telegram_id);
            if (!user) {
                console.error('❌ User not found for notification:', order.telegram_id);
                return;
            }

            // Add products to purchased_products table
            for (const item of order.items) {
                await purchasedProductQueries.create(user.id, item.product_id, orderId);
            }

            const message = `🎉 *Payment Received!*\n\n` +
                `Your order #${order.id} has been paid successfully!\n` +
                `Total: $${order.total_price}\n\n` +
                `Your digital products are now available for download! 📥\n\n` +
                `Thank you for your purchase! 🙏`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Order', `order_${orderId}`)],
                [Markup.button.callback('📥 My Downloads', 'my_downloads')]
            ]);

            await this.bot.telegram.sendMessage(order.telegram_id, message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });

            console.log(`✅ Payment notification sent to user ${order.telegram_id} for order ${orderId}`);
        } catch (error) {
            console.error('❌ Error sending payment notification:', error);
        }
    }

    async showUserDownloads(ctx) {
        try {
            if (!ctx.user) {
                return ctx.reply('❌ User not found. Please try /start command first.');
            }
            
            const purchasedProducts = await purchasedProductQueries.getUserPurchasedProducts(ctx.user.id);
            
            if (purchasedProducts.length === 0) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('🛒 Start Shopping', `${this.baseUrl}/store`)]
                ]);
                
                return ctx.reply('📥 *Your Downloads*\n\nYou haven\'t purchased any digital products yet. Start shopping to see your downloads here!', {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            }

            let message = '📥 *Your Downloads*\n\n';
            const buttons = [];

            for (const item of purchasedProducts) {
                const product = await productQueries.getById(item.product_id);
                if (product) {
                    const purchaseDate = new Date(item.created_at).toLocaleDateString();
                    
                    message += `📦 *${product.name}*\n`;
                    message += `📅 Purchased: ${purchaseDate}\n`;
                    message += `💰 Price: $${product.price}\n\n`;

                    if (product.mega_link) {
                        buttons.push([Markup.button.callback(`📥 Download ${product.name}`, `download_${product.id}`)]);
                    }
                }
            }

            buttons.push([Markup.button.webApp('🛒 Continue Shopping', `${this.baseUrl}/store`)]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            });
        } catch (error) {
            console.error('❌ Error showing user downloads:', error);
            ctx.reply('❌ Error loading downloads. Please try again.');
        }
    }

    async sendMegaLink(ctx, productId) {
        try {
            if (!ctx.user) {
                return ctx.reply('❌ User not found. Please try /start command first.');
            }
            
            // Check if user has purchased this product
             const hasPurchased = await purchasedProductQueries.hasAccess(ctx.user.id, productId);
            
            if (!hasPurchased) {
                return ctx.reply('❌ You haven\'t purchased this product.');
            }

            const product = await productQueries.getById(productId);
            if (!product || !product.mega_link) {
                return ctx.reply('❌ Download link not available for this product.');
            }

            const message = `📥 *Download Link*\n\n` +
                `Product: *${product.name}*\n` +
                `Size: ${product.file_size || 'N/A'}\n\n` +
                `Click the button below to download your product:\n\n` +
                `⚠️ *Important:* This link is for your personal use only. Please do not share it with others.`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('📥 Download Now', product.mega_link)]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });

            console.log(`📥 Download link sent to user ${ctx.user.id} for product ${productId}`);
        } catch (error) {
            console.error('❌ Error sending mega link:', error);
            ctx.reply('❌ Error accessing download link. Please try again.');
        }
    }

    async startAddProduct(ctx) {
        try {
            const message = `📦 *Add New Product*\n\n` +
                `Use the admin panel to add new products with all details including:\n\n` +
                `• Product name and description\n` +
                `• Price and category\n` +
                `• Images and files\n` +
                `• Mega.nz download links\n\n` +
                `Click the button below to access the full admin panel:`;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('⚙️ Open Admin Panel', `${this.baseUrl}/admin`)]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        } catch (error) {
            console.error('❌ Error in startAddProduct:', error);
            ctx.reply('❌ Error accessing product management.');
        }
    }

    async showAdminProducts(ctx) {
        try {
            const products = await productQueries.getAll();
            
            if (products.length === 0) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('➕ Add First Product', `${this.baseUrl}/admin`)]
                ]);
                
                return ctx.reply('📦 *Product Management*\n\nNo products found. Add your first product using the admin panel!', {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup
                });
            }

            let message = `📦 *Product Management*\n\n`;
            message += `Total Products: ${products.length}\n\n`;

            for (const product of products.slice(0, 10)) { // Show first 10 products
                const status = product.is_active ? '✅' : '❌';
                message += `${status} *${product.name}*\n`;
                message += `💰 $${product.price}\n`;
                message += `📂 ${product.category || 'Uncategorized'}\n`;
                message += `🔗 ${product.mega_link ? 'Has download link' : 'No download link'}\n\n`;
            }

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.webApp('⚙️ Manage Products', `${this.baseUrl}/admin`)],
                [Markup.button.webApp('➕ Add New Product', `${this.baseUrl}/admin`)]
            ]);

            await ctx.reply(message, {
                parse_mode: 'Markdown',
                reply_markup: keyboard.reply_markup
            });
        } catch (error) {
            console.error('❌ Error showing admin products:', error);
            ctx.reply('❌ Error loading products.');
        }
    }

    async start() {
        try {
            if (this.mockMode) {
                console.log('🤖 Telegram bot started in mock mode (database unavailable)');
                return;
            }
            
            // Check if we should use webhooks (production/Railway) or polling (local)
            const useWebhook = process.env.NODE_ENV === 'production' && process.env.BASE_URL;
            
            if (useWebhook) {
                // Set up webhook for production
                const webhookUrl = `${process.env.BASE_URL}/webhook`;
                console.log(`🔗 Setting up Telegram webhook: ${webhookUrl}`);
                
                try {
                    await this.bot.telegram.setWebhook(webhookUrl);
                    console.log('✅ Telegram webhook set successfully');
                    
                    // Verify webhook was set
                    const webhookInfo = await this.bot.telegram.getWebhookInfo();
                    console.log(`📡 Webhook info: ${webhookInfo.url}, pending: ${webhookInfo.pending_update_count}`);
                } catch (webhookError) {
                    console.error('❌ Failed to set webhook:', webhookError);
                    throw webhookError;
                }
            } else {
                // Use polling for local development
                console.log('🔄 Starting bot with polling mode (local development)');
                
                // Add timeout to prevent hanging
                const launchPromise = this.bot.launch({
                    polling: {
                        timeout: 30,
                        limit: 100,
                        allowedUpdates: ['message', 'callback_query']
                    }
                });
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Bot launch timeout after 10 seconds')), 10000);
                });
                
                await Promise.race([launchPromise, timeoutPromise]);
            }
            
            console.log('🤖 Telegram bot started successfully');
            
            // Graceful stop
            process.once('SIGINT', () => this.bot.stop('SIGINT'));
            process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        } catch (error) {
            console.error('❌ Failed to start Telegram bot:', error);
            throw error;
        }
    }

    getBot() {
        return this.bot;
    }
}

module.exports = TelegramBot;