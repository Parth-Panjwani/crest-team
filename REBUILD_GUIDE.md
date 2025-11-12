# Complete Rebuild Guide

This project has been rebuilt from scratch with a proper fullstack architecture.

## New Architecture

### Backend (`/server`)
- **Express.js** server with RESTful API
- **WebSocket** server for real-time sync
- **MongoDB** integration with proper models
- TypeScript throughout

### Frontend (`/src`)
- React + Vite (unchanged)
- All UI components preserved
- Needs to be updated to connect to new backend

## Setup Instructions

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string
npm run dev
```

Backend runs on:
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:3001

### 2. Frontend Setup

```bash
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

### 3. Run Both Together

```bash
npm run dev:all
```

## What's Been Created

### Backend Structure
- ✅ Server entry point with Express + WebSocket
- ✅ MongoDB connection and database setup
- ✅ WebSocket server for real-time sync
- ✅ Model definitions for all data types
- ✅ Route handlers for:
  - Authentication
  - Users
  - Attendance
  - Notes
  - Leaves
  - Salaries
  - Announcements
  - Bootstrap (initial data load)

### What Needs to Be Done

1. **Update Frontend Store** (`src/lib/store.ts`)
   - Change API calls from `/api/*` to `http://localhost:3000/api/*`
   - Add WebSocket connection for real-time updates
   - Update all API calls to match new backend structure

2. **Add WebSocket Client**
   - Create WebSocket hook in `src/hooks/useWebSocket.ts`
   - Connect to `ws://localhost:3001?userId=USER_ID`
   - Listen for `data-update` messages and refresh data

3. **Complete Remaining Routes** (if needed)
   - Salary history routes
   - Pending advances routes
   - Pending store purchases routes

4. **Deployment Configuration**
   - Update `vercel.json` or create new deployment config
   - Set up environment variables
   - Configure CORS properly

## API Endpoints

All endpoints are under `/api`:

- `POST /api/auth/login` - Login with PIN
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/attendance/punch` - Record attendance punch
- `GET /api/attendance/today/:userId` - Get today's attendance
- `GET /api/attendance/history/:userId` - Get attendance history
- `GET /api/bootstrap` - Get all data for initial load
- And more...

## WebSocket Events

Connect to `ws://localhost:3001?userId=USER_ID`

Message format:
```json
{
  "type": "data-update",
  "payload": {
    "dataType": "attendance|note|leave|salary|user|announcement",
    "data": { ... }
  }
}
```

## Next Steps

1. Update `src/lib/store.ts` to use new API endpoints
2. Add WebSocket client for real-time updates
3. Test all features
4. Deploy backend and frontend

## Notes

- All existing UI and features are preserved
- Backend is built with proper TypeScript types
- Real-time sync is implemented via WebSocket
- MongoDB models match existing data structure

