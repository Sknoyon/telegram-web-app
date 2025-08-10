# Railway Deployment Guide 🚀

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository with your code

## Step 1: Create Railway Project
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `telegram-web-app` repository

## Step 2: Add PostgreSQL Database
1. In your Railway project dashboard
2. Click "+ New Service"
3. Select "Database" → "PostgreSQL"
4. Railway will automatically create a PostgreSQL instance
5. The `DATABASE_URL` environment variable will be automatically provided

## Step 3: Configure Environment Variables
In Railway project settings → Variables, add these:

```env
# Telegram Bot (get from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Plisio Payment Gateway (get from Plisio dashboard)
PLISIO_SECRET_KEY=your_plisio_secret_key

# Admin Configuration (your Telegram user ID)
ADMIN_TELEGRAM_IDS=your_telegram_id

# Server Configuration
PORT=3000
NODE_ENV=production

# Security (generate secure random strings)
WEBHOOK_SECRET=your_webhook_secret
JWT_SECRET=your_jwt_secret

# Base URL (Railway will provide this)
BASE_URL=https://your-app-name.up.railway.app
```

**Note:** `DATABASE_URL` is automatically provided by Railway PostgreSQL service.

## Step 4: Database Migration
After deployment, run the database migration:

1. Go to Railway project → your service
2. Open "Deployments" tab
3. Click on latest deployment
4. Open "View Logs"
5. The migration should run automatically on first startup

## Step 5: Set Up Telegram Webhook
After successful deployment:

1. Your bot will be available at: `https://your-app-name.up.railway.app`
2. Telegram webhook will be automatically configured
3. Test by sending `/start` to your bot

## Step 6: Configure Plisio Webhooks
1. Go to Plisio dashboard
2. Navigate to API settings
3. Set webhook URL to: `https://your-app-name.up.railway.app/webhook/plisio`
4. Enable webhook notifications

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL service is running in Railway
- Check that `DATABASE_URL` is automatically set
- Verify migration ran successfully in deployment logs

### Bot Not Responding
- Check `TELEGRAM_BOT_TOKEN` is correct
- Verify webhook URL is accessible
- Check deployment logs for errors

### Payment Issues
- Verify `PLISIO_SECRET_KEY` is correct
- Ensure webhook URL is configured in Plisio
- Check webhook endpoint is accessible

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | ✅ |
| `PLISIO_SECRET_KEY` | Plisio API secret key | ✅ |
| `ADMIN_TELEGRAM_IDS` | Comma-separated admin user IDs | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ (Auto) |
| `PORT` | Server port | ✅ |
| `NODE_ENV` | Environment (production) | ✅ |
| `WEBHOOK_SECRET` | Webhook security secret | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `BASE_URL` | Your Railway app URL | ✅ |

## Success Indicators
- ✅ Railway deployment shows "Success"
- ✅ Database migration completed
- ✅ Bot responds to `/start` command
- ✅ Store interface loads at `/store`
- ✅ Admin panel accessible at `/admin`
- ✅ Health check passes at `/health`

## Support
If you encounter issues:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Ensure PostgreSQL service is running
4. Test webhook endpoints manually