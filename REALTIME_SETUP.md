# Real-time Data Sharing Setup

This guide will help you set up real-time data sharing across all staff and admin users.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Setup Instructions

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Install Frontend Dependencies

```bash
# From project root
npm install
```

This will install `socket.io-client` which is needed for real-time updates.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_API_URL=http://localhost:3001
```

### 4. Start the Backend Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### 5. Start the Frontend

In a new terminal, from the project root:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173` (or the port shown)

## How It Works

### Backend (Server)
- Uses Express.js for REST API
- Uses Socket.io for WebSocket real-time communication
- SQLite database for data persistence
- All data changes are broadcast to all connected clients

### Frontend
- Uses `socket.io-client` to connect to the server
- Automatically receives real-time updates
- All data operations go through the API
- Multiple users see updates instantly

## Real-time Features

When any user:
- Checks in/out → All users see the update immediately
- Creates/updates a note → All users see it instantly
- Updates salary → All admins see it immediately
- Creates announcement → All users see it instantly
- Any data change → Broadcast to all connected clients

## Switching from LocalStorage to API

To use the API store instead of localStorage:

1. Update imports in your components:
   ```typescript
   // Change from:
   import { store } from '@/lib/store';
   
   // To:
   import { store } from '@/lib/store-api';
   ```

2. Make all store methods async:
   ```typescript
   // Before:
   const users = store.getAllUsers();
   
   // After:
   const users = await store.getAllUsers();
   ```

## Production Deployment

For production:
1. Set `VITE_API_URL` to your production server URL
2. Deploy the server (e.g., on Railway, Render, or your own server)
3. Update CORS settings in `server/server.js` to allow your frontend domain

## Troubleshooting

- **Connection issues**: Check that the server is running and `VITE_API_URL` is correct
- **No real-time updates**: Check browser console for WebSocket connection errors
- **Data not syncing**: Ensure both frontend and backend are running

