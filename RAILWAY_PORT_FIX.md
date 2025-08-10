# Railway Health Check Fix - PORT Variable Required

## Problem
Your Railway deployment health checks are failing with "service unavailable" because Railway doesn't know which port to check.

## Root Cause
According to Railway documentation <mcreference link="https://docs.railway.com/guides/public-networking" index="3">3</mcreference>, when using health checks, you MUST set a PORT environment variable in your Railway service settings. <mcreference link="https://docs.railway.com/guides/variables" index="1">1</mcreference>

## ✅ Confirmed Working Locally
Our debug script confirms the health endpoint works perfectly on port 8080 locally. The issue is Railway configuration.

## Solution

### Step 1: Set PORT Environment Variable in Railway
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Click "New Variable" <mcreference link="https://docs.railway.com/guides/variables" index="1">1</mcreference>
5. Add a new environment variable:
   - **Name**: `PORT`
   - **Value**: `8080`
6. Click "Add" to save the variable

### Step 2: Verify Other Required Variables
Ensure these variables are also set:
- `NODE_ENV=production`
- `DATABASE_URL` (your PostgreSQL connection string)
- `TELEGRAM_BOT_TOKEN`
- `BASE_URL` (your Railway domain)
- All other variables from RAILWAY_DEPLOYMENT.md

### Step 3: Redeploy
After setting the PORT variable, trigger a new deployment by pushing any small change or using Railway's redeploy button.

## Why This Happens
Railway's health check system needs to know which port to check. Without an explicit PORT variable, Railway can't determine where to send health check requests, causing "service unavailable" errors.

## Reference
- [Railway Health Check Documentation](https://docs.railway.com/guides/healthchecks)
- [Railway Port Configuration](https://docs.railway.com/guides/public-networking#port-variable)

## Expected Result
After setting the PORT variable, your health checks should pass and show:
```
Healthcheck Path: /health
Attempt #1 succeeded with status 200
```