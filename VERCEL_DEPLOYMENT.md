# Vercel Deployment Guide

## Prerequisites

1. MongoDB Atlas account with IP whitelist configured (allow `0.0.0.0/0` or Vercel IPs)
2. Vercel account connected to your GitHub repository

## Step 1: Environment Variables

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

### Required Variables:

```
MONGODB_URI=mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/
MONGODB_DB_NAME=crest-team
```

**Important:**

- Add these for **Production**, **Preview**, and **Development** environments
- The MongoDB URI contains your password - keep it secure
- Make sure your MongoDB Atlas IP whitelist allows Vercel's IPs (or use `0.0.0.0/0` for testing)

## Step 2: Project Settings

In Vercel dashboard → **Settings → General**:

1. **Framework Preset:** `Vite` (should auto-detect)
2. **Root Directory:** Leave empty (or `.` if needed)
3. **Build Command:** `npm run build` (already in vercel.json)
4. **Output Directory:** `dist` (already in vercel.json)
5. **Serverless Runtime:** leave as default; the API function exports its own config to pin Node.js 20 for MongoDB/zlib support
6. **Install Command:** `npm install` (default)

## Step 3: Build Configuration

The `vercel.json` is already configured correctly:

- API routes are handled via `/api/[...path]`
- Frontend routes are handled via `index.html`
- Build output goes to `dist/`

## Step 4: MongoDB Atlas IP Whitelist

**CRITICAL:** Before deployment, ensure MongoDB Atlas allows connections:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Select your cluster
3. Go to **Network Access**
4. Click **Add IP Address**
5. Add `0.0.0.0/0` (allows all IPs) OR add Vercel's IP ranges:
   - Vercel uses dynamic IPs, so `0.0.0.0/0` is recommended for serverless functions
   - For production, you can restrict to specific IPs later

## Step 5: Deploy

### Option A: Via GitHub (Recommended)

1. Push your code to GitHub
2. Vercel will auto-deploy on push to main branch
3. Check deployment logs for any errors

### Option B: Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Step 6: Verify Deployment

After deployment:

1. **Check API Endpoints:**

   - Visit: `https://your-app.vercel.app/api/auth/login`
   - Should return JSON (not HTML)
   - Visit: `https://your-app.vercel.app/api/bootstrap`
   - Should respond with arrays for users, attendance, salaries, notes, and announcements

2. **Check Frontend:**

   - Visit: `https://your-app.vercel.app`
   - Should show login page

3. **Test Login:**
   - Try logging in with default admin PIN: `1234`
   - Check browser console for errors
   - Check Vercel function logs for API errors

## Troubleshooting

### Issue: "MongoDB connection failed"

**Solution:**

- Check MongoDB Atlas IP whitelist
- Verify `MONGODB_URI` environment variable is set correctly
- Check Vercel function logs for detailed error messages

### Issue: "API returns 404"

**Solution:**

- Verify `vercel.json` rewrite rules are correct
- Check that `/api/[...path].ts` exists
- Ensure build completed successfully

### Issue: "Build fails"

**Solution:**

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18.x by default)
- Confirm `vercel.json` still pins the API function to Node.js 20 so MongoDB/zlib remain available
- If chunk size warnings appear, adjust the manual vendor groupings in `vite.config.ts`

### Issue: "Environment variables not working"

**Solution:**

- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

## Current Configuration Files

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/[...path].ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/[...path]"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### API Route

- Location: `/api/[...path].ts`
- Handles all API requests
- Connects to MongoDB using environment variables

## Environment Variables Summary

| Variable          | Value               | Required | Description                              |
| ----------------- | ------------------- | -------- | ---------------------------------------- |
| `MONGODB_URI`     | `mongodb+srv://...` | Yes      | MongoDB connection string                |
| `MONGODB_DB_NAME` | `crest-team`        | No       | Database name (defaults to 'crest-team') |

## Next Steps After Deployment

1. **Test all features:**

   - Login
   - Attendance tracking
   - Manual punches (admin)
   - Salary management
   - Notes

2. **Monitor logs:**

   - Check Vercel function logs regularly
   - Monitor MongoDB Atlas for connection issues

3. **Set up custom domain (optional):**
   - Go to Vercel → Settings → Domains
   - Add your custom domain

## Security Notes

⚠️ **Important:**

- Never commit `.env` files to Git
- MongoDB password is in the connection string - keep it secure
- Use environment variables for all sensitive data
- Consider rotating MongoDB password periodically
