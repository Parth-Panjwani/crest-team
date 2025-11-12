# Employee Management System

Modern employee management system built with React, Vite, and MongoDB.

## 🚀 Quick Start

### Local Development

**Run in TWO terminals:**

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Opens at: `http://localhost:5173`

**Terminal 2 - API:**
```bash
npm run dev:api
```
Serves API at: `http://localhost:3000/api/*`

### Default Login PINs

- **Admin**: `1234` (Store Owner)
- **Employee 1**: `5678` (Alice Johnson)  
- **Employee 2**: `9012` (Bob Smith)

## 📦 Tech Stack

- **Frontend**: React + Vite + TypeScript
- **UI**: Tailwind CSS + Shadcn UI
- **Backend**: Vercel Serverless Functions
- **Database**: MongoDB
- **Deployment**: Vercel

## 🏗️ Project Structure

```
├── api/              # Serverless functions (MongoDB API)
│   ├── [...path].ts  # Main API handler
│   └── mongodb.ts    # MongoDB connection
├── src/
│   ├── components/   # React components
│   ├── pages/        # Page components
│   └── lib/          # Store & utilities
└── public/           # Static assets
```

## 🔧 Configuration

MongoDB connection is configured in `api/mongodb.ts`. For production, set `MONGODB_URI` environment variable in Vercel.

## 📝 Features

- ✅ Employee attendance tracking
- ✅ Leave management
- ✅ Salary & deductions tracking
- ✅ Notes/Orders management
- ✅ Real-time data sync
- ✅ Multi-user support

## ⚙️ Backend & API Highlights

- 🔐 **Single catch-all serverless handler** in [`api/[...path].ts`](api/%5B...path%5D.ts) routes every `/api/*` request, matches the local Express bridge, and centralizes typed validation for attendance, notes, salaries, leaves, and announcements.
- 🗃️ **Typed MongoDB models** in [`api/mongodb.ts`](api/mongodb.ts) remove `any` usage, enforce schema-safe CRUD helpers, and transparently compress large note bodies while keeping legacy documents readable.
- 🚀 **Bootstrap endpoint** (`/api/bootstrap`) batches the dashboard payload (users, attendance, notes, salaries, announcements, and more) so the client performs a single hydrated fetch on load.

## 📈 Performance Improvements

- 🪄 **Compressed note storage** dramatically reduces MongoDB document size and network transfer, with automatic backfill for legacy records.
- 🧭 **Client-side data store** (`src/lib/store.ts`) keeps memoized maps, lazy background refreshes, and graceful error boundaries for a snappy UI.
- 🧩 **Route-level code splitting** via `React.lazy` and manual Rollup chunking (see [`vite.config.ts`](vite.config.ts)) keeps the largest production bundle well under Vercel’s default 500&nbsp;kB budget.

## 📚 Additional Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) – deep dive into the API router, MongoDB helpers, bootstrap flow, and data compression strategy.

## 🚢 Deployment

### Prerequisites
1. Set environment variables in Vercel:
   - `MONGODB_URI` = Your MongoDB connection string
   - `MONGODB_DB_NAME` = `crest-team` (optional)

2. Whitelist IP in MongoDB Atlas:
   - Go to Network Access → Add `0.0.0.0/0` (allows all IPs)

### Deploy
Push to GitHub - Vercel auto-deploys on every push.

### Verify
- Test API: `https://your-app.vercel.app/api/health` (should return `{"status":"ok"}`)
- Test Login: `https://your-app.vercel.app/api/auth/login` (POST with `{"pin":"1234"}`)
