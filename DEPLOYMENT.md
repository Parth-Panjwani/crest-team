# Deployment Guide

This guide covers deploying the fullstack application with separate frontend and backend.

## Architecture

- **Frontend**: React app (static files) - Deploy to Vercel/Netlify
- **Backend**: Express + WebSocket server - Deploy to Railway/Render/Heroku

## Backend Deployment

### Option 1: Railway (Recommended)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set root directory to `server`

3. **Configure Environment Variables**
   ```
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB_NAME=crest-team
   PORT=3000
   CLIENT_URL=https://your-frontend-domain.vercel.app
   NODE_ENV=production
   ```

4. **Deploy**
   - Railway will auto-detect Node.js
   - Build command: `npm run build`
   - Start command: `npm start`

### Option 2: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Settings:
     - Root Directory: `server`
     - Build Command: `npm run build`
     - Start Command: `npm start`
     - Environment: Node

3. **Set Environment Variables**
   - Same as Railway above

### Option 3: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create App**
   ```bash
   cd server
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your_connection_string
   heroku config:set MONGODB_DB_NAME=crest-team
   heroku config:set CLIENT_URL=https://your-frontend.vercel.app
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

## Frontend Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://your-backend.railway.app
     VITE_WS_URL=wss://your-backend.railway.app
     ```

4. **Redeploy** after setting environment variables

### Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**
   ```bash
   netlify deploy --prod
   ```

3. **Set Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add `VITE_API_URL` and `VITE_WS_URL`

## MongoDB Atlas Setup

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create free cluster

2. **Network Access**
   - Add IP Address: `0.0.0.0/0` (allows all IPs)
   - Or add specific IPs for production

3. **Database User**
   - Create database user
   - Note username and password

4. **Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password

## Environment Variables Summary

### Backend (.env)
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
MONGODB_DB_NAME=crest-team
PORT=3000
CLIENT_URL=https://your-frontend-domain.vercel.app
NODE_ENV=production
```

### Frontend (.env)
```
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
```

## Post-Deployment Checklist

- [ ] Backend is accessible at API URL
- [ ] Frontend can connect to backend (check browser console)
- [ ] WebSocket connection works (check browser console)
- [ ] MongoDB connection is working
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] Default users are created (or create manually)

## Troubleshooting

### CORS Errors
- Ensure `CLIENT_URL` in backend matches your frontend URL exactly
- Check for trailing slashes

### WebSocket Not Connecting
- Ensure WebSocket URL uses `wss://` for HTTPS sites
- Check firewall/proxy settings
- Verify WebSocket is enabled on hosting platform

### MongoDB Connection Issues
- Verify IP whitelist includes hosting platform IPs
- Check connection string format
- Verify database user has correct permissions

## Production Best Practices

1. **Security**
   - Use strong MongoDB passwords
   - Enable MongoDB IP whitelisting
   - Use HTTPS/WSS in production
   - Set secure CORS origins

2. **Performance**
   - Enable MongoDB indexes
   - Use connection pooling
   - Monitor server resources

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor API response times
   - Track WebSocket connections

