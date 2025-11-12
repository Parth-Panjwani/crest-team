# Frontend Firebase Environment Variables for Vercel

## ✅ Server-Side Firebase (Working!)

Your test endpoint shows server-side Firebase is configured correctly:
- `firebaseInitialized: true` ✅

## ⚠️ Client-Side Firebase (Needs Frontend Env Vars)

The Settings page uses **client-side Firebase**, which requires **frontend environment variables** with the `VITE_` prefix.

## Required Frontend Environment Variables

Add these to Vercel (Settings → Environment Variables):

### 1. VITE_FIREBASE_API_KEY
```
AIzaSyAW7FUjSC4dksa1wGg1BRmbTD3xIYq1kfs
```

### 2. VITE_FIREBASE_AUTH_DOMAIN
```
spt-employee-hub.firebaseapp.com
```

### 3. VITE_FIREBASE_PROJECT_ID
```
spt-employee-hub
```

### 4. VITE_FIREBASE_STORAGE_BUCKET
```
spt-employee-hub.firebasestorage.app
```

### 5. VITE_FIREBASE_MESSAGING_SENDER_ID
```
221082548144
```

### 6. VITE_FIREBASE_APP_ID
```
1:221082548144:web:b5addda41ca65f6aba4875
```

### 7. VITE_FIREBASE_VAPID_KEY
```
BKsMP88DiQLayc2jSmI3w0d9SKa_DyMehBor7oeqbpBKTCNx3EaBg1-SqZ6kmHD94jp_OYgwPdR8pFmX30xY0XI
```

## How to Add in Vercel

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. For each variable above:
   - **Key:** `VITE_FIREBASE_API_KEY` (or the appropriate name)
   - **Value:** The value from above
   - **Environments:** Select all three (Production, Preview, Development)
4. Click **Save**
5. Repeat for all 7 variables

## After Adding Variables

1. **Redeploy** your project:
   - Go to **Deployments**
   - Click **⋯** on latest deployment
   - Click **Redeploy**

2. **Test in Browser:**
   - Open browser console (F12)
   - Go to Settings page
   - Try to enable notifications
   - Look for: `✅ Firebase client initialized`

## Quick Test

After redeploying, check the browser console when loading the app. You should see:
- `✅ Firebase client initialized` (if working)
- Or `⚠️  Firebase config not complete` (if missing vars)

## Summary

- ✅ **Server-side Firebase:** Working (for sending push notifications)
- ⚠️ **Client-side Firebase:** Needs frontend env vars (for receiving push notifications)

Both are needed for push notifications to work end-to-end!

