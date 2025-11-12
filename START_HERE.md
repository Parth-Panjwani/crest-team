# 🚀 START HERE - Quick Setup

## ⚠️ IMPORTANT: You Need TWO Terminals Running

### Step 1: Open Terminal 1 (Frontend)
```bash
npm run dev
```
✅ This starts the frontend on `http://localhost:5173`

**Wait for:** `Local: http://localhost:5173/`

### Step 2: Open Terminal 2 (API - REQUIRED!)
```bash
npm run dev:api
```
✅ This starts the API server on `http://localhost:3000`

**Wait for:** `Ready! Available at http://localhost:3000`

**If you see errors:**
- Check MongoDB connection string in `api/mongodb.ts`
- Make sure Vercel CLI is installed: `npm i -g vercel`
- Check Terminal 2 for error messages

### Step 3: Verify API is Running
In a new terminal, run:
```bash
./test-api.sh
```
Should show: `✅ Port 3000 is in use` and `✅ API is responding`

### Step 4: Open Browser
Go to: `http://localhost:5173` (NOT 3001!)

### Step 5: Login
Use PIN: `1234` (Admin) or `5678` (Employee)

---

## ❌ Troubleshooting

**"API server not running" error**
1. Check Terminal 2 where `npm run dev:api` is running
2. Look for error messages (MongoDB connection, etc.)
3. Verify port 3000: `lsof -ti:3000` should show a process
4. Try restarting: Stop (Ctrl+C) and run `npm run dev:api` again

**"Login not moving forward"**
- ✅ Make sure BOTH terminals are running
- ✅ Check Terminal 2 for errors
- ✅ Verify API: `curl http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"pin":"1234"}'`

**Accessing wrong port**
- ✅ Use `http://localhost:5173` (Vite frontend)
- ❌ NOT `http://localhost:3001` (that's something else)

---

## 📝 What Changed

1. ✅ Added 10-second timeout to prevent infinite hanging
2. ✅ Better error messages when API is not running
3. ✅ Background data refresh (non-blocking)
4. ✅ Loading spinner during login
5. ✅ Added `test-api.sh` script to verify API

---

**Both terminals must be running for the app to work!**

