# Test Firebase Configuration

## Step 1: Verify Environment Variables in Vercel

Make sure all three Firebase variables are set:

1. **FIREBASE_PROJECT_ID** = `spt-employee-hub`
2. **FIREBASE_CLIENT_EMAIL** = `firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com`
3. **FIREBASE_PRIVATE_KEY** = (the key you just added)

**Important for FIREBASE_PRIVATE_KEY:**

- ✅ Should start with `-----BEGIN PRIVATE KEY-----`
- ✅ Should end with `-----END PRIVATE KEY-----`
- ⚠️ If you see a warning icon, try this:
  - Remove the variable
  - Add it again, but this time paste it as a **single line** with `\n` instead of actual newlines
  - Or ensure there are no extra spaces before/after

## Step 2: Redeploy

After adding/updating variables:

1. Go to **Deployments** tab
2. Click **⋯** on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Step 3: Test Firebase Configuration

### Option A: Test via Browser/API

Visit this URL (replace with your Vercel domain):

```
https://your-app.vercel.app/api/test-firebase
```

Or if testing locally:

```
http://localhost:3000/api/test-firebase
```

**Expected Response:**

```json
{
  "configured": true,
  "hasProjectId": true,
  "hasClientEmail": true,
  "hasPrivateKey": true,
  "privateKeyValid": true,
  "privateKeyLength": 1672,
  "firebaseInitialized": true,
  "projectId": "spt-employee-hub",
  "clientEmail": "firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com"
}
```

### Option B: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** → Latest deployment
3. Click on the function execution
4. Look for logs starting with:
   - `🔍 Firebase Environment Variables Check:`
   - `✅ Firebase Admin SDK initialized successfully`
   - Or `⚠️  Firebase credentials not configured`

## Step 4: Common Issues & Fixes

### Issue: Warning Icon on Private Key

**Fix:** The key might have actual newlines. Try:

1. Copy the key from `FIREBASE_PRIVATE_KEY_CLEAN.txt`
2. Remove the variable in Vercel
3. Add it again and paste as a **single line** (Vercel will handle it)

### Issue: `hasPrivateKey: false`

**Fix:**

- Check if the variable name is exactly `FIREBASE_PRIVATE_KEY` (case-sensitive)
- Make sure it's added to **all three environments**: Production, Preview, Development

### Issue: `privateKeyValid: false`

**Fix:**

- The key must include `BEGIN PRIVATE KEY` and `END PRIVATE KEY` markers
- Make sure you copied the entire key including the header and footer

### Issue: `firebaseInitialized: false` but `configured: true`

**Fix:**

- Check the Vercel function logs for the actual error message
- Common errors:
  - Invalid key format
  - Key doesn't match the service account email
  - Network issues connecting to Firebase

## Step 5: Verify It's Working

Once `firebaseInitialized: true`, test push notifications:

1. Go to Settings page in your app
2. Enable push notifications
3. Have someone check in/out
4. Admin should receive a push notification
