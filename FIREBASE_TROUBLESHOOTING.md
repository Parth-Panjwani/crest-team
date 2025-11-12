# Firebase Push Notifications Troubleshooting Guide

If you're getting "Firebase is not configured" errors, follow these steps:

## 🔍 Step 1: Verify Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Verify these variables are set (for **all environments** - Production, Preview, Development):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

## 🔍 Step 2: Check Variable Values

### FIREBASE_PROJECT_ID

- Should be: `spt-employee-hub`
- No quotes, no spaces

### FIREBASE_CLIENT_EMAIL

- Should be: `firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com`
- No quotes, no spaces

### FIREBASE_PRIVATE_KEY

- **IMPORTANT**: Must include the entire key with newlines
- Should start with: `-----BEGIN PRIVATE KEY-----\n`
- Should end with: `-----END PRIVATE KEY-----\n`
- The `\n` characters are important - they represent newlines
- In Vercel, paste the entire key including BEGIN and END lines

**Example format in Vercel:**

```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChiXf+w24hdqFq\n... (rest of key) ...\n-----END PRIVATE KEY-----\n
```

## 🔍 Step 3: Check Deployment Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Check the **Build Logs** and **Function Logs**
4. Look for:
   - `✅ Firebase Admin SDK initialized successfully` (good!)
   - `⚠️  Firebase credentials not configured` (missing env vars)
   - `❌ Failed to initialize Firebase Admin SDK` (error details)

## 🔍 Step 4: Test Environment Variables

You can add a test endpoint to check if variables are loaded:

```typescript
// Add this to api/[...path].ts temporarily
if (context.segments[0] === "test-firebase") {
  return json(res, 200, {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
    // Don't expose private key in response!
  })
}
```

Then visit: `https://your-app.vercel.app/api/test-firebase`

## 🔧 Common Issues and Fixes

### Issue 1: "Firebase credentials not configured"

**Cause:** Environment variables are missing or not set for the correct environment.

**Fix:**

1. Go to Vercel → Settings → Environment Variables
2. Make sure variables are added to **all three environments**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
3. **Redeploy** your project after adding variables

### Issue 2: "Failed to initialize Firebase Admin SDK"

**Cause:** Invalid credentials or malformed private key.

**Fix:**

1. Verify the private key is complete (includes BEGIN and END lines)
2. Make sure newlines are represented as `\n` in Vercel
3. Check that there are no extra spaces or quotes
4. Re-download the Firebase service account JSON if needed

### Issue 3: Variables work locally but not on Vercel

**Cause:** Variables not set in Vercel or set for wrong environment.

**Fix:**

1. Double-check Vercel environment variables
2. Make sure you selected the correct environments
3. Redeploy after adding/changing variables

### Issue 4: "No FCM token found"

**Cause:** User hasn't granted notification permissions or token not saved.

**Fix:**

1. This is expected if user hasn't enabled notifications
2. Check Settings page - user should enable push notifications
3. Verify FCM token is being saved to database

## 📝 Quick Checklist

- [ ] All 3 Firebase env vars added to Vercel
- [ ] Variables set for Production, Preview, AND Development
- [ ] FIREBASE_PRIVATE_KEY includes `\n` for newlines
- [ ] Project redeployed after adding variables
- [ ] Checked deployment logs for Firebase initialization
- [ ] Users have enabled push notifications in Settings

## 🧪 Testing Push Notifications

1. **Enable notifications:**

   - Go to Settings page
   - Click "Enable Push Notifications"
   - Grant browser permission

2. **Test attendance notification:**

   - Have a staff member check in
   - Admin should receive push notification
   - Check browser console for errors

3. **Check logs:**
   - Vercel Function Logs should show:
     - `✅ Firebase Admin SDK initialized successfully`
     - `✅ Push notification sent to user [userId]`

## 🆘 Still Not Working?

1. **Check Vercel Function Logs:**

   - Go to Vercel Dashboard → Your Project → **Functions**
   - Click on a function execution
   - Check the logs for Firebase-related errors

2. **Verify Firebase Service Account:**

   - Go to Firebase Console → Project Settings → Service Accounts
   - Generate a new private key if needed
   - Make sure the key is complete

3. **Test locally:**

   ```bash
   # Make sure .env file exists with Firebase vars
   npm run dev:server
   # Try a check-in action
   # Check console for Firebase initialization
   ```

4. **Contact Support:**
   - Share the exact error message from logs
   - Include which environment (Production/Preview)
   - Include the Firebase project ID

---

**Remember:** After adding/changing environment variables in Vercel, you **must redeploy** for changes to take effect!
