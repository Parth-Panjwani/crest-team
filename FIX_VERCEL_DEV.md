# Fix: Vercel Dev Running Vite Instead of API

## Problem
When running `npm run dev:api`, Vercel dev is trying to run Vite (frontend) instead of just serving API routes.

## Solution

**Stop the current `npm run dev:api` process** (Ctrl+C in that terminal), then:

1. **Restart it:**
   ```bash
   npm run dev:api
   ```

2. **What to expect:**
   - Should NOT say "Running Dev Command vite"
   - Should say "Ready! Available at http://localhost:3000"
   - API routes should be accessible at `http://localhost:3000/api/*`

3. **If it still runs Vite:**
   - Check `vercel.json` - `devCommand` should be `null` or removed
   - Make sure you're in the project root directory

4. **Test the API:**
   ```bash
   curl http://localhost:3000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"pin":"1234"}'
   ```
   Should return user data or 401 error.

## Alternative: Use Different Port

If port 3000 is still conflicted, you can use a different port:

```bash
vercel dev --listen 3002
```

Then update `vite.config.ts` proxy to point to port 3002.

