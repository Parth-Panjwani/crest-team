# Mobile Cache Issue Fix

## Problem
Desktop works but mobile shows "can't find variable" errors. This is a **cache issue** - mobile is using an old build that was created before the environment variables were added to Vercel.

## Why This Happens

1. **Vite replaces env vars at BUILD time** - not runtime
2. If you added variables to Vercel AFTER the last build, mobile might be using a cached version
3. Mobile browsers cache more aggressively than desktop

## Solutions

### Solution 1: Force Redeploy (Recommended)

1. **Go to Vercel Dashboard**
   - Your project → **Deployments**
   - Click **⋯** on the latest deployment
   - Click **Redeploy**
   - ✅ Check "Use existing Build Cache" = **OFF** (uncheck it)
   - Click **Redeploy**

2. **Wait for deployment to complete**

3. **On Mobile:**
   - Open the app
   - **Hard refresh** (see below)
   - Or clear browser cache

### Solution 2: Clear Mobile Browser Cache

**Chrome (Android):**
1. Open Chrome
2. Tap **⋮** (menu)
3. **Settings** → **Privacy and security** → **Clear browsing data**
4. Select **Cached images and files**
5. Tap **Clear data**

**Safari (iOS):**
1. Open **Settings** app
2. **Safari** → **Clear History and Website Data**
3. Confirm

**Hard Refresh (Mobile):**
- **Chrome Android:** Hold refresh button → **Hard reload**
- **Safari iOS:** Hold refresh button → **Reload Without Content Blockers**

### Solution 3: Verify Variables Are Set

1. **Go to Vercel** → Your project → **Settings** → **Environment Variables**
2. **Verify all 7 variables exist:**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_VAPID_KEY`

3. **Check environments:**
   - Each variable should be available for: **Production, Preview, Development**
   - If missing, add it to all three

### Solution 4: Add Cache-Busting Query Parameter

Temporarily, you can add `?v=2` to the URL to force reload:
```
https://your-app.vercel.app/?v=2
```

## Verification

After redeploying and clearing cache:

1. **Open mobile browser console** (if possible) or check network tab
2. **Look for:**
   - ✅ `✅ Firebase client initialized` = Working!
   - ❌ `❌ Firebase config not complete` = Still cached or variables missing

3. **Check the debug logs:**
   - Should see: `[Firebase] Available VITE_ variables: [...]`
   - Should list all 7 variables

## Why Desktop Works But Mobile Doesn't

- **Desktop:** Might have cleared cache automatically or using a fresh session
- **Mobile:** More aggressive caching, might be using a build from before variables were added
- **Solution:** Force a new build in Vercel (without cache) and clear mobile cache

## Prevention

After adding environment variables to Vercel:
1. **Always redeploy** (don't just add variables)
2. **Uncheck "Use existing Build Cache"** when redeploying
3. **Test on mobile** after deployment

