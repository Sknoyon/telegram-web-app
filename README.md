# Telegram Crypto Store

A complete Telegram Web Store with cryptocurrency payment integration using Plisio API. This project includes a Telegram bot, web app frontend, admin panel, and secure payment processing.

## 🌐 Live Demo
- **Deployed App**: https://ewhoreweb.up.railway.app
- **Store URL**: https://ewhoreweb.up.railway.app/store
- **Admin Panel**: https://ewhoreweb.up.railway.app/admin
- **GitHub Repository**: https://github.com/Sknoyon/telegram-web-app.git

## 🚀 Features

### 🤖 Telegram Bot
- Responds to `/start`, `/shop`, `/admin`, `/orders`, `/help` commands
- Sends Telegram Web App buttons for shopping
- User identification by Telegram ID
- Automatic user registration
- Payment notifications

### 🛍️ Telegram Web App (Store)
- Responsive store UI optimized for Telegram Mini Apps
- Product browsing with search functionality
- Shopping cart with quantity controls
- Crypto payment checkout
- Real-time order status

### ⚙️ Admin Panel
- Secure admin access (Telegram ID whitelist)
- Product management (add/edit/delete)
- Order management and tracking
- User management
- Sales statistics and analytics
- Daily earnings reports

### 💰 Crypto Payment Integration (Plisio)
- Multiple cryptocurrency support (BTC, ETH, LTC, etc.)
- Automatic invoice generation
- QR code payments
- Webhook payment confirmation
- Secure signature verification

### 🗄️ Database (PostgreSQL)
- Complete schema with relationships
- User management
- Product inventory
- Order tracking
- Invoice management
- Performance optimized with indexes

### 🔧 Auto-Configuration
- **Environment Detection**: Automatically detects Railway, Heroku, Vercel, AWS, or local environments
- **Smart Configuration**: Applies environment-specific settings (SSL, host binding, etc.)
- **Validation**: Checks required environment variables and displays helpful warnings
- **One-Click Railway Setup**: Automated Railway deployment with `npm run railway-setup`
- **Configuration Display**: Shows current environment settings on startup

## ⚡ Quick Start

### 🚂 Railway Deployment (Recommended)
```bash
# 1. Clone the repository
git clone https://github.com/Sknoyon/telegram-web-app.git
cd telegram-web-app

# 2. Install dependencies
npm install

# 3. Auto-setup Railway deployment
npm run railway-setup
```

### 💻 Local Development
```bash
# 1. Clone and install
git clone https://github.com/Sknoyon/telegram-web-app.git
cd telegram-web-app
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start with auto-configuration
npm start
```

The application will automatically:
- ✅ Detect your environment (Railway/Local/Production)
- ✅ Apply appropriate configurations
- ✅ Validate environment variables
- ✅ Display helpful setup information

## 📋 Prerequisites

- Node.js 18+ 
- Telegram Bot Token (from @BotFather)
- Plisio API credentials
- Railway account (for deployment)

**Note**: No external database required - uses local SQLite database file.

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <your-repo>
cd telegram-crypto-store
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Plisio API Configuration
PLISIO_SECRET_KEY=your_plisio_secret_key_here

# Admin Configuration (comma-separated Telegram IDs)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_store

# Server Configuration
PORT=3000
WEBHOOK_SECRET=your_webhook_secret_here
BASE_URL=https://your-app.railway.app

# Security
JWT_SECRET=your_jwt_secret_here

# Environment
NODE_ENV=production
```

### 3. Database Setup

```bash
# Run database migration
npm run migrate
```

### 4. Development

```bash
# Start development server
npm run dev
```

### 5. Production

```bash
# Start production server
npm start
```

## 🚀 Railway Deployment

### 1. Prepare for Deployment

1. Create a Railway account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

### 2. Deploy to Railway

```bash
# Initialize Railway project
railway init

# Add PostgreSQL database
railway add postgresql
```bash
# Set environment variables
railway variables set TELEGRAM_BOT_TOKEN=your_bot_token
railway variables set PLISIO_SECRET_KEY=your_plisio_secret
railway variables set ADMIN_TELEGRAM_IDS=your_telegram_ids
railway variables set WEBHOOK_SECRET=your_webhook_secret
railway variables set JWT_SECRET=your_jwt_secret
railway variables set NODE_ENV=production
```
# Deploy
railway up
```

### 3. Post-Deployment Setup

1. **Current Railway URL**: `https://ewhoreweb.up.railway.app`
2. **BASE_URL** is already configured in environment variables
3. Run database migration:
   ```bash
   railway run npm run migrate
   ```
4. **Set up Telegram Bot Web App**:
   - Go to @BotFather in Telegram
   - Use `/setmenubutton` command
   - Set Web App URL to: `https://ewhoreweb.up.railway.app/store`

## 📱 Telegram Bot Setup

### 1. Create Bot

1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Follow instructions to get bot token
4. Set bot commands:
   ```
   start - Welcome message and main menu
   shop - Open the store
   orders - View your orders
   admin - Admin panel (admin only)
   help - Show help information
   ```

### 2. Configure Web App

1. Use `/setmenubutton` with @BotFather
2. Set Web App URL to: `https://ewhoreweb.up.railway.app/store`
3. Alternatively, set it via bot commands in your code

## 🔐 Plisio Setup

### 1. Create Account

1. Sign up at [plisio.net](https://plisio.net)
2. Verify your account
3. Get Secret Key from dashboard

### 2. Configure Integration

1. **Integration type**: Custom
2. **Copy your Secret key** from dashboard
3. **Set Status URL**: `https://ewhoreweb.up.railway.app/webhook/plisio/status`
4. **Set Success URL**: `https://ewhoreweb.up.railway.app/payment/success`
5. **Set Failed URL**: `https://ewhoreweb.up.railway.app/payment/failed`
6. **Commission**: Site (recommended)
7. **Enable supported cryptocurrencies** (Bitcoin, Litecoin, Dogecoin, etc.)
8. **Update environment variables**:
   ```env
   PLISIO_SECRET_KEY=your_secret_key_from_dashboard
   ```
9. **Configure Railway Environment**: Add the same variables in Railway dashboard

## 🏗️ Project Structure

```
telegram-crypto-store/
├── bot/
│   └── telegram-bot.js          # Telegram bot logic
├── database/
│   └── db.js                    # Database queries and connection
├── migrations/
│   ├── schema.sql               # Database schema
│   └── migrate.js               # Migration script
├── public/
│   ├── store.html               # Store frontend
│   └── admin.html               # Admin panel frontend
├── services/
│   └── plisio.js                # Plisio API integration
├── server.js                    # Express server and API routes
├── package.json                 # Dependencies and scripts
├── railway.json                 # Railway deployment config
├── .env.example                 # Environment variables template
└── README.md                    # This file
```

## 🔧 API Endpoints

### Public Endpoints
- `GET /health` - Health check
- `GET /store` - Store frontend
- `GET /admin` - Admin panel frontend
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/orders` - Create order and invoice
- `GET /api/orders/user/:telegram_id` - Get user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/webhook/plisio` - Plisio payment webhook

### Admin Endpoints (require admin Telegram ID)
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/users` - Get all users

## 🔒 Security Features

- Helmet.js for security headers
- Rate limiting on API endpoints
- CORS configuration
- Input validation and sanitization
- Webhook signature verification
- Admin access control
- SQL injection prevention
- XSS protection

## 📊 Database Schema

### Tables
- **users** - User information and admin status
- **products** - Product catalog with pricing and inventory
- **orders** - Order tracking and status
- **order_items** - Individual items within orders
- **invoices** - Payment invoices and crypto transaction data

### Key Features
- Foreign key relationships
- Indexes for performance
- Automatic timestamps
- Soft delete for products
- Transaction support for order creation

## 🎯 Usage

### For Customers
1. Start the bot in Telegram
2. Use `/shop` or click "Open Store" button
3. Browse products and add to cart
4. Checkout with preferred cryptocurrency
5. Complete payment using provided address/QR code
6. Receive confirmation and digital products

### For Admins
1. Use `/admin` command in Telegram
2. Access admin panel via Web App
3. Manage products, orders, and view analytics
4. Monitor payments and customer activity

## 🐛 Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check TELEGRAM_BOT_TOKEN
   - Verify bot is started with `/start`
   - Check server logs

2. **Payment webhook not working**
   - Verify PLISIO_SECRET_KEY
   - Check webhook URL in Plisio dashboard
   - Monitor webhook logs

3. **Database connection issues**
   - Verify DATABASE_URL
   - Check PostgreSQL service status
   - Run migration script

4. **Admin access denied**
   - Verify Telegram ID in ADMIN_TELEGRAM_IDS
   - Check comma separation in environment variable

### Logs

Monitor application logs:
```bash
# Railway logs
railway logs

# Local development
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check troubleshooting section
- Review Railway and Plisio documentation

## 🔄 Updates

To update the application:
1. Pull latest changes
2. Run `npm install` for new dependencies
3. Run migrations if database schema changed
4. Restart the application

---

**Built with ❤️ for the crypto community**