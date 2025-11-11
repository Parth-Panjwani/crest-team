# Quick Deploy Guide - Vercel (Frontend + Backend)

## 🚀 Quick Start (3 minutes)

### Deploy Everything to Vercel

Both frontend and backend will be deployed together on Vercel!

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Click **"Deploy"**

**That's it!** Both frontend and backend are now deployed together.

### Test!

1. Open your Vercel app
2. Login with PIN: `1234` (admin) or `5678` (employee)
3. Open in another browser/device
4. Check in as one user - the other should see updates within 2 seconds! ✨

## 📝 Environment Variables

No environment variables needed! Everything works out of the box.

**Note**: For production with persistent data, consider upgrading to Vercel Postgres or Vercel KV for better data persistence.

## ✅ That's it!

Your app is now live! Data updates are shared across all users via intelligent polling (checks every 2 seconds).

## 🔧 Troubleshooting

**API not working?**
- Check that API routes are in the `/api` folder
- Verify build completed successfully
- Check Vercel function logs in dashboard

**Data not persisting?**
- Vercel serverless functions use `/tmp` for SQLite (resets on cold start)
- For production, consider upgrading to Vercel Postgres (see VERCEL_DEPLOY.md)

**Updates not syncing?**
- Polling runs every 2 seconds automatically
- Check browser console for API errors
- Verify API endpoints are accessible

## Production Checklist

- [ ] Frontend and backend deployed to Vercel
- [ ] Tested with multiple users
- [ ] All features working
- [ ] (Optional) Upgraded to Vercel Postgres for persistent data

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project → Settings → Domains
2. Add your custom domain
3. That's it! Everything works automatically
