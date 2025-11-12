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

## 🚢 Deployment

Push to GitHub - Vercel auto-deploys on every push.
