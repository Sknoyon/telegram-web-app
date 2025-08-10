const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
    console.log('🔗 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

// User operations
const userQueries = {
    async findByTelegramId(telegramId) {
        const query = 'SELECT * FROM users WHERE telegram_id = $1';
        const result = await pool.query(query, [telegramId]);
        return result.rows[0];
    },

    async create(userData) {
        const { telegram_id, username, first_name, last_name } = userData;
        const query = `
            INSERT INTO users (telegram_id, username, first_name, last_name, is_admin)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.split(',').includes(telegram_id.toString()) || false;
        const result = await pool.query(query, [telegram_id, username, first_name, last_name, isAdmin]);
        return result.rows[0];
    },

    async updateLastActive(telegramId) {
        const query = 'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = $1';
        await pool.query(query, [telegramId]);
    },

    async getAll() {
        const query = 'SELECT * FROM users ORDER BY joined_at DESC';
        const result = await pool.query(query);
        return result.rows;
    }
};

// Product operations
const productQueries = {
    async getAll() {
        const query = 'SELECT * FROM products WHERE is_active = true ORDER BY created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    },

    async getById(id) {
        const query = 'SELECT * FROM products WHERE id = $1 AND is_active = true';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async create(productData) {
        const { name, description, price_usd, image_url, stock } = productData;
        const query = `
            INSERT INTO products (name, description, price_usd, image_url, stock)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price_usd, image_url, stock]);
        return result.rows[0];
    },

    async update(id, productData) {
        const { name, description, price_usd, image_url, stock } = productData;
        const query = `
            UPDATE products 
            SET name = $1, description = $2, price_usd = $3, image_url = $4, stock = $5
            WHERE id = $6
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price_usd, image_url, stock, id]);
        return result.rows[0];
    },

    async delete(id) {
        const query = 'UPDATE products SET is_active = false WHERE id = $1';
        await pool.query(query, [id]);
    },

    async updateStock(id, quantity) {
        const query = 'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1';
        const result = await pool.query(query, [quantity, id]);
        return result.rowCount > 0;
    }
};

// Order operations
const orderQueries = {
    async create(userId, items, totalPrice) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create order
            const orderQuery = `
                INSERT INTO orders (user_id, total_price)
                VALUES ($1, $2)
                RETURNING *
            `;
            const orderResult = await client.query(orderQuery, [userId, totalPrice]);
            const order = orderResult.rows[0];
            
            // Create order items
            for (const item of items) {
                const itemQuery = `
                    INSERT INTO order_items (order_id, product_id, quantity, price_per_item, total_price)
                    VALUES ($1, $2, $3, $4, $5)
                `;
                await client.query(itemQuery, [
                    order.id,
                    item.product_id,
                    item.quantity,
                    item.price_per_item,
                    item.total_price
                ]);
            }
            
            await client.query('COMMIT');
            return order;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getById(id) {
        const query = `
            SELECT o.*, u.telegram_id, u.username, u.first_name, u.last_name,
                   json_agg(
                       json_build_object(
                           'product_id', oi.product_id,
                           'product_name', p.name,
                           'quantity', oi.quantity,
                           'price_per_item', oi.price_per_item,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = $1
            GROUP BY o.id, u.telegram_id, u.username, u.first_name, u.last_name
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    async updateStatus(id, status) {
        const query = 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';
        const result = await pool.query(query, [status, id]);
        return result.rows[0];
    },

    async getByUser(userId) {
        const query = `
            SELECT o.*, 
                   json_agg(
                       json_build_object(
                           'product_name', p.name,
                           'quantity', oi.quantity,
                           'price_per_item', oi.price_per_item
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    async getAll() {
        const query = `
            SELECT o.*, u.telegram_id, u.username, u.first_name,
                   json_agg(
                       json_build_object(
                           'product_name', p.name,
                           'quantity', oi.quantity,
                           'total_price', oi.total_price
                       )
                   ) as items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id, u.telegram_id, u.username, u.first_name
            ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }
};

// Invoice operations
const invoiceQueries = {
    async create(invoiceData) {
        const {
            order_id,
            plisio_invoice_id,
            currency,
            amount,
            amount_usd,
            invoice_url,
            qr_code_url,
            wallet_hash,
            expires_at
        } = invoiceData;
        
        const query = `
            INSERT INTO invoices (
                order_id, plisio_invoice_id, currency, amount, amount_usd,
                invoice_url, qr_code_url, wallet_hash, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            order_id, plisio_invoice_id, currency, amount, amount_usd,
            invoice_url, qr_code_url, wallet_hash, expires_at
        ]);
        return result.rows[0];
    },

    async updateStatus(plisioInvoiceId, status, paidAt = null) {
        const query = `
            UPDATE invoices 
            SET status = $1, paid_at = $2
            WHERE plisio_invoice_id = $3
            RETURNING *
        `;
        const result = await pool.query(query, [status, paidAt, plisioInvoiceId]);
        return result.rows[0];
    },

    async getByPlisioId(plisioInvoiceId) {
        const query = 'SELECT * FROM invoices WHERE plisio_invoice_id = $1';
        const result = await pool.query(query, [plisioInvoiceId]);
        return result.rows[0];
    },

    async getByOrderId(orderId) {
        const query = 'SELECT * FROM invoices WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await pool.query(query, [orderId]);
        return result.rows[0];
    }
};

// Statistics
const statsQueries = {
    async getDailyEarnings() {
        const query = `
            SELECT 
                DATE(o.created_at) as date,
                COUNT(o.id) as orders_count,
                SUM(o.total_price) as total_earnings
            FROM orders o
            WHERE o.status = 'paid' AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(o.created_at)
            ORDER BY date DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    async getTotalStats() {
        const query = `
            SELECT 
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_paid_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_price END), 0) as total_revenue,
                COUNT(DISTINCT user_id) as unique_customers
            FROM orders
        `;
        const result = await pool.query(query);
        return result.rows[0];
    }
};

module.exports = {
    pool,
    userQueries,
    productQueries,
    orderQueries,
    invoiceQueries,
    statsQueries
};