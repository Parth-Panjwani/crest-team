# Troubleshooting Guide

## Backend Server Not Responding

### Check if Backend is Running

1. **Check if port 3000 is in use:**
   ```bash
   lsof -ti:3000
   ```
   If it returns a PID, the server is running.

2. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. **Test the API:**
   ```bash
   curl http://localhost:3000/api/bootstrap
   ```
   Should return JSON data.

### Common Issues

#### Issue: "Failed to fetch" or "NetworkError"

**Solution:**
- Ensure backend is running: `cd server && npm run dev`
- Check MongoDB connection in `server/.env`
- Verify CORS settings in `server/src/index.ts`

#### Issue: Backend starts but immediately crashes

**Solution:**
- Check MongoDB connection string in `server/.env`
- Ensure MongoDB is accessible (IP whitelist for Atlas)
- Check server logs for error messages

#### Issue: Frontend can't connect to backend

**Solution:**
1. **Development Mode (using Vite proxy):**
   - Frontend should use relative URLs: `/api/...`
   - Vite proxy in `vite.config.ts` forwards `/api` to `http://localhost:3000`
   - No CORS issues in development

2. **If using absolute URLs:**
   - Set `VITE_API_URL=http://localhost:3000` in `.env`
   - Ensure CORS is configured in backend

#### Issue: WebSocket not connecting

**Solution:**
- Check browser console for WebSocket errors
- Verify WebSocket URL: `ws://localhost:3000?userId=USER_ID`
- Ensure user is logged in (WebSocket requires userId)
- Check backend WebSocket server logs

### Debug Steps

1. **Check Backend Logs:**
   ```bash
   cd server
   npm run dev
   ```
   Look for:
   - `✅ MongoDB connected`
   - `🚀 Server running on http://localhost:3000`
   - `🔌 WebSocket server running on ws://localhost:3000`

2. **Check Frontend Console:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Test API Manually:**
   ```bash
   # Test login
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"pin":"1234"}'
   
   # Test bootstrap
   curl http://localhost:3000/api/bootstrap
   ```

### Quick Fixes

1. **Restart both servers:**
   ```bash
   # Kill existing processes
   lsof -ti:3000 | xargs kill -9
   lsof -ti:5173 | xargs kill -9
   
   # Restart
   npm run dev:all
   ```

2. **Clear browser cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear browser cache

3. **Check environment variables:**
   ```bash
   # Backend
   cd server
   cat .env
   
   # Frontend (optional)
   cat .env
   ```

### MongoDB Connection Issues

1. **Check connection string format:**
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
   ```

2. **Verify IP whitelist:**
   - MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` for testing (or your IP)

3. **Test connection:**
   ```bash
   cd server
   node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"
   ```

## Still Not Working?

1. Check all error messages in terminal and browser console
2. Verify both frontend and backend are running
3. Test API endpoints directly with curl
4. Check MongoDB connection separately
5. Review server logs for specific errors

