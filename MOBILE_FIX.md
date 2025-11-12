# Mobile Error Fix: "Can't Find Variables"

## ✅ Fixed: Better Error Handling

The app now handles missing Firebase environment variables gracefully:
- Won't crash on mobile
- Shows clear error messages
- Logs which variables are missing

## ⚠️ Still Need: Add Frontend Environment Variables to Vercel

The error happens because **frontend Firebase environment variables** are not set in Vercel's production environment.

### Quick Fix Steps

1. **Go to Vercel Dashboard**
   - Open your project
   - Go to **Settings** → **Environment Variables**

2. **Add These 7 Variables** (all with `VITE_` prefix):

   | Variable Name | Value |
   |--------------|-------|
   | `VITE_FIREBASE_API_KEY` | `AIzaSyAW7FUjSC4dksa1wGg1BRmbTD3xIYq1kfs` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `spt-employee-hub.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `spt-employee-hub` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | `spt-employee-hub.firebasestorage.app` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `221082548144` |
   | `VITE_FIREBASE_APP_ID` | `1:221082548144:web:b5addda41ca65f6aba4875` |
   | `VITE_FIREBASE_VAPID_KEY` | `BKsMP88DiQLayc2jSmI3w0d9SKa_DyMehBor7oeqbpBKTCNx3EaBg1-SqZ6kmHD94jp_OYgwPdR8pFmX30xY0XI` |

3. **Important Settings:**
   - ✅ Select **all three environments**: Production, Preview, Development
   - ✅ No quotes needed around values
   - ✅ Variable names must start with `VITE_`

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **⋯** on latest deployment
   - Click **Redeploy**

## After Redeploying

- ✅ Mobile app will work without errors
- ✅ Firebase will initialize correctly
- ✅ Push notifications can be enabled from Settings page

## Why This Happens

- **Desktop (local dev):** Uses `.env` file with `VITE_*` variables ✅
- **Mobile (production):** Needs variables in Vercel environment ❌

Vite replaces `import.meta.env.VITE_*` at build time. If variables aren't in Vercel, they become `undefined` in the production build, causing the error.

## Verification

After redeploying, check mobile browser console:
- Should see: `✅ Firebase client initialized`
- Should NOT see: `⚠️  Firebase config not complete`

