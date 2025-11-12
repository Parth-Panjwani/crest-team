# Debug API Server Issue

## Problem
API server says it's running but port 3000 is not in use.

## Quick Fix

1. **Stop the current `npm run dev:api` process** (Ctrl+C)

2. **Check for errors:**
   ```bash
   npm run dev:api
   ```
   Look for any error messages in the terminal.

3. **Common Issues:**

   **Issue 1: Vercel CLI not installed globally**
   ```bash
   npm i -g vercel
   ```

   **Issue 2: Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   npm run dev:api
   ```

   **Issue 3: MongoDB connection error**
   - Check `api/mongodb.ts` for correct connection string
   - Verify MongoDB network access

4. **Verify it's running:**
   ```bash
   curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"pin":"1234"}'
   ```
   Should return user data or 401 error.

## Expected Output

When `npm run dev:api` is running correctly, you should see:
```
> vercel dev --listen 3000
Vercel CLI 48.9.0
...
Ready! Available at http://localhost:3000
```

## Alternative: Check What's Actually Running

```bash
# See all node processes
ps aux | grep node

# See what's using port 3000
lsof -i :3000

# See what's using port 3001  
lsof -i :3001
```

