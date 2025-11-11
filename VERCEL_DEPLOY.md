# Deploying to Vercel

This guide will help you deploy the Crest Team app to Vercel.

## Important Note

**The backend server (with WebSocket support) cannot run on Vercel Serverless Functions.** You'll need to host the backend separately. Options:

1. **Railway** (Recommended) - Easy deployment, supports WebSockets
2. **Render** - Free tier available, supports WebSockets  
3. **Fly.io** - Good for WebSocket apps
4. **Your own server** - Full control

## Step 1: Deploy Backend First

### Option A: Deploy to Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Sign up/login
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo and set root directory to `server/`
5. Add environment variable:
   - `CLIENT_URL` = Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
6. Railway will automatically deploy and give you a URL like `https://your-app.up.railway.app`
7. Copy this URL - you'll need it for the frontend

### Option B: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your GitHub repo
4. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variable:
   - `CLIENT_URL` = Your Vercel frontend URL
6. Render will give you a URL like `https://your-app.onrender.com`

## Step 2: Deploy Frontend to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. When prompted:
   - Set up and deploy? **Yes**
   - Which scope? **Your account**
   - Link to existing project? **No**
   - Project name? **crest-team** (or your choice)
   - Directory? **./** (current directory)
   - Override settings? **No**

5. Add environment variable:
```bash
vercel env add VITE_API_URL
```
   - Enter your backend URL (from Railway/Render)
   - Select: **Production, Preview, Development**

6. Redeploy:
```bash
vercel --prod
```

### Method 2: Vercel Dashboard (GitHub Integration)

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Your backend URL (from Railway/Render)
   - **Environments**: Production, Preview, Development
7. Click "Deploy"

## Step 3: Update CORS on Backend

After deploying frontend, update your backend CORS settings:

In `server/server.js`, update:
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://your-app.vercel.app",  // Add your Vercel URL
      "https://*.vercel.app"  // Allow all Vercel preview URLs
    ],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
```

Redeploy the backend after this change.

## Step 4: Test Real-time Features

1. Open your Vercel app in two different browsers/devices
2. Login as different users
3. Have one user check in - the other should see it instantly
4. Test other real-time features (notes, announcements, etc.)

## Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_URL` = Your backend URL (e.g., `https://your-app.up.railway.app`)

### Backend (Railway/Render)
- `CLIENT_URL` = Your Vercel frontend URL (e.g., `https://your-app.vercel.app`)
- `PORT` = Usually auto-set by hosting platform

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` is set correctly in Vercel
- Check backend CORS allows your Vercel domain
- Check backend is running and accessible

### WebSocket connection fails
- Ensure backend is on a platform that supports WebSockets (Railway, Render, Fly.io)
- Check CORS settings include your Vercel domain
- Check browser console for WebSocket errors

### Real-time updates not working
- Verify Socket.io connection in browser console
- Check backend logs for WebSocket connections
- Ensure both frontend and backend are using same protocol (https)

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed to Vercel
- [ ] `VITE_API_URL` set in Vercel environment variables
- [ ] CORS configured on backend for Vercel domain
- [ ] Tested real-time features with multiple users
- [ ] Database persists data correctly
- [ ] All features working in production

## Custom Domain (Optional)

1. In Vercel dashboard, go to your project → Settings → Domains
2. Add your custom domain
3. Update backend CORS to include your custom domain
4. Update `VITE_API_URL` if needed

