# Quick Start Guide

## 🚀 Local Development

**Run in TWO terminals:**

### Terminal 1: Frontend (Vite)

```bash
npm run dev
```

Opens at: `http://localhost:5173`

### Terminal 2: API (Vercel Dev)

```bash
npm run dev:api
```

Serves API at: `http://localhost:3000/api/*`

## 📝 Why Two Terminals?

- **Vite** serves the React frontend (fast HMR)
- **Vercel Dev** serves the MongoDB API routes
- They work together via proxy in `vite.config.ts`

## 🔑 Default Login PINs

- **Admin**: `1234` (Store Owner)
- **Employee 1**: `5678` (Alice Johnson)
- **Employee 2**: `9012` (Bob Smith)

## ✅ What's Working

- ✅ MongoDB connected
- ✅ All data syncs across devices
- ✅ No localStorage fallbacks
- ✅ Real-time updates via auto-refresh

## 🐛 Troubleshooting

**"Cannot connect to database"**

- Make sure `npm run dev:api` is running in Terminal 2
- Check MongoDB connection string in `api/mongodb.ts`

**"500 Internal Server Error"**

- Check Terminal 2 (API) for error messages
- Verify MongoDB connection string is correct

## 📦 Production Deployment

Just push to GitHub - Vercel auto-deploys:

- Frontend: Built from `dist/`
- API: Serverless functions in `api/`
