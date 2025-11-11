# Vercel Deployment Fix

## Issue
Error: `Function Runtimes must have a valid version, for example now-php@1.0.0`

## Solution

Vercel automatically detects TypeScript files in the `/api` folder and uses Node.js runtime. The error might be from a cached configuration.

### Steps to Fix:

1. **Clear Vercel Build Cache** (in Vercel Dashboard):
   - Go to your project → Settings → General
   - Scroll to "Build & Development Settings"
   - Clear build cache or redeploy

2. **Ensure Dependencies are Installed**:
   ```bash
   npm install
   ```

3. **Verify API Files Structure**:
   - All API files should be in `/api` folder
   - Files should export a default async function handler
   - Use `@vercel/node` types (already installed)

4. **Redeploy**:
   - Push changes to GitHub
   - Vercel will auto-deploy
   - Or trigger manual redeploy in Vercel dashboard

## Current Configuration

- `vercel.json` - Simplified, no function runtime config (Vercel auto-detects)
- `/api/**/*.ts` - All API routes (auto-detected by Vercel)
- Dependencies: `@vercel/node`, `better-sqlite3`, `uuid` installed

## If Error Persists

1. Check Vercel build logs for specific file causing issue
2. Ensure all API files have proper TypeScript syntax
3. Verify `@vercel/node` is in `package.json` dependencies (it's in devDependencies, might need to move it)

