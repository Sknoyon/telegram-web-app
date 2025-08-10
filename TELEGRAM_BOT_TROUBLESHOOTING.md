# Telegram Bot Troubleshooting Guide 🤖

## Current Issue: Bot Not Responding

Your Railway Force Fix is active on port 8080, but the Telegram bot is not responding. Here's what we've identified and fixed:

## ✅ What We Fixed

### 1. Webhook Setup
- **Added Telegram webhook endpoint** at `/webhook` in server.js
- **Modified bot to use webhooks** instead of polling in production
- **Updated port configuration** to use 8080 consistently

### 2. Environment Detection
- Bot now automatically switches between:
  - **Polling mode** for local development
  - **Webhook mode** for Railway production

## 🔍 Current Status

From our webhook test:
- ✅ Server is accessible on Railway
- ✅ Bot token is valid (@EwhoreAssistantbot)
- ⚠️ Webhook not yet set (15 pending updates)
- ⚠️ Bot still in polling mode

## 🚀 Next Steps

### 1. Wait for Railway Deployment
The webhook changes have been pushed to GitHub. Railway should automatically redeploy:
- Check Railway dashboard for deployment status
- Look for "✅ Telegram webhook set successfully" in Railway logs

### 2. Verify Environment Variables
Ensure these are set in Railway:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
BASE_URL=https://ewhoreweb.up.railway.app
NODE_ENV=production
PORT=8080
ADMIN_TELEGRAM_IDS=your_telegram_id
```

### 3. Test the Bot
After deployment completes:
1. Open Telegram
2. Search for @EwhoreAssistantbot
3. Send `/start` command
4. Bot should respond with store buttons

## 🔧 Manual Webhook Setup (If Needed)

If automatic webhook setup fails, you can set it manually:

```bash
# Replace YOUR_BOT_TOKEN with your actual token
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://ewhoreweb.up.railway.app/webhook"}'
```

## 🧪 Testing Commands

### Check Webhook Status
```bash
node test-webhook.js
```

### Check Bot Token
```bash
node test-bot-token.js
```

### Check Bot Interaction
```bash
node test-bot-interaction.js
```

## 📊 Expected Railway Logs

After successful deployment, you should see:
```
🚀 Initializing Advanced Crypto Store...
✅ Advanced services initialized
✅ Advanced routes configured
🔗 Setting up Telegram webhook: https://ewhoreweb.up.railway.app/webhook
✅ Telegram webhook set successfully
📡 Webhook info: https://ewhoreweb.up.railway.app/webhook, pending: 0
🤖 Telegram bot started successfully
```

## 🐛 Common Issues & Solutions

### Issue: "Bot launch timeout"
**Solution**: This is normal - we switched from polling to webhooks

### Issue: "Webhook not accessible"
**Solution**: 
- Check BASE_URL is correct
- Verify Railway deployment is successful
- Ensure PORT is set to 8080

### Issue: "Invalid bot token"
**Solution**:
- Verify TELEGRAM_BOT_TOKEN in Railway variables
- Check token with @BotFather

### Issue: "Bot responds but buttons don't work"
**Solution**:
- Check BASE_URL points to your Railway app
- Verify store endpoints are accessible

## 📱 Bot Commands

Once working, your bot supports:
- `/start` - Welcome message with store button
- `/shop` - Direct store access
- `/orders` - View user orders
- `/admin` - Admin panel (for admin users)
- `/help` - Help information

## 🔄 Rollback Plan

If webhook mode causes issues, you can temporarily revert to polling:

1. Set `NODE_ENV=development` in Railway
2. Or modify the webhook condition in `bot/telegram-bot.js`

## 📞 Support

If issues persist:
1. Check Railway deployment logs
2. Run `node test-webhook.js` to verify status
3. Ensure all environment variables are correctly set
4. Try manual webhook setup if automatic fails

---

**Status**: Webhook implementation deployed ✅  
**Next**: Wait for Railway deployment and test bot response